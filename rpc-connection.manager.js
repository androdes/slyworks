var rpc = (function (exports) {
    class RPCConnectionManager {
        constructor(customReadRPCs = [], customWriteRPCs = [], confirmationCheckingDelay = 2000) {
            this.saRPCs = [
                'https://rpc.ironforge.network/mainnet?apiKey=01JEEEQP3FTZJFCP5RCCKB2NSQ',
            ];
////
            this.readRPCs = customReadRPCs.concat(this.saRPCs);
            this.writeRPCs = customWriteRPCs.concat(this.saRPCs);

            this.readCount = 0;
            this.writeCount = 0;
            this.errorCount = 0;

            this.readConnection = null;
            this.writeConnection = null;
            this.cachedEpochInfo = {'blockHeight': 0, 'lastUpdated': 0, 'isUpdating': false};
            this.signatureStatusQueue = [];
            this.confirmationCheckingDelay = confirmationCheckingDelay;
            this.initConnections();
        }

        initConnections() {
            const readIdx = Math.floor(Math.random() * this.readRPCs.length);
            const writeIdx = Math.floor(Math.random() * this.writeRPCs.length);

            const rawReadConn = new solanaWeb3.Connection(this.readRPCs[readIdx], 'confirmed');
            const rawWriteConn = new solanaWeb3.Connection(this.writeRPCs[writeIdx], 'confirmed');

            this.readConnection = new Proxy(rawReadConn, this.createConnectionProxy('READ'));
            this.writeConnection = new Proxy(rawWriteConn, this.createConnectionProxy('WRITE'));
        }

        getReadConnection() {
            return this.readConnection;
        }

        getWriteConnection() {
            return this.readConnection;
        }

        createConnectionProxy(type) {
            const manager = this;
            return {
                get(target, key) {
                    const origMethod = target[key];
                    if (typeof origMethod === 'function') {
                        return async function (...args) {
                            if (type === 'READ') manager.readCount++;
                            else manager.writeCount++;

                            return await manager.executeWithRetry(
                                target,
                                origMethod,
                                args,
                                type === 'READ' ? manager.readRPCs : manager.writeRPCs,
                                type
                            );
                        };
                    }
                    return origMethod;
                }
            };
        }

        async executeWithRetry(target, method, args, rpcs, type) {
            try {
                return await method.apply(target, args);
            } catch (error) {
                this.errorCount++;
                logger.log(2, `${type} CONNECTION ERROR:`, error);

                if (this.isConnectivityError(error)) {
                    return await this.tryAlternativeRPCs(method, args, rpcs, type);
                }

                logger.logError('Unrecoverable connection error: ' + error);
                throw error;
            }
        }

        async tryAlternativeRPCs(method, args, rpcs, type) {
            for (let i = 0; i < rpcs.length; i++) {
                logger.log(2, `${type} trying ${rpcs[i]}`);
                const newConnection = new solanaWeb3.Connection(rpcs[i], 'confirmed');

                try {
                    const result = await method.apply(newConnection, args);
                    return result;
                } catch (error) {
                    this.errorCount++;
                    logger.log(2, `${type} INNER ERROR:`, error);

                    if (!this.isConnectivityError(error)) {
                        logError('Unrecoverable connection error: ' + error);
                        throw error;
                    }

                    await this.wait(1000);
                }
            }

            throw new Error('All RPC endpoints failed');
        }

        isConnectivityError(error) {
            const msg = error.message;
            return (
                Number(msg.slice(0, 3)) > 299 ||
                msg === 'Failed to fetch' ||
                msg.includes('failed to get') ||
                msg.includes('failed to send') ||
                msg.includes('NetworkError') ||
                msg.includes('Unable to complete request')
            );
        }

        wait(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        getStats() {
            return {
                readCount: this.readCount,
                writeCount: this.writeCount,
                errorCount: this.errorCount
            };
        }

        async localGetEpochInfo(fleet) {
            const cachedValueExpires = 15000, useBlockTime = 450;
            let curTimestamp = Date.now(), localBlockHeight = 0, loopCounter = 0;
            // if another async call is already requesting the current blocktime, we wait for the result, but max 2.5 seconds (= 20 * 125ms)//
            while (this.cachedEpochInfo.isUpdating && (curTimestamp - this.cachedEpochInfo.lastUpdated) > cachedValueExpires && loopCounter < 20) {
                await wait(125);
                loopCounter++;
                if (loopCounter >= 20 && this.cachedEpochInfo.isUpdating) logger.log(1, `${utils.FleetTimeStamp(fleet.label)} Concurrent read of block height took too long, forcing read`);
            }
            if ((curTimestamp - this.cachedEpochInfo.lastUpdated) > cachedValueExpires) {
                // We request the current block height. We use a try/catch block, so if something goes wrong, we can be sure that "isUpdating" is reset
                try {
                    this.cachedEpochInfo.isUpdating = true;
                    let {blockHeight: curBlockHeight} = await this.readConnection.getEpochInfo({commitment: 'confirmed'});
                    this.cachedEpochInfo.blockHeight = curBlockHeight;
                    this.cachedEpochInfo.lastUpdated = Date.now(); // we must use the current time (instead of the previously saved timestamp), because it is possible that several re-reads occured (it would then lead to a block height that's way too high). Also it is possible that the while loop from above took some time.
                    localBlockHeight = curBlockHeight;
                    logger.log(3, `${utils.FleetTimeStamp(fleet.label)} using requested block height of`, localBlockHeight);
                    this.cachedEpochInfo.isUpdating = false;
                } catch (error) {
                    // something went wrong, we reset "isUpdating" and use the cached value
                    localBlockHeight = this.cachedEpochInfo.blockHeight + Math.round((Date.now() - this.cachedEpochInfo.lastUpdated) / useBlockTime);
                    this.cachedEpochInfo.isUpdating = false;
                    logger.log(1, `${utils.FleetTimeStamp(fleet.label)} Uncaught error in localGetEpochInfo`, error);
                }
            } else {
                // We estimate the current block height and use the current timestamp for the calculation, because it is possible that the above while loop took some time. The average block time is 420ms, but just to be sure we use a little more (450ms), so a tx doesn't expire too early.
                localBlockHeight = this.cachedEpochInfo.blockHeight + Math.round((Date.now() - this.cachedEpochInfo.lastUpdated) / useBlockTime);
                logger.log(3, `${utils.FleetTimeStamp(fleet.label)} using estimated block height of`, localBlockHeight);
            }
            return localBlockHeight;
        }

        async sendAndConfirmTx(txSerialized, lastValidBlockHeight, txHash, fleet, opName) {
            let curBlockHeight = await this.localGetEpochInfo(fleet);
            let retryCount = 0;
            // loop until block height exceeded and give the RPC a little more time (20 blocks = ~8 seconds) to prevent race conditions (and take into account that the estimated block time can be slightly off). The loop doesn't need a wait time, because it is enforced by the signature queue (2 seconds)
            while (curBlockHeight <= lastValidBlockHeight + 20) {
                // we initially send the tx. Also we resend the tx every fourth loop (=~8 seconds), because: "With many transactions in the network queue, our initial send might get stuck behind a large backlog. While the blockhash is still valid, the transaction must still be seen and processed by validators. Continuously resending it can increase the chance that our transaction “bubbles up” to the front of processing queues.
                if ((retryCount % 4) === 0) {
                    txHash = await this.writeConnection.sendRawTransaction(txSerialized, {
                        skipPreflight: true,
                        maxRetries: 0,
                        preflightCommitment: 'confirmed'
                    });
                    logger.log(3, `${utils.FleetTimeStamp(fleet.label)} <${opName}>`, (retryCount > 0 ? 'TRYING 🌐 ' : '') + 'txHash', txHash, `/ last valid block`, lastValidBlockHeight, `/ cur block`, curBlockHeight);
                    if (!txHash) return {txHash, confirmation: {name: 'TransactionExpiredBlockheightExceededError'}};
                }
                try {
                    const signatureStatus = await this.requestSignatureStatus(txHash);
                    if (signatureStatus.value && ['confirmed', 'finalized'].includes(signatureStatus.value.confirmationStatus)) {
                        logger.log(3, `${utils.FleetTimeStamp(fleet.label)} <${opName}> SIGNATURE FOUND ✅`);
                        return {txHash, confirmation: signatureStatus};
                    } else if (signatureStatus.err) {
                        logger.log(3, `${utils.FleetTimeStamp(fleet.label)} <${opName}> Err`, signatureStatus.err);
                        return {txHash, confirmation: signatureStatus}
                    }
                } catch (err) {
                    logger.log(1, `${utils.FleetTimeStamp(fleet.label)} <${opName}> Signature exception:`, err);
                }
                curBlockHeight = await this.localGetEpochInfo(fleet); // todo: if for some reason the request of the block height takes a very long time (e.g. 20 seconds) and the block height is near the block limit, it is possible that the loop will exit without doing a final signature check.
                retryCount++;
            }
            return {txHash, confirmation: {name: 'TransactionExpiredBlockheightExceededError'}};
        }

        requestSignatureStatus(txHash) {
            return new Promise((resolve, reject) => {
                this.signatureStatusQueue.push({txHash, resolve, reject});
            });
        }

        async signatureStatusHandler() {
            const currentHashes = this.signatureStatusQueue.splice(0, this.signatureStatusQueue.length);//coco
            if (currentHashes.length > 0) {

                const txHashes = currentHashes.map(req => req.txHash);
                logger.log(3, `Requesting`, currentHashes.length, `signature statuses at once`);

                try {
                    const signatureStatuses = await this.readConnection.getSignatureStatuses(txHashes);
                    //logger.log(3,`Got signature results:`, signatureStatuses);
                    for (let i = 0; i < currentHashes.length; i++) {
                        const {resolve} = currentHashes[i];
                        const signatureStatus = {value: signatureStatuses.value[i]};
                        resolve(signatureStatus);
                    }
                } catch (error) {
                    // If something goes wrong, we reject each request. If a promise of the queue was already resolved in the "try" block, the reject does (correctly) nothing and won't throw an error
                    logger.logError('Error: Rejecting all signature checks - ' + error);
                    for (const req of currentHashes) {
                        req.reject(err);
                    }
                }
            }
            setTimeout(() => {
                this.signatureStatusHandler();
            }, Math.max(2000, this.confirmationCheckingDelay));
        }

    }


    return new RPCConnectionManager();
})({});

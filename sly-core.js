/* global solanaWeb3 */
/* global BrowserBuffer */
/* global cargoIDL */
/* global craftingIDL */
/* global pointsStoreIDL */
/* global pointsIDL */
/* global profileFactionIDL */
/* global profileIDL */
/* global sageIDL */
/* global BrowserAnchor */
var sly = (async function (exports) {


    'use strict';
    let globalSettings;
    const settingsGmKey = 'globalSettings';




    let customKeypair = null;

    //Program public keys

    const sageProgramPK = new solanaWeb3.PublicKey('SAGE2HAwep459SNq61LHvjxPk4pLPEJLoMETef7f7EE');
    const profileProgramPK = new solanaWeb3.PublicKey('pprofELXjL5Kck7Jn5hCpwAL82DpTkSYBENzahVtbc9');
    const cargoProgramPK = new solanaWeb3.PublicKey('Cargo2VNTPPTi9c1vq1Jw5d3BWUNr18MjRtSupAghKEk');
    const profileFactionProgramPK = new solanaWeb3.PublicKey('pFACSRuobDmvfMKq1bAzwj27t6d2GJhSCHb1VcfnRmq');
    const craftingProgramPK = new solanaWeb3.PublicKey('CRAFT2RPXPJWCEix4WpJST3E7NLf79GTqZUL75wngXo5');
    const pointsProgramId = new solanaWeb3.PublicKey('Point2iBvz7j5TMVef8nEgpmz4pDr7tU7v3RjAfkQbM');
    const pointsStoreProgramId = new solanaWeb3.PublicKey('PsToRxhEPScGt1Bxpm7zNDRzaMk31t8Aox7fyewoVse');
    const dataRunningXpCategory = new solanaWeb3.PublicKey('DataJpxFgHhzwu4zYJeHCnAv21YqWtanEBphNxXBHdEY');
    const councilRankXpCategory = new solanaWeb3.PublicKey('XPneyd1Wvoay3aAa24QiKyPjs8SUbZnGg5xvpKvTgN9'); //??
    const pilotingXpCategory = new solanaWeb3.PublicKey('PiLotBQoUBUvKxMrrQbuR3qDhqgwLJctWsXj3uR7fGs');
    const miningXpCategory = new solanaWeb3.PublicKey('MineMBxARiRdMh7s1wdStSK4Ns3YfnLjBfvF5ZCnzuw');
    const craftingXpCategory = new solanaWeb3.PublicKey('CraftndAV62acibnaW7TiwEYwu8MmJZBdyrfyN54nre7');
    const LPCategory = new solanaWeb3.PublicKey('LPkmmDQG8iBDAfKkWN6QadeoiLSvD1p3fGgq8m8QdMu');
    const addressLookupTableAddresses = [
        new solanaWeb3.PublicKey('AyC4m8fYEgR9mYcf6zzajevPjF8QhptY9Nae5LX6xgiu'),
        new solanaWeb3.PublicKey('F4jZvnU9fdi2mGp13TyewdAj96cKGUcwBBSMTsL1nRoC')
    ];
    //Token addresses
    const programAddy = 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';
    const tokenProgAddy = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
    //Commonly used public keys
    const programPK = new solanaWeb3.PublicKey(programAddy);
    const tokenProgramPK = new solanaWeb3.PublicKey(tokenProgAddy);
    let initComplete = false;
    
    let globalErrorTracker = {'firstErrorTime': 0, 'errorCount': 0};

    const anchorProvider = new BrowserAnchor.anchor.AnchorProvider(rpc.getReadConnection(), null, null);
    window.Buffer = BrowserBuffer.Buffer.Buffer;


    let influxLastStarbaseCargoHoldUpdates = [];

    async function influxStarbaseCargoHold(starbaseX, starbaseY, cargoHoldKeyOrTokens) {

        if (!globalSettings.influxURL.length) return;

        let cargoHoldTokens = null;

        let starbaseName = validTargets.find(target => (target.x + ',' + target.y) === (starbaseX + ',' + starbaseY))?.name;

        let lastUpdate = influxLastStarbaseCargoHoldUpdates.find(item => item.x === starbaseX && item.y === starbaseY);
        let lastUpdateTimestamp = 0;

        if (!lastUpdate) {
            lastUpdateTimestamp = 0;
            influxLastStarbaseCargoHoldUpdates.push({x: starbaseX, y: starbaseY, timestamp: Date.now()});
        } else {
            lastUpdateTimestamp = lastUpdate.timestamp;
        }

        if (lastUpdateTimestamp < Date.now() - 60 * 15 * 1000) { // log new data after 15 minutes

            if (lastUpdate) lastUpdate.timestamp = Date.now();

            if (cargoHoldKeyOrTokens.constructor === solanaWeb3.PublicKey) {
                // we got public key of the cargo hold and read the token accounts by ourselves
                cargoHoldTokens = await rpc.getReadConnection().getParsedTokenAccountsByOwner(cargoHoldKeyOrTokens, {programId: tokenProgramPK});
            } else {
                // we got an object, so we got the full token accounts
                cargoHoldTokens = cargoHoldKeyOrTokens;
            }

            let influxStr = '';
            let starbaseName = validTargets.find(target => (target.x + ',' + target.y) === starbaseX + ',' + starbaseY)?.name;

            let count = 0;
            for (let curToken of cargoHoldTokens.value) {
                let mint = curToken.account.data.parsed.info.mint;
                let rssName = cargoItems.find(r => r.token === mint)?.name;
                let amount = curToken.account.data.parsed.info.tokenAmount.uiAmount ? curToken.account.data.parsed.info.tokenAmount.uiAmount : 0;
                if (rssName) {
                    influxStr += (count ? "\n" : "") + `starbase,starbase=${influxEscape(starbaseName)},sectorX=${starbaseX},sectorY=${starbaseY},rss=${influxEscape(rssName)} curAmount=${amount}`;
                    count++;
                }
            }
            if (count) await sendToInflux(influxStr);
        }
    }

    let userPublicKey = null;
    let userProfileAcct = null;
    let userProfileKeyIdx = 0;
    let pointsProfileKeyIdx = 0;
    let userProfileFactionAcct = null;
    let userRedemptionConfigAcct = null;
    let userFleets = [];
    let userXpAccounts = {
        userCouncilRankXpAccounts: {},
        userDataRunningXpAccounts: {},
        userPilotingXpAccounts: {},
        userMiningXpAccounts: {},
        userCraftingXpAccounts: {},
        userLPAccounts: {},
    };
    let starbaseData = [];
    let planetData = [];
    let minableResourceData = null;
    let starbasePlayerData = [];
    let validTargets = [];


    let sageProgram = new BrowserAnchor.anchor.Program(sageIDL, sageProgramPK, anchorProvider);
    let profileProgram = new BrowserAnchor.anchor.Program(profileIDL, profileProgramPK, anchorProvider);
    let pointsProgram = new BrowserAnchor.anchor.Program(pointsIDL, pointsProgramId, anchorProvider);
    let pointsStoreProgram = new BrowserAnchor.anchor.Program(pointsStoreIDL, pointsStoreProgramId, anchorProvider);
    let craftingProgram = new BrowserAnchor.anchor.Program(craftingIDL, craftingProgramPK, anchorProvider);
    let cargoProgram = new BrowserAnchor.anchor.Program(cargoIDL, cargoProgramPK, anchorProvider);
    let [sageGameAcct] = await sageProgram.account.game.all();
    let cargoStatsDefinitionAcctPK = sageGameAcct.account.cargo.statsDefinition;


    //let [cargoStatsDefinitionAcct] = await cargoProgram.account.cargoStatsDefinition.all();
    let cargoStatsDefinitionAccts = await cargoProgram.account.cargoStatsDefinition.all();
    //we need to select the correct account:
    let cargoStatsDefinitionAcct = cargoStatsDefinitionAccts.find(item => item.publicKey.toString() === cargoStatsDefinitionAcctPK.toString());
    let cargoStatsDefSeqId = cargoStatsDefinitionAcct.account.seqId;
    let seqBN = new BrowserAnchor.anchor.BN(cargoStatsDefSeqId);
    let seqArr = seqBN.toTwos(64).toArrayLike(BrowserBuffer.Buffer.Buffer, "be", 2);
    let seq58 = bs58.encode(seqArr);
    let cargoItems = [];
    let craftableItems = [];
    let mineItems = [];
    let craftRecipes = [];
    let upgradeRecipes = [];
    let addressLookupTables = [];

    const cargoTypes = await cargoProgram.account.cargoType.all([
        {
            memcmp: {
                offset: 108,//75,
                bytes: seq58,
            },
        },
        {
            memcmp: {
                offset: 9,
                bytes: cargoStatsDefinitionAcct.publicKey.toBase58()
            }
        },
    ]);


    async function getCargoTypeSizes(cargoTypes) {
        let publicKeys = [];
        let cargoTypeSizes = [];
        for (let i = 0; i < cargoTypes.length; i++) {
            publicKeys.push(cargoTypes[i].publicKey);
        }
        // 100 is the max data size of getMultipleAccountsInfo
        for (let i = 0; i < publicKeys.length; i += 100) {
            let publicKeysSlice = publicKeys.slice(i, i + 100);
            let cargoTypeAccts = await rpc.getReadConnection().getMultipleAccountsInfo(publicKeysSlice);
            for (let j = 0; j < cargoTypeAccts.length; j++) {
                let cargoTypeDataExtra = cargoTypeAccts[j].data.subarray(110);
                let cargoTypeDataExtraBuff = BrowserBuffer.Buffer.Buffer.from(cargoTypeDataExtra);
                cargoTypeSizes[i + j] = cargoTypeDataExtraBuff.readUIntLE(0, 8);
            }
        }
        return cargoTypeSizes;
    }


    async function getResourceTokens() {
        mineItems = await sageProgram.account.mineItem.all();
        craftableItems = await craftingProgram.account.craftableItem.all();

        let cargoTypeSizes = await getCargoTypeSizes(cargoTypes);
        for (let resource of mineItems) {
            let cargoTypeIndex = cargoTypes.findIndex(item => item.account.mint.toString() === resource.account.mint.toString());
            let cargoName = (new TextDecoder().decode(new Uint8Array(resource.account.name)).replace(/\0/g, ''));
            let cargoSize = cargoTypeSizes[cargoTypeIndex];
            cargoItems.push({'name': cargoName, 'token': resource.account.mint.toString(), 'size': cargoSize});
        }
        for (let craftable of craftableItems) {
            let cargoTypeIndex = cargoTypes.findIndex(item => item.account.mint.toString() === craftable.account.mint.toString());
            let cargoName = (new TextDecoder().decode(new Uint8Array(craftable.account.namespace)).replace(/\0/g, ''));
            let cargoSize = cargoTypeSizes[cargoTypeIndex];
            cargoItems.push({'name': cargoName, 'token': craftable.account.mint.toString(), 'size': cargoSize});
        }
        cargoItems.sort(function (a, b) {
            return a.name.toUpperCase().localeCompare(b.name.toUpperCase());
        });
    }


    async function getCraftRecipes() {
        let craftingDomain = sageGameAcct.account.crafting.domain;
        //const allCraftCategories = await craftingProgram.account.recipeCategory.all();
        //we need to select the correct craftingDomain:
        const allCraftCategories = await craftingProgram.account.recipeCategory.all([
            {
                memcmp: {
                    offset: 9,
                    bytes: craftingDomain.toBase58(),
                },
            },

        ]);
        let upgradeCategory = allCraftCategories.find(item => (new TextDecoder().decode(new Uint8Array(item.account.namespace)).replace(/\0/g, '')) === 'Upgrade');

        let statusBN = new BrowserAnchor.anchor.BN(2);
        let statusArr = statusBN.toTwos(64).toArrayLike(BrowserBuffer.Buffer.Buffer, "be", 2);
        let status58 = bs58.encode(statusArr);
        const allCraftRecipes = await craftingProgram.account.recipe.all([
            {
                memcmp: {
                    offset: 152,
                    bytes: status58,
                },
            },
            //we only select the recipes for the correct crafting domain
            {
                memcmp: {
                    offset: 9,
                    bytes: craftingDomain.toBase58(),
                },
            },
        ]);

        let publicKeys = [];
        let recipeDatas = [];
        for (let i = 0; i < allCraftRecipes.length; i++) {
            publicKeys.push(allCraftRecipes[i].publicKey);
        }
        // 100 is the max data size of getMultipleAccountsInfo
        for (let i = 0; i < publicKeys.length; i += 100) {
            let publicKeysSlice = publicKeys.slice(i, i + 100);
            let recipeAcctInfos = await rpc.getReadConnection().getMultipleAccountsInfo(publicKeysSlice);
            for (let j = 0; j < recipeAcctInfos.length; j++) {
                recipeDatas[i + j] = recipeAcctInfos[j].data.subarray(223);
            }
        }

        let recipeIdx = 0;
        for (let craftRecipe of allCraftRecipes) {
            let recipeName = (new TextDecoder().decode(new Uint8Array(craftRecipe.account.namespace)).replace(/\0/g, ''));
            let recipeInputOutput = [];
            let recipeData = recipeDatas[recipeIdx];
            let recipeIter = 0;
            while (recipeData.length >= 40) {
                let currIngredient = recipeData.subarray(0, 40);
                let ingredientDecoded = craftingProgram.coder.types.decode('RecipeInputsOutputs', currIngredient);
                recipeInputOutput.push({
                    mint: ingredientDecoded.mint,
                    amount: ingredientDecoded.amount.toNumber(),
                    idx: recipeIter
                });
                recipeData = recipeData.subarray(40);
                recipeIter += 1;
            }
            if (craftRecipe.account.category.toString() === upgradeCategory.publicKey.toString()) {
                upgradeRecipes.push({
                    'name': recipeName,
                    'publicKey': craftRecipe.publicKey,
                    'category': craftRecipe.account.category,
                    'domain': craftRecipe.account.domain,
                    'feeRecipient': craftRecipe.account.feeRecipient.key,
                    'duration': craftRecipe.account.duration.toNumber(),
                    'input': recipeInputOutput,
                    'output': []
                });
            } else {
                craftRecipes.push({
                    'name': recipeName,
                    'publicKey': craftRecipe.publicKey,
                    'category': craftRecipe.account.category,
                    'domain': craftRecipe.account.domain,
                    'feeAmount': craftRecipe.account.feeAmount.toNumber() / 100000000,
                    'feeRecipient': craftRecipe.account.feeRecipient.key,
                    'duration': craftRecipe.account.duration.toNumber(),
                    'input': recipeInputOutput.slice(0, -1),
                    'output': recipeInputOutput.slice(-1)[0]
                });
            }
            recipeIdx++;
        }
        upgradeRecipes.sort(function (a, b) {
            return a.name.toUpperCase().localeCompare(b.name.toUpperCase());
        });
        craftRecipes.sort(function (a, b) {
            return a.name.toUpperCase().localeCompare(b.name.toUpperCase());
        });
    }

    function createPDA(derived, derivedFrom1, derivedFrom2, fleet, send = true) {
        return new Promise(async resolve => {
            const keys = [{
                pubkey: userPublicKey,
                isSigner: true,
                isWritable: true
            }, {
                pubkey: derived,
                isSigner: false,
                isWritable: true
            }, {
                pubkey: derivedFrom1,
                isSigner: false,
                isWritable: false
            }, {
                pubkey: derivedFrom2,
                isSigner: false,
                isWritable: false
            }, {
                pubkey: solanaWeb3.SystemProgram.programId,
                isSigner: false,
                isWritable: false
            }, {
                pubkey: tokenProgramPK,
                isSigner: false,
                isWritable: false
            }];
            let tx = {
                instruction: new solanaWeb3.TransactionInstruction({
                    keys: keys,
                    programId: programPK,
                    //data: []
                })
            }
            let txResult = tx
            if (send) txResult = await txSignAndSend(tx, fleet, 'CreatePDA', 100);
            resolve(txResult);
        });
    }


    async function assistProfileToggle(profiles) {
        return new Promise(async resolve => {
            let targetElem = document.querySelector('#profileModal');
            let contentElem = document.querySelector('#profileDiv');

            if (targetElem.style.display === 'none' && profiles) {
                targetElem.style.display = 'block';
                contentElem.innerHTML = ''; // Nettoyer le contenu précédent

                let transportOptStr = '';
                profiles.forEach(function (profile) {
                    transportOptStr += `<option value="${profile.profile}">${profile.name} [${profile.profile.substring(0, 4)}...]</option>`;
                });

                let profileSelect = document.createElement('select');
                profileSelect.id = 'profileSelect';
                profileSelect.size = profiles.length > 5 ? 6 : profiles.length + 1; // Limiter la taille pour un meilleur affichage
                profileSelect.innerHTML = transportOptStr;
                contentElem.append(profileSelect);

                profileSelect.onchange = function () {
                    const selected = profiles.find(o => o.profile === profileSelect.value);
                    assistProfileToggle(null);
                    resolve(selected);
                };
            } else {
                targetElem.style.display = 'none';
                resolve(null);
            }
        });
    }



    async function loadGlobalSettings() {
        const rawSettingsData = await GM.getValue(settingsGmKey, '{}');
        globalSettings = JSON.parse(rawSettingsData);
        globalSettings = {
            // Priority Fee added to each transaction in Lamports. Set to 0 (zero) to disable priority fees. 1 Lamport = 0.000000001 SOL
            priorityFee: utils.parseIntDefault(globalSettings.priorityFee, 1),
            minPriorityFeeForMultiIx: utils.parseIntDefault(globalSettings.minPriorityFeeForMultiIx, 0),

            //autofee
            automaticFee: utils.parseBoolDefault(globalSettings.automaticFee, false),
            automaticFeeStep: utils.parseIntDefault(globalSettings.automaticFeeStep, 80),
            automaticFeeMin: utils.parseIntDefault(globalSettings.automaticFeeMin, 1),
            automaticFeeMax: utils.parseIntDefault(globalSettings.automaticFeeMax, 10000),
            automaticFeeTimeMin: utils.parseIntDefault(globalSettings.automaticFeeTimeMin, 10),
            automaticFeeTimeMax: utils.parseIntDefault(globalSettings.automaticFeeTimeMax, 70),

            craftingTxMultiplier: utils.parseIntDefault(globalSettings.craftingTxMultiplier, 200),
            craftingTxAffectsAutoFee: utils.parseBoolDefault(globalSettings.craftingTxAffectsAutoFee, true),

            transportKeep1: true,
            transportLoadUnloadSingleTx: true,
            transportUnloadsUnknownRSS: utils.parseBoolDefault(globalSettings.transportUnloadsUnknownRSS, false),
            minerUnloadsAll: false,
            minerSupplySingleTx: true,
            minerKeep1: true,
            starbaseKeep1: false,
            queueExitWarpSubwarp: true,

            emailInterface: utils.parseStringDefault(globalSettings.emailInterface, ''),

            influxURL: utils.parseStringDefault(globalSettings.influxURL, ''),
            influxAuth: utils.parseStringDefault(globalSettings.influxAuth, ''),


            emailFleetIxErrors: false,
            emailCraftIxErrors: false,
            emailNoCargoLoaded: false,
            emailNotEnoughFFA: false,

            fleetsPerColumn: utils.parseIntDefault(globalSettings.fleetsPerColumn, 0),


            //Save profile selection to speed up future initialization
            saveProfile: utils.parseBoolDefault(globalSettings.saveProfile, true),
            savedProfile: globalSettings.savedProfile && globalSettings.savedProfile.length > 0 ? globalSettings.savedProfile : [],

            //How many milliseconds to wait before re-reading the chain for confirmation
            confirmationCheckingDelay: utils.parseIntDefault(globalSettings.confirmationCheckingDelay, 2000),

            //How much console logging you want to see (higher number = more, 0 = none)
            debugLogLevel: 2,

            //The number of crafting jobs enabled in config
            craftingJobs: utils.parseIntDefault(globalSettings.craftingJobs, 4),

            //Subwarp when the distance is 1 diagonal sector or less
            subwarpShortDist: utils.parseBoolDefault(globalSettings.subwarpShortDist, true),

            //Determines if your transports should use their ammo banks to move ammo (in addition to their cargo holds)
            transportUseAmmoBank: utils.parseBoolDefault(globalSettings.transportUseAmmoBank, true),

            //Should transport fleet stop completely if there's an error (example: not enough resource/fuel/etc.)
            transportStopOnError: utils.parseBoolDefault(globalSettings.transportStopOnError, true),

            //If refueling at the source, should transport fleets fill fuel to 100%?
            transportFuel100: utils.parseBoolDefault(globalSettings.transportFuel100, true),

            //Should fleets always load the full ordered amount of consumables needed for operation (fuel, ammo, food)? (otherwise fractions are allowed, but a fleet may do an additional loop until it realizes there is not enough of the rss available)
            fleetForceConsumableAmount: utils.parseBoolDefault(globalSettings.fleetForceConsumableAmount, true),


            //List of fleets that are handled manually or in another instance (they are excluded here)
            excludeFleets: utils.parseStringDefault(globalSettings.excludeFleets, ''),

            //How transparent the status panel should be (1 = completely opaque)
            statusPanelOpacity: utils.parseIntDefault(globalSettings.statusPanelOpacity, 75),

            //Should assistant automatically start after initialization is complete?
            autoStartScript: utils.parseBoolDefault(globalSettings.autoStartScript, false),

            //How many fleets need to stall before triggering an automatic page reload? (0 = never trigger)
            reloadPageOnFailedFleets: utils.parseIntDefault(globalSettings.reloadPageOnFailedFleets, 0),

            //Custom secret key (replaces Solflare/Phantom signing)
            mySecretKey: utils.parseStringDefault(globalSettings.mySecretKey, ''),
        }

        logger.log(2, 'SYSTEM: Global Settings loaded', globalSettings);
    }

    async function getAllStarbasesForFaction(faction) {
        return new Promise(async resolve => {

            logger.log(1, 'Reading faction starbases');
            let starbases = await sageProgram.account.starbase.all([
                {
                    memcmp: {
                        offset: 201,
                        bytes: [faction]
                    }
                }
            ]);
            logger.log(1, starbases.length, 'read');

            logger.log(1, 'Reading all planets');
            let planets = await sageProgram.account.planet.all([]);
            logger.log(1, planets.length, 'read');

            // first we group all planets of the same sector:
            let planetSectors = [];
            planets.forEach((planet) => {
                let label = (new TextDecoder("utf-8").decode(new Uint8Array(planet.account.name))).replace(/\0/g, '');
                let x = planet.account.sector[0].toNumber();
                let y = planet.account.sector[1].toNumber();
                if (typeof planetSectors[x] == 'undefined') {
                    planetSectors[x] = [];
                }
                if (typeof planetSectors[x][y] == 'undefined') {
                    planetSectors[x][y] = [];
                }
                planetSectors[x][y].push(planet);
            });

            // now we find out the system names by looking at the planet names
            let validMainTargets = [];
            let validMRZTargets = [];
            starbases.forEach((starbase) => {
                let x = starbase.account.sector[0].toNumber();
                let y = starbase.account.sector[1].toNumber();
                let planets = planetSectors[x][y];
                let name = (new TextDecoder("utf-8").decode(new Uint8Array(planets[0].account.name))).replace(/\0/g, '').split('-');
                let systemName = name[0] + '-' + name[1];
                if (name[0] == 'MRZ') {
                    validMRZTargets.push({x, y, name: systemName});
                } else {
                    validMainTargets.push({x, y, name: systemName});
                }
                planetData.push({coords: [x, y], lastUpdated: Date.now(), planets: planets});
                starbaseData.push({coords: [x, y], lastUpdated: Date.now(), starbase: starbase});
            });
            validMainTargets.sort((a, b) => {
                if (a.name < b.name) {
                    return -1;
                }
                if (a.name > b.name) {
                    return 1;
                }
                return 0;
            });
            //validMainTargets[0].name = (validMainTargets[0].name.includes('-1') ? validMainTargets[0].name.replace('-1','-CSS') : validMainTargets[0].name);
            validMRZTargets.sort((a, b) => {
                if (a.name < b.name) {
                    return -1;
                }
                if (a.name > b.name) {
                    return 1;
                }
                return 0;
            });
            validTargets = validMainTargets.concat(validMRZTargets);

            logger.log(4, 'validTargets:', validTargets);

            resolve();
        });
    }

    function buildXpAccounts(xpCategory, userXpAccounts, userXpAccountGroup) {
        return new Promise(async resolve => {
            let [userXpAccount] = await BrowserAnchor.anchor.web3.PublicKey.findProgramAddressSync(
                [
                    BrowserBuffer.Buffer.Buffer.from("UserPointsAccount"),
                    xpCategory.toBuffer(),
                    userProfileAcct.toBuffer()
                ],
                pointsProgramId
            );
            let sageGamePointsCategory = Object.values(sageGameAcct.account.points).find(item => item.category.toString() == xpCategory.toString());
            userXpAccounts[userXpAccountGroup] = {
                userPointsAccount: userXpAccount,
                pointsCategory: xpCategory,
                pointsModifierAccount: sageGamePointsCategory.modifier
            }

            resolve(userXpAccounts[userXpAccountGroup]);
        });
    }

    async function getALTs() {
        for (let lookupTableAddress of addressLookupTableAddresses) {
            let lookupTableAccount = await rpc.getReadConnection().getAddressLookupTable(lookupTableAddress);
            addressLookupTables.push(lookupTableAccount.value);
        }
    }

    console.log("Load global settings");
    await loadGlobalSettings();



    logger.log(4, "Load resources");
    await getResourceTokens();
    logger.log(4, "Load recipes");
    await getCraftRecipes();
    logger.log(4, "Load ALTs");
    await getALTs();

    let fuelItem = cargoItems.find(item => item.token === sageGameAcct.account.mints.fuel.toString());
    let foodItem = cargoItems.find(item => item.token === sageGameAcct.account.mints.food.toString());
    let toolItem = cargoItems.find(item => item.token === sageGameAcct.account.mints.repairKit.toString());
    let ammoItem = cargoItems.find(item => item.token === sageGameAcct.account.mints.ammo.toString());

    let [progressionConfigAcct] = await BrowserAnchor.anchor.web3.PublicKey.findProgramAddressSync(
        [
            BrowserBuffer.Buffer.Buffer.from("ProgressionConfig"),
            sageGameAcct.publicKey.toBuffer()
        ],
        sageProgramPK
    );

    let currentFee = globalSettings.priorityFee; //autofee

    async function getAccountInfo(fleetName, reason, params) {
        logger.log(3, `${utils.FleetTimeStamp(fleetName)} get ${reason}`);
        return await rpc.getReadConnection().getAccountInfo(params);
    }

    function getFleetState(fleetAcctInfo, fleet) {
        let remainingData = fleetAcctInfo.data.subarray(439);
        let fleetState = 'Unknown';
        let extra = null;

        if (fleet && fleet.exitWarpSubwarpPending) {
            let sector = null;
            if (fleet.exitWarpSubwarpPending == 1) sector = sageProgram.coder.types.decode('MoveWarp', remainingData.subarray(1));
            if (fleet.exitWarpSubwarpPending == 2) sector = sageProgram.coder.types.decode('MoveSubwarp', remainingData.subarray(1));
            if (sector.toSector) { // only continue if there is a target sector. Otherwise we will assume a RPC mismatch and reset the pending state (after waiting some time to be sure)
                fleetState = 'Idle';
                if (fleet.exitWarpSubwarpPending == 2) {
                    fleet.exitSubwarpWillBurnFuel = sector.fuelExpenditure.toNumber();
                }
                extra = [sector.toSector[0].toNumber(), sector.toSector[1].toNumber()];
                return [fleetState, extra];
            } else {
                logger.log(1, `${utils.FleetTimeStamp(fleet.label)} Exit warp/subwarp was pending, but no target sector found, resetting pending state`);
                logger.logError('Exit warp/subwarp was pending, but no target sector found, resetting pending state', fleet.label);
                fleet.exitWarpSubwarpPending = 0;
            }
        }

        switch (remainingData[0]) {
            case 0:
                fleetState = 'StarbaseLoadingBay';
                extra = sageProgram.coder.types.decode('StarbaseLoadingBay', remainingData.subarray(1));
                break;
            case 1: {
                fleetState = 'Idle';
                let sector = sageProgram.coder.types.decode('Idle', remainingData.subarray(1));
                extra = [sector.sector[0].toNumber(), sector.sector[1].toNumber()]
                break;
            }
            case 2:
                fleetState = 'MineAsteroid';
                extra = sageProgram.coder.types.decode('MineAsteroid', remainingData.subarray(1));
                break;
            case 3:
                fleetState = 'MoveWarp';
                extra = sageProgram.coder.types.decode('MoveWarp', remainingData.subarray(1));
                break;
            case 4:
                fleetState = 'MoveSubwarp';
                extra = sageProgram.coder.types.decode('MoveSubwarp', remainingData.subarray(1));
                break;
            case 5:
                fleetState = 'Respawn';
                break;
            case 6:
                fleetState = "StarbaseUpgrade";
                break;
            case 7:
                fleetState = "ReadyToExitWarp";
                break;
        }
        return [fleetState, extra];
    }

    function getBalanceChange(txResult, targetAcct) {
        let acctIdx = txResult.transaction.message.staticAccountKeys.findIndex(item => item.toString() === targetAcct);
        let preBalanceObj = txResult.meta.preTokenBalances.find(item => item.accountIndex === acctIdx);
        let preBalance = preBalanceObj && preBalanceObj.uiTokenAmount && preBalanceObj.uiTokenAmount.uiAmount ? preBalanceObj.uiTokenAmount.uiAmount : 0;
        let postBalanceObj = txResult.meta.postTokenBalances.find(item => item.accountIndex === acctIdx);
        let postBalance = postBalanceObj && postBalanceObj.uiTokenAmount && postBalanceObj.uiTokenAmount.uiAmount ? postBalanceObj.uiTokenAmount.uiAmount : 0;
        return {preBalance: preBalance, postBalance: postBalance}
    }

    function calculateMovementDistance(orig, dest) {
        return dest ? Math.sqrt((orig[0] - dest[0]) ** 2 + (orig[1] - dest[1]) ** 2) : 0
    }

    function calculateWarpTime(fleet, distance) {
        return fleet.warpSpeed > 0 ? distance / (fleet.warpSpeed / 1e6) : 0
    }

    function calcNextWarpPoint(warpRange, startCoords, endCoords) {
        const [startX, startY] = [Number(startCoords[0]), Number(startCoords[1])];
        const [endX, endY] = [Number(endCoords[0]), Number(endCoords[1])];
        const moveDist = calculateMovementDistance([startX, startY], [endX, endY]);
        const realWarpRange = warpRange / 100;
        const warpCount = realWarpRange > 0 ? moveDist / realWarpRange : 1;

        if (warpCount <= 1) return endCoords; // In range for single jump?

        // Calculate raw distance
        let slope = Math.abs(endX - startX) > 0 ? Math.abs((endY - startY) / (endX - startX)) : Math.abs((endY - startY));
        let dx = realWarpRange / Math.sqrt(slope ** 2 + 1);
        let dy = dx * slope;

        // Calculate the middle point destination
        let intX = startX > endX ? startX - parseInt(dx) : startX + parseInt(dx);
        let intY = startY > endY ? startY - parseInt(dy) : startY + parseInt(dy);
        let potentialCoords = [[intX, intY], [intX - 1, intY - 1], [intX - 1, intY], [intX - 1, intY + 1], [intX, intY - 1], [intX, intY + 1], [intX + 1, intY - 1], [intX + 1, intY], [intX + 1, intY + 1]];

        // Determine the optimal route based on total jumps and total distance
        let bestCoords = potentialCoords.reduce((best, val) => {
            let remainingDistOld = Math.sqrt((best[0] - endX) ** 2 + (best[1] - endY) ** 2);
            let remainingDistNew = Math.sqrt((val[0] - endX) ** 2 + (val[1] - endY) ** 2);
            let travelDistOld = Math.sqrt((startX - best[0]) ** 2 + (startY - best[1]) ** 2);
            let travelDistNew = Math.sqrt((startX - val[0]) ** 2 + (startY - val[1]) ** 2);
            if (globalSettings.subwarpShortDist && remainingDistOld > 0 && remainingDistNew < remainingDistOld && remainingDistNew < 1.5 && travelDistNew <= realWarpRange) {
                return val;
            } else if (globalSettings.subwarpShortDist && remainingDistOld < 1.5 && remainingDistNew >= 1.5) {
                return best;
            } else if (remainingDistNew <= realWarpRange && travelDistNew <= realWarpRange && remainingDistNew + travelDistNew < remainingDistOld + travelDistOld) {
                return val;
            } else if (remainingDistNew <= realWarpRange && travelDistNew <= realWarpRange && remainingDistOld > realWarpRange) {
                return val;
            } else if (remainingDistNew > realWarpRange && travelDistNew <= realWarpRange && remainingDistNew < remainingDistOld) {
                return val;
            } else if (travelDistOld <= realWarpRange) {
                return best;
            }
        });

        //Calculate and return waypoint coordinates
        return bestCoords;
    }

    function calcWarpFuelReq(fleet, startCoords, endCoords, warpSubwarp) {
        if (!utils.CoordsValid(startCoords) || !utils.CoordsValid(endCoords)) {
            logger.log(4, `${utils.FleetTimeStamp(fleet.label)} calcWarpFuelReq: Bad coords`, startCoords, endCoords);
            return 0;
        }
        if (utils.CoordsEqual(startCoords, endCoords)) {
            logger.log(4, `${utils.FleetTimeStamp(fleet.label)} calcWarpFuelReq: Same coords`, startCoords, endCoords);
            return 0;
        }

        const [startX, startY] = [Number(startCoords[0]), Number(startCoords[1])];

        let jumps = 0;
        let fuelRequired = 0;
        let curWP = [startX, startY];

        while (!utils.CoordsEqual(curWP, endCoords)) {
            const nextWP = calcNextWarpPoint(fleet.maxWarpDistance, curWP, endCoords);
            const distance = calculateMovementDistance(curWP, nextWP);
            fuelRequired += Math.ceil(distance * (fleet.warpFuelConsumptionRate / 100));
            curWP = nextWP;
            jumps++;
            if (warpSubwarp) {
                const distToTarget = calculateMovementDistance(curWP, endCoords);
                fuelRequired += calculateSubwarpFuelBurn(fleet, distToTarget);
                break;
            }
        }


        //logger.log(4, `${utils.FleetTimeStamp(fleet.label)} calcWarpFuelReq: ${fuelRequired} fuel over ${jumps} jumps`);
        return fuelRequired;
    }

    function calculateSubwarpTime(fleet, distance) {
        return fleet.subwarpSpeed > 0 ? distance / (fleet.subwarpSpeed / 1e6) : 0
    }

    function calculateSubwarpFuelBurn(fleet, distance) {
        return distance * (fleet.subwarpFuelConsumptionRate / 100)
    }

    function calculateMiningDuration(cargoCapacity, miningRate, resourceHardness, systemRichness) {
        return resourceHardness > 0 ? Math.ceil(cargoCapacity / (((miningRate / 10000) * (systemRichness / 100)) / (resourceHardness / 100))) : 0;
    }

    async function getSectorFromCoords(x, y) {
        return new Promise(async resolve => {
            let xBN = new BrowserAnchor.anchor.BN(x);
            let xArr = xBN.toTwos(64).toArrayLike(BrowserBuffer.Buffer.Buffer, "le", 8);
            let yBN = new BrowserAnchor.anchor.BN(y);
            let yArr = yBN.toTwos(64).toArrayLike(BrowserBuffer.Buffer.Buffer, "le", 8);
            let [sector] = await BrowserAnchor.anchor.web3.PublicKey.findProgramAddressSync(
                [
                    BrowserBuffer.Buffer.Buffer.from("Sector"),
                    sageGameAcct.publicKey.toBuffer(),
                    xArr,
                    yArr
                ],
                sageProgramPK
            );
            resolve(sector);
        });
    }

    async function getStarbaseFromCoords(x, y, getLive = false) {
        return new Promise(async resolve => {
            let xBN = new BrowserAnchor.anchor.BN(x);
            let xArr = xBN.toTwos(64).toArrayLike(BrowserBuffer.Buffer.Buffer, "le", 8);
            let x58 = bs58.encode(xArr);
            let yBN = new BrowserAnchor.anchor.BN(y);
            let yArr = yBN.toTwos(64).toArrayLike(BrowserBuffer.Buffer.Buffer, "le", 8);
            let y58 = bs58.encode(yArr);

            let cachedStarbase = starbaseData.find(item => item.coords[0] == x && item.coords[1] == y);
            let starbase = cachedStarbase && cachedStarbase.starbase;
            let needUpdate = cachedStarbase && Date.now() - cachedStarbase.lastUpdated > 1000 * 60 * 60 * 24 ? true : false;

            if (!starbase || needUpdate || getLive) {
                [starbase] = await sageProgram.account.starbase.all([
                    {
                        memcmp: {
                            offset: 41,
                            bytes: x58
                        }
                    },
                    {
                        memcmp: {
                            offset: 49,
                            bytes: y58
                        }
                    },
                ]);
                //race-condition fixed: because of the previous "await", it is possible that we end up with two concurrent reads and two identical cache entries. So we need to make sure that an existing entry is always overwritten
                //also when expired entry is read again and just pushed to the array, find() will still find the expired first entry and not the updated one. This would lead to a broken cache. So again we need to overwrite the existing entry.
                let cachedStarbaseIdx = starbaseData.findIndex(item => item.coords[0] == x && item.coords[1] == y);
                if (cachedStarbaseIdx >= 0) {
                    starbaseData[cachedStarbaseIdx].lastUpdated = Date.now();
                    starbaseData[cachedStarbaseIdx].starbase = starbase;
                } else {
                    starbaseData.push({coords: [x, y], lastUpdated: Date.now(), starbase: starbase});
                }
            }

            resolve(starbase);
        });
    }

    async function getPlanetsFromCoords(x, y) {
        return new Promise(async resolve => {
            let xBN = new BrowserAnchor.anchor.BN(x);
            let xArr = xBN.toTwos(64).toArrayLike(BrowserBuffer.Buffer.Buffer, "le", 8);
            let x58 = bs58.encode(xArr);
            let yBN = new BrowserAnchor.anchor.BN(y);
            let yArr = yBN.toTwos(64).toArrayLike(BrowserBuffer.Buffer.Buffer, "le", 8);
            let y58 = bs58.encode(yArr);

            let cachedPlanet = planetData.find(item => item.coords[0] == x && item.coords[1] == y);
            let planets = cachedPlanet && cachedPlanet.planets;
            let needUpdate = cachedPlanet && Date.now() - cachedPlanet.lastUpdated > 1000 * 60 * 60 * 24 ? true : false;

            if (!planets || needUpdate) {
                planets = await sageProgram.account.planet.all([
                    {
                        memcmp: {
                            offset: 105,
                            bytes: x58
                        }
                    },
                    {
                        memcmp: {
                            offset: 113,
                            bytes: y58
                        }
                    },
                ]);
                //race-condition fixed: because of the previous "await", it is possible that we end up with two concurrent reads and two identical cache entries. So we need to make sure that an existing entry is always overwritten
                //also when expired entry is read again and just pushed to the array, find() will still find the expired first entry and not the updated one. This would lead to a broken cache. So again we need to overwrite the existing entry.
                let cachedPlanetIdx = planetData.findIndex(item => item.coords[0] == x && item.coords[1] == y);
                if (cachedPlanetIdx >= 0) {
                    planetData[cachedPlanetIdx].lastUpdated = Date.now();
                    planetData[cachedPlanetIdx].planets = planets;
                } else {
                    planetData.push({coords: [x, y], lastUpdated: Date.now(), planets: planets});
                }
            }

            resolve(planets);
        });
    }

    async function getMineableResourceFromPlanet(planet, mineItem) {
        let needUpdate = minableResourceData && minableResourceData.lastUpdated && Date.now() - minableResourceData.lastUpdated < 1000 * 60 * 60 * 24 ? false : true;

        if (needUpdate) {
            let mineableResources = await sageProgram.account.resource.all();
            minableResourceData = {lastUpdated: Date.now(), mineableResources: mineableResources};
        }

        let mineableResource = minableResourceData.mineableResources.find(item => item.account.location.toString() === planet && item.account.mineItem.toString() === mineItem);

        return mineableResource;
    }

    async function getStarbasePlayer(userProfile, starbase) {
        return new Promise(async resolve => {
            //starbasePlayerData
            let cachedStarbasePlayer = starbasePlayerData.find(item => item.userProfile == userProfile.toBase58() && item.starbase == starbase.toBase58());
            let starbasePlayer = cachedStarbasePlayer && cachedStarbasePlayer.starbasePlayer;
            let needUpdate = cachedStarbasePlayer && Date.now() - cachedStarbasePlayer.lastUpdated > 1000 * 60 * 60 * 24 ? true : false;

            if (!starbasePlayer || needUpdate) {
                [starbasePlayer] = await sageProgram.account.starbasePlayer.all([
                    {
                        memcmp: {
                            offset: 9,
                            bytes: userProfile.toBase58()
                        }
                    },
                    {
                        memcmp: {
                            offset: 73,
                            bytes: starbase.toBase58()
                        }
                    },
                ]);
                //race-condition fixed: because of the previous "await", it is possible that we end up with two concurrent reads and two identical cache entries. So we need to make sure that an existing entry is always overwritten
                //also when expired entry is read again and just pushed to the array, find() will still find the expired first entry and not the updated one. This would lead to a broken cache. So again we need to overwrite the existing entry.
                let cachedStarbasePlayerDataIdx = starbasePlayerData.findIndex(item => item.userProfile == userProfile.toBase58() && item.starbase == starbase.toBase58());
                if (cachedStarbasePlayerDataIdx >= 0) {
                    starbasePlayerData[cachedStarbasePlayerDataIdx].lastUpdated = Date.now();
                    starbasePlayerData[cachedStarbasePlayerDataIdx].starbasePlayer = starbasePlayer;
                } else {
                    starbasePlayerData.push({
                        userProfile: userProfile.toBase58(),
                        starbase: starbase.toBase58(),
                        lastUpdated: Date.now(),
                        starbasePlayer: starbasePlayer
                    });
                }
            }

            resolve(starbasePlayer);
        });
    }

    async function getUserRedemptionAccount() {
        let currentDayIndex = Math.floor(Date.now() / 86400000);
        let currentDayIdxBN = new BrowserAnchor.anchor.BN(currentDayIndex);
        let currentDayIdxArr = currentDayIdxBN.toTwos(64).toArrayLike(BrowserBuffer.Buffer.Buffer, "le", 2);
        let currentDayIdx58 = bs58.encode(currentDayIdxArr);

        let [userRedemption] = await pointsStoreProgram.account.userRedemption.all([
            {
                memcmp: {
                    offset: 9,
                    bytes: userProfileAcct.toBase58(),
                },
            },
            {
                memcmp: {
                    offset: 145,
                    bytes: currentDayIdx58,
                },
            },
        ]);

        return userRedemption ? userRedemption.publicKey : false;
    }


    async function getFleetFuelToken(fleet) {
        const [token] = await BrowserAnchor.anchor.web3.PublicKey.findProgramAddressSync(
            [
                fleet.fuelTank.toBuffer(),
                tokenProgramPK.toBuffer(),
                new solanaWeb3.PublicKey(fuelItem.token).toBuffer()
            ],
            programPK
        );

        return token;
    }

    async function getFleetAmmoToken(fleet) {
        const [token] = await BrowserAnchor.anchor.web3.PublicKey.findProgramAddressSync(
            [
                fleet.ammoBank.toBuffer(),
                tokenProgramPK.toBuffer(),
                sageGameAcct.account.mints.ammo.toBuffer()
            ],
            programPK
        );

        return token;
    }

    setTimeout(() => {
        rpc.signatureStatusHandler();//
    }, Math.max(2000, globalSettings.confirmationCheckingDelay));




    function txSignAndSend(ix, fleet, opName, priorityFeeMultiplier, extraSigner = false) {
        return new Promise(async resolve => {
            const fleetName = fleet ? fleet.label : 'unknown';
            let macroOpStart = Date.now();
            if (!priorityFeeMultiplier) priorityFeeMultiplier = 10; // globalSettings.lowPriorityFeeMultiplier;
            priorityFeeMultiplier = priorityFeeMultiplier / 100;

            let priorityFeeMin = 1;
            if (ix.constructor === Array) priorityFeeMin = Math.max(1, Math.min(globalSettings.minPriorityFeeForMultiIx, 50000) * 5);

            if (fleet.exitWarpSubwarpPending) {
                let exitWarpSubwarpTx = null;
                if (fleet.exitWarpSubwarpPending === 1) exitWarpSubwarpTx = await execExitWarp(fleet, true);
                else exitWarpSubwarpTx = await execExitSubwarp(fleet, true);
                if (ix.constructor === Array) {
                    ix = [exitWarpSubwarpTx].concat(ix);
                } else {
                    ix = [exitWarpSubwarpTx, ix];
                }
                fleet.exitWarpSubwarpPending = 0;
                fleet.exitSubwarpWillBurnFuel = 0;
            }

            let confirmed = false;
            while (!confirmed) {
                //the fee is applied to the default compute limit and it is in microLamports. The default compute limit is 200k and microLamports to Lamports is 1M, therefore: 1M / 200k = we need to multiply by 5
                //const priorityFee = currentFee ? Math.max(1, Math.ceil(priorityFeeMultiplier * currentFee * 5)) : 0;
                const priorityFee = currentFee ? Math.max(priorityFeeMin, Math.ceil(priorityFeeMultiplier * currentFee * 5)) : 0;

                logger.log(4, `${utils.FleetTimeStamp(fleetName)} <${opName}> 💳 Fee ${Math.ceil(priorityFee / 5)} lamp`);

                let instructions = [];
                if (priorityFee > 0) instructions.push(solanaWeb3.ComputeBudgetProgram.setComputeUnitPrice({microLamports: priorityFee}));
                if (ix.constructor === Array) {
                    ix.forEach(item => instructions.push(item.instruction))
                } else {
                    instructions.push(ix.instruction);
                }
                let latestBH = await rpc.getReadConnection().getLatestBlockhash('confirmed');
                let messageV0 = new solanaWeb3.TransactionMessage({
                    payerKey: userPublicKey,
                    recentBlockhash: latestBH.blockhash,
                    instructions,
                }).compileToV0Message(addressLookupTables);
                let tx = new solanaWeb3.VersionedTransaction(messageV0);
                if (extraSigner) tx.sign([extraSigner]);
                let txSigned = null;
                logger.log(4, `${utils.FleetTimeStamp(fleetName)} <${opName}> tx: `, tx);

                const signStart = Date.now();

                try {
                    if (customKeypair) {
                        tx.sign([customKeypair]);
                        txSigned = [tx];
                    } else if (typeof solflare === 'undefined') {
                        txSigned = phantom && phantom.solana ? await phantom.solana.signAllTransactions([tx]) : solana.signAllTransactions([tx]);
                    } else {
                        txSigned = await solflare.signAllTransactions([tx]);
                    }
                } catch (error1) {
                    /* Catch the very rare "Could not establish connection. Receiving end does not exist" error from Solflare and just try it again: */
                    logger.log(2, `${utils.FleetTimeStamp(fleetName)} <${opName}> Wallet extension error`, error1);
                    await utils.wait(1000);
                    if (customKeypair) {
                        tx.sign([customKeypair]);
                        txSigned = [tx];
                    } else if (typeof solflare === 'undefined') {
                        txSigned = phantom && phantom.solana ? await phantom.solana.signAllTransactions([tx]) : solana.signAllTransactions([tx]);
                    } else {
                        txSigned = await solflare.signAllTransactions([tx]);
                    }
                }

                const signMsTaken = Date.now() - signStart;
                if (signMsTaken > 2000) logger.log(2, `${utils.FleetTimeStamp(fleetName)} <${opName}> WARNING: Signing of tx took`, signMsTaken, `milliseconds`);
                //document.getElementById('assist-modal-time').innerHTML = 'Last sign time: <span style="color:' + (signMsTaken >= 2000 ? (signMsTaken >= 20000 ? 'Red' : 'Yellow') : 'inherit') + '">' + (signMsTaken / 1000).toFixed(1) + 's</span>';

                logger.log(4, `${utils.FleetTimeStamp(fleetName)} <${opName}> txSigned: `, txSigned);
                let txSerialized = await txSigned[0].serialize();
                logger.log(4, `${utils.FleetTimeStamp(fleetName)} <${opName}> txSerialized: `, txSerialized);

                let microOpStart = Date.now();
                logger.log(2, `${utils.FleetTimeStamp(fleetName)} <${opName}> SEND ➡️ lastValidBlockHeight: `, latestBH.lastValidBlockHeight);
                // Adding a 25 block buffer before considering a transaction expired
                let response = await rpc.sendAndConfirmTx(txSerialized, latestBH.lastValidBlockHeight, null, fleet, opName);
                let txHash = response.txHash;
                let confirmation = response.confirmation;
                let txResult = txHash ? await rpc.getReadConnection().getTransaction(txHash, {
                    commitment: 'confirmed',
                    preflightCommitment: 'confirmed',
                    maxSupportedTransactionVersion: 1
                }) : undefined;
                if ((confirmation.value && confirmation.value.err && confirmation.value.err.InstructionError) || (txResult && txResult.meta && txResult.meta.err && txResult.meta.err.InstructionError)) {
                    if (globalErrorTracker.firstErrorTime === 0) globalErrorTracker.firstErrorTime = Date.now();
                    if (Date.now() < globalErrorTracker.firstErrorTime + 600000) {
                        globalErrorTracker.errorCount++
                    } else {
                        globalErrorTracker.firstErrorTime = Date.now();
                        globalErrorTracker.errorCount = 1;
                    }
                    updateFleetState(fleet, 'ERROR: Ix Error');
                    logger.log(2, `${utils.FleetTimeStamp(fleetName)} <${opName}> ERROR ❌ The instruction resulted in an error.`);
                    let ixError = txResult && txResult.meta && txResult.meta.logMessages ? txResult.meta.logMessages : 'Unknown';
                    logger.log(4, utils.FleetTimeStamp(fleetName), ' txResult.logMessages: ', ixError);
                    logger.logError('ix error: ' + ixError, fleetName);
                    if (fleet.publicKey) {
                        if (globalSettings.emailFleetIxErrors) await sendEMail(fleetName + ' ix error', ixError);
                    } else {
                        if (globalSettings.emailCraftIxErrors) await sendEMail(fleetName + ' ix error', ixError);
                    }
                }

                const confirmationTimeStr = `${Date.now() - microOpStart}ms`;

                if (confirmation && confirmation.name == 'TransactionExpiredBlockheightExceededError' && !txResult) {
                    logger.log(2, `${utils.FleetTimeStamp(fleetName)} <${opName}> CONFIRM ❌ ${confirmationTimeStr}`);
                    logger.log(2, `${utils.FleetTimeStamp(fleetName)} <${opName}> RESEND 🔂`);
                    //await alterStats('Txs Resent', opName, (Date.now() - macroOpStart) / 1000, 'Seconds', 1); //statsadd
                    //await alterFees(-1, opName); //autofee
                    continue; //retart loop to try again
                }

                let tryCount = 1;
                if (!confirmation.name) {
                    if (!txResult) logger.log(3, `${utils.FleetTimeStamp(fleetName)} <${opName}> Polling transaction until successful`);
                    while (!txResult) {
                        tryCount++;
                        if (tryCount >= 130) {
                            // couldn't find the transaction, it is possible a block re-org happened, so try to send the tx again
                            logger.log(1, `${utils.FleetTimeStamp(fleetName)} <${opName}> No transaction found after ${tryCount} tries, possible block re-org, resending the tx`);
                            break;
                        }
                        if ((tryCount % 10) == 0) {
                            logger.log(3, `${utils.FleetTimeStamp(fleetName)} <${opName}> Still polling the transaction`);
                        }
                        txResult = await rpc.getReadConnection().getTransaction(txHash, {
                            commitment: 'confirmed',
                            preflightCommitment: 'confirmed',
                            maxSupportedTransactionVersion: 1
                        });
                        if (!txResult) await utils.wait(1000);
                    }
                    if (tryCount >= 130) {
                        continue;
                    }
                }

                if (tryCount > 1) logger.log(3, `${utils.FleetTimeStamp(fleetName)} Got txResult in ${tryCount} tries`, txResult);
                logger.log(4, `${utils.FleetTimeStamp(fleetName)} txResult`, txResult);
                logger.log(2, `${utils.FleetTimeStamp(fleetName)} <${opName}> CONFIRM ✅ ${confirmationTimeStr}`);
                confirmed = true;

                const fullMsTaken = Date.now() - macroOpStart;
                const secondsTaken = Math.round(fullMsTaken / 1000);
                logger.log(1, `${utils.FleetTimeStamp(fleetName)} <${opName}> Completed 🏁 ${secondsTaken}s`);

                //await alterStats('SOL Fees', undefined, txResult.meta.fee * 0.000000001, 'SOL', 7); // undefined name => only totals tracked //statsadd
                let statGroup = ((confirmation && confirmation.value && confirmation.value.err && confirmation.value.err.InstructionError) || (txResult && txResult.meta && txResult.meta.err && txResult.meta.err.InstructionError)) ? 'Txs IxErrors' : 'Txs Confirmed'; //statsadd
                //await alterStats(statGroup, opName, fullMsTaken / 1000, 'Seconds', 1); //statsadd
                //await alterFees(fullMsTaken / 1000, opName); //autofee

                resolve(txResult);
            }
        });
    }


    async function execSubwarp(fleet, destX, destY, moveTime) {
        return new Promise(async resolve => {
            let tx = {
                instruction: await sageProgram.methods.startSubwarp({
                    keyIndex: new BrowserAnchor.anchor.BN(userProfileKeyIdx),
                    toSector: [new BrowserAnchor.anchor.BN(destX), new BrowserAnchor.anchor.BN(destY)]
                }).accountsStrict({
                    gameAccountsFleetAndOwner: {
                        gameFleetAndOwner: {
                            fleetAndOwner: {
                                fleet: fleet.publicKey,
                                owningProfile: userProfileAcct,
                                owningProfileFaction: userProfileFactionAcct.publicKey,
                                key: userPublicKey
                            },
                            gameId: sageGameAcct.publicKey
                        },
                        gameState: sageGameAcct.account.gameState
                    },
                }).instruction()
            }

            const coordStr = `[${destX},${destY}]`;
            logger.log(1, `${utils.FleetTimeStamp(fleet.label)} Subwarping to ${coordStr}`);
            updateFleetState(fleet, 'Subwarping');

            let txResult = await txSignAndSend(tx, fleet, 'SUBWARP', 10);

            const travelEndTime = utils.TimeToStr(new Date(Date.now() + (moveTime * 1000)));
            const newFleetState = `Subwarp ${coordStr} ${travelEndTime}`;
            updateFleetState(fleet, newFleetState);

            resolve(txResult);
        });
    }

    async function execExitSubwarp(fleet, returnTx) {
        return new Promise(async resolve => {
            let fuelCargoTypeAcct = cargoTypes.find(item => item.account.mint.toString() == sageGameAcct.account.mints.fuel);
            let tx = {
                instruction: await sageProgram.methods.fleetStateHandler().accountsStrict({
                    fleet: fleet.publicKey
                }).remainingAccounts([
                    {
                        pubkey: userProfileAcct,
                        isSigner: false,
                        isWritable: true
                    },
                    {
                        pubkey: fleet.fuelTank,
                        isSigner: false,
                        isWritable: true
                    },
                    {
                        pubkey: fuelCargoTypeAcct.publicKey,
                        isSigner: false,
                        isWritable: false
                    },
                    {
                        pubkey: sageGameAcct.account.cargo.statsDefinition,
                        isSigner: false,
                        isWritable: false
                    },
                    {
                        pubkey: fleet.fuelToken,
                        isSigner: false,
                        isWritable: true
                    },
                    {
                        pubkey: sageGameAcct.account.mints.fuel,
                        isSigner: false,
                        isWritable: true
                    },
                    {
                        pubkey: userXpAccounts.userPilotingXpAccounts.userPointsAccount,
                        isSigner: false,
                        isWritable: true
                    },
                    {
                        pubkey: userXpAccounts.userPilotingXpAccounts.pointsCategory,
                        isSigner: false,
                        isWritable: false
                    },
                    {
                        pubkey: userXpAccounts.userPilotingXpAccounts.pointsModifierAccount,
                        isSigner: false,
                        isWritable: false
                    },
                    {
                        pubkey: userXpAccounts.userCouncilRankXpAccounts.userPointsAccount,
                        isSigner: false,
                        isWritable: true
                    },
                    {
                        pubkey: userXpAccounts.userCouncilRankXpAccounts.pointsCategory,
                        isSigner: false,
                        isWritable: false
                    },
                    {
                        pubkey: userXpAccounts.userCouncilRankXpAccounts.pointsModifierAccount,
                        isSigner: false,
                        isWritable: false
                    },
                    {
                        pubkey: progressionConfigAcct,
                        isSigner: false,
                        isWritable: false
                    },
                    {
                        pubkey: sageGameAcct.publicKey,
                        isSigner: false,
                        isWritable: false
                    },
                    {
                        pubkey: pointsProgramId,
                        isSigner: false,
                        isWritable: false
                    },
                    {
                        pubkey: cargoProgramPK,
                        isSigner: false,
                        isWritable: false
                    },
                    {
                        pubkey: tokenProgramPK,
                        isSigner: false,
                        isWritable: false
                    },
                ]).instruction()
            }

            logger.log(1, `${utils.FleetTimeStamp(fleet.label)} Exiting Subwarp`);
            updateFleetState(fleet, 'Exiting Subwarp');

            //let txResult = await txSignAndSend(tx, fleet, 'EXIT SUBWARP', 100);
            let txResult;
            if (returnTx) {
                txResult = tx;
            } else {
                txResult = await txSignAndSend(tx, fleet, 'EXIT SUBWARP', 100);
            }

            logger.log(1, `${utils.FleetTimeStamp(fleet.label)} Idle 💤`);
            updateFleetState(fleet, 'Idle');

            resolve(txResult);
        });
    }

    async function execWarp(fleet, destX, destY, moveTime) {
        return new Promise(async resolve => {
            let fuelCargoTypeAcct = cargoTypes.find(item => item.account.mint.toString() == sageGameAcct.account.mints.fuel);
            let tx = {
                instruction: await sageProgram.methods.warpToCoordinate({
                    keyIndex: new BrowserAnchor.anchor.BN(userProfileKeyIdx),
                    toSector: [new BrowserAnchor.anchor.BN(destX), new BrowserAnchor.anchor.BN(destY)]
                }).accountsStrict({
                    gameAccountsFleetAndOwner: {
                        gameFleetAndOwner: {
                            fleetAndOwner: {
                                fleet: fleet.publicKey,
                                owningProfile: userProfileAcct,
                                owningProfileFaction: userProfileFactionAcct.publicKey,
                                key: userPublicKey
                            },
                            gameId: sageGameAcct.publicKey
                        },
                        gameState: sageGameAcct.account.gameState
                    },
                    fuelTank: fleet.fuelTank,
                    cargoType: fuelCargoTypeAcct.publicKey,
                    statsDefinition: sageGameAcct.account.cargo.statsDefinition,
                    tokenFrom: fleet.fuelToken,
                    tokenMint: sageGameAcct.account.mints.fuel,
                    cargoProgram: cargoProgramPK,
                    tokenProgram: tokenProgramPK
                }).instruction()
            }

            const coordStr = `[${destX},${destY}]`;
            logger.log(1, `${utils.FleetTimeStamp(fleet.label)} Warping to ${coordStr}`);
            updateFleetState(fleet, 'Warping');

            let txResult = await txSignAndSend(tx, fleet, 'WARP', 100);

            const travelEndTime = utils.TimeToStr(new Date(Date.now() + (moveTime * 1000 + 10000)));
            const newFleetState = `Warp ${coordStr} ${travelEndTime}`;
            updateFleetState(fleet, newFleetState);

            fleet.warpCoolDownFinish = Date.now() + fleet.warpCooldown * 1000 + 2000;

            resolve({txResult, warpCooldownFinished: fleet.warpCoolDownFinish});
        });
    }

    async function execExitWarp(fleet, returnTx) {
        return new Promise(async resolve => {
            let tx = {
                instruction: await sageProgram.methods.fleetStateHandler().accountsStrict({
                    fleet: fleet.publicKey
                }).remainingAccounts([
                    {
                        pubkey: userXpAccounts.userPilotingXpAccounts.userPointsAccount,
                        isSigner: false,
                        isWritable: true
                    },
                    {
                        pubkey: userXpAccounts.userPilotingXpAccounts.pointsCategory,
                        isSigner: false,
                        isWritable: false
                    },
                    {
                        pubkey: userXpAccounts.userPilotingXpAccounts.pointsModifierAccount,
                        isSigner: false,
                        isWritable: false
                    },
                    {
                        pubkey: userXpAccounts.userCouncilRankXpAccounts.userPointsAccount,
                        isSigner: false,
                        isWritable: true
                    },
                    {
                        pubkey: userXpAccounts.userCouncilRankXpAccounts.pointsCategory,
                        isSigner: false,
                        isWritable: false
                    },
                    {
                        pubkey: userXpAccounts.userCouncilRankXpAccounts.pointsModifierAccount,
                        isSigner: false,
                        isWritable: false
                    },
                    {
                        pubkey: userProfileAcct,
                        isSigner: false,
                        isWritable: false
                    },
                    {
                        pubkey: progressionConfigAcct,
                        isSigner: false,
                        isWritable: false
                    },
                    {
                        pubkey: sageGameAcct.publicKey,
                        isSigner: false,
                        isWritable: false
                    },
                    {
                        pubkey: pointsProgramId,
                        isSigner: false,
                        isWritable: false
                    },
                ]).instruction()
            }

            logger.log(1, `${utils.FleetTimeStamp(fleet.label)} Exiting Warp`);
            updateFleetState(fleet, 'Exiting Warp');

            //let txResult = await txSignAndSend(tx, fleet, 'EXIT WARP', 10);
            let txResult;
            if (returnTx) {
                txResult = tx;
            } else {
                txResult = await txSignAndSend(tx, fleet, 'EXIT WARP', 10);
            }

            logger.log(1, `${utils.FleetTimeStamp(fleet.label)} Idle 💤`);
            updateFleetState(fleet, 'Idle');

            resolve(txResult);
        });
    }

    async function execRegisterStarbasePlayer(fleet, dockCoords) {
        let starbaseX = dockCoords.split(',')[0].trim();
        let starbaseY = dockCoords.split(',')[1].trim();
        let starbase = await getStarbaseFromCoords(starbaseX, starbaseY);

        let [sagePlayerProfile] = await BrowserAnchor.anchor.web3.PublicKey.findProgramAddressSync(
            [
                BrowserBuffer.Buffer.Buffer.from("sage_player_profile"),
                userProfileAcct.toBuffer(),
                sageGameAcct.publicKey.toBuffer()
            ],
            sageProgramPK
        );

        const bumpArrBuff = new ArrayBuffer(2)
        const bumpData = new DataView(bumpArrBuff);
        bumpData.setUint16(0, starbase.seqId, !0);
        let [starbasePlayer] = await BrowserAnchor.anchor.web3.PublicKey.findProgramAddressSync(
            [
                BrowserBuffer.Buffer.Buffer.from("starbase_player"),
                starbase.publicKey.toBuffer(),
                sagePlayerProfile.toBuffer(),
                new Uint8Array(bumpData.buffer)
            ],
            sageProgramPK
        );

        let tx = {
            instruction: await sageProgram.methods.registerStarbasePlayer().accountsStrict({
                profileFaction: userProfileFactionAcct.publicKey,
                funder: userPublicKey,
                gameAccounts: {
                    gameId: sageGameAcct.publicKey,
                    gameState: sageGameAcct.account.gameState
                },
                sagePlayerProfile: sagePlayerProfile,
                starbase: starbase.publicKey,
                starbasePlayer: starbasePlayer,
                systemProgram: solanaWeb3.SystemProgram.programId
            }).instruction()
        }
        await txSignAndSend(tx, fleet, 'Register Starbase Player');

        return starbasePlayer;
    }

    async function execDock(fleet, dockCoords, returnTx) {
        return new Promise(async resolve => {
            let starbaseX = dockCoords.split(',')[0].trim();
            let starbaseY = dockCoords.split(',')[1].trim();
            let starbase = await getStarbaseFromCoords(starbaseX, starbaseY);
            let starbasePlayer = await getStarbasePlayer(userProfileAcct, starbase.publicKey);
            starbasePlayer = starbasePlayer ? starbasePlayer.publicKey : await execRegisterStarbasePlayer(fleet, dockCoords);
            let tx = {
                instruction: await sageProgram.methods.idleToLoadingBay(new BrowserAnchor.anchor.BN(userProfileKeyIdx)).accountsStrict({
                    gameAccountsFleetAndOwner: {
                        gameFleetAndOwner: {
                            fleetAndOwner: {
                                fleet: fleet.publicKey,
                                owningProfile: userProfileAcct,
                                owningProfileFaction: userProfileFactionAcct.publicKey,
                                key: userPublicKey
                            },
                            gameId: sageGameAcct.publicKey
                        },
                        gameState: sageGameAcct.account.gameState
                    },
                    starbaseAndStarbasePlayer: {
                        starbase: starbase.publicKey,
                        starbasePlayer: starbasePlayer
                    }
                }).instruction()
            }

            logger.log(1, `${utils.FleetTimeStamp(fleet.label)} Docking`);
            updateFleetState(fleet, 'Docking');

            let txResult;
            if (returnTx) {
                txResult = tx;
            } else {
                txResult = await txSignAndSend(tx, fleet, 'DOCK', 10);
            }
            //let txResult = await txSignAndSend(tx, fleet, 'DOCK', 10);

            logger.log(1, `${utils.FleetTimeStamp(fleet.label)} Docked`);
            updateFleetState(fleet, 'Docked');

            resolve(txResult);
        });
    }

    async function execUndock(fleet, dockCoords, returnTx) {
        return new Promise(async resolve => {
            let starbaseX = dockCoords.split(',')[0].trim();
            let starbaseY = dockCoords.split(',')[1].trim();
            let starbase = await getStarbaseFromCoords(starbaseX, starbaseY);
            let starbasePlayer = await getStarbasePlayer(userProfileAcct, starbase.publicKey);
            let tx = {
                instruction: await sageProgram.methods.loadingBayToIdle(new BrowserAnchor.anchor.BN(userProfileKeyIdx)).accountsStrict({
                    gameAccountsFleetAndOwner: {
                        gameFleetAndOwner: {
                            fleetAndOwner: {
                                fleet: fleet.publicKey,
                                owningProfile: userProfileAcct,
                                owningProfileFaction: userProfileFactionAcct.publicKey,
                                key: userPublicKey
                            },
                            gameId: sageGameAcct.publicKey
                        },
                        gameState: sageGameAcct.account.gameState
                    },
                    starbaseAndStarbasePlayer: {
                        starbase: starbase.publicKey,
                        starbasePlayer: starbasePlayer.publicKey
                    }
                }).remainingAccounts([{
                    pubkey: starbase.publicKey,
                    isSigner: false,
                    isWritable: false
                }]).instruction()
            }

            logger.log(1, `${utils.FleetTimeStamp(fleet.label)} Undocking`);
            updateFleetState(fleet, 'Undocking');

            let txResult;
            if (returnTx) {
                txResult = tx;
            } else {
                txResult = await txSignAndSend(tx, fleet, 'UNDOCK', 10);
            }
            //let txResult = await txSignAndSend(tx, fleet, 'UNDOCK', 10);

            //await utils.wait(2000);
            updateFleetState(fleet, 'Idle');

            resolve(txResult);
        });
    }

    async function execStartupUndock(i, assignment) {
        const fleet = userFleets[i];
        logger.log(1, `${utils.FleetTimeStamp(fleet.label)} Undock ${assignment} Startup`);

        if (assignment == 'Transport' || assignment == 'Mine') {
            const fleetAcctInfo = await rpc.getReadConnection().getAccountInfo(fleet.publicKey);
            const [fleetState, extra] = getFleetState(fleetAcctInfo, fleet);
            if (fleetState === 'StarbaseLoadingBay') {
                const starbase = await sageProgram.account.starbase.fetch(extra.starbase);
                const coords = starbase.sector[0].toNumber() + ',' + starbase.sector[1].toNumber();
                await execUndock(fleet, coords);
            }
        }
        logger.log(1, `${utils.FleetTimeStamp(fleet.label)} Undock Startup Complete`);
    }

    async function execCreateCargoPod(fleet, dockCoords) {
        let starbaseX = dockCoords.split(',')[0].trim();
        let starbaseY = dockCoords.split(',')[1].trim();
        let starbase = await getStarbaseFromCoords(starbaseX, starbaseY);
        let starbasePlayer = await getStarbasePlayer(userProfileAcct, starbase.publicKey);
        let cargoPodData = {
            keyIndex: new BrowserAnchor.anchor.BN(userProfileKeyIdx),
            podSeeds: Array.from(solanaWeb3.Keypair.generate().publicKey.toBuffer())
        }

        let [cargoPod] = await BrowserAnchor.anchor.web3.PublicKey.findProgramAddressSync(
            [
                BrowserBuffer.Buffer.Buffer.from("cargo_pod"),
                BrowserBuffer.Buffer.Buffer.from(cargoPodData.podSeeds),
            ],
            cargoProgramPK
        );

        let tx = {
            instruction: await sageProgram.methods.createCargoPod(cargoPodData).accountsStrict({
                funder: userPublicKey,
                starbaseAndStarbasePlayer: {
                    starbase: starbase.publicKey,
                    starbasePlayer: starbasePlayer.publicKey
                },
                gameAccountsAndProfile: {
                    gameAndProfileAndFaction: {
                        key: userPublicKey,
                        profile: userProfileAcct,
                        profileFaction: userProfileFactionAcct.publicKey,
                        gameId: sageGameAcct.publicKey
                    },
                    gameState: sageGameAcct.account.gameState
                },
                cargoPod: cargoPod,
                cargoStatsDefinition: sageGameAcct.account.cargo.statsDefinition,
                cargoProgram: cargoProgramPK,
                systemProgram: solanaWeb3.SystemProgram.programId
            }).instruction(),
            signers: [userPublicKey, userPublicKey]
        }

        await txSignAndSend(tx, fleet, 'Create CargoPod');

        return cargoPod;
    }

    async function execCargoFromFleetToStarbase(fleet, fleetCargoPod, tokenMint, dockCoords, amount, returnTx) {
        return new Promise(async resolve => {
            let starbaseX = dockCoords.split(',')[0].trim();
            let starbaseY = dockCoords.split(',')[1].trim();
            let starbase = await getStarbaseFromCoords(starbaseX, starbaseY);
            let starbasePlayer = await getStarbasePlayer(userProfileAcct, starbase.publicKey);
            let starbasePlayerCargoHolds = await cargoProgram.account.cargoPod.all([
                {
                    memcmp: {
                        offset: 41,
                        bytes: starbasePlayer.publicKey.toBase58(),
                    },
                },
            ]);

            let starbasePlayerCargoHold = starbasePlayerCargoHolds.find(item => item.account.openTokenAccounts > 0);
            starbasePlayerCargoHold = starbasePlayerCargoHold ? starbasePlayerCargoHold.publicKey : starbasePlayerCargoHolds.length > 0 ? starbasePlayerCargoHolds[0].publicKey : await execCreateCargoPod(fleet, dockCoords);

            if (!fleet.state.includes('ERROR')) {
                await influxStarbaseCargoHold(starbaseX, starbaseY, starbasePlayerCargoHold);
            }

            let [starbaseCargoToken] = await BrowserAnchor.anchor.web3.PublicKey.findProgramAddressSync(
                [
                    starbasePlayerCargoHold.toBuffer(),
                    tokenProgramPK.toBuffer(),
                    new solanaWeb3.PublicKey(tokenMint).toBuffer()
                ],
                programPK
            );
            let [fleetResourceToken] = await BrowserAnchor.anchor.web3.PublicKey.findProgramAddressSync(
                [
                    fleetCargoPod.toBuffer(),
                    tokenProgramPK.toBuffer(),
                    new solanaWeb3.PublicKey(tokenMint).toBuffer()
                ],
                programPK
            );
            let fleetCurrentPod = await rpc.getReadConnection().getParsedTokenAccountsByOwner(fleetCargoPod, {programId: tokenProgramPK});
            let currentResource = fleetCurrentPod.value.find(item => item.account.data.parsed.info.mint === tokenMint);
            let fleetResourceAcct = currentResource ? currentResource.pubkey : fleetResourceToken;
            let resourceCargoTypeAcct = cargoTypes.find(item => item.account.mint.toString() == tokenMint);
            await getAccountInfo(fleet.label, 'Starbase cargo token', starbaseCargoToken) || await createPDA(starbaseCargoToken, starbasePlayerCargoHold, new solanaWeb3.PublicKey(tokenMint), fleet);
            let tx = {
                instruction: await sageProgram.methods.withdrawCargoFromFleet({
                    amount: new BrowserAnchor.anchor.BN(amount),
                    keyIndex: new BrowserAnchor.anchor.BN(userProfileKeyIdx)
                }).accountsStrict({
                    gameAccountsFleetAndOwner: {
                        gameFleetAndOwner: {
                            fleetAndOwner: {
                                fleet: fleet.publicKey,
                                owningProfile: userProfileAcct,
                                owningProfileFaction: userProfileFactionAcct.publicKey,
                                key: userPublicKey
                            },
                            gameId: sageGameAcct.publicKey
                        },
                        gameState: sageGameAcct.account.gameState
                    },
                    starbaseAndStarbasePlayer: {
                        starbase: starbase.publicKey,
                        starbasePlayer: starbasePlayer.publicKey
                    },
                    cargoPodFrom: fleetCargoPod, // fleet.cargoHold,
                    cargoPodTo: starbasePlayerCargoHold,
                    cargoType: resourceCargoTypeAcct.publicKey,
                    cargoStatsDefinition: sageGameAcct.account.cargo.statsDefinition,
                    tokenFrom: fleetResourceAcct,
                    tokenTo: starbaseCargoToken,
                    tokenMint: tokenMint,
                    fundsTo: userPublicKey,
                    cargoProgram: cargoProgramPK,
                    tokenProgram: tokenProgAddy
                }).remainingAccounts([{
                    pubkey: starbase.publicKey,
                    isSigner: false,
                    isWritable: false
                }]).instruction()
            }
            //let txResult = await txSignAndSend(tx, fleet, 'UNLOAD', 100);
            let txResult;
            if (returnTx) {
                txResult = tx;
            } else {
                txResult = await txSignAndSend(tx, fleet, 'UNLOAD', 100);
            }
            resolve(txResult);

            if (globalSettings.influxURL.length) {
                let starbaseName = validTargets.find(target => (target.x + ',' + target.y) == (starbaseX + ',' + starbaseY))?.name;
                let rssName = cargoItems.find(r => r.token == tokenMint)?.name;
                const fleetPK = fleet.publicKey.toString();
                const fleetSavedData = await GM.getValue(fleetPK, '{}');
                const fleetParsedData = JSON.parse(fleetSavedData);
                const assignment = fleetParsedData.assignment;
                let loadType = 'cargo_out';
                if (fleetCargoPod == fleet.fuelTank) loadType = 'fuel_out';
                if (fleetCargoPod == fleet.ammoBank) loadType = 'ammo_out';
                await sendToInflux(`fleetrss,fleet=${influxEscape(fleet.label)},starbase=${influxEscape(starbaseName)},sectorX=${starbaseX},sectorY=${starbaseY},rss=${influxEscape(rssName)},assignment=${assignment},type=${loadType} amount=${amount}`);
            }

        });
    }


    async function execCargoFromStarbaseToFleet(fleet, cargoPodTo, tokenTo, tokenMint, cargoType, dockCoords, amount, forceAmount, returnTx, alreadyLoadedInTransaction) {
        return new Promise(async resolve => {
            let txResult = {};
            let starbaseX = dockCoords.split(',')[0].trim();
            let starbaseY = dockCoords.split(',')[1].trim();
            let starbase = await getStarbaseFromCoords(starbaseX, starbaseY);
            let starbasePlayer = await getStarbasePlayer(userProfileAcct, starbase.publicKey);
            let starbasePlayerCargoHolds = await cargoProgram.account.cargoPod.all([
                {
                    memcmp: {
                        offset: 41,
                        bytes: starbasePlayer.publicKey.toBase58(),
                    },
                },
            ]);
            let starbasePlayerCargoHold = starbasePlayerCargoHolds[0];
            let mostFound = 0;
            for (let cargoHold of starbasePlayerCargoHolds) {
                if (cargoHold.account && cargoHold.account.openTokenAccounts > 0) {
                    let cargoHoldTokens = await rpc.getReadConnection().getParsedTokenAccountsByOwner(cargoHold.publicKey, {programId: tokenProgramPK});

                    if (!fleet.state.includes('ERROR')) {
                        await influxStarbaseCargoHold(starbaseX, starbaseY, cargoHoldTokens);
                    }

                    let cargoHoldFound = cargoHoldTokens.value.find(item => item.account.data.parsed.info.mint === tokenMint && item.account.data.parsed.info.tokenAmount.uiAmount >= amount);
                    if (cargoHoldFound) {
                        starbasePlayerCargoHold = cargoHold;
                        mostFound = cargoHoldFound.account.data.parsed.info.tokenAmount.uiAmount;
                        break;
                    } else {
                        let cargoHoldFound = cargoHoldTokens.value.find(item => item.account.data.parsed.info.mint === tokenMint && item.account.data.parsed.info.tokenAmount.uiAmount >= mostFound);
                        if (cargoHoldFound) {
                            starbasePlayerCargoHold = cargoHold;
                            mostFound = cargoHoldFound.account.data.parsed.info.tokenAmount.uiAmount;
                        }
                    }
                }
            }

            if (alreadyLoadedInTransaction) {
                mostFound = mostFound - alreadyLoadedInTransaction;
            }

            //amount = amount > mostFound ? mostFound : amount;
            let orgAmount = amount;
            if (globalSettings.starbaseKeep1) {
                // don't close the token account; also prevents a race condition if a transporter loads and closes the account while a miner unloads in the same moment
                amount = amount >= mostFound ? mostFound - 1 : amount;
            } else {
                amount = amount > mostFound ? mostFound : amount;
            }

            //if (amount > 0) {
            if ((!forceAmount && amount > 0) || (forceAmount && amount >= orgAmount)) {
                //Make sure fleet token account exists
                const tokenMintPK = new solanaWeb3.PublicKey(tokenMint)
                await getAccountInfo(fleet.label, 'fleet cargo token', tokenTo) || await createPDA(tokenTo, cargoPodTo, tokenMintPK, fleet);

                let [starbaseCargoToken] = await BrowserAnchor.anchor.web3.PublicKey.findProgramAddressSync(
                    [
                        starbasePlayerCargoHold.publicKey.toBuffer(),
                        tokenProgramPK.toBuffer(),
                        tokenMintPK.toBuffer()
                    ],
                    programPK
                );


                //Build tx
                let tx = {
                    instruction: await sageProgram.methods.depositCargoToFleet({
                        amount: new BrowserAnchor.anchor.BN(amount),
                        keyIndex: new BrowserAnchor.anchor.BN(userProfileKeyIdx)
                    }).accountsStrict({
                        gameAccountsFleetAndOwner: {
                            gameFleetAndOwner: {
                                fleetAndOwner: {
                                    fleet: fleet.publicKey,
                                    owningProfile: userProfileAcct,
                                    owningProfileFaction: userProfileFactionAcct.publicKey,
                                    key: userPublicKey
                                },
                                gameId: sageGameAcct.publicKey
                            },
                            gameState: sageGameAcct.account.gameState
                        },
                        fundsTo: userPublicKey,
                        starbaseAndStarbasePlayer: {
                            starbase: starbase.publicKey,
                            starbasePlayer: starbasePlayer.publicKey
                        },
                        cargoPodFrom: starbasePlayerCargoHold.publicKey,
                        cargoPodTo: cargoPodTo,
                        cargoType: cargoType.publicKey,
                        cargoStatsDefinition: sageGameAcct.account.cargo.statsDefinition,
                        tokenFrom: starbaseCargoToken,
                        tokenTo: tokenTo,
                        tokenMint: tokenMint,
                        cargoProgram: cargoProgramPK,
                        tokenProgram: tokenProgAddy
                    }).remainingAccounts([{
                        pubkey: starbase.publicKey,
                        isSigner: false,
                        isWritable: false
                    }]).instruction()
                }

                //Send tx

                if (returnTx) {
                    txResult = {amount: amount, tx: tx};
                } else {
                    txResult = {amount: amount, result: await txSignAndSend(tx, fleet, 'LOAD', 100)};
                }
            } else txResult = {name: "NotEnoughResource"};

            resolve(txResult);

            if (globalSettings.influxURL.length && amount > 0) {
                let starbaseName = validTargets.find(target => (target.x + ',' + target.y) == (starbaseX + ',' + starbaseY))?.name;
                let rssName = cargoItems.find(r => r.token == tokenMint)?.name;
                const fleetPK = fleet.publicKey.toString();
                const fleetSavedData = await GM.getValue(fleetPK, '{}');
                const fleetParsedData = JSON.parse(fleetSavedData);
                const assignment = fleetParsedData.assignment;
                let loadType = 'cargo_in';
                if (cargoPodTo == fleet.fuelTank) loadType = 'fuel_in';
                if (cargoPodTo == fleet.ammoBank) loadType = 'ammo_in';
                await sendToInflux(`fleetrss,fleet=${influxEscape(fleet.label)},starbase=${influxEscape(starbaseName)},sectorX=${starbaseX},sectorY=${starbaseY},rss=${influxEscape(rssName)},assignment=${assignment},type=${loadType} amount=${amount}`);
            }

        });
    }

    async function execStartMining(fleet, mineItem, sageResource, planet) {
        return new Promise(async resolve => {
            let resourceToken = fleet.mineResource;
            let targetX = fleet.destCoord.split(',')[0].trim();
            let targetY = fleet.destCoord.split(',')[1].trim();
            let starbase = await getStarbaseFromCoords(targetX, targetY);
            let starbasePlayer = await getStarbasePlayer(userProfileAcct, starbase.publicKey);
            starbasePlayer = starbasePlayer ? starbasePlayer.publicKey : await execRegisterStarbasePlayer(fleet, fleet.destCoord);
            let tx = {
                instruction: await sageProgram.methods.startMiningAsteroid({keyIndex: new BrowserAnchor.anchor.BN(userProfileKeyIdx)}).accountsStrict({
                    gameAccountsFleetAndOwner: {
                        gameFleetAndOwner: {
                            fleetAndOwner: {
                                fleet: fleet.publicKey,
                                owningProfile: userProfileAcct,
                                owningProfileFaction: userProfileFactionAcct.publicKey,
                                key: userPublicKey
                            },
                            gameId: sageGameAcct.publicKey
                        },
                        gameState: sageGameAcct.account.gameState
                    },
                    starbaseAndStarbasePlayer: {
                        starbase: starbase.publicKey,
                        starbasePlayer: starbasePlayer
                    },
                    mineItem: mineItem.publicKey,
                    resource: sageResource.publicKey,
                    planet: planet.publicKey,
                    fleetFuelTokenAccount: fleet.fuelToken,
                }).instruction()
            }

            logger.log(1, `${utils.FleetTimeStamp(fleet.label)} Mining Start ...`);
            updateFleetState(fleet, 'Mine Starting')

            let txResult = await txSignAndSend(tx, fleet, 'START MINING', 10);
            resolve(txResult);
        });
    }

    async function execStopMining(fleet, sageResource, sageResourceAcctInfo, mineItem, resourceToken) {
        return new Promise(async resolve => {
            let planet = sageResourceAcctInfo.location;
            let targetX = fleet.destCoord.split(',')[0].trim();
            let targetY = fleet.destCoord.split(',')[1].trim();
            let starbase = await getStarbaseFromCoords(targetX, targetY);

            let [planetResourceToken] = await BrowserAnchor.anchor.web3.PublicKey.findProgramAddressSync(
                [
                    mineItem.toBuffer(),
                    tokenProgramPK.toBuffer(),
                    resourceToken.toBuffer()
                ],
                programPK
            );
            let [fleetResourceToken] = await BrowserAnchor.anchor.web3.PublicKey.findProgramAddressSync(
                [
                    fleet.cargoHold.toBuffer(),
                    tokenProgramPK.toBuffer(),
                    resourceToken.toBuffer()
                ],
                programPK
            );
            let [fleetFoodToken] = await BrowserAnchor.anchor.web3.PublicKey.findProgramAddressSync(
                [
                    fleet.cargoHold.toBuffer(),
                    tokenProgramPK.toBuffer(),
                    sageGameAcct.account.mints.food.toBuffer()
                ],
                programPK
            );
            const fleetAmmoToken = await getFleetAmmoToken(fleet);
            const fleetCurrentCargo = await rpc.getReadConnection().getParsedTokenAccountsByOwner(fleet.cargoHold, {programId: tokenProgramPK});
            const currentFood = fleetCurrentCargo.value.find(item => item.account.data.parsed.info.mint === sageGameAcct.account.mints.food.toString());
            const fleetFoodAcct = currentFood ? currentFood.pubkey : fleetFoodToken;

            let fleetCurrentAmmoBank = await rpc.getReadConnection().getParsedTokenAccountsByOwner(fleet.ammoBank, {programId: tokenProgramPK});
            let currentAmmo = fleetCurrentAmmoBank.value.find(item => item.account.data.parsed.info.mint === sageGameAcct.account.mints.ammo.toString());
            let fleetAmmoAcct = currentAmmo ? currentAmmo.pubkey : fleetAmmoToken;
            await rpc.getReadConnection().getAccountInfo(fleetAmmoAcct) || await createPDA(fleetAmmoAcct, fleet.ammoBank, sageGameAcct.account.mints.ammo, fleet);

            const accInfo = await getAccountInfo(fleet.label, 'fleet resource token', fleetResourceToken);
            logger.log(2, `${utils.FleetTimeStamp(fleet.label)} Mining getAccountInfo result`, accInfo);
            if (!accInfo) {
                const cpda = await createPDA(fleetResourceToken, fleet.cargoHold, resourceToken, fleet);

                logger.log(2, `${utils.FleetTimeStamp(fleet.label)} Mining createPDA result`, cpda);
            }
            let foodCargoTypeAcct = cargoTypes.find(item => item.account.mint.toString() == sageGameAcct.account.mints.food);
            let ammoCargoTypeAcct = cargoTypes.find(item => item.account.mint.toString() == sageGameAcct.account.mints.ammo);
            let resourceCargoTypeAcct = cargoTypes.find(item => item.account.mint.toString() == resourceToken.toString());
            let tx1 = {
                instruction: await sageProgram.methods.fleetStateHandler().accountsStrict({
                    fleet: fleet.publicKey
                }).remainingAccounts([
                    {
                        pubkey: fleet.cargoHold,
                        isSigner: false,
                        isWritable: true
                    },
                    {
                        pubkey: fleet.ammoBank,
                        isSigner: false,
                        isWritable: true
                    },
                    {
                        pubkey: mineItem,
                        isSigner: false,
                        isWritable: false
                    },
                    {
                        pubkey: sageResource,
                        isSigner: false,
                        isWritable: true
                    },
                    {
                        pubkey: planet,
                        isSigner: false,
                        isWritable: true
                    },
                    {
                        pubkey: starbase.publicKey,
                        isSigner: false,
                        isWritable: false
                    },
                    {
                        pubkey: fleetFoodAcct,
                        isSigner: false,
                        isWritable: true
                    },
                    {
                        pubkey: fleetAmmoAcct,
                        isSigner: false,
                        isWritable: true
                    },
                    {
                        pubkey: planetResourceToken,
                        isSigner: false,
                        isWritable: true
                    },
                    {
                        pubkey: fleetResourceToken,
                        isSigner: false,
                        isWritable: true
                    },
                    {
                        pubkey: sageGameAcct.account.mints.food,
                        isSigner: false,
                        isWritable: true
                    },
                    {
                        pubkey: sageGameAcct.account.mints.ammo,
                        isSigner: false,
                        isWritable: true
                    },
                    {
                        pubkey: foodCargoTypeAcct.publicKey,
                        isSigner: false,
                        isWritable: false
                    },
                    {
                        pubkey: ammoCargoTypeAcct.publicKey,
                        isSigner: false,
                        isWritable: false
                    },
                    {
                        pubkey: resourceCargoTypeAcct.publicKey,
                        isSigner: false,
                        isWritable: false
                    },
                    {
                        pubkey: sageGameAcct.account.cargo.statsDefinition,
                        isSigner: false,
                        isWritable: false
                    },
                    {
                        pubkey: sageGameAcct.account.gameState,
                        isSigner: false,
                        isWritable: false
                    },
                    {
                        pubkey: sageGameAcct.publicKey,
                        isSigner: false,
                        isWritable: false
                    },
                    {
                        pubkey: cargoProgramPK,
                        isSigner: false,
                        isWritable: false
                    },
                    {
                        pubkey: tokenProgramPK,
                        isSigner: false,
                        isWritable: false
                    },
                ]).instruction()
            }
            updateFleetState(fleet, `Mining Stop`);

            let fuelCargoTypeAcct = cargoTypes.find(item => item.account.mint.toString() == sageGameAcct.account.mints.fuel);
            let tx2 = {
                instruction: await sageProgram.methods.stopMiningAsteroid({keyIndex: new BrowserAnchor.anchor.BN(userProfileKeyIdx)}).accountsStrict({
                    gameAccountsFleetAndOwner: {
                        gameFleetAndOwner: {
                            fleetAndOwner: {
                                fleet: fleet.publicKey,
                                owningProfile: userProfileAcct,
                                owningProfileFaction: userProfileFactionAcct.publicKey,
                                key: userPublicKey
                            },
                            gameId: sageGameAcct.publicKey
                        },
                        gameState: sageGameAcct.account.gameState
                    },
                    mineItem: mineItem,
                    resource: sageResource,
                    planet: planet,
                    fuelTank: fleet.fuelTank,
                    cargoType: fuelCargoTypeAcct.publicKey,
                    cargoStatsDefinition: sageGameAcct.account.cargo.statsDefinition,
                    tokenFrom: fleet.fuelToken,
                    tokenMint: sageGameAcct.account.mints.fuel,
                    miningXpAccounts: userXpAccounts.userMiningXpAccounts,
                    pilotXpAccounts: userXpAccounts.userPilotingXpAccounts,
                    councilRankXpAccounts: userXpAccounts.userCouncilRankXpAccounts,
                    progressionConfig: progressionConfigAcct,
                    cargoProgram: cargoProgramPK,
                    pointsProgram: pointsProgramId,
                    tokenProgram: tokenProgramPK,
                }).instruction()
            }

            logger.log(1, `${utils.FleetTimeStamp(fleet.label)} Mining Stop`);
            updateFleetState(fleet, 'Mining Stop')

            //let txResult = await txSignAndSend(tx2, fleet, 'STOP MINING', 100);
            let txResult = await txSignAndSend([tx1, tx2], fleet, 'STOP MINING', 100);

            //await utils.wait(2000);
            logger.log(1, `${utils.FleetTimeStamp(fleet.label)} Idle 💤`);
            updateFleetState(fleet, 'Idle');

            resolve(txResult);

            if (!fleet.state.includes('ERROR') && txResult && txResult.meta && globalSettings.influxURL.length) {
                let postTokenBalances = txResult.meta.postTokenBalances;
                let preTokenBalances = txResult.meta.preTokenBalances;
                let preFoodCnt = 0;
                let postFoodCnt = 0;
                let preAmmoCnt = 0;
                let postAmmoCnt = 0;
                let preRssCnt = 0;
                let postRssCnt = 0;
                for (let bal of preTokenBalances) {
                    if (bal.mint == resourceToken.toString() && bal.owner == fleet.cargoHold) {
                        preRssCnt = bal.uiTokenAmount.uiAmount;
                    }
                    if (bal.mint == sageGameAcct.account.mints.food.toString()) {
                        preFoodCnt = bal.uiTokenAmount.uiAmount;
                    }
                    if (bal.mint == sageGameAcct.account.mints.ammo.toString()) {
                        preAmmoCnt = bal.uiTokenAmount.uiAmount;
                    }
                }
                for (let bal of postTokenBalances) {
                    if (bal.mint == resourceToken.toString() && bal.owner == fleet.cargoHold) {
                        postRssCnt = bal.uiTokenAmount.uiAmount;
                    }
                    if (bal.mint == sageGameAcct.account.mints.food.toString()) {
                        postFoodCnt = bal.uiTokenAmount.uiAmount;
                    }
                    if (bal.mint == sageGameAcct.account.mints.ammo.toString()) {
                        postAmmoCnt = bal.uiTokenAmount.uiAmount;
                    }
                }
                let minedAmount = postRssCnt - preRssCnt;
                let burnedFood = preFoodCnt - postFoodCnt;
                let burnedAmmo = preAmmoCnt - postAmmoCnt;

                let minedRssName = cargoItems.find(r => r.token == resourceToken.toString())?.name;
                let starbaseName = validTargets.find(target => (target.x + ',' + target.y) == targetX + ',' + targetY)?.name;
                await sendToInflux(`mining,fleet=${influxEscape(fleet.label)},starbase=${influxEscape(starbaseName)},sectorX=${targetX},sectorY=${targetY},rss=${influxEscape(minedRssName)} burnedFuel=${fleet.planetExitFuelAmount},burnedFood=${burnedFood},burnedAmmo=${burnedAmmo},amount=${minedAmount}`);
            }

        });
    }

    async function execStartCrafting(starbase, starbasePlayer, starbasePlayerCargoHoldsAndTokens, craftingRecipe, craftAmount, userCraft) {
        return new Promise(async resolve => {
            let transactions = [];
            let numCrew = craftAmount > 1 ? userCraft.crew : 1;

            let facility = craftRecipes.some(item => item.name === craftingRecipe.name) ? starbase.account.craftingFacility : starbase.account.upgradeFacility;

            let craftingFacilityAcct = await rpc.getReadConnection().getAccountInfo(facility);
            let craftingFacilityData = craftingFacilityAcct.data.subarray(90);
            let craftIter = 0;
            let craftingFacilityRecipeCategories = [];
            while (craftingFacilityData.length >= 32) {
                let currRecipeCategory = craftingFacilityData.subarray(0, 32);
                let recipeCategoryDecoded = craftingProgram.coder.types.decode('WrappedRecipeCategory', currRecipeCategory);
                craftingFacilityRecipeCategories.push({recipeCategory: recipeCategoryDecoded.id, idx: craftIter});
                craftingFacilityData = craftingFacilityData.subarray(32);
                craftIter += 1;
            }

            let recipeCategoryIndex = craftingFacilityRecipeCategories.find(item => item.recipeCategory.toString() === craftingRecipe.category.toString());
            if (!recipeCategoryIndex) {
                updateFleetState(userCraft, 'ERROR: Craft Unavailable');
                resolve({name: "CraftUnavailable"});
                return;
            }

            let tempBytes = new Uint8Array(256);
            let tempRandomBytes = crypto.getRandomValues(tempBytes);
            let formattedRandomBytes = BrowserBuffer.Buffer.Buffer.from(tempRandomBytes).readUIntLE(0, 6);
            let bnRandomBytes = new BrowserAnchor.anchor.BN(formattedRandomBytes);
            let [craftingProcess] = await BrowserAnchor.anchor.web3.PublicKey.findProgramAddressSync(
                [
                    BrowserBuffer.Buffer.Buffer.from("CraftingProcess"),
                    facility.toBuffer(),
                    craftingRecipe.publicKey.toBuffer(),
                    bnRandomBytes.toArrayLike(BrowserBuffer.Buffer.Buffer, "le", 8)
                ],
                craftingProgramPK
            );

            let [craftingInstance] = await BrowserAnchor.anchor.web3.PublicKey.findProgramAddressSync(
                [
                    BrowserBuffer.Buffer.Buffer.from("CraftingInstance"),
                    starbasePlayer.toBuffer(),
                    craftingProcess.toBuffer(),
                ],
                sageProgramPK
            );

            let createProcessMethod = craftRecipes.some(item => item.name === craftingRecipe.name) ? sageProgram.methods.createCraftingProcess : sageProgram.methods.createStarbaseUpgradeResourceProcess;
            let facilityLabel = craftRecipes.some(item => item.name === craftingRecipe.name) ? 'craftingFacility' : 'upgradeFacility';

            let tx1 = {
                instruction: await createProcessMethod({
                    keyIndex: new BrowserAnchor.anchor.BN(userProfileKeyIdx),
                    craftingId: new BrowserAnchor.anchor.BN(formattedRandomBytes),
                    recipeCategoryIndex: new BrowserAnchor.anchor.BN(recipeCategoryIndex.idx),
                    quantity: new BrowserAnchor.anchor.BN(craftAmount),
                    numCrew: new BrowserAnchor.anchor.BN(numCrew)
                }).accountsStrict({
                    funder: userPublicKey,
                    starbaseAndStarbasePlayer: {
                        starbase: starbase.publicKey,
                        starbasePlayer: starbasePlayer
                    },
                    gameAccountsAndProfile: {
                        gameAndProfileAndFaction: {
                            gameId: sageGameAcct.publicKey,
                            key: userPublicKey,
                            profile: userProfileAcct,
                            profileFaction: userProfileFactionAcct.publicKey
                        },
                        gameState: sageGameAcct.account.gameState
                    },
                    craftingInstance: craftingInstance,
                    craftingProcess: craftingProcess,
                    [facilityLabel]: facility,
                    craftingRecipe: craftingRecipe.publicKey,
                    craftingDomain: craftingRecipe.domain,
                    craftingProgram: craftingProgramPK,
                    systemProgram: solanaWeb3.SystemProgram.programId
                }).instruction()
            }
            transactions.push(tx1);

            for (let ingredient of craftingRecipe.input) {
                let starbasePlayerCargoHold = getStarbasePlayerCargoMaxItem(starbasePlayerCargoHoldsAndTokens, ingredient.mint.toString());
                let cargoTypeAcct = cargoTypes.find(item => item.account.mint.toString() == ingredient.mint.toString());

                let [starbaseCargoToken] = await BrowserAnchor.anchor.web3.PublicKey.findProgramAddressSync(
                    [
                        starbasePlayerCargoHold.starbasePlayerCargoHold.toBuffer(),
                        tokenProgramPK.toBuffer(),
                        ingredient.mint.toBuffer()
                    ],
                    programPK
                );

                let [ingredientToken] = await BrowserAnchor.anchor.web3.PublicKey.findProgramAddressSync(
                    [
                        craftingProcess.toBuffer(),
                        tokenProgramPK.toBuffer(),
                        ingredient.mint.toBuffer(),
                    ],
                    programPK
                );
                if (!await getAccountInfo(userCraft.label, 'Crafting ingredient token', ingredientToken)) transactions.push(await createPDA(ingredientToken, craftingProcess, ingredient.mint, userCraft, false));

                let tx = {
                    instruction: await sageProgram.methods.depositCraftingIngredient({
                        amount: new BrowserAnchor.anchor.BN(craftAmount * ingredient.amount),
                        keyIndex: new BrowserAnchor.anchor.BN(userProfileKeyIdx),
                        ingredientIndex: ingredient.idx
                    }).accountsStrict({
                        starbaseAndStarbasePlayer: {
                            starbase: starbase.publicKey,
                            starbasePlayer: starbasePlayer
                        },
                        gameAccountsAndProfile: {
                            gameAndProfileAndFaction: {
                                gameId: sageGameAcct.publicKey,
                                key: userPublicKey,
                                profile: userProfileAcct,
                                profileFaction: userProfileFactionAcct.publicKey
                            },
                            gameState: sageGameAcct.account.gameState
                        },
                        craftingInstance: craftingInstance,
                        craftingProcess: craftingProcess,
                        craftingFacility: facility,
                        craftingRecipe: craftingRecipe.publicKey,
                        cargoPodFrom: starbasePlayerCargoHold.starbasePlayerCargoHold,
                        cargoType: cargoTypeAcct.publicKey,
                        cargoStatsDefinition: sageGameAcct.account.cargo.statsDefinition,
                        tokenFrom: starbaseCargoToken,
                        tokenTo: ingredientToken,
                        craftingProgram: craftingProgramPK,
                        cargoProgram: cargoProgramPK,
                        tokenProgram: tokenProgramPK
                    }).instruction()
                }
                transactions.push(tx);
            }

            let [signerFeeMintToken] = await BrowserAnchor.anchor.web3.PublicKey.findProgramAddressSync(
                [
                    userPublicKey.toBuffer(),
                    tokenProgramPK.toBuffer(),
                    sageGameAcct.account.mints.atlas.toBuffer(),
                ],
                programPK
            );

            let startCraftProcRemainingAccts = [
                {
                    pubkey: craftingRecipe.feeRecipient,
                    isSigner: false,
                    isWritable: false
                }, {
                    pubkey: userPublicKey,
                    isSigner: true,
                    isWritable: true
                }, {
                    pubkey: signerFeeMintToken,
                    isSigner: false,
                    isWritable: true
                }];

            if (craftRecipes.some(item => item.name === craftingRecipe.name)) {
                let [craftingAtlasToken] = await BrowserAnchor.anchor.web3.PublicKey.findProgramAddressSync(
                    [
                        craftingProcess.toBuffer(),
                        tokenProgramPK.toBuffer(),
                        sageGameAcct.account.mints.atlas.toBuffer(),
                    ],
                    programPK
                );

                if (!await getAccountInfo(userCraft.label, 'Crafting atlas token', craftingAtlasToken)) transactions.push(await createPDA(craftingAtlasToken, craftingProcess, sageGameAcct.account.mints.atlas, userCraft, false));

                startCraftProcRemainingAccts.push({
                    pubkey: craftingAtlasToken,
                    isSigner: false,
                    isWritable: true
                });
            }

            startCraftProcRemainingAccts.push({
                pubkey: tokenProgramPK,
                isSigner: false,
                isWritable: false
            });

            let tx2 = {
                instruction: await sageProgram.methods.startCraftingProcess({keyIndex: new BrowserAnchor.anchor.BN(userProfileKeyIdx)}).accountsStrict({
                    starbaseAndStarbasePlayer: {
                        starbase: starbase.publicKey,
                        starbasePlayer: starbasePlayer
                    },
                    craftingInstance: craftingInstance,
                    craftingProcess: craftingProcess,
                    craftingRecipe: craftingRecipe.publicKey,
                    craftingFacility: facility,
                    gameAccountsAndProfile: {
                        gameAndProfileAndFaction: {
                            gameId: sageGameAcct.publicKey,
                            key: userPublicKey,
                            profile: userProfileAcct,
                            profileFaction: userProfileFactionAcct.publicKey
                        },
                        gameState: sageGameAcct.account.gameState
                    },
                    craftingProgram: craftingProgramPK
                }).remainingAccounts(startCraftProcRemainingAccts).instruction()
            }
            transactions.push(tx2);

            //let txResult = {craftingId: formattedRandomBytes, result: await txSignAndSend(transactions, userCraft, 'START CRAFTING', Math.min(globalSettings.craftingTxMultiplier, 500) )};
            let txResult = {
                craftingId: formattedRandomBytes,
                feeAtlas: 0,
                result: await txSliceAndSend(transactions, userCraft, 'START CRAFTING', Math.min(globalSettings.craftingTxMultiplier, 500), 6)
            };

            if (!userCraft.state.includes('ERROR')) {
                let postTokenBalances = txResult.result.meta.postTokenBalances;
                let feeAccount = txResult.result.transaction.message.staticAccountKeys.map((key) => key.toBase58())[3];
                for (var b in postTokenBalances) {
                    if (postTokenBalances[b].mint == 'ATLASXmbPQxBUYbxPsV97usA3fPQYEqzQBUHgiFCUsXx' && postTokenBalances[b].owner == feeAccount && postTokenBalances[b].uiTokenAmount.uiAmount) {
                        //await alterStats('ATLAS Fees', 'Crafting', postTokenBalances[b].uiTokenAmount.uiAmount, 'ATLAS', 4);
                        txResult.feeAtlas = postTokenBalances[b].uiTokenAmount.uiAmount;
                    }
                }
            }

            resolve(txResult);
        });
    }

    async function execCompleteCrafting(starbase, starbasePlayer, starbasePlayerCargoHoldsAndTokens, craftingProcess, userCraft) {
        return new Promise(async resolve => {
            let transactions = [];

            let craftRecipe = craftRecipes.find(item => item.publicKey.toString() === craftingProcess.recipe.toString());

            let influxStr = '';
            let starbaseName = validTargets.find(target => (target.x + ',' + target.y) == (starbase.account.sector[0].toNumber() + ',' + starbase.account.sector[1].toNumber()))?.name;
            ;
            let outputName = cargoItems.find(r => r.token == craftRecipe.output.mint.toString())?.name;

            // status:
            // <2 = not ready
            // 2 = ready
            // 3 = at least 1 ingredient was burned, but the craftingProcess is still open
            if (craftingProcess.status < 2) {
                updateFleetState(userCraft, 'ERROR: Invalid crafting state');
                resolve({});
                return;
            }

            //if (craftingProcess.status == 2) {
            for (let ingredient of craftRecipe.input) {
                let [ingredientToken] = await BrowserAnchor.anchor.web3.PublicKey.findProgramAddressSync(
                    [
                        craftingProcess.craftingProcess.toBuffer(),
                        tokenProgramPK.toBuffer(),
                        ingredient.mint.toBuffer(),
                    ],
                    programPK
                );


                // input Checksum has a bit for each ingredient.
                // so if we have 3 ingredients, the initial value is 1+2+4=7
                // when we claim the ingredient with index 1, the checksum is 1+4=5 now
                // we need to make sure it works with more than 8 ingredients
                const bitValue = craftingProcess.inputsChecksum[0] + craftingProcess.inputsChecksum[1] * 256;
                const ingredientBurned = ((bitValue >> ingredient.idx) & 1) == 0;
                if (ingredientBurned) {
                    logger.log(1, `${utils.FleetTimeStamp(userCraft.label)} Ingredient`, ingredient.idx, `was already burned, skipping ...`);
                    continue;
                }

                let inputName = cargoItems.find(r => r.token == ingredient.mint.toString())?.name;
                influxStr += (influxStr.length ? "\n" : "") + `crafting,starbase=${influxEscape(starbaseName)},sectorX=${starbase.account.sector[0].toNumber()},sectorY=${starbase.account.sector[1].toNumber()},input=${influxEscape(inputName)},output=${influxEscape(outputName)},craftingID=${userCraft.craftingId},type=Input fee=${userCraft.feeAtlas ? userCraft.feeAtlas : 0},amount=${craftingProcess.quantity * ingredient.amount}`;

                let tx = {
                    instruction: await sageProgram.methods.burnCraftingConsumables({
                        ingredientIndex: ingredient.idx
                    }).accountsStrict({
                        starbaseAndStarbasePlayer: {
                            starbase: starbase.publicKey,
                            starbasePlayer: starbasePlayer
                        },
                        gameAccounts: {
                            gameId: sageGameAcct.publicKey,
                            gameState: sageGameAcct.account.gameState
                        },
                        craftingInstance: craftingProcess.craftingInstance,
                        craftingProcess: craftingProcess.craftingProcess,
                        craftingFacility: starbase.account.craftingFacility,
                        craftingRecipe: craftingProcess.recipe,
                        tokenFrom: ingredientToken,
                        tokenMint: ingredient.mint,
                        craftingProgram: craftingProgramPK,
                        tokenProgram: tokenProgramPK
                    }).instruction()
                }
                transactions.push(tx);
            }


            let starbasePlayerCargoHold = getStarbasePlayerCargoMaxItem(starbasePlayerCargoHoldsAndTokens, craftRecipe.output.mint.toString());
            starbasePlayerCargoHold = starbasePlayerCargoHold ? starbasePlayerCargoHold.starbasePlayerCargoHold : starbasePlayerCargoHoldsAndTokens.length > 0 ? starbasePlayerCargoHoldsAndTokens[0].starbasePlayerCargoHold : await execCreateCargoPod(userCraft, userCraft.coordinates);

            let cargoTypeAcct = cargoTypes.find(item => item.account.mint.toString() == craftRecipe.output.mint.toString());

            let [starbaseCargoToken] = await BrowserAnchor.anchor.web3.PublicKey.findProgramAddressSync(
                [
                    starbasePlayerCargoHold.toBuffer(),
                    tokenProgramPK.toBuffer(),
                    craftRecipe.output.mint.toBuffer()
                ],
                programPK
            );

            await getAccountInfo(userCraft.label, 'Starbase cargo token', starbaseCargoToken) || await createPDA(starbaseCargoToken, starbasePlayerCargoHold, craftRecipe.output.mint, userCraft);


            let craftableItem = craftableItems.find(item => item.account.domain.toString() === craftRecipe.domain.toBase58() && item.account.mint.toString() === craftRecipe.output.mint.toBase58());

            let [outputFrom] = await BrowserAnchor.anchor.web3.PublicKey.findProgramAddressSync(
                [
                    craftableItem.publicKey.toBuffer(),
                    tokenProgramPK.toBuffer(),
                    craftRecipe.output.mint.toBuffer()
                ],
                programPK
            );
            if (!await getAccountInfo(userCraft.label, 'Crafting ingredient token', outputFrom)) transactions.push(await createPDA(outputFrom, craftableItem.publicKey, craftRecipe.output.mint, userCraft, false));

            //if the output checksum is 0, we haven't claimed the output yet.
            if (!craftingProcess.outputsChecksum[0]) {
                influxStr += (influxStr.length ? "\n" : "") + `crafting,starbase=${influxEscape(starbaseName)},sectorX=${starbase.account.sector[0].toNumber()},sectorY=${starbase.account.sector[1].toNumber()},output=${influxEscape(outputName)},craftingID=${userCraft.craftingId},type=Output fee=${userCraft.feeAtlas ? userCraft.feeAtlas : 0},amount=${craftingProcess.quantity}`;

                let tx1 = {
                    instruction: await sageProgram.methods.claimCraftingOutputs({
                        ingredientIndex: craftRecipe.output.idx
                    }).accountsStrict({
                        starbaseAndStarbasePlayer: {
                            starbase: starbase.publicKey,
                            starbasePlayer: starbasePlayer
                        },
                        gameAccounts: {
                            gameId: sageGameAcct.publicKey,
                            gameState: sageGameAcct.account.gameState
                        },
                        craftingInstance: craftingProcess.craftingInstance,
                        craftingProcess: craftingProcess.craftingProcess,
                        craftingFacility: starbase.account.craftingFacility,
                        craftingRecipe: craftingProcess.recipe,
                        craftableItem: craftableItem.publicKey,
                        cargoPodTo: starbasePlayerCargoHold,
                        cargoType: cargoTypeAcct.publicKey,
                        cargoStatsDefinition: sageGameAcct.account.cargo.statsDefinition,
                        tokenFrom: outputFrom,
                        tokenTo: starbaseCargoToken,
                        craftingProgram: craftingProgramPK,
                        cargoProgram: cargoProgramPK,
                        tokenProgram: tokenProgramPK
                    }).instruction()
                }
                transactions.push(tx1);
            } else {
                logger.log(1, `${utils.FleetTimeStamp(userCraft.label)} Output was already claimed, skipping ...`);
            }


            let [craftingAtlasToken] = await BrowserAnchor.anchor.web3.PublicKey.findProgramAddressSync(
                [
                    craftingProcess.craftingProcess.toBuffer(),
                    tokenProgramPK.toBuffer(),
                    sageGameAcct.account.mints.atlas.toBuffer(),
                ],
                programPK
            );

            let tx2 = {
                instruction: await sageProgram.methods.closeCraftingProcess({keyIndex: new BrowserAnchor.anchor.BN(userProfileKeyIdx)}).accountsStrict({
                    fundsTo: userPublicKey,
                    starbaseAndStarbasePlayer: {
                        starbase: starbase.publicKey,
                        starbasePlayer: starbasePlayer
                    },
                    gameAccountsAndProfile: {
                        gameAndProfileAndFaction: {
                            gameId: sageGameAcct.publicKey,
                            key: userPublicKey,
                            profile: userProfileAcct,
                            profileFaction: userProfileFactionAcct.publicKey
                        },
                        gameState: sageGameAcct.account.gameState
                    },
                    craftingInstance: craftingProcess.craftingInstance,
                    craftingProcess: craftingProcess.craftingProcess,
                    craftingRecipe: craftingProcess.recipe,
                    craftingFacility: starbase.account.craftingFacility,
                    craftingXpAccounts: userXpAccounts.userCraftingXpAccounts,
                    councilRankXpAccounts: userXpAccounts.userCouncilRankXpAccounts,
                    progressionConfig: progressionConfigAcct,
                    pointsProgram: pointsProgramId,
                    craftingProgram: craftingProgramPK
                }).remainingAccounts([
                    {
                        pubkey: craftingAtlasToken,
                        isSigner: false,
                        isWritable: true
                    }, {
                        pubkey: sageGameAcct.account.vaults.atlas,
                        isSigner: false,
                        isWritable: true
                    }, {
                        pubkey: tokenProgramPK,
                        isSigner: false,
                        isWritable: false
                    }
                ]).instruction()
            }
            transactions.push(tx2);

            let txResult = await txSliceAndSend(transactions, userCraft, 'COMPLETING CRAFT', Math.min(globalSettings.craftingTxMultiplier, 500), 6);

            if (!userCraft.state.includes('ERROR')) {
                await sendToInflux(influxStr);
            }

            // Allow RPC to catch up (to be sure the crew is available before starting the next job)
            await utils.wait(4000);

            resolve(txResult);
        });
    }

    async function execCompleteUpgrade(starbase, starbasePlayer, starbasePlayerCargoHoldsAndTokens, craftingProcess, userCraft) {
        return new Promise(async resolve => {
            let transactions = [];

            let craftingRecipe = upgradeRecipes.find(item => item.publicKey.toString() === craftingProcess.recipe.toString());
            let starbaseUpgradeRecipe = upgradeRecipes.find(item => item.name === 'SB Tier ' + (starbase.account.level + 1));
            let starbaseUpgradeRecipeInput = starbaseUpgradeRecipe.input.find(item => item.mint.toString() === craftingRecipe.input[0].mint.toString());
            let itemRecipe = craftRecipes.find(item => item.output.mint.toString() === craftingRecipe.input[0].mint.toString());

            let starbasePlayerCargoHold = getStarbasePlayerCargoMaxItem(starbasePlayerCargoHoldsAndTokens, craftingRecipe.input[0].mint.toString());
            starbasePlayerCargoHold = starbasePlayerCargoHold ? starbasePlayerCargoHold.starbasePlayerCargoHold : starbasePlayerCargoHoldsAndTokens.length > 0 ? starbasePlayerCargoHoldsAndTokens[0].starbasePlayerCargoHold : await execCreateCargoPod(userCraft, userCraft.coordinates);

            let cargoTypeAcct = cargoTypes.find(item => item.account.mint.toString() == craftingRecipe.input[0].mint.toString());

            let [starbaseCargoToken] = await BrowserAnchor.anchor.web3.PublicKey.findProgramAddressSync(
                [
                    starbasePlayerCargoHold.toBuffer(),
                    tokenProgramPK.toBuffer(),
                    craftingRecipe.input[0].mint.toBuffer()
                ],
                programPK
            );

            let craftableItem = craftableItems.find(item => item.account.domain.toString() === craftingRecipe.domain.toBase58() && item.account.mint.toString() === craftingRecipe.input[0].mint.toBase58());

            let [outputFrom] = await BrowserAnchor.anchor.web3.PublicKey.findProgramAddressSync(
                [
                    craftableItem.publicKey.toBuffer(),
                    tokenProgramPK.toBuffer(),
                    craftingRecipe.input[0].mint.toBuffer()
                ],
                programPK
            );

            let [ingredientToken] = await BrowserAnchor.anchor.web3.PublicKey.findProgramAddressSync(
                [
                    craftingProcess.craftingProcess.toBuffer(),
                    tokenProgramPK.toBuffer(),
                    craftingRecipe.input[0].mint.toBuffer(),
                ],
                programPK
            );

            let userRedemptionPubkey = await getUserRedemptionAccount();
            let newRedemption = false;
            let userRedemptionAcct;
            if (!userRedemptionPubkey) {
                userRedemptionAcct = new solanaWeb3.Keypair();
                userRedemptionPubkey = userRedemptionAcct.publicKey;
                newRedemption = true;
            }

            let remainingAccounts = [
                {
                    pubkey: userRedemptionPubkey,
                    isSigner: newRedemption,
                    isWritable: true
                },
                {
                    pubkey: userRedemptionConfigAcct,
                    isSigner: false,
                    isWritable: true
                },
                {
                    pubkey: pointsStoreProgramId,
                    isSigner: false,
                    isWritable: false
                }
            ];

            let ixSigners = [userPublicKey];

            if (newRedemption) {
                remainingAccounts.push({
                    pubkey: solanaWeb3.SystemProgram.programId,
                    isSigner: false,
                    isWritable: false
                });
                remainingAccounts.push({
                    pubkey: userPublicKey,
                    isSigner: true,
                    isWritable: true
                });
                ixSigners.push(userRedemptionAcct);
            }

            let currDayIndex = Math.floor(Date.now() / 86400000);
            let redemptionConfig = await rpc.getReadConnection().getAccountInfo(userRedemptionConfigAcct);
            let redemptionConfigData = redemptionConfig.data.subarray(112);
            let epochIndex = 0;
            while (redemptionConfigData.length >= 44) {
                let currEpoch = redemptionConfigData.subarray(0, 40);
                let epochDecoded = pointsStoreProgram.coder.types.decode('RedemptionEpoch', currEpoch);
                if (epochDecoded.dayIndex.toNumber() === currDayIndex) {
                    break;
                }
                redemptionConfigData = redemptionConfigData.subarray(40);
                epochIndex += 1;
            }

            let tx1 = {
                instruction: await sageProgram.methods.submitStarbaseUpgradeResource({
                    sagePermissionsKeyIndex: new BrowserAnchor.anchor.BN(userProfileKeyIdx),
                    pointsProgramPermissionsKeyIndex: new BrowserAnchor.anchor.BN(pointsProfileKeyIdx),
                    upgradeProcessRecipeInputIndex: craftingRecipe.input[0].idx,
                    starbaseUpgradeRecipeInputIndex: starbaseUpgradeRecipeInput.idx,
                    resourceRecipeOutputIndex: itemRecipe.output.idx,
                    epochIndex: epochIndex,
                }).accountsStrict({
                    fundsTo: userPublicKey,
                    starbaseAndStarbasePlayer: {
                        starbase: starbase.publicKey,
                        starbasePlayer: starbasePlayer
                    },
                    gameAccountsAndProfile: {
                        gameAndProfileAndFaction: {
                            gameId: sageGameAcct.publicKey,
                            key: userPublicKey,
                            profile: userProfileAcct,
                            profileFaction: userProfileFactionAcct.publicKey
                        },
                        gameState: sageGameAcct.account.gameState
                    },
                    resourceCraftingInstance: craftingProcess.craftingInstance,
                    resourceCraftingProcess: craftingProcess.craftingProcess,
                    resourceCraftingFacility: starbase.account.upgradeFacility,
                    upgradeProcessRecipe: craftingProcess.recipe,
                    starbaseUpgradeRecipe: starbaseUpgradeRecipe.publicKey,
                    resourceRecipe: itemRecipe.publicKey,
                    cargoPodTo: starbasePlayerCargoHold,
                    cargoType: cargoTypeAcct.publicKey,
                    cargoStatsDefinition: sageGameAcct.account.cargo.statsDefinition,
                    tokenFrom: ingredientToken,
                    tokenTo: starbaseCargoToken,
                    tokenMint: craftingRecipe.input[0].mint,
                    loyaltyPointsAccounts: userXpAccounts.userLPAccounts,
                    progressionConfig: progressionConfigAcct,
                    pointsProgram: pointsProgramId,
                    craftingProgram: craftingProgramPK,
                    cargoProgram: cargoProgramPK,
                    tokenProgram: tokenProgramPK
                }).remainingAccounts(remainingAccounts).instruction(),
                signers: ixSigners
            };
            transactions.push(tx1);

            let tx2 = {
                instruction: await sageProgram.methods.closeUpgradeProcess({
                    keyIndex: new BrowserAnchor.anchor.BN(userProfileKeyIdx)
                }).accountsStrict({
                    fundsTo: userPublicKey,
                    starbaseAndStarbasePlayer: {
                        starbase: starbase.publicKey,
                        starbasePlayer: starbasePlayer
                    },
                    gameAccountsAndProfile: {
                        gameAndProfileAndFaction: {
                            gameId: sageGameAcct.publicKey,
                            key: userPublicKey,
                            profile: userProfileAcct,
                            profileFaction: userProfileFactionAcct.publicKey
                        },
                        gameState: sageGameAcct.account.gameState
                    },
                    resourceCraftingInstance: craftingProcess.craftingInstance,
                    resourceCraftingProcess: craftingProcess.craftingProcess,
                    resourceRecipe: craftingRecipe.publicKey,
                    resourceCraftingFacility: starbase.account.upgradeFacility,
                    craftingProgram: craftingProgramPK
                }).instruction()
            };
            transactions.push(tx2);

            let txResult = await txSignAndSend(transactions, userCraft, 'COMPLETING UPGRADE', Math.min(globalSettings.craftingTxMultiplier, 500), userRedemptionAcct);

            resolve(txResult);
        });
    }

    // TESTING - this is not compatible with Player Profiles
    async function execHarvestClaimStake() {
        return new Promise(async resolve => {
            const stakeProgramId = new solanaWeb3.PublicKey('STAKEr4Bh8sbBMoAVmTDBRqouPzgdocVrvtjmhJhd65');
            const stakeIDL = JSON.parse('{"version":"0.1.0","name":"claim_stake","instructions":[{"name":"processHarvest","accounts":[{"name":"playerAccount","isMut":false,"isSigner":true,"docs":["Player Account Info"]},{"name":"claimStakingAccount","isMut":true,"isSigner":false,"docs":["`ClaimStaking` Account"]},{"name":"claimStakeVarsAccount","isMut":false,"isSigner":false,"docs":["`ClaimStakeVar` Account"]},{"name":"fuelTreasuryTokenAccount","isMut":true,"isSigner":false,"docs":["Fuel Treasury token Account"]},{"name":"armsTreasuryTokenAccount","isMut":true,"isSigner":false,"docs":["Arms Treasury token Account"]},{"name":"foodTreasuryTokenAccount","isMut":true,"isSigner":false,"docs":["Food treasury token Account"]},{"name":"toolkitTreasuryTokenAccount","isMut":true,"isSigner":false,"docs":["ToolKit treasury Token Account"]},{"name":"playerFuelTokenAccount","isMut":true,"isSigner":false,"docs":["Player fuel token Account"]},{"name":"playerArmsTokenAccount","isMut":true,"isSigner":false,"docs":["Player arms token Account"]},{"name":"playerFoodTokenAccount","isMut":true,"isSigner":false,"docs":["Player food token Account"]},{"name":"playerToolkitTokenAccount","isMut":true,"isSigner":false,"docs":["Player toolkit Token Account"]},{"name":"treasuryAuthorityAccount","isMut":false,"isSigner":false,"docs":["Treasury Authority Account"]},{"name":"claimStakeMint","isMut":false,"isSigner":false,"docs":["Claim Stake Mint"]},{"name":"tokenProgram","isMut":false,"isSigner":false,"docs":["Token Program"]}],"args":[]},{"name":"processInitialDeposit","accounts":[{"name":"funder","isMut":true,"isSigner":true,"docs":["Funder for Instruction"]},{"name":"playerAccount","isMut":false,"isSigner":true,"docs":["The player account and the signer"]},{"name":"claimStakingAccount","isMut":true,"isSigner":false,"docs":["The Claim Staking PDA"]},{"name":"claimStakeVars","isMut":false,"isSigner":false,"docs":["Claim Stake Vars Account"]},{"name":"playerFactionAccount","isMut":false,"isSigner":false,"docs":["Player faction account"]},{"name":"escrowAuthority","isMut":false,"isSigner":false,"docs":["Claim Stake Escrow Authority Account"]},{"name":"claimStakeTokenAccountSource","isMut":true,"isSigner":false,"docs":["Player/Source Claim Stake Token Account Source"]},{"name":"claimStakeTokenAccountEscrow","isMut":true,"isSigner":false,"docs":["Escrow Claim Stake Token Account"]},{"name":"systemProgram","isMut":false,"isSigner":false,"docs":["System Program"]},{"name":"tokenProgram","isMut":false,"isSigner":false,"docs":["Token Program"]},{"name":"claimStakeMint","isMut":false,"isSigner":false,"docs":["Claim Stake Mint"]},{"name":"rent","isMut":false,"isSigner":false,"docs":["Rent"]}],"args":[{"name":"claimStakeQuantity","type":"u64"}]},{"name":"processInitialize","accounts":[{"name":"funder","isMut":true,"isSigner":true,"docs":["Instruction funder"]},{"name":"updateAuthorityAccount","isMut":true,"isSigner":true,"docs":["Update Authority Account"]},{"name":"globalVarsAccount","isMut":true,"isSigner":false,"docs":["`GlobalVars` Account"]},{"name":"tokenProgram","isMut":false,"isSigner":false,"docs":["Token Program"]},{"name":"systemProgram","isMut":false,"isSigner":false,"docs":["System Program"]},{"name":"fuelTreasuryAccount","isMut":true,"isSigner":false,"docs":["Fuel Treasury Token Account"]},{"name":"armsTreasuryAccount","isMut":true,"isSigner":false,"docs":["Arms Treasury Token Account"]},{"name":"foodTreasuryAccount","isMut":true,"isSigner":false,"docs":["Food Treasury Token Account"]},{"name":"toolkitTreasuryAccount","isMut":true,"isSigner":false,"docs":["Toolkit Treasury Token Account"]},{"name":"treasuryAuthorityAccount","isMut":false,"isSigner":false,"docs":["Treasury Authority Account"]},{"name":"fuelMint","isMut":false,"isSigner":false,"docs":["Fuel Mint"]},{"name":"foodMint","isMut":false,"isSigner":false,"docs":["Food Mint"]},{"name":"armsMint","isMut":false,"isSigner":false,"docs":["Arms Mint"]},{"name":"toolkitMint","isMut":false,"isSigner":false,"docs":["Toolkit Mint"]},{"name":"rent","isMut":false,"isSigner":false,"docs":["Rent sysvar"]}],"args":[]},{"name":"processPartialDeposit","accounts":[{"name":"playerAccount","isMut":false,"isSigner":true,"docs":["Player Account"]},{"name":"claimStakingAccount","isMut":true,"isSigner":false,"docs":["Claim Staking Account"]},{"name":"claimStakeVarsAccount","isMut":false,"isSigner":false,"docs":["Claim Stake Vars Account"]},{"name":"escrowAuthority","isMut":false,"isSigner":false,"docs":["Claim Stake escrow Auth"]},{"name":"systemProgram","isMut":false,"isSigner":false,"docs":["System Program"]},{"name":"tokenProgram","isMut":false,"isSigner":false,"docs":["Token Program"]},{"name":"claimStakeMint","isMut":false,"isSigner":false,"docs":["Claim Stake Mint"]},{"name":"fromTokenAccount","isMut":true,"isSigner":false,"docs":["Player Token Account"]},{"name":"claimStakeEscrow","isMut":true,"isSigner":false,"docs":["Escrow Token Account"]}],"args":[{"name":"claimStakeQuantity","type":"u64"}]},{"name":"processRegisterClaimStake","accounts":[{"name":"funder","isMut":true,"isSigner":true,"docs":["Funder"]},{"name":"updateAuthorityAccount","isMut":false,"isSigner":true,"docs":["Update Authority Account"]},{"name":"globalVarsAccount","isMut":false,"isSigner":false,"docs":["Global Vars Account"]},{"name":"claimStakeVarsAccount","isMut":true,"isSigner":false,"docs":["Claim Stake Vars Account"]},{"name":"claimStakeMint","isMut":false,"isSigner":false,"docs":["Claim Stake Mint"]},{"name":"systemProgram","isMut":false,"isSigner":false,"docs":["System Program"]}],"args":[{"name":"rewardRatePerSecond","type":{"defined":"RewardRateValuesInputUnpacked"}},{"name":"claimStakeMaxReserves","type":{"defined":"MaxReserveValuesInputUnpacked"}}]},{"name":"processSettle","accounts":[{"name":"claimStakingAccount","isMut":true,"isSigner":false,"docs":["Claim Staking Account Info"]},{"name":"claimStakeVarsAccount","isMut":false,"isSigner":false,"docs":["Claim Stake Vars Account"]},{"name":"globalVarsAccount","isMut":false,"isSigner":false,"docs":["Global Vars"]},{"name":"claimStakeMint","isMut":false,"isSigner":false,"docs":["Claim Stake Mint"]}],"args":[]},{"name":"processUpdateClaimStakeVars","accounts":[{"name":"updateAuthorityAccount","isMut":false,"isSigner":true,"docs":["Authority Account"]},{"name":"globalVarsAccount","isMut":false,"isSigner":false,"docs":["Global Vars Account"]},{"name":"claimStakeVarsAccount","isMut":true,"isSigner":false,"docs":["Claim Stake Vars Account"]},{"name":"claimStakeMint","isMut":false,"isSigner":false,"docs":["Claim stake mint"]}],"args":[{"name":"rewardRateValues","type":{"defined":"RewardRateValuesInputUnpacked"}},{"name":"maxReserveValues","type":{"defined":"MaxReserveValuesInputUnpacked"}}]},{"name":"processWithdrawClaimStakes","accounts":[{"name":"playerAccount","isMut":false,"isSigner":true,"docs":["Player Account"]},{"name":"claimStakingAccount","isMut":true,"isSigner":false,"docs":["Claim Staking Account"]},{"name":"claimStakeVarsAccount","isMut":false,"isSigner":false,"docs":["Claim Stake Vars Account"]},{"name":"playerTokenAccount","isMut":true,"isSigner":false,"docs":["Player Claim Stakes Token Account"]},{"name":"playerFuelTokenAccount","isMut":true,"isSigner":false,"docs":["Player Fuel Token Account"]},{"name":"playerArmsTokenAccount","isMut":true,"isSigner":false,"docs":["Player Arms Token Account"]},{"name":"playerFoodTokenAccount","isMut":true,"isSigner":false,"docs":["Player Food Token Account"]},{"name":"playerToolkitTokenAccount","isMut":true,"isSigner":false,"docs":["Player ToolKit Token Account"]},{"name":"claimStakeEscrowAccount","isMut":true,"isSigner":false,"docs":["Claim Staking Escrow Token Account"]},{"name":"fuelTreasuryTokenAccount","isMut":true,"isSigner":false,"docs":["Fuel Treasury Account"]},{"name":"armsTreasuryTokenAccount","isMut":true,"isSigner":false,"docs":["Arms Treasury Account"]},{"name":"foodTreasuryTokenAccount","isMut":true,"isSigner":false,"docs":["Food Treasury Account"]},{"name":"toolkitTreasuryTokenAccount","isMut":true,"isSigner":false,"docs":["ToolKit Treasury Account"]},{"name":"treasuryAuthorityAccount","isMut":false,"isSigner":false,"docs":["Treasury Authority Account"]},{"name":"escrowAuthority","isMut":false,"isSigner":false},{"name":"tokenProgram","isMut":false,"isSigner":false},{"name":"systemProgram","isMut":false,"isSigner":false},{"name":"claimStakeMint","isMut":false,"isSigner":false}],"args":[]}],"accounts":[{"name":"ClaimStakeVar","type":{"kind":"struct","fields":[{"name":"version","docs":["Account version"],"type":"u8"},{"name":"claimStakeMint","docs":["Mint Pubkey"],"type":"publicKey"},{"name":"fuelRewardRatePerSecond","docs":["Amount of fuel emitted as reward by claim stake of `claim_stake_mint` per second // Multiplied by [crate::util::REWARD_RATE_MULTIPLIER] to maintain precision"],"type":"u64"},{"name":"armsRewardRatePerSecond","docs":["Amount of arms emitted as reward by claim stake of `claim_stake_mint` per second // Multiplied by [crate::util::REWARD_RATE_MULTIPLIER] to maintain precision"],"type":"u64"},{"name":"foodRewardRatePerSecond","docs":["Amount of food emitted as reward by claim stake of `claim_stake_mint` per second // Multiplied by [crate::util::REWARD_RATE_MULTIPLIER] to maintain precision"],"type":"u64"},{"name":"toolkitRewardRatePerSecond","docs":["Amount of toolkit emitted as reward by claim stake of `claim_stake_mint` per second // Multiplied my [crate::util::REWARD_RATE_MULTIPLIER] to maintain precision"],"type":"u64"},{"name":"fuelMaxReserve","docs":["Max reserve of fuel of claim stake of `claim_stake_mint`    // stored in tokens * [crate::util::REWARD_RATE_MULTIPLIER]"],"type":"u64"},{"name":"foodMaxReserve","docs":["Max reserve of food of claim stake of `claim_stake_mint`    // stored in tokens * [crate::util::REWARD_RATE_MULTIPLIER]"],"type":"u64"},{"name":"armsMaxReserve","docs":["Max reserve of arms of claim stake of `claim_stake_mint`    // stored in tokens * [crate::util::REWARD_RATE_MULTIPLIER]"],"type":"u64"},{"name":"toolkitMaxReserve","docs":["Max reserve of toolkits of claim stake of `claim_stake_mint` // stored in tokens * [crate::util::REWARD_RATE_MULTIPLIER]"],"type":"u64"},{"name":"bump","docs":["Bump for Claim Stake Vars Account"],"type":"u8"}]}},{"name":"ClaimStaking","type":{"kind":"struct","fields":[{"name":"version","docs":["Account version"],"type":"u8"},{"name":"factionId","docs":["Faction Id of the player"],"type":"u8"},{"name":"owner","docs":["Claim Stake escrow owner"],"type":"publicKey"},{"name":"mint","docs":["Claim Stake Mint"],"type":"publicKey"},{"name":"lastHarvestTimestamp","docs":["Timestamp of last harvest ix call"],"type":"i64"},{"name":"claimStakesInEscrow","docs":["Amount deposited - to be returned on withdraw"],"type":"u64"},{"name":"fuelToPay","docs":["Fuel reward to pay on harvest/ withdraw // stored as (token count * [`crate::util::REWARD_RATE_MULTIPLIER`])"],"type":"u64"},{"name":"foodToPay","docs":["Food reward to pay on harvest/ withdraw // stored as (token count * [`crate::util::REWARD_RATE_MULTIPLIER`])"],"type":"u64"},{"name":"armsToPay","docs":["Arms reward to pay on harvest/ withdraw // stored as (token count * [`crate::util::REWARD_RATE_MULTIPLIER`])"],"type":"u64"},{"name":"toolkitToPay","docs":["toolkit reward to pay on harvest/ withdraw // stored as (token count * [`crate::util::REWARD_RATE_MULTIPLIER`])"],"type":"u64"},{"name":"totalFuelPaid","docs":["Total fuel paid as reward (stored as token count)"],"type":"u64"},{"name":"totalFoodPaid","docs":["Total food paid as reward (stored as token count)"],"type":"u64"},{"name":"totalArmsPaid","docs":["Total arms paid as reward (stored as token count)"],"type":"u64"},{"name":"totalToolkitPaid","docs":["Total toolkit paid as reward (stored as token count)"],"type":"u64"},{"name":"totalFuelSecondsPaid","docs":["Total Fuel Seconds paid"],"type":"u64"},{"name":"totalArmsSecondsPaid","docs":["Total Arms Seconds Paid"],"type":"u64"},{"name":"totalFoodSecondsPaid","docs":["Total Food Seconds Paid"],"type":"u64"},{"name":"totalToolkitSecondsPaid","docs":["Total Toolkit seconds Paid"],"type":"u64"},{"name":"stakedAtTimestamp","docs":["Timestamp in second when the claim stakes are staked (in seconds)"],"type":"i64"},{"name":"bump","docs":["Bump for Claim Staking Account"],"type":"u8"}]}},{"name":"GlobalVars","type":{"kind":"struct","fields":[{"name":"version","docs":["Account version"],"type":"u8"},{"name":"updateAuthorityMaster","docs":["Update authority key"],"type":"publicKey"},{"name":"fuelMint","docs":["Mint for Fuel R4"],"type":"publicKey"},{"name":"foodMint","docs":["Mint for Food R4"],"type":"publicKey"},{"name":"armsMint","docs":["Mint for Arms R4"],"type":"publicKey"},{"name":"toolkitMint","docs":["Mint for Toolkit R4"],"type":"publicKey"},{"name":"bump","docs":["Bump for Global Vars Account"],"type":"u8"}]}}],"types":[{"name":"MaxReserveValuesInput","docs":["Max Reserve Values"],"type":{"kind":"struct","fields":[{"name":"fuel","type":"u64"},{"name":"arms","type":"u64"},{"name":"food","type":"u64"},{"name":"toolkit","type":"u64"}]}},{"name":"MaxReserveValuesInputUnpacked","docs":["Unpacked version of [`MaxReserveValuesInput`]"],"type":{"kind":"struct","fields":[{"name":"fuel","type":"u64"},{"name":"arms","type":"u64"},{"name":"food","type":"u64"},{"name":"toolkit","type":"u64"}]}},{"name":"RewardRateValuesInput","docs":["Reward Rate Values"],"type":{"kind":"struct","fields":[{"name":"fuel","type":"u64"},{"name":"arms","type":"u64"},{"name":"food","type":"u64"},{"name":"toolkit","type":"u64"}]}},{"name":"RewardRateValuesInputUnpacked","docs":["Unpacked version of [`RewardRateValuesInput`]"],"type":{"kind":"struct","fields":[{"name":"fuel","type":"u64"},{"name":"arms","type":"u64"},{"name":"food","type":"u64"},{"name":"toolkit","type":"u64"}]}}],"errors":[{"code":6000,"name":"MintMismatch","msg":"Mint does not match"},{"code":6001,"name":"AccountInitializeError","msg":"Account Should not be initialized"},{"code":6002,"name":"GlobalVarsAuthInvalid","msg":"Global Vars Authority Mismatch"},{"code":6003,"name":"AuthInvalid","msg":"Authority key is not valid"},{"code":6004,"name":"InvalidInput","msg":"Cannot Deposit 0 Claim Stakes"},{"code":6005,"name":"NotInitialized","msg":"Account not Initialized"},{"code":6006,"name":"OwnerMismatch","msg":"Owner key does not match"},{"code":6007,"name":"ZeroClaimError","msg":"No Claims Staked"},{"code":6008,"name":"NumericalOverflowError","msg":"Numerical Overflow Error"},{"code":6009,"name":"InvalidOwner","msg":"Wrong Owner"},{"code":6010,"name":"GlobalVarsNotInitialized","msg":"Global Vars Account not initialized"},{"code":6011,"name":"InvalidPlayerFaction","msg":"Invalid Player Faction"}]}');
            let stakeProgram = new BrowserAnchor.anchor.Program(stakeIDL, stakeProgramId, anchorProvider);
            let tx = {
                instruction: await stakeProgram.methods.processHarvest().accountsStrict({
                    playerAccount: "",
                    claimStakingAccount: "",
                    claimStakeVarsAccount: "",
                    fuelTreasuryTokenAccount: "Fj1fDGX77KoFLbB7tLL5xg9xR7DvJxNmU3yo3QR1hgm",
                    armsTreasuryTokenAccount: "9Dp9Rjh6mmDFPDkLVhp6SbJp2Xj2EDGAWy46yVrfzAFG",
                    foodTreasuryTokenAccount: "4RoeBTjsMyMf7wJ1a3Hi3NsppphgvpVLHaC5Tb4FKUQ8",
                    toolkitTreasuryTokenAccount: "CdQHUngrpj21e5Pi7WD21Uj5w6wDWX4AK1McuedHMDga",
                    playerFuelTokenAccount: "",
                    playerArmsTokenAccount: "",
                    playerFoodTokenAccount: "",
                    playerToolkitTokenAccount: "",
                    treasuryAuthorityAccount: "6gxMWRY4DJnx8WfJi45KqYY1LaqMGEHfX9YdLeQ6Wi5",
                    claimStakeMint: "",
                    tokenProgram: tokenProgramPK
                }).instruction()
            }

            logger.log(1, `${utils.FleetTimeStamp('CLAIM STAKE')} TESTING ...`);

            let txResult = await txSignAndSend(tx, {state: 'TESTING', label: 'CLAIM STAKE'}, 'TESTING');
            resolve(txResult);
        });
    }

    async function execLoadFleetAmmo(fleet, starbaseCoords, amount, returnTx) {
        const ammoMint = sageGameAcct.account.mints.ammo;
        const parsedTokenAccounts = await rpc.getReadConnection().getParsedTokenAccountsByOwner(fleet.ammoBank, {programId: tokenProgramPK});
        const parsedTokenAccount = parsedTokenAccounts.value.find(item => item.account.data.parsed.info.mint === ammoMint.toString());
        const ammoCargoTypeAcct = cargoTypes.find(item => item.account.mint.toString() == ammoMint);
        const [fleetAmmoToken] = await BrowserAnchor.anchor.web3.PublicKey.findProgramAddressSync(
            [
                fleet.ammoBank.toBuffer(),
                tokenProgramPK.toBuffer(),
                sageGameAcct.account.mints.ammo.toBuffer()
            ],
            programPK
        );
        const currentAmmoCnt = parsedTokenAccount ? parsedTokenAccount.account.data.parsed.info.tokenAmount.uiAmount : 0;
        const resAmmoMax = Math.min(fleet.ammoCapacity, amount);

        let amountLoaded = 0;
        let transaction = null;
        if (currentAmmoCnt < resAmmoMax) {
            amountLoaded = resAmmoMax - currentAmmoCnt;
            logger.log(1, `${utils.FleetTimeStamp(fleet.label)} Loading Ammobanks: ${amountLoaded}`);
            let resp = await execCargoFromStarbaseToFleet(
                fleet,
                fleet.ammoBank,
                parsedTokenAccount ? parsedTokenAccount.pubkey : fleetAmmoToken,
                ammoMint.toString(),
                ammoCargoTypeAcct,
                starbaseCoords,
                amountLoaded,
                false,
                returnTx
            );
            if (resp && !resp.name) {
                transaction = resp.tx;
            }
        }

        return {amountLoaded, transaction};
    }


    async function addCraftingInput(craftIndex) {
        let craftSavedData = await GM.getValue('craft' + craftIndex, '{}');
        let craftParsedData = JSON.parse(craftSavedData);
        let craftRow = document.createElement('tr');
        craftRow.classList.add('assist-craft-row');
        craftRow.setAttribute('pk', 'craft' + craftIndex);

        let craftLabel = document.createElement('span');
        craftLabel.innerHTML = 'craft' + craftIndex;
        let craftLabelTd = document.createElement('td');
        craftLabelTd.appendChild(craftLabel);


        let craftStarbaseCoordSelect = document.createElement('select');
        craftStarbaseCoordSelect.style.width = '80px';
        craftStarbaseCoordSelect.appendChild(document.createElement('option'))
        validTargets.forEach(target => {
            let craftStarbaseCoordOption = document.createElement('option');
            craftStarbaseCoordOption.value = target.x + ',' + target.y;
            craftStarbaseCoordOption.innerHTML = target.name + '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[' + target.x + ',' + target.y + ']';
            if (craftParsedData && craftStarbaseCoordOption.value == craftParsedData.coordinates) craftStarbaseCoordOption.setAttribute('selected', 'selected');
            craftStarbaseCoordSelect.appendChild(craftStarbaseCoordOption);
        });
        let craftStarbaseCoordTd = document.createElement('td');
        craftStarbaseCoordTd.appendChild(craftStarbaseCoordSelect);

        let craftCrew = document.createElement('input');
        craftCrew.setAttribute('type', 'text');
        craftCrew.placeholder = '0';
        craftCrew.style.width = '50px';
        craftCrew.value = craftParsedData && craftParsedData.crew ? craftParsedData.crew : '';
        let craftCrewTd = document.createElement('td');
        craftCrewTd.appendChild(craftCrew);

        let filteredUpgradeRecipes = upgradeRecipes.filter(item => item.name.indexOf('SB Tier') === -1);
        let allRecipes = craftRecipes.filter(item => item.name.indexOf('SDU') === -1).concat(filteredUpgradeRecipes);
        const craftItems = [''].concat(allRecipes.map((r) => r.name));
        let craftOptStr = '';
        craftItems.forEach(function (item) {
            craftOptStr += '<option value="' + item + '">' + item + '</option>';
        });
        let craftItem = document.createElement('select');
        craftItem.innerHTML = craftOptStr;
        let craftResourceToken = craftParsedData && craftParsedData.item && craftParsedData.item !== '' ? allRecipes.find(r => r.name == craftParsedData.item) : '';
        craftItem.value = craftResourceToken && craftResourceToken.name ? craftResourceToken.name : '';
        let craftAmount = document.createElement('input');
        craftAmount.setAttribute('type', 'text');
        craftAmount.placeholder = '0';
        craftAmount.style.width = '70px';
        craftAmount.style.marginRight = '10px';
        craftAmount.value = craftParsedData && craftParsedData.amount ? craftParsedData.amount : '';
        let craftItemDiv = document.createElement('div');
        craftItemDiv.appendChild(craftItem);
        craftItemDiv.appendChild(craftAmount);
        let craftItemDivTd = document.createElement('td');
        craftItemDivTd.appendChild(craftItemDiv);

        let craftBelowAmount = document.createElement('input');
        craftBelowAmount.setAttribute('type', 'text');
        craftBelowAmount.placeholder = '';
        craftBelowAmount.style.width = '90px';
        craftBelowAmount.value = craftParsedData && craftParsedData.belowAmount ? craftParsedData.belowAmount : '';
        let craftBelowAmountTd = document.createElement('td');
        craftBelowAmountTd.appendChild(craftBelowAmount);

        let craftSpecial = document.createElement('select');
        let craftSpecialOptStr = '<option value=""></option>';
        craftSpecialOptStr += '<option value="f2">Framework 2</option>';
        craftSpecialOptStr += '<option value="f3">Framework 3</option>';
        craftSpecialOptStr += '<option value="t2">Toolkit 2</option>';
        craftSpecialOptStr += '<option value="t3">Toolkit 3</option>';
        craftSpecial.innerHTML = craftSpecialOptStr;
        craftSpecial.value = (craftParsedData && craftParsedData.special && craftParsedData.special !== '') ? craftParsedData.special : '';
        let craftSpecialTd = document.createElement('td');
        craftSpecialTd.appendChild(craftSpecial);

        craftRow.appendChild(craftLabelTd);
        craftRow.appendChild(craftStarbaseCoordTd);
        craftRow.appendChild(craftCrewTd);
        craftRow.appendChild(craftItemDivTd);
        craftRow.appendChild(craftBelowAmountTd);
        craftRow.appendChild(craftSpecialTd);

        let targetElem = document.querySelector('#assistModal .assist-modal-body #craftTable');
        targetElem.appendChild(craftRow);
    }

    async function resetFleetState(fleet) {
        if ((fleet.state.includes('ERROR') && !fleet.state.includes('⌛')) || fleet.state.includes('STOPPED')) {
            let userFleetIndex = userFleets.findIndex(item => {
                return item.publicKey == fleet.publicKey
            });
            logger.log(1, `${utils.FleetTimeStamp(fleet.label)} Manual request for resetting the fleet state`);
            updateFleetState(fleet, 'ERROR: Trying to restart ...', true); // keep string "ERROR" for now to prevent an early start of operateFleet()

            fleet.exitWarpSubwarpPending = 0;
            fleet.exitSubwarpWillBurnFuel = 0;

            let fleetAcctInfo = await getAccountInfo(fleet.label, 'full fleet info', fleet.publicKey);
            let [fleetState, extra] = getFleetState(fleetAcctInfo);
            let fleetCoords = fleetState == 'Idle' && extra ? extra : [];

            //now we have all necessary info, let's do the reset
            fleet.startingCoords = fleetCoords;
            fleet.iterCnt = 0;
            fleet.resupplying = false;
            fleet.justResupplied = false;
            fleet.moveTarget = '';
            fleet.stopping = false;


            //updateFleetState(fleet, fleetState, true);
            updateFleetState(fleet, 'Starting', true);
            fleet.state = fleetState; // overwrite "starting" with the real state but don't display it - just like in toggleAssistant
        } else {
            fleet.stopping = true;
            updateFleetState(fleet, 'Stopping ...');
        }
    }

    function updateAssistStatus(fleet) {
        /*
            // Identifier la flotte par publicKey ou label
            const rowPK = fleet.publicKey ? fleet.publicKey.toString() : fleet.label;
            const targetRow = document.querySelector(`#assistStatsContent .assist-fleet-row[data-pk="${rowPK}"]`);
            const assistStatsContent = document.getElementById('assistStatsContent');
            const assistStatsView = document.getElementById('assist-stats-view');

            if (!assistStatsContent || !assistStatsView) {
                console.error('Element #assistStatsContent or #assist-stats-view not found');
                return;
            }

            // Preserve scroll position of assist-stats-view
            const scrollTop = assistStatsView.scrollTop;
            console.log(`Preserving assist-stats-view scroll position: ${scrollTop}`);

            // Déterminer la cible (craftingCoords ou coordinates)
            const target = fleet.craftingId && fleet.craftingCoords
                ? validTargets.find(t => `${t.x},${t.y}` === fleet.craftingCoords)
                : validTargets.find(t => `${t.x},${t.y}` === fleet.coordinates);
            const fleetLabelText = `${fleet.label} ${target ? target.name : ''}`;

            if (targetRow) {
                // Mettre à jour une ligne existante
                const labelElement = targetRow.querySelector('.fleet-label');
                const foodElement = targetRow.querySelector('.fleet-food');
                const statusElement = targetRow.querySelector('.fleet-status');

                if (labelElement) {
                    labelElement.textContent = fleetLabelText;
                    labelElement.style.color = fleet.fontColor || '#f0f0f0';
                }
                if (fleet.publicKey && foodElement) {
                    foodElement.textContent = fleet.foodCnt || 0;
                }
                if (statusElement) {
                    statusElement.textContent = fleet.state || 'Unknown';
                }
            } else {
                // Créer une nouvelle ligne
                const fleetRow = document.createElement('div');
                fleetRow.classList.add('assist-fleet-row');
                fleetRow.setAttribute('data-pk', rowPK);

                // Label de la flotte
                const fleetLabel = document.createElement('span');
                fleetLabel.classList.add('fleet-label');
                fleetLabel.textContent = fleetLabelText;
                fleetLabel.style.color = fleet.fontColor || '#f0f0f0';

                // État de la flotte
                const fleetStatus = document.createElement('span');
                fleetStatus.classList.add('fleet-status');
                fleetStatus.textContent = fleet.state || 'Unknown';

                if (fleet.publicKey) {
                    // Ajouter la tooltip et le gestionnaire d'événements pour les flottes avec publicKey
                    const tooltipWrapper = document.createElement('span');
                    tooltipWrapper.classList.add('fleet-status-tooltip');
                    const tooltipText = document.createElement('span');
                    tooltipText.classList.add('tooltiptext');
                    tooltipText.textContent = 'Click to stop or reset the fleet. STOPPED fleets will resume, and ERROR fleets will retry.';
                    tooltipWrapper.appendChild(fleetStatus);
                    tooltipWrapper.appendChild(tooltipText);

                    fleetStatus.addEventListener('click', async () => {
                        await resetFleetState(fleet);
                    });

                    // Ajouter la nourriture pour les flottes avec publicKey
                    const fleetFood = document.createElement('span');
                    fleetFood.classList.add('fleet-food');
                    fleetFood.textContent = fleet.foodCnt || 0;

                    fleetRow.appendChild(fleetLabel);
                    fleetRow.appendChild(fleetFood);
                    fleetRow.appendChild(tooltipWrapper);
                } else {
                    // Sans publicKey, afficher seulement le label et l'état
                    fleetRow.appendChild(fleetLabel);
                    fleetRow.appendChild(fleetStatus);
                }

                assistStatsContent.appendChild(fleetRow);
            }

            // Restore scroll position after DOM update
            requestAnimationFrame(() => {
                assistStatsView.scrollTop = scrollTop;
                console.log(`Restored assist-stats-view scroll position: ${assistStatsView.scrollTop}`);
                // Verify if scroll position was maintained
                setTimeout(() => {
                    if (assistStatsView.scrollTop !== scrollTop) {
                        console.warn(`Scroll position reset detected in assist-stats-view! Expected: ${scrollTop}, Actual: ${assistStatsView.scrollTop}`);
                        assistStatsView.scrollTop = scrollTop; // Force restore
                    }
                }, 0);
            });
            */
    }

    async function updateAssistStarbaseStatus(starbases) {
        document.querySelectorAll('#assistStarbaseStatus .assist-modal-body table .assist-starbase-row').forEach(e => e.remove());

        for (let starbase of starbases) {
            let starbaseRow = document.createElement('tr');
            starbaseRow.classList.add('assist-starbase-row');
            let starbaseLabel = document.createElement('span');
            starbaseLabel.innerHTML = starbase.name;
            let starbaseLabelTd = document.createElement('td');
            starbaseLabelTd.appendChild(starbaseLabel);
            let starbaseCoords = document.createElement('span');
            starbaseCoords.innerHTML = starbase.coords;
            let starbaseCoordsTd = document.createElement('td');
            starbaseCoordsTd.appendChild(starbaseCoords);
            let starbaseFood = document.createElement('span');
            starbaseFood.innerHTML = `${starbase.foodBalanceHr}hr [${(starbase.foodBalancePerc * 100).toFixed(2)}%]`;
            let starbaseFoodTd = document.createElement('td');
            starbaseFoodTd.appendChild(starbaseFood);
            let starbaseTools = document.createElement('span');
            starbaseTools.innerHTML = `${starbase.toolBalanceHr}hr [${(starbase.toolBalancePerc * 100).toFixed(2)}%]`;
            let starbaseToolsTd = document.createElement('td');
            starbaseToolsTd.appendChild(starbaseTools);
            starbaseRow.appendChild(starbaseLabelTd);
            starbaseRow.appendChild(starbaseCoordsTd);
            starbaseRow.appendChild(starbaseFoodTd);
            starbaseRow.appendChild(starbaseToolsTd);
            let targetElem = document.querySelector('#assistStarbaseStatus .assist-modal-body table');
            targetElem.appendChild(starbaseRow);
        }
    }

    function updateFleetState(fleet, newState, overrideError) {
        if ((typeof fleet.state == 'undefined') || !fleet.state.includes('ERROR') || overrideError) {
            fleet.state = newState;

            // Vérifier si l'ancien système d'interface existe
            const assistStatusElement = document.querySelector('#assistStatus');
            if (assistStatusElement) {
                updateAssistStatus(fleet);
            } else {
                // Pour le nouveau système de workflow, juste loguer
                logger.log(4, `Fleet ${fleet.label}: ${newState}`);
                logger.log(4, fleet);
            }
        }
    }

    async function exportConfigToTextarea() {
        let importText = document.querySelector('#importText');
        importText.value = '{';
        let fleetKeys = GM_listValues();
        //logger.log(2, 'assistImportToggle: fleetKeys', fleetKeys);
        for (let i in fleetKeys) {
            let fleetSavedData = await GM.getValue(fleetKeys[i], '{}');
            //let fleetParsedData = JSON.parse(fleetSavedData);
            importText.value += '"' + fleetKeys[i] + '":' + fleetSavedData;
            if (i < fleetKeys.length - 1) importText.value += ',';
        }
        importText.value += '}';
    }

    async function assistImportToggle() {
        let targetElem = document.querySelector('#importModal');
        if (targetElem.style.display === 'none') {
            targetElem.style.display = 'block';
            await exportConfigToTextarea();
            assistModalToggle();
        } else {
            targetElem.style.display = 'none';
        }
    }

    


    

    


    async function assistStatusToggle() {
        let targetElem = document.querySelector('#assistStatus');
        if (targetElem.style.display === 'none') {
            targetElem.style.display = 'block';
        } else {
            targetElem.style.display = 'none';
        }
        //await calcMiningFleet();
    }


    async function handleUndockAll() {
        for (let i = 0, n = userFleets.length; i < n; i++) {
            let fleetAcctInfo = await rpc.getReadConnection().getAccountInfo(userFleets[i].publicKey);
            let [fleetState, extra] = getFleetState(fleetAcctInfo);
            if (fleetState === 'StarbaseLoadingBay') {
                let starbase = await sageProgram.account.starbase.fetch(extra.starbase);
                let coords = starbase.sector[0].toNumber() + ',' + starbase.sector[1].toNumber();
                await execUndock(userFleets[i], coords);
            }
        }
    }

    async function handleClean() {

        let fleetKeys = GM_listValues();
        let fleetKey = null;
        let removedCounter = 0;
        for (let i in fleetKeys) {

            fleetKey = fleetKeys[i];

            let fleetSavedData = await GM.getValue(fleetKey, '{}');
            let fleetParsedData = JSON.parse(fleetSavedData);

            if (typeof fleetParsedData.assignment == "undefined") continue; //skip crafting jobs and global settings

            if (!userFleets.some(item => item.publicKey.toString() === fleetKey)) {
                logger.log(1, `Deleting ${fleetParsedData.name}`);
                GM.deleteValue(fleetKey);
                removedCounter++;
            }
        }
        let cleanBtn = document.querySelector('#cleanBtn');
        if (cleanBtn) cleanBtn.innerHTML = '' + removedCounter + ' removed';

        setTimeout(() => {
            if (cleanBtn) cleanBtn.innerHTML = 'Clean';
        }, 2000);
    }

    async function handleMovement(i, moveDist, moveX, moveY, isStarbaseAndWarpSubwarp) {
        let moveTime = 1;
        let warpCooldownFinished = 0;
        let fleetAcctInfo = await getAccountInfo(userFleets[i].label, 'full fleet info', userFleets[i].publicKey);
        let [fleetState, extra] = getFleetState(fleetAcctInfo, userFleets[i]);

        //Fleet idle and needs to be moved?
        if (fleetState == 'Idle' && extra.length > 1 && moveDist && moveX !== null && moveX !== '' && moveY != null && moveY !== '') {
            if (extra[0] !== moveX || extra[1] !== moveY) {
                let warpCost = calcWarpFuelReq(userFleets[i], extra, [moveX, moveY], isStarbaseAndWarpSubwarp);
                logger.log(4, `${utils.FleetTimeStamp(userFleets[i].label)} warpCost: ${warpCost}`);
                let subwarpCost = calculateSubwarpFuelBurn(userFleets[i], moveDist);
                let fleetCurrentFuelTank = await rpc.getReadConnection().getParsedTokenAccountsByOwner(userFleets[i].fuelTank, {programId: tokenProgramPK});
                let currentFuel = fleetCurrentFuelTank.value.find(item => item.account.data.parsed.info.mint === sageGameAcct.account.mints.fuel.toString());
                let currentFuelCnt = currentFuel ? currentFuel.account.data.parsed.info.tokenAmount.uiAmount - userFleets[i].exitSubwarpWillBurnFuel : 0;

                let fleetCurrentCargo = await rpc.getReadConnection().getParsedTokenAccountsByOwner(userFleets[i].cargoHold, {programId: tokenProgramPK});
                let currentCargoFuel = fleetCurrentCargo.value.find(item => item.account.data.parsed.info.mint === sageGameAcct.account.mints.fuel.toString());
                let currentCargoFuelCnt = currentCargoFuel ? currentCargoFuel.account.data.parsed.info.tokenAmount.uiAmount : 0;

                let shortSubwarp = moveDist < 1.5 && globalSettings.subwarpShortDist ? true : false;
                let fleetAcctData = sageProgram.coder.accounts.decode('fleet', fleetAcctInfo.data);
                let warpCooldownExpiresAt = fleetAcctData.warpCooldownExpiresAt.toNumber() * 1000;
                let forceSubwarp = false;
                if (!shortSubwarp && userFleets[i].moveType == 'warp-subwarp-warp' && Date.now() < warpCooldownExpiresAt) {
                    let warpCooldownLeft = (warpCooldownExpiresAt - Date.now()) / 1000;
                    let fullDistanceLeft = calculateMovementDistance(extra, [moveX, moveY]);
                    let subwarpDistanceWhileCooldown = warpCooldownLeft * (userFleets[i].subwarpSpeed / 1e6);
                    let maxSubwarpDistancePastCooldown = (userFleets[i].warpCooldown - warpCooldownLeft) * (userFleets[i].subwarpSpeed / 1e6); //how far could we subwarp in the past cooldown time?
                    //if the past warp cooldown is too low that it would've allowed a subwarp, we subwarp if we can do at least 0.5 AU in the remaining time. If a lot more of the cooldown is done, we check if we can do at least 0.71 AU because moveX and moveY can be off by 0.49999 (=0.5) each (due to rounding) and sqrt(0.5*0.5+0.5*0.5)=0.707, so it is possible that the previous subwarp was 0.707 units off, but we don't want to subwarp again
                    if (fullDistanceLeft > 0 && ((maxSubwarpDistancePastCooldown < 0.5 && subwarpDistanceWhileCooldown >= 0.5) || subwarpDistanceWhileCooldown >= 0.71)) {
                        if (subwarpDistanceWhileCooldown < 1.415) subwarpDistanceWhileCooldown = 1.415; // we subwarp at least 1 sector in the direction of the target and we choose 1.415 (=sqrt(2) rounded up), so all 8 directions have the same chance
                        let distanceRatio = Math.min(1, subwarpDistanceWhileCooldown / fullDistanceLeft);
                        if (distanceRatio < 1) {
                            let moveXNew = Math.round((moveX - extra[0]) * distanceRatio) + extra[0];
                            let moveYNew = Math.round((moveY - extra[1]) * distanceRatio) + extra[1];
                            let moveDistNew = calculateMovementDistance(extra, [moveXNew, moveYNew]);
                            //if we would be near the target after subwarp, we subwarp the full distance if "subwarpShortDist" is enabled, so we only set the new coords if this isn't the case
                            if (!globalSettings.subwarpShortDist || moveDist - moveDistNew >= 1.5) {
                                moveX = moveXNew;
                                moveY = moveYNew;
                                moveDist = moveDistNew;

                                //if we don't subwarp the full way to the target, we need to save the target (exactly as in the warp block below), just in case SLYA gets reloaded
                                const fleetPK = userFleets[i].publicKey.toString();
                                const fleetSavedData = await GM.getValue(fleetPK, '{}');
                                const fleetParsedData = JSON.parse(fleetSavedData);
                                fleetParsedData.moveTarget = userFleets[i].moveTarget;
                                await GM.setValue(fleetPK, JSON.stringify(fleetParsedData));
                            }
                        }
                        forceSubwarp = true;
                    }
                }

                //Should a warp be attempted?
                //if (userFleets[i].moveType == 'warp' && (currentFuelCnt + currentCargoFuelCnt) >= warpCost && !shortSubwarp) {
                if ((userFleets[i].moveType == 'warp' || userFleets[i].moveType == 'warp-subwarp-warp' || isStarbaseAndWarpSubwarp) && (currentFuelCnt + currentCargoFuelCnt) >= warpCost && !shortSubwarp && !forceSubwarp) {
                    //let fleetAcctData = sageProgram.coder.accounts.decode('fleet', fleetAcctInfo.data);
                    //let warpCooldownExpiresAt = fleetAcctData.warpCooldownExpiresAt.toNumber() * 1000;

                    //Wait for cooldown
                    while (Date.now() < warpCooldownExpiresAt) {
                        if (!userFleets[i].state.includes('Warp C/D')) {
                            const warpCDExpireTimeStr = `[${utils.TimeToStr(new Date(warpCooldownExpiresAt))}]`;
                            logger.log(1, `${utils.FleetTimeStamp(userFleets[i].label)} Awaiting Warp C/D ${warpCDExpireTimeStr}`);
                            updateFleetState(userFleets[i], `Warp C/D ${warpCDExpireTimeStr}`);
                        }

                        //await utils.wait(Math.max(1000, warpCooldownExpiresAt - Date.now()));
                        if (warpCooldownExpiresAt - Date.now() < 5000) await utils.wait(Math.max(1000, warpCooldownExpiresAt - Date.now()));
                        else await utils.wait(5000);
                        if (userFleets[i].stopping) return;
                    }
                    await utils.wait(2000); //Extra wait to ensure accuracy

                    const fleetPK = userFleets[i].publicKey.toString();
                    const fleetSavedData = await GM.getValue(fleetPK, '{}');
                    const fleetParsedData = JSON.parse(fleetSavedData);
                    const assignment = fleetParsedData.assignment;

                    //Calculate next warp point if more than 1 is needed to arrive at final destination
                    if (moveDist > userFleets[i].maxWarpDistance / 100) {
                        [moveX, moveY] = calcNextWarpPoint(userFleets[i].maxWarpDistance, extra, [moveX, moveY]);

                        //Saves temporary waypoints for transports in case the page is refreshed mid-journey while using warp
                        //const fleetPK = userFleets[i].publicKey.toString();
                        //const fleetSavedData = await GM.getValue(fleetPK, '{}');
                        //const fleetParsedData = JSON.parse(fleetSavedData);
                        //logger.log(3, `${utils.FleetTimeStamp(userFleets[i].label)} moveTargets`, fleetParsedData.moveTarget, userFleets[i].moveTarget);
                        fleetParsedData.moveTarget = userFleets[i].moveTarget;
                        await GM.setValue(fleetPK, JSON.stringify(fleetParsedData));

                        //Update distance based on new warp target
                        moveDist = calculateMovementDistance(extra, [moveX, moveY]);
                    }

                    moveTime = calculateWarpTime(userFleets[i], moveDist);
                    const warpResult = await execWarp(userFleets[i], moveX, moveY, moveTime);
                    await sendToInflux(`movement,fleet=${influxEscape(userFleets[i].label)},fromX=${extra[0]},fromY=${extra[1]},toX=${moveX},toY=${moveY},assignment=${assignment} type="warp",burnedFuel=${moveDist * (userFleets[i].warpFuelConsumptionRate / 100)},moveTime=${moveTime},moveDist=${moveDist}`);
                    if (userFleets[i].scanLastFuelAmount) userFleets[i].scanLastFuelAmount -= moveDist * (userFleets[i].warpFuelConsumptionRate / 100);
                    warpCooldownFinished = warpResult.warpCooldownFinished;
                } else if (currentFuelCnt + currentCargoFuelCnt >= subwarpCost) {
                    moveTime = calculateSubwarpTime(userFleets[i], moveDist);
                    await execSubwarp(userFleets[i], moveX, moveY, moveTime);
                    const fleetPK = userFleets[i].publicKey.toString();
                    const fleetSavedData = await GM.getValue(fleetPK, '{}');
                    const fleetParsedData = JSON.parse(fleetSavedData);
                    const assignment = fleetParsedData.assignment;
                    await sendToInflux(`movement,fleet=${influxEscape(userFleets[i].label)},fromX=${extra[0]},fromY=${extra[1]},toX=${moveX},toY=${moveY},assignment=${assignment} type="subwarp",burnedFuel=${moveDist * (userFleets[i].subwarpFuelConsumptionRate / 100)},moveTime=${moveTime},moveDist=${moveDist}`);
                    if (userFleets[i].scanLastFuelAmount) userFleets[i].scanLastFuelAmount -= moveDist * (userFleets[i].subwarpFuelConsumptionRate / 100);
                } else {
                    logger.log(1, `${utils.FleetTimeStamp(userFleets[i].label)} Unable to move, lack of fuel`);
                    updateFleetState(userFleets[i], 'ERROR: Not enough fuel');
                    if (globalSettings.emailNotEnoughFFA) await sendEMail(userFleets[i].label + ' not enough fuel', '');
                }
            }
        }

        await utils.wait(2000); //Allow time for RPC to update
        fleetAcctInfo = await getAccountInfo(userFleets[i].label, 'full fleet info', userFleets[i].publicKey);
        [fleetState, extra] = getFleetState(fleetAcctInfo, userFleets[i]);
        let warpFinish = fleetState == 'MoveWarp' ? extra.warpFinish.toNumber() * 1000 : 0;
        let subwarpFinish = fleetState == 'MoveSubwarp' ? extra.arrivalTime.toNumber() * 1000 : 0;
        let endTime = warpFinish > subwarpFinish ? warpFinish : subwarpFinish;

        const calcEndTime = Date.now() + moveTime * 1000;
        logger.log(3, `${utils.FleetTimeStamp(userFleets[i].label)} Expected arrival (chain): ${utils.TimeToStr(new Date(endTime))}`);
        logger.log(3, `${utils.FleetTimeStamp(userFleets[i].label)} Expected arrival (calc): ${utils.TimeToStr(new Date(calcEndTime))}`);

        //Sometimes the chain returns null, use calculated time as fallback
        if (!endTime) endTime = calcEndTime;

        userFleets[i].moveEnd = endTime;
        await utils.wait(moveTime * 1000);
        while (endTime > Date.now()) {
            const newFleetState = 'Move [' + utils.TimeToStr(new Date(endTime)) + ']';
            updateFleetState(userFleets[i], newFleetState);
            await utils.wait(Math.max(1000, endTime - Date.now()));
        }

        //await utils.wait(2000);

        let localQueueExitWarpSubwarp = false;
        if (globalSettings.queueExitWarpSubwarp) {
            //exclude scanning fleets from this feature, because we can't bundle a scan instruction with any other ix
            let fleetSavedData = await GM.getValue(userFleets[i].publicKey.toString(), '{}');
            let fleetParsedData = JSON.parse(fleetSavedData);
            if (fleetParsedData.assignment != 'Scan') localQueueExitWarpSubwarp = true;
        }

        if (fleetState == 'MoveWarp') {
            if (localQueueExitWarpSubwarp) {
                userFleets[i].exitWarpSubwarpPending = 1;
                updateFleetState(userFleets[i], 'Idle');
            } else {
                await execExitWarp(userFleets[i]);
            }
        } else if (fleetState == 'MoveSubwarp') {
            if (localQueueExitWarpSubwarp) {
                userFleets[i].exitWarpSubwarpPending = 2;
                updateFleetState(userFleets[i], 'Idle');
            } else {
                await execExitSubwarp(userFleets[i]);
            }
        }

        fleetAcctInfo = await getAccountInfo(userFleets[i].label, 'full fleet info', userFleets[i].publicKey);
        [fleetState, extra] = getFleetState(fleetAcctInfo, userFleets[i]);
        if (fleetState == 'Idle' && extra) {
            let targetX = userFleets[i].moveTarget != '' && userFleets[i].moveTarget.split(',').length > 1 ? userFleets[i].moveTarget.split(',')[0].trim() : '';
            let targetY = userFleets[i].moveTarget != '' && userFleets[i].moveTarget.split(',').length > 1 ? userFleets[i].moveTarget.split(',')[1].trim() : '';
            if (extra[0] == targetX && extra[1] == targetY) {
                //bugfix: moveTarget is string based, not an array!
                //userFleets[i].moveTarget = [];
                userFleets[i].moveTarget = '';
                let fleetSavedData = await GM.getValue(userFleets[i].publicKey.toString(), '{}');
                let fleetParsedData = JSON.parse(fleetSavedData);
                let fleetPK = userFleets[i].publicKey.toString();
                fleetParsedData.moveTarget = userFleets[i].moveTarget;
                await GM.setValue(fleetPK, JSON.stringify(fleetParsedData));
            }
        }

        return warpCooldownFinished;
    }


    function influxEscape(val) {
        return val.replaceAll("\\", "\\\\").replaceAll(" ", "\\ ").replaceAll(",", "\\,").replaceAll("=", "\\=");
    }

    async function sendToInflux(msg) {
        if (!globalSettings.influxURL.length) return;
        let message = '';
        try {
            logger.log(2, 'Sending message to influx:', msg);
            const response = await fetch(globalSettings.influxURL, {
                method: "POST",
                body: msg,
                headers: {
                    "Authorization": (globalSettings.influxURL.includes('/v2/') ? "Token " : "Bearer ") + globalSettings.influxAuth
                }
            });
            if (!response.ok) {
                message = 'Error while sending a request to influx: ' + response.status + ' ' + response.statusText;
            } else {
                message = 'Influx: Request was successful.';
            }
        } catch (error) {
            message = 'Error while sending a request to influx: ' + error.message;
        }
        logger.log(2, message);
    }


    async function handleMining(i, fleetState, fleetCoords, fleetMining) {
        let destX = userFleets[i].destCoord.split(',')[0].trim();
        let destY = userFleets[i].destCoord.split(',')[1].trim();
        let starbaseX = userFleets[i].starbaseCoord.split(',')[0].trim();
        let starbaseY = userFleets[i].starbaseCoord.split(',')[1].trim();

        let mineItem = mineItems.find(item => item.account.mint.toString() === userFleets[i].mineResource);
        let resourceHardness = mineItem.account.resourceHardness;
        let planets = await getPlanetsFromCoords(destX, destY);
        let sageResource = null;
        let planet = null;
        for (let planetCheck of planets) {

            let resourceCheck = await getMineableResourceFromPlanet(planetCheck.publicKey.toString(), mineItem.publicKey.toString());
            if (sageResource === null && resourceCheck && resourceCheck.publicKey) {
                sageResource = resourceCheck;
                planet = planetCheck
            }
        }
        let systemRichness = 0;
        if (sageResource && sageResource.account) {
            systemRichness = sageResource.account.systemRichness;
        } else {
            let resShort = cargoItems.find(r => r.token == userFleets[i].mineResource).name;
            logger.log(1, `${utils.FleetTimeStamp(userFleets[i].label)} ERROR: ${resShort} not found at mining location`);
            updateFleetState(userFleets[i], `ERROR: ${resShort} not found at mining location`);
            return;
        }
        // fleet PDA
        let [fleetResourceToken] = await BrowserAnchor.anchor.web3.PublicKey.findProgramAddressSync(
            [
                userFleets[i].cargoHold.toBuffer(),
                tokenProgramPK.toBuffer(),
                new solanaWeb3.PublicKey(userFleets[i].mineResource).toBuffer()
            ],
            programPK
        );
        let [fleetFoodToken] = await BrowserAnchor.anchor.web3.PublicKey.findProgramAddressSync(
            [
                userFleets[i].cargoHold.toBuffer(),
                tokenProgramPK.toBuffer(),
                sageGameAcct.account.mints.food.toBuffer()
            ],
            programPK
        );
        let [fleetAmmoToken] = await BrowserAnchor.anchor.web3.PublicKey.findProgramAddressSync(
            [
                userFleets[i].ammoBank.toBuffer(),
                tokenProgramPK.toBuffer(),
                sageGameAcct.account.mints.ammo.toBuffer()
            ],
            programPK
        );
        let [fleetCargoAmmoToken] = await BrowserAnchor.anchor.web3.PublicKey.findProgramAddressSync(
            [
                userFleets[i].cargoHold.toBuffer(),
                tokenProgramPK.toBuffer(),
                sageGameAcct.account.mints.ammo.toBuffer()
            ],
            programPK
        );
        let [fleetFuelToken] = await BrowserAnchor.anchor.web3.PublicKey.findProgramAddressSync(
            [
                userFleets[i].fuelTank.toBuffer(),
                tokenProgramPK.toBuffer(),
                new solanaWeb3.PublicKey(fuelItem.token).toBuffer()
            ],
            programPK
        );

        let fleetCurrentFuelTank = await rpc.getReadConnection().getParsedTokenAccountsByOwner(userFleets[i].fuelTank, {programId: tokenProgramPK});
        let currentFuel = fleetCurrentFuelTank.value.find(item => item.account.data.parsed.info.mint === sageGameAcct.account.mints.fuel.toString());
        let fleetFuelAcct = currentFuel ? currentFuel.pubkey : fleetFuelToken;
        let currentFuelCnt = currentFuel ? currentFuel.account.data.parsed.info.tokenAmount.uiAmount - userFleets[i].exitSubwarpWillBurnFuel : 0;
        let fleetCurrentCargo = await rpc.getReadConnection().getParsedTokenAccountsByOwner(userFleets[i].cargoHold, {programId: tokenProgramPK});
        //todo: cargoCnt currently assumes that 1 rss always takes 1 of the cargo room
        let cargoCnt = fleetCurrentCargo.value.reduce((n, {account}) => n + account.data.parsed.info.tokenAmount.uiAmount, 0);
        let currentFood = fleetCurrentCargo.value.find(item => item.account.data.parsed.info.mint === sageGameAcct.account.mints.food.toString());
        let fleetFoodAcct = currentFood ? currentFood.pubkey : fleetFoodToken;
        let currentFoodCnt = currentFood ? currentFood.account.data.parsed.info.tokenAmount.uiAmount : 0;
        let currentResource = fleetCurrentCargo.value.find(item => item.account.data.parsed.info.mint === userFleets[i].mineResource);
        let fleetResourceAcct = currentResource ? currentResource.pubkey : fleetResourceToken;
        let currentResourceCnt = currentResource ? currentResource.account.data.parsed.info.tokenAmount.uiAmount : 0;
        let fleetCurrentAmmoBank = await rpc.getReadConnection().getParsedTokenAccountsByOwner(userFleets[i].ammoBank, {programId: tokenProgramPK});
        let currentAmmo = fleetCurrentAmmoBank.value.find(item => item.account.data.parsed.info.mint === sageGameAcct.account.mints.ammo.toString());
        let fleetAmmoAcct = currentAmmo ? currentAmmo.pubkey : fleetAmmoToken;
        let currentAmmoCnt = currentAmmo ? currentAmmo.account.data.parsed.info.tokenAmount.uiAmount : 0;

        let miningDuration = calculateMiningDuration(userFleets[i].cargoCapacity - cargoCnt, userFleets[i].miningRate, resourceHardness, systemRichness);
        let foodForDuration = Math.ceil(miningDuration * (userFleets[i].foodConsumptionRate / 10000));
        let ammoForDuration = Math.ceil(miningDuration * (userFleets[i].ammoConsumptionRate / 10000));
        ammoForDuration = Math.min(userFleets[i].ammoCapacity, ammoForDuration);

        let distToTarget = calculateMovementDistance(fleetCoords, [destX, destY]);
        let distReturn = calculateMovementDistance([destX, destY], [starbaseX, starbaseY]);

        logger.log(4, `${utils.FleetTimeStamp(userFleets[i].label)} handleMining -> fleet:`, fleetCoords, `starbase:`, [starbaseX, starbaseY], `target:`, [destX, destY]);

        let isStarbaseAndWarpSubwarp = (userFleets[i].moveType == 'warpsubwarp' && ((fleetCoords[0] == starbaseX && fleetCoords[1] == starbaseY) || (fleetCoords[0] == destX && fleetCoords[1] == destY)));
        let isSourceStarbaseAndWarpSubwarp = (userFleets[i].moveType == 'warpsubwarp' && (fleetCoords[0] == starbaseX && fleetCoords[1] == starbaseY));

        const warpCostToTarget = fleetCoords.length == 2 ? calcWarpFuelReq(userFleets[i], fleetCoords, [destX, destY], isSourceStarbaseAndWarpSubwarp) : 0;
        let warpCost = warpCostToTarget + calcWarpFuelReq(userFleets[i], [destX, destY], [starbaseX, starbaseY], userFleets[i].moveType == 'warpsubwarp') + userFleets[i].planetExitFuelAmount;
        let halfWarpCost = warpCostToTarget + calculateSubwarpFuelBurn(userFleets[i], distReturn) + userFleets[i].planetExitFuelAmount;
        let subwarpCost = calculateSubwarpFuelBurn(userFleets[i], distToTarget) + calculateSubwarpFuelBurn(userFleets[i], distReturn) + userFleets[i].planetExitFuelAmount;
        let fuelNeeded = userFleets[i].planetExitFuelAmount;
        if (userFleets[i].moveType == 'warp' || userFleets[i].moveType == 'warp-subwarp-warp' || isStarbaseAndWarpSubwarp) {
            fuelNeeded += userFleets[i].fuelCapacity < warpCost ? userFleets[i].fuelCapacity < halfWarpCost ? subwarpCost : halfWarpCost : warpCost;
        } else fuelNeeded += subwarpCost;

        async function handleMineMovement() {
            if (userFleets[i].moveTarget && userFleets[i].moveTarget !== '') {
                let targetX = userFleets[i].moveTarget.split(',').length > 1 ? userFleets[i].moveTarget.split(',')[0].trim() : '';
                let targetY = userFleets[i].moveTarget.split(',').length > 1 ? userFleets[i].moveTarget.split(',')[1].trim() : '';
                let moveDist = calculateMovementDistance(fleetCoords, [targetX, targetY]);
                if (moveDist > 0) {
                    let warpCooldownFinished = await handleMovement(i, moveDist, targetX, targetY, isStarbaseAndWarpSubwarp);
                } else {
                    logger.log(1, `${utils.FleetTimeStamp(userFleets[i].label)} Idle 💤`);
                    updateFleetState(userFleets[i], 'Idle');
                }
            } else {
                const msg = 'ERROR: Fleet must start at Target or Starbase';
                logger.log(1, `${utils.FleetTimeStamp(userFleets[i].label)} Mining - ${msg}`);
                updateFleetState(userFleets[i], msg);
            }
        }

        if (fleetState !== 'Idle') userFleets[i].justResupplied = false;

        //Not mining?
        if (fleetState === 'Idle') {
            let errorResource = [];
            let needSupplies = false;

            //Hard-coded 60 second duration check: no point resuming mining if it'll take less than 1 minute to finish
            if (miningDuration < 60) {
                logger.log(1, `${utils.FleetTimeStamp(userFleets[i].label)} Supplies low, only ${miningDuration} seconds left`);
                needSupplies = true;
            } else if (currentFuelCnt < fuelNeeded || currentAmmoCnt < ammoForDuration || currentFoodCnt < foodForDuration) {
                needSupplies = true;
            }
            logger.log(4, `currentFoodCnt < foodForDuration ${currentFoodCnt}<${currentFoodCnt}`);

            //sometimes the RPC didn't catch up when we send the combined resupply tx - even after the loop wait time of 10 seconds. So we try to wait another 15+10 seconds if we think that's happening
            if (needSupplies && userFleets[i].justResupplied) {
                logger.log(1, `${utils.FleetTimeStamp(userFleets[i].label)} Fleet just resupplied, but it is trying to resupply again. RPC sync problems? We wait some time to be sure`);
                updateFleetState(userFleets[i], 'Waiting ...');
                await utils.wait(15000);
                updateFleetState(userFleets[i], 'Idle');
                userFleets[i].justResupplied = false;
                return;
            }
            userFleets[i].justResupplied = false;

            let minerSupplySingleTx = globalSettings.minerSupplySingleTx;
            logger.log(4, `Needs ressuply ${needSupplies} singletx : ${minerSupplySingleTx}`);
            //Needs Resupply?
            if (needSupplies) {
                logger.log(1, `${utils.FleetTimeStamp(userFleets[i].label)} Need resupply`);

                //Recalulate requirements based on total cargo cap
                miningDuration = calculateMiningDuration(userFleets[i].cargoCapacity, userFleets[i].miningRate, resourceHardness, systemRichness);
                foodForDuration = Math.ceil(miningDuration * (userFleets[i].foodConsumptionRate / 10000));
                ammoForDuration = Math.ceil(miningDuration * (userFleets[i].ammoConsumptionRate / 10000));
                ammoForDuration = Math.min(userFleets[i].ammoCapacity, ammoForDuration);

                logger.log(2, `${utils.FleetTimeStamp(userFleets[i].label)} Calculated miningDuration: ${miningDuration}`);
                logger.log(2, `${utils.FleetTimeStamp(userFleets[i].label)} fuel: ${currentFuelCnt}/${fuelNeeded}`);
                logger.log(2, `${utils.FleetTimeStamp(userFleets[i].label)} ammo: ${currentAmmoCnt}/${ammoForDuration}`);
                //logger.log(2, `${utils.FleetTimeStamp(userFleets[i].label)} ammoForDuration: ${ammoForDuration} = miningDuration ${miningDuration} * (ammoConsumptionRate ${userFleets[i].ammoConsumptionRate} / 10000)`);
                logger.log(2, `${utils.FleetTimeStamp(userFleets[i].label)} food: ${currentFoodCnt}/${foodForDuration}`);

                if (fleetCoords[0] == starbaseX && fleetCoords[1] == starbaseY) {
                    let transactions = [];
                    let resp = await execDock(userFleets[i], userFleets[i].starbaseCoord, minerSupplySingleTx);
                    if (minerSupplySingleTx && resp) {
                        transactions.push(resp);
                    }
                    //await execDock(userFleets[i], userFleets[i].starbaseCoord);
                    logger.log(1, `${utils.FleetTimeStamp(userFleets[i].label)} Unloading resource`);
                    updateFleetState(userFleets[i], `Unloading`);

                    let unloadAmount = 0;
                    if (globalSettings.minerUnloadsAll) {
                        for (let currentRes of fleetCurrentCargo.value) {

                            // don't unload food
                            if (currentRes.account.data.parsed.info.mint === sageGameAcct.account.mints.food.toString()) continue;

                            let amountToUnload = currentRes.account.data.parsed.info.tokenAmount.uiAmount;
                            if (globalSettings.minerKeep1 && amountToUnload > 0) {
                                amountToUnload -= 1;
                            }
                            if (amountToUnload > 0) {
                                resp = await execCargoFromFleetToStarbase(userFleets[i], userFleets[i].cargoHold, currentRes.account.data.parsed.info.mint, userFleets[i].starbaseCoord, amountToUnload, minerSupplySingleTx);
                                if (minerSupplySingleTx && resp) {
                                    transactions.push(resp);
                                }
                                unloadAmount += amountToUnload;
                            }
                        }
                    } else {
                        unloadAmount = currentResourceCnt;
                        if (globalSettings.minerKeep1 && unloadAmount > 0) {
                            unloadAmount -= 1;
                        }
                        if (unloadAmount > 0) {
                            resp = await execCargoFromFleetToStarbase(userFleets[i], userFleets[i].cargoHold, userFleets[i].mineResource, userFleets[i].starbaseCoord, unloadAmount, minerSupplySingleTx);
                            if (minerSupplySingleTx && resp) {
                                transactions.push(resp);
                            }
                            //await utils.wait(2000);
                        }
                    }

                    //if (currentFuelCnt < userFleets[i].fuelCapacity) {
                    if (currentFuelCnt < fuelNeeded) {
                        logger.log(1, `${utils.FleetTimeStamp(userFleets[i].label)} Loading fuel`);
                        updateFleetState(userFleets[i], `Loading`);
                        let fuelCargoTypeAcct = cargoTypes.find(item => item.account.mint.toString() == sageGameAcct.account.mints.fuel);
                        let fuelResp = await execCargoFromStarbaseToFleet(userFleets[i], userFleets[i].fuelTank, fleetFuelAcct, sageGameAcct.account.mints.fuel.toString(), fuelCargoTypeAcct, userFleets[i].starbaseCoord, userFleets[i].fuelCapacity - currentFuelCnt, globalSettings.fleetForceConsumableAmount, minerSupplySingleTx);
                        if (fuelResp && fuelResp.name == 'NotEnoughResource') {
                            logger.log(1, `${utils.FleetTimeStamp(userFleets[i].label)} ERROR: Not enough fuel`);
                            errorResource.push('fuel');
                        } else if (minerSupplySingleTx && fuelResp.tx) {
                            transactions.push(fuelResp.tx);
                        }
                        //await utils.wait(2000);
                    } else {
                        logger.log(1, `${utils.FleetTimeStamp(userFleets[i].label)} Fuel loading skipped: ${currentFuelCnt} / ${fuelNeeded}`);
                    }

                    if (currentAmmoCnt < ammoForDuration) {
                        logger.log(1, `${utils.FleetTimeStamp(userFleets[i].label)} Loading ammo`);
                        updateFleetState(userFleets[i], `Loading`);
                        let ammoCargoTypeAcct = cargoTypes.find(item => item.account.mint.toString() == sageGameAcct.account.mints.ammo);
                        let ammoResp = await execCargoFromStarbaseToFleet(userFleets[i], userFleets[i].ammoBank, fleetAmmoAcct, sageGameAcct.account.mints.ammo.toString(), ammoCargoTypeAcct, userFleets[i].starbaseCoord, userFleets[i].ammoCapacity - currentAmmoCnt, globalSettings.fleetForceConsumableAmount, minerSupplySingleTx);
                        if (ammoResp && ammoResp.name == 'NotEnoughResource') {
                            logger.log(1, `${utils.FleetTimeStamp(userFleets[i].label)} ERROR: Not enough ammo`);
                            errorResource.push('ammo');
                        } else if (minerSupplySingleTx && ammoResp.tx) {
                            transactions.push(ammoResp.tx);
                        }
                        //await utils.wait(2000);
                    } else {
                        logger.log(1, `${utils.FleetTimeStamp(userFleets[i].label)} Ammo loading skipped: ${currentAmmoCnt} / ${ammoForDuration}`);
                    }


                    miningDuration = calculateMiningDuration(userFleets[i].cargoCapacity - cargoCnt + unloadAmount + currentFoodCnt, userFleets[i].miningRate, resourceHardness, systemRichness);
                    foodForDuration = Math.ceil(miningDuration * (userFleets[i].foodConsumptionRate / 10000)) + (globalSettings.minerKeep1 ? 1 : 0);
                    if (currentFoodCnt < foodForDuration) {
                        logger.log(1, `${utils.FleetTimeStamp(userFleets[i].label)} Loading food`);
                        updateFleetState(userFleets[i], `Loading`);
                        let foodCargoTypeAcct = cargoTypes.find(item => item.account.mint.toString() == sageGameAcct.account.mints.food);
                        let foodResp = await execCargoFromStarbaseToFleet(userFleets[i], userFleets[i].cargoHold, fleetFoodAcct, sageGameAcct.account.mints.food.toString(), foodCargoTypeAcct, userFleets[i].starbaseCoord, foodForDuration - currentFoodCnt, globalSettings.fleetForceConsumableAmount, minerSupplySingleTx);
                        if (foodResp && foodResp.name == 'NotEnoughResource') {
                            logger.log(1, `${utils.FleetTimeStamp(userFleets[i].label)} ERROR: Not enough food`);
                            errorResource.push('food');
                        } else if (minerSupplySingleTx && foodResp.tx) {
                            transactions.push(foodResp.tx);
                        }
                        //await utils.wait(2000);
                    } else {
                        logger.log(1, `${utils.FleetTimeStamp(userFleets[i].label)} Food loading skipped: ${currentFoodCnt} / ${foodForDuration}`);
                    }

                    updateFleetState(userFleets[i], `Loading`);

                    if (errorResource.length > 0) {
                        updateFleetState(userFleets[i], `ERROR: Not enough ${errorResource.toString()}`);
                        if (globalSettings.emailNotEnoughFFA) await sendEMail(userFleets[i].label + ' not enough ' + errorResource.toString(), '');
                    } else {
                        //await execUndock(userFleets[i], userFleets[i].starbaseCoord);
                        resp = await execUndock(userFleets[i], userFleets[i].starbaseCoord, minerSupplySingleTx);
                        if (minerSupplySingleTx && resp) {
                            updateFleetState(userFleets[i], `Executing resupply tx`);
                            transactions.push(resp);
                            //logger.log(4, transactions);
                            await txSliceAndSend(transactions, userFleets[i], 'RESUPPLY', 100, 6);
                            updateFleetState(userFleets[i], 'Idle');
                        }
                        userFleets[i].justResupplied = true;
                    }
                    //await utils.wait(2000);
                    //userFleets[i].moveTarget = userFleets[i].destCoord;
                } else {
                    if (userFleets[i].stopping) return;
                    userFleets[i].moveTarget = userFleets[i].starbaseCoord;
                    await handleMineMovement();
                }
            }

            //At mining area?
            else if (fleetCoords[0] == destX && fleetCoords[1] == destY) {
                if (userFleets[i].stopping) return;
                fleetCurrentCargo = await rpc.getReadConnection().getParsedTokenAccountsByOwner(userFleets[i].cargoHold, {programId: tokenProgramPK});
                cargoCnt = fleetCurrentCargo.value.reduce((n, {account}) => n + account.data.parsed.info.tokenAmount.uiAmount, 0);
                currentFood = fleetCurrentCargo.value.find(item => item.account.data.parsed.info.mint === sageGameAcct.account.mints.food.toString());
                fleetFoodAcct = currentFood ? currentFood.pubkey : fleetFoodToken;
                currentFoodCnt = currentFood ? currentFood.account.data.parsed.info.tokenAmount.uiAmount : 0;
                miningDuration = calculateMiningDuration(userFleets[i].cargoCapacity - cargoCnt + currentFoodCnt, userFleets[i].miningRate, resourceHardness, systemRichness);
                await execStartMining(userFleets[i], mineItem, sageResource, planet);
                if (userFleets[i].state.slice(0, 5) !== 'ERROR') updateFleetState(userFleets[i], 'Mine [' + utils.TimeToStr(new Date(Date.now() + (miningDuration * 1000))) + ']')

                //Wait for data to propagate through the RPCs
                await utils.wait(20000);

                //Fetch update mining state from chain
                const fleetAcctInfo = await getAccountInfo(userFleets[i].label, 'full fleet info', userFleets[i].publicKey);
                const [fleetState, extra] = getFleetState(fleetAcctInfo, userFleets[i]);
                logger.log(4, `${utils.FleetTimeStamp(userFleets[i].label)} chain fleet state: ${fleetState}`);
                fleetMining = fleetState === 'MineAsteroid' ? extra : null;
            }

            //Move to mining area
            else {
                if (userFleets[i].stopping) return;
                userFleets[i].moveTarget = userFleets[i].destCoord;
                await handleMineMovement();
            }
        }

        if (userFleets[i].stopping) return;

        //Already mining?
        if (userFleets[i].state.slice(0, 4) === 'Mine' && fleetMining) {
            let maxMiningDuration = calculateMiningDuration(userFleets[i].cargoCapacity, userFleets[i].miningRate, resourceHardness, systemRichness);
            let mineTimePassed = (Date.now() / 1000) - fleetMining.start.toNumber();
            let foodConsumed = Math.ceil(mineTimePassed * (userFleets[i].foodConsumptionRate / 10000));
            let ammoConsumed = Math.ceil(mineTimePassed * (userFleets[i].ammoConsumptionRate / 10000));
            let resourceMined = Math.ceil(mineTimePassed * ((userFleets[i].miningRate / 10000) * (systemRichness / 100)) / (resourceHardness / 100));
            let timeFoodRemaining = Math.ceil((currentFoodCnt - foodConsumed) / (userFleets[i].foodConsumptionRate / 10000));
            let timeAmmoRemaining = userFleets[i].ammoConsumptionRate > 0 ? Math.ceil((currentAmmoCnt - ammoConsumed) / (userFleets[i].ammoConsumptionRate / 10000)) : maxMiningDuration;

            //wrong calculation, fixed: we must not subtract the foodConsumed from the simulated cargo space, because the food doesn't exist anymore
            //we instead ignore the food needed for consumption completely

            //let simCurrentCargo = userFleets[i].cargoCapacity - cargoCnt - resourceMined + currentFoodCnt - foodConsumed;
            let foodMaxConsumed = Math.ceil(maxMiningDuration * (userFleets[i].foodConsumptionRate / 10000));
            let simCurrentCargo = userFleets[i].cargoCapacity - cargoCnt - resourceMined + foodMaxConsumed;

            let timeCargoRemaining = calculateMiningDuration(simCurrentCargo, userFleets[i].miningRate, resourceHardness, systemRichness);
            let timeLimit = Math.min(timeFoodRemaining, timeAmmoRemaining, timeCargoRemaining);
            let mineEnd = Date.now() + (timeLimit * 1000);
            userFleets[i].mineEnd = mineEnd;
            updateFleetState(userFleets[i], 'Mine [' + utils.TimeToStr(new Date(mineEnd)) + ']');//
            let sageResourceAcctInfo = await sageProgram.account.resource.fetch(fleetMining.resource);
            let mineItem = await sageProgram.account.mineItem.fetch(sageResourceAcctInfo.mineItem);
            if (Date.now() > (mineEnd)) {
                await execStopMining(userFleets[i], fleetMining.resource, sageResourceAcctInfo, sageResourceAcctInfo.mineItem, mineItem.mint);
            }
        }
    }

    function hasTransportManifest(manifest) {
        for (const entry of manifest)
            if (entry.res && entry.amt) return true;

        return false;
    }

    async function checkCargo(currentManifest, destinationManifest, fleet) {
        const fleetCurrentCargo = await rpc.getReadConnection().getParsedTokenAccountsByOwner(fleet.cargoHold, {programId: tokenProgramPK});
        const cargoCnt = fleetCurrentCargo.value.reduce((n, {account}) => n + account.data.parsed.info.tokenAmount.uiAmount * cargoItems.find(r => r.token == account.data.parsed.info.mint).size, 0);
        let needToLoad = false;
        let needToUnload = false;
        for (const entry of destinationManifest) {
            if (entry.res && entry.amt > 0) {
                let currentCargoObj = fleetCurrentCargo.value.find(item => item.account.data.parsed.info.mint === entry.res);
                let currentCargoResAmt = currentCargoObj ? currentCargoObj.account.data.parsed.info.tokenAmount.uiAmount : 0;
                if (currentCargoResAmt < entry.amt) needToLoad = true;
                if (currentCargoResAmt > entry.amt) {
                    needToUnload = true;
                    currentManifest.push({res: entry.res, amt: currentCargoResAmt - entry.amt, extra: true});
                }
            }
        }

        for (const entry of currentManifest) {
            if (entry.res && entry.amt > 0) {
                let currentCargoObj = fleetCurrentCargo.value.find(item => item.account.data.parsed.info.mint === entry.res);
                let currentCargoResAmt = currentCargoObj ? currentCargoObj.account.data.parsed.info.tokenAmount.uiAmount : 0;
                if (currentCargoResAmt > (globalSettings.transportKeep1 ? 1 : 0)) needToUnload = true;
            }
        }

        //we check if the fleet has any cargo which isn't part of the current or destination manifest - to unload it
        if (globalSettings.transportUnloadsUnknownRSS) {
            for (let currentRes of fleetCurrentCargo.value) {
                if (currentManifest.findIndex(item => item.res == currentRes.account.data.parsed.info.mint) < 0 && destinationManifest.findIndex(item => item.res == currentRes.account.data.parsed.info.mint) < 0) {
                    let amountToUnload = currentRes.account.data.parsed.info.tokenAmount.uiAmount;
                    if (globalSettings.transportKeep1 && amountToUnload > 0) {
                        amountToUnload -= 1;
                    }
                    if (amountToUnload > 0) {
                        needToUnload = true;
                        logger.log(3, `${utils.FleetTimeStamp(fleet.label)} Found rss that is not part of any transport manifest, unloading`, amountToUnload, 'of', currentRes.account.data.parsed.info.mint);
                        currentManifest.push({res: currentRes.account.data.parsed.info.mint, amt: amountToUnload});
                    }
                }
            }
        }

        return {currentManifest, destinationManifest, needToLoad, needToUnload};
    }

    async function projectCargo(unloadCargo, loadCargo, fleet) {
        // Alias internes pour compatibilité avec anciens noms (currentManifest = unloadCargo, destinationManifest = loadCargo)
        let currentManifest = unloadCargo; // Pour déchargement sur place
        let destinationManifest = loadCargo; // Pour chargement anticipé

        const fleetCurrentCargo = await rpc.getReadConnection().getParsedTokenAccountsByOwner(fleet.cargoHold, {programId: tokenProgramPK});
        const cargoCnt = fleetCurrentCargo.value.reduce((n, {account}) => n + account.data.parsed.info.tokenAmount.uiAmount * cargoItems.find(r => r.token == account.data.parsed.info.mint).size, 0);
        let needToLoad = false;
        let needToUnload = false;
        let projectedCargo = []; // Tableau pour projeter le cargo final après ajustements sur place (pour calcul fuel)

        // Étape 1: Vérification et ajustements sur place basés sur unloadCargo et loadCargo
        // On priorise les actions sur place, en anticipant les besoins de destination sans y aller encore
        for (const entry of loadCargo) {
            if (entry.res && entry.amt > 0) {
                let currentCargoObj = fleetCurrentCargo.value.find(item => item.account.data.parsed.info.mint === entry.res);
                let currentCargoResAmt = currentCargoObj ? currentCargoObj.account.data.parsed.info.tokenAmount.uiAmount : 0;

                // Si manque pour destination, on marque pour charger sur place
                if (currentCargoResAmt < entry.amt) {
                    needToLoad = true;
                    // Ajoute au projectedCargo la quantité cible
                    projectedCargo.push({res: entry.res, amt: entry.amt});
                } else {
                    // Si excès, on marque pour décharger sur place et ajoute à unloadCargo
                    if (currentCargoResAmt > entry.amt) {
                        needToUnload = true;
                        unloadCargo.push({res: entry.res, amt: currentCargoResAmt - entry.amt, extra: true});
                    }
                    // Ajoute au projectedCargo la quantité conservée
                    projectedCargo.push({res: entry.res, amt: Math.min(currentCargoResAmt, entry.amt)});
                }
            }
        }

        // Étape 2: Déchargement sur place pour unloadCargo
        for (const entry of unloadCargo) {
            if (entry.res && entry.amt > 0) {
                let currentCargoObj = fleetCurrentCargo.value.find(item => item.account.data.parsed.info.mint === entry.res);
                let currentCargoResAmt = currentCargoObj ? currentCargoObj.account.data.parsed.info.tokenAmount.uiAmount : 0;
                if (currentCargoResAmt > (globalSettings.transportKeep1 ? 1 : 0)) {
                    needToUnload = true;
                    // Pour projectedCargo, on soustrait ce qui est déchargé (quantité finale = actuelle - amt à décharger)
                    let projectedAmt = currentCargoResAmt - entry.amt;
                    if (projectedAmt > 0) {
                        projectedCargo.push({res: entry.res, amt: projectedAmt});
                    }
                }
            }
        }

        // Étape 3: Gestion des ressources inconnues (déchargement sur place si activé)
        if (globalSettings.transportUnloadsUnknownRSS) {
            for (let currentRes of fleetCurrentCargo.value) {
                if (unloadCargo.findIndex(item => item.res == currentRes.account.data.parsed.info.mint) < 0 && loadCargo.findIndex(item => item.res == currentRes.account.data.parsed.info.mint) < 0) {
                    let amountToUnload = currentRes.account.data.parsed.info.tokenAmount.uiAmount;
                    if (globalSettings.transportKeep1 && amountToUnload > 0) {
                        amountToUnload -= 1;
                    }
                    if (amountToUnload > 0) {
                        needToUnload = true;
                        logger.log(3, `${utils.FleetTimeStamp(fleet.label)} Found rss that is not part of any transport manifest, unloading`, amountToUnload, 'of', currentRes.account.data.parsed.info.mint);
                        unloadCargo.push({res: currentRes.account.data.parsed.info.mint, amt: amountToUnload});
                        // Pour projectedCargo, on ne garde pas ces ressources (ou garde 1 si keep1)
                        let projectedAmt = globalSettings.transportKeep1 ? 1 : 0;
                        if (projectedAmt > 0) {
                            projectedCargo.push({res: currentRes.account.data.parsed.info.mint, amt: projectedAmt});
                        }
                    }
                }
            }
        }


        // Retour avec les anciens noms pour compatibilité, mais valeurs mises à jour
        return {
            currentManifest: unloadCargo,
            destinationManifest: loadCargo,
            needToLoad,
            needToUnload,
            projectedCargo
        };
    }

    async function handleCrewUnloading(fleet, starbaseCoords, amount, returnTx) {
        return new Promise(async resolve => {

            let starbaseX = starbaseCoords.split(',')[0].trim();
            let starbaseY = starbaseCoords.split(',')[1].trim();
            let starbase = await getStarbaseFromCoords(starbaseX, starbaseY);
            let starbasePlayer = await getStarbasePlayer(userProfileAcct, starbase.publicKey);
            starbasePlayer = starbasePlayer ? starbasePlayer.publicKey : await execRegisterStarbasePlayer(fleet, starbaseCoords);

            let txUnload = {
                instruction: await sageProgram.methods.unloadFleetCrew({
                    count: new BrowserAnchor.anchor.BN(amount),
                    keyIndex: new BrowserAnchor.anchor.BN(userProfileKeyIdx)
                }).accountsStrict({
                    fleetAndOwner: {
                        key: userPublicKey,
                        owningProfile: userProfileAcct,
                        owningProfileFaction: userProfileFactionAcct.publicKey,
                        fleet: fleet.publicKey
                    },
                    starbaseAndStarbasePlayer: {
                        starbase: starbase.publicKey,
                        starbasePlayer: starbasePlayer
                    },
                    gameId: sageGameAcct.publicKey
                }).remainingAccounts([{
                    pubkey: starbase.publicKey,
                    isSigner: false,
                    isWritable: false
                }]).instruction()
            }
            logger.log(1, `${utils.FleetTimeStamp(fleet.label)} Unloading crew`);
            updateFleetState(fleet, 'Unloading crew');
            //let txResult = await txSignAndSend(txUnload, fleet, 'UNLOAD CREW', 100);

            let txResult;
            if (returnTx) {
                txResult = txUnload;
            } else {
                txResult = await txSignAndSend(txUnload, fleet, 'UNLOAD CREW', 100);
            }

            resolve(txResult);
        });
    }

    async function handleCrewLoading(fleet, starbaseCoords, amount, returnTx) {
        return new Promise(async resolve => {

            let starbaseX = starbaseCoords.split(',')[0].trim();
            let starbaseY = starbaseCoords.split(',')[1].trim();
            let starbase = await getStarbaseFromCoords(starbaseX, starbaseY);
            let starbasePlayer = await getStarbasePlayer(userProfileAcct, starbase.publicKey);
            starbasePlayer = starbasePlayer ? starbasePlayer.publicKey : await execRegisterStarbasePlayer(fleet, starbaseCoords);

            let starbasePlayerInfo = await sageProgram.account.starbasePlayer.fetch(starbasePlayer);
            let availableCrew = starbasePlayerInfo.totalCrew - starbasePlayerInfo.busyCrew.toNumber();
            logger.log(3, `${utils.FleetTimeStamp(fleet.label)} Available crew at starbase:`, availableCrew);
            if (availableCrew < amount) amount = availableCrew;

            let txResult;
            if (amount <= 0) {
                txResult = {name: "NotEnoughCrew"};
            } else {

                let txLoad = {
                    instruction: await sageProgram.methods.loadFleetCrew({
                        count: new BrowserAnchor.anchor.BN(amount),
                        keyIndex: new BrowserAnchor.anchor.BN(userProfileKeyIdx)
                    }).accountsStrict({
                        fleetAndOwner: {
                            key: userPublicKey,
                            owningProfile: userProfileAcct,
                            owningProfileFaction: userProfileFactionAcct.publicKey,
                            fleet: fleet.publicKey
                        },
                        starbaseAndStarbasePlayer: {
                            starbase: starbase.publicKey,
                            starbasePlayer: starbasePlayer
                        },
                        gameId: sageGameAcct.publicKey
                    }).remainingAccounts([{
                        pubkey: starbase.publicKey,
                        isSigner: false,
                        isWritable: false
                    }]).instruction()
                }
                logger.log(1, `${utils.FleetTimeStamp(fleet.label)} Loading crew`);
                updateFleetState(fleet, 'Loading crew');
                //txResult = await txSignAndSend(txLoad, fleet, 'LOAD CREW', 100);
                if (returnTx) {
                    txResult = txLoad;
                } else {
                    txResult = await txSignAndSend(txLoad, fleet, 'LOAD CREW', 100);
                }
            }

            resolve(txResult);
        });
    }

    async function handleTransport(i, fleetState, fleetCoords) {
        const [destX, destY] = utils.ConvertCoords(userFleets[i].destCoord);
        const [starbaseX, starbaseY] = utils.ConvertCoords(userFleets[i].starbaseCoord);
        logger.log(4, `Dest ${userFleets[i].destCoord} SB ${userFleets[i].starbaseCoord} fleetCoords ${fleetCoords} fleetState ${fleetState}`);

        const fleetParsedData = JSON.parse(await GM.getValue(userFleets[i].publicKey.toString(), '{}'));
        let targetCargoManifest = [
            {
                res: fleetParsedData.transportResource1,
                amt: fleetParsedData.transportResource1Perc,
                crew: fleetParsedData.transportResource1Crew
            },
            {res: fleetParsedData.transportResource2, amt: fleetParsedData.transportResource2Perc,},
            {res: fleetParsedData.transportResource3, amt: fleetParsedData.transportResource3Perc,},
            {res: fleetParsedData.transportResource4, amt: fleetParsedData.transportResource4Perc,},
        ];
        let starbaseCargoManifest = [
            {
                res: fleetParsedData.transportSBResource1,
                amt: fleetParsedData.transportSBResource1Perc,
                crew: fleetParsedData.transportSBResource1Crew
            },
            {res: fleetParsedData.transportSBResource2, amt: fleetParsedData.transportSBResource2Perc,},
            {res: fleetParsedData.transportSBResource3, amt: fleetParsedData.transportSBResource3Perc,},
            {res: fleetParsedData.transportSBResource4, amt: fleetParsedData.transportSBResource4Perc,},
        ];
        const hasTargetManifest = hasTransportManifest(targetCargoManifest);
        const hasStarbaseManifest = hasTransportManifest(starbaseCargoManifest);

        //let moveDist = calculateMovementDistance([starbaseX,starbaseY], [destX,destY]);
        if (fleetState === 'Idle') {
            // Fleet at starbase?
            if (fleetCoords[0] == starbaseX && fleetCoords[1] == starbaseY) {
                logger.log(4, "Is at SB");
                userFleets[i].resupplying = true;

                let checkCargoResult = await checkCargo(starbaseCargoManifest, targetCargoManifest, userFleets[i]);
                starbaseCargoManifest = checkCargoResult.currentManifest;
                targetCargoManifest = checkCargoResult.destinationManifest;

                let needToUnloadCrew = 0;
                if ((starbaseCargoManifest[0].crew > 0) && (userFleets[i].passengerCapacity > 0) && (userFleets[i].crewCount - userFleets[i].requiredCrew > 0)) {
                    needToUnloadCrew = userFleets[i].crewCount - userFleets[i].requiredCrew;
                }
                let needToLoadCrew = 0;
                if ((targetCargoManifest[0].crew > 0) && (userFleets[i].passengerCapacity > 0) && ((userFleets[i].requiredCrew + userFleets[i].passengerCapacity - userFleets[i].crewCount - needToUnloadCrew) > 0)) {
                    needToLoadCrew = Math.min(userFleets[i].requiredCrew + userFleets[i].passengerCapacity - userFleets[i].crewCount, targetCargoManifest[0].crew);
                }
                if (starbaseCargoManifest[0].crew > 0 || targetCargoManifest[0].crew > 0) logger.log(4, `${utils.FleetTimeStamp(userFleets[i].label)} crew:`, userFleets[i].crewCount, 'passengerCapacity:', userFleets[i].passengerCapacity, 'required crew:', userFleets[i].requiredCrew, 'load:', needToLoadCrew, 'unload:', needToUnloadCrew);

                const fuelData = await getFleetFuelData(userFleets[i], [starbaseX, starbaseY], [destX, destY], false);
                //previously we only checked for "fuelData.fuelNeeded > 0" below, but fuelNeeded is always greater than 0 - it is just the fuel needed for the warp/subwarp.
                //this broke the check if the fleet needs to do the dock/undock sequence and the sequence was always executed
                //We need to explicitly calculate the needed fuel minus the available fuel, just like in handleTransportRefueling()
                const fuelEntry = targetCargoManifest.find(e => e.res === sageGameAcct.account.mints.fuel.toString()) || {amt: 0};
                const totalFuel = fuelData.fuelNeeded + fuelEntry.amt;
                let fuelToAdd = Math.min(fuelData.capacity, totalFuel) - fuelData.amount;
                // Check for "Fuel to 100% for transporters" (roundTrip only = source starbase)
                if (fuelToAdd > 0 && globalSettings.transportFuel100 && fuelToAdd < fuelData.capacity - fuelData.amount) fuelToAdd = fuelData.capacity - fuelData.amount;

                logger.log(4, `${utils.FleetTimeStamp(userFleets[i].label)} Fuel needed`, fuelData.fuelNeeded, '/ fuel found', fuelData.amount, '/ fuel to add', fuelToAdd, '/ needToLoad', checkCargoResult.needToLoad, '/ needToUnload', checkCargoResult.needToUnload, '/ needToLoadCrew', needToLoadCrew, '/ needToUnloadCrew', needToUnloadCrew);

                //if (checkCargoResult.needToLoad || checkCargoResult.needToUnload || fuelData.fuelNeeded > 0 || needToLoadCrew || needToUnloadCrew) {
                if (checkCargoResult.needToLoad || checkCargoResult.needToUnload || fuelToAdd > 0 || needToLoadCrew > 0 || needToUnloadCrew > 0) {
                    //await execDock(userFleets[i], userFleets[i].starbaseCoord);
                    let transportLoadUnloadSingleTx = globalSettings.transportLoadUnloadSingleTx;
                    let transactions = [];
                    let unloadedAmountInTransaction = 0;

                    let resp = await execDock(userFleets[i], userFleets[i].starbaseCoord, transportLoadUnloadSingleTx);
                    if (transportLoadUnloadSingleTx && resp) {
                        transactions.push(resp);
                    }

                    if (needToUnloadCrew) {
                        resp = await handleCrewUnloading(userFleets[i], userFleets[i].starbaseCoord, needToUnloadCrew, transportLoadUnloadSingleTx);
                        if (transportLoadUnloadSingleTx && resp) {
                            transactions.push(resp);
                        }
                    }
                    if (needToLoadCrew) {
                        let crewResp = await handleCrewLoading(userFleets[i], userFleets[i].starbaseCoord, needToLoadCrew, transportLoadUnloadSingleTx);
                        if (crewResp && crewResp.name == 'NotEnoughCrew') {
                            if (globalSettings.transportStopOnError) {
                                logger.log(4, `${utils.FleetTimeStamp(userFleets[i].label)} Transporting - ERROR: Not enough crew`);
                                updateFleetState(userFleets[i], 'ERROR: Not enough crew');
                                return;
                            } else {
                                logger.log(4, `${utils.FleetTimeStamp(userFleets[i].label)} Not enough crew`);
                            }
                        } else if (transportLoadUnloadSingleTx && crewResp) {
                            transactions.push(crewResp);
                        }
                    }

                    if (hasStarbaseManifest || checkCargoResult.needToUnload) {
                        resp = await handleTransportUnloading(userFleets[i], userFleets[i].starbaseCoord, starbaseCargoManifest, transportLoadUnloadSingleTx);
                        if (transportLoadUnloadSingleTx) {
                            transactions = transactions.concat(resp.transactions);
                            unloadedAmountInTransaction = resp.unloadedAmount;
                            /*
                    if(hasTargetManifest) {
                        //if we need to load something, make sure we execute the unload transactions first
                        updateFleetState(userFleets[i], 'Exec tx bundle');
                        await txSliceAndSend(transactions, userFleets[i], 'LOAD/UNLOAD', 100, 5);
                        transactions = [];
                    }
                        */
                        }
                    } else logger.log(4, `${utils.FleetTimeStamp(userFleets[i].label)} Unloading skipped - No resources specified`);

                    //Refueling at Starbase
                    let refuelResp = await handleTransportRefueling(userFleets[i], userFleets[i].starbaseCoord, [starbaseX, starbaseY], [destX, destY], true, 0, targetCargoManifest, transportLoadUnloadSingleTx);
                    if (refuelResp.status === 0) {
                        userFleets[i].state = refuelResp.detail;
                        return;
                    } else if (refuelResp && refuelResp.transactions) {
                        transactions = transactions.concat(refuelResp.transactions);
                    }

                    let fuelIndex = targetCargoManifest.findIndex(e => e.res === sageGameAcct.account.mints.fuel.toString());
                    if (fuelIndex > -1) {
                        targetCargoManifest[fuelIndex].amt = targetCargoManifest[fuelIndex].amt - refuelResp.amount;
                        //when using a combined load tx, we need to take into account the amount loaded into the fuel tank, because the starbase still reports the original amount (otherwise we may get an ix error instead a "NotEnoughResource" error)
                        if (refuelResp.alreadyLoaded){
                            targetCargoManifest[fuelIndex].alreadyLoadedInTransaction = refuelResp.alreadyLoaded;
                        }
                    }

                    //Loading at Starbase
                    if (hasTargetManifest) {
                        const loadedCargo = await handleTransportLoading(i, userFleets[i].starbaseCoord, targetCargoManifest, transportLoadUnloadSingleTx, transportLoadUnloadSingleTx ? unloadedAmountInTransaction : 0);
                        logger.log(4, `${utils.FleetTimeStamp(userFleets[i].label)} loadedCargo: `, loadedCargo.success);
                        if (!loadedCargo.success && globalSettings.transportStopOnError) {
                            //const newFleetState = `ERROR: No more cargo to load`;
                            //logger.log(1,`${utils.FleetTimeStamp(userFleets[i].label)} ${newFleetState}`);
                            //userFleets[i].state = newFleetState;
                            logger.log(4, `${utils.FleetTimeStamp(userFleets[i].label)} ERROR: Unexpected error on cargo load.`);
                            return;
                        } else if (transportLoadUnloadSingleTx) {
                            transactions = transactions.concat(loadedCargo.transactions);
                        }
                    } else logger.log(4, `${utils.FleetTimeStamp(userFleets[i].label)} Loading skipped - No resources specified`);

                    let undockResult = await execUndock(userFleets[i], userFleets[i].starbaseCoord, transportLoadUnloadSingleTx);
                    if (transportLoadUnloadSingleTx) {
                        updateFleetState(userFleets[i], 'Exec tx bundle');
                        transactions.push(undockResult);
                        undockResult = await txSliceAndSend(transactions, userFleets[i], 'LOAD/UNLOAD', 100, 5);
                        updateFleetState(userFleets[i], 'Idle');
                        userFleets[i].ressuplied = true;
                    }
                    //logger.log(4,`${utils.FleetTimeStamp(userFleets[i].label)} userFleets[i]: `, undockResult);
                    let fleetState = await rpc.getReadConnection().getAccountInfoAndContext(userFleets[i].publicKey, {minContextSlot: undockResult.slot});
                }
                userFleets[i].moveTarget = userFleets[i].destCoord;
                userFleets[i].resupplying = false;
                logger.log(4, `${utils.FleetTimeStamp(userFleets[i].label)} userFleets[i]: `, userFleets[i]);
            }

            // Fleet at target?
            else if (fleetCoords[0] == destX && fleetCoords[1] == destY) {
                logger.log(4, "Is at TARGET");
                userFleets[i].resupplying = true;

                let checkCargoResult = await checkCargo(targetCargoManifest, starbaseCargoManifest, userFleets[i]);
                targetCargoManifest = checkCargoResult.currentManifest;
                starbaseCargoManifest = checkCargoResult.destinationManifest;

                let needToUnloadCrew = 0;
                if ((targetCargoManifest[0].crew > 0) && (userFleets[i].passengerCapacity > 0) && (userFleets[i].crewCount - userFleets[i].requiredCrew > 0)) {
                    needToUnloadCrew = userFleets[i].crewCount - userFleets[i].requiredCrew;
                }
                let needToLoadCrew = 0;
                if ((starbaseCargoManifest[0].crew > 0) && (userFleets[i].passengerCapacity > 0) && ((userFleets[i].requiredCrew + userFleets[i].passengerCapacity - userFleets[i].crewCount - needToUnloadCrew) > 0)) {
                    needToLoadCrew = Math.min(userFleets[i].requiredCrew + userFleets[i].passengerCapacity - userFleets[i].crewCount, starbaseCargoManifest[0].crew);
                }
                if (starbaseCargoManifest[0].crew > 0 || targetCargoManifest[0].crew > 0) logger.log(4, `${utils.FleetTimeStamp(userFleets[i].label)} crew:`, userFleets[i].crewCount, 'passengerCapacity:', userFleets[i].passengerCapacity, 'required crew:', userFleets[i].requiredCrew, 'load:', needToLoadCrew, 'unload:', needToUnloadCrew);

                const fuelData = await getFleetFuelData(userFleets[i], [destX, destY], [starbaseX, starbaseY], false);
                //previously we only checked for "fuelData.fuelNeeded > 0" below, but fuelNeeded is always greater than 0 - it is just the fuel needed for the warp/subwarp.
                //We need to explicitly calculate the needed fuel minus the available fuel, just like in handleTransportRefueling()
                const fuelEntry = starbaseCargoManifest.find(e => e.res === sageGameAcct.account.mints.fuel.toString()) || {amt: 0};
                const totalFuel = fuelData.fuelNeeded + fuelEntry.amt;
                let fuelToAdd = Math.min(fuelData.capacity, totalFuel) - fuelData.amount;

                logger.log(4, `${utils.FleetTimeStamp(userFleets[i].label)} Fuel needed`, fuelData.fuelNeeded, '/ fuel found', fuelData.amount, '/ fuel to add', fuelToAdd, '/ needToLoad', checkCargoResult.needToLoad, '/ needToUnload', checkCargoResult.needToUnload, '/ needToLoadCrew', needToLoadCrew, '/ needToUnloadCrew', needToUnloadCrew);

                if (checkCargoResult.needToLoad || checkCargoResult.needToUnload || fuelToAdd > 0 || needToLoadCrew > 0 || needToUnloadCrew > 0) {
                    //await execDock(userFleets[i], userFleets[i].destCoord);
                    let transportLoadUnloadSingleTx = globalSettings.transportLoadUnloadSingleTx;
                    let transactions = [];
                    let unloadedAmountInTransaction = 0;

                    let resp = await execDock(userFleets[i], userFleets[i].destCoord, transportLoadUnloadSingleTx);
                    if (transportLoadUnloadSingleTx && resp) {
                        transactions.push(resp);
                    }

                    if (needToUnloadCrew) {
                        resp = await handleCrewUnloading(userFleets[i], userFleets[i].destCoord, needToUnloadCrew, transportLoadUnloadSingleTx);
                        if (transportLoadUnloadSingleTx && resp) {
                            transactions.push(resp);
                        }
                    }
                    if (needToLoadCrew) {
                        let crewResp = await handleCrewLoading(userFleets[i], userFleets[i].destCoord, needToLoadCrew, transportLoadUnloadSingleTx);
                        if (crewResp && crewResp.name == 'NotEnoughCrew') {
                            if (globalSettings.transportStopOnError) {
                                logger.log(1, `${utils.FleetTimeStamp(userFleets[i].label)} Transporting - ERROR: Not enough crew`);
                                updateFleetState(userFleets[i], 'ERROR: Not enough crew');
                                return;
                            } else {
                                logger.log(1, `${utils.FleetTimeStamp(userFleets[i].label)} Not enough crew`);
                            }
                        } else if (transportLoadUnloadSingleTx && crewResp) {
                            transactions.push(crewResp);
                        }
                    }

                    //Unloading at Target
                    let fuelUnloadDeficit = 0; //How far short of the manifest was the amount of fuel unloaded?
                    if (hasTargetManifest || checkCargoResult.needToUnload) {
                        const unloadResult = await handleTransportUnloading(userFleets[i], userFleets[i].destCoord, targetCargoManifest, transportLoadUnloadSingleTx);
                        fuelUnloadDeficit = unloadResult.fuelUnloadDeficit;
                        if (transportLoadUnloadSingleTx) {
                            transactions = transactions.concat(unloadResult.transactions);
                            unloadedAmountInTransaction = unloadResult.unloadedAmount;
                            /*
                    if(hasStarbaseManifest) {
                        //if we need to load something, make sure we execute the unload transactions first
                        updateFleetState(userFleets[i], 'Exec tx bundle');
                        await txSliceAndSend(transactions, userFleets[i], 'LOAD/UNLOAD', 100, 5);
                        transactions = [];
                    }
                        */
                        }
                    } else logger.log(1, `${utils.FleetTimeStamp(userFleets[i].label)} Unloading skipped - No resources specified`);

                    //Refueling at Target
                    let refuelResp = await handleTransportRefueling(userFleets[i], userFleets[i].destCoord, [destX, destY], [starbaseX, starbaseY], false, fuelUnloadDeficit, starbaseCargoManifest, transportLoadUnloadSingleTx);
                    if (refuelResp.status === 0) {
                        userFleets[i].state = refuelResp.detail;
                        return;
                    } else if (transportLoadUnloadSingleTx && refuelResp && refuelResp.transactions) {
                        transactions = transactions.concat(refuelResp.transactions);
                    }

                    let fuelIndex = starbaseCargoManifest.findIndex(e => e.res === sageGameAcct.account.mints.fuel.toString());
                    if (fuelIndex > -1) {
                        starbaseCargoManifest[fuelIndex].amt = starbaseCargoManifest[fuelIndex].amt - refuelResp.amount;
                    }

                    //Loading at Target
                    if (hasStarbaseManifest) {
                        const loadedCargo = await handleTransportLoading(i, userFleets[i].destCoord, starbaseCargoManifest, transportLoadUnloadSingleTx, transportLoadUnloadSingleTx ? unloadedAmountInTransaction : 0);
                        logger.log(4, `${utils.FleetTimeStamp(userFleets[i].label)} loadedCargo: `, loadedCargo.success);
                        if (!loadedCargo.success && globalSettings.transportStopOnError) {
                            //const newFleetState = `ERROR: No more cargo to load`;
                            //logger.log(1,`${utils.FleetTimeStamp(userFleets[i].label)} ${newFleetState}`);
                            //userFleets[i].state = newFleetState;
                            logger.log(1, `${utils.FleetTimeStamp(userFleets[i].label)} ERROR: Unexpected error on cargo load.`);
                            return;
                        } else if (transportLoadUnloadSingleTx) {
                            transactions = transactions.concat(loadedCargo.transactions);
                        }
                    } else logger.log(1, `${utils.FleetTimeStamp(userFleets[i].label)} Loading skipped - No resources specified`);

                    let undockResult = await execUndock(userFleets[i], userFleets[i].destCoord, transportLoadUnloadSingleTx);
                    if (transportLoadUnloadSingleTx) {
                        transactions.push(undockResult);
                        updateFleetState(userFleets[i], 'Exec tx bundle');
                        undockResult = await txSliceAndSend(transactions, userFleets[i], 'LOAD/UNLOAD', 100, 5);
                        updateFleetState(userFleets[i], 'Idle');
                    }
                    //logger.log(4,`${utils.FleetTimeStamp(userFleets[i].label)} userFleets[i]: `, undockResult);
                    let fleetState = await rpc.getReadConnection().getAccountInfoAndContext(userFleets[i].publicKey, {minContextSlot: undockResult.slot});
                }
                userFleets[i].moveTarget = userFleets[i].starbaseCoord;
                userFleets[i].resupplying = false;
                logger.log(3, `${utils.FleetTimeStamp(userFleets[i].label)} userFleets[i]: `, userFleets[i]);
            }

            if (userFleets[i].stopping) return;

            if (userFleets[i].moveTarget !== '') {
                const targetX = userFleets[i].moveTarget.split(',').length > 1 ? userFleets[i].moveTarget.split(',')[0].trim() : '';
                const targetY = userFleets[i].moveTarget.split(',').length > 1 ? userFleets[i].moveTarget.split(',')[1].trim() : '';
                const moveDist = calculateMovementDistance(fleetCoords, [targetX, targetY]);
                let isStarbaseAndWarpSubwarp = userFleets[i].moveType == 'warpsubwarp' && ((fleetCoords[0] == starbaseX && fleetCoords[1] == starbaseY) || (fleetCoords[0] == destX && fleetCoords[1] == destY));
                await handleMovement(i, moveDist, targetX, targetY, isStarbaseAndWarpSubwarp);
            } else {
                logger.log(1, `${utils.FleetTimeStamp(userFleets[i].label)} Transporting - ERROR: Fleet must start at Target or Starbase`);
                updateFleetState(userFleets[i], 'ERROR: Fleet must start at Target or Starbase');
            }
        }
    }


    async function handleSupply(i, fleetState, fleetCoords) {
        const fleet = userFleets[i];
        logger.log(4, `moveType: ${fleet.moveType}`);
        const [destX, destY] = utils.ConvertCoords(fleet.destCoord);
        const [starbaseX, starbaseY] = utils.ConvertCoords(fleet.starbaseCoord);

        const fleetParsedData = JSON.parse(await GM.getValue(fleet.publicKey.toString(), '{}'));
        logger.log(4, `fleetParsedData.loadCargo: ${fleetParsedData.loadCargo} fleetParsedData.unloadCargo ${fleetParsedData.unloadCargo} for ${destX},${destY}`);
        let loadCargoManifest = fleetParsedData.loadCargo ? JSON.parse(fleetParsedData.loadCargo) : [];  // Correction: Vérification et défaut à []
        let unloadCargoManifest = fleetParsedData.unloadCargo ? JSON.parse(fleetParsedData.unloadCargo) : [];  // Correction: Vérification et défaut à []
        const hasLoadManifest = hasTransportManifest(loadCargoManifest);
        const hasUnloadManifest = hasTransportManifest(unloadCargoManifest);


        if (fleetState === 'Idle') {
            // Vérifier si la flotte est à la starbase
            if (fleetCoords[0] === starbaseX && fleetCoords[1] === starbaseY) {
                fleet.resupplying = true;
                if (!fleet.ressuplied) {
                    let checkCargoResult = await projectCargo(unloadCargoManifest, loadCargoManifest, fleet);
                    unloadCargoManifest = checkCargoResult.currentManifest;
                    loadCargoManifest = checkCargoResult.destinationManifest;

                    let needToUnloadCrew = 0;
                    if ((unloadCargoManifest.some(e => e.crew > 0)) && (fleet.passengerCapacity > 0) && (fleet.crewCount - fleet.requiredCrew > 0)) {
                        needToUnloadCrew = fleet.crewCount - fleet.requiredCrew;
                    }
                    let needToLoadCrew = 0;
                    if ((loadCargoManifest.some(e => e.crew > 0)) && (fleet.passengerCapacity > 0) && ((fleet.requiredCrew + fleet.passengerCapacity - fleet.crewCount - needToUnloadCrew) > 0)) {
                        needToLoadCrew = Math.min(fleet.requiredCrew + fleet.passengerCapacity - fleet.crewCount, loadCargoManifest.find(e => e.crew > 0)?.crew || 0);
                    }

                    const fuelData = await getFleetFuelData(fleet, [starbaseX, starbaseY], [destX, destY], true);
                    const fuelEntry = loadCargoManifest.find(e => e.res === sageGameAcct.account.mints.fuel.toString()) || {amt: 0};
                    const totalFuel = fuelData.fuelNeeded + fuelEntry.amt;
                    let fuelToAdd = Math.min(fuelData.capacity, totalFuel) - fuelData.amount;
                    if (fuelToAdd > 0 && globalSettings.transportFuel100 && fuelToAdd < fuelData.capacity - fuelData.amount) {
                        fuelToAdd = fuelData.capacity - fuelData.amount;
                    }

                    logger.log(3, `${utils.FleetTimeStamp(fleet.label)} Fuel needed: ${fuelData.fuelNeeded}, Fuel found: ${fuelData.amount}, Fuel to add: ${fuelToAdd}, Load: ${checkCargoResult.needToLoad}, Unload: ${checkCargoResult.needToUnload}, LoadCrew: ${needToLoadCrew}, UnloadCrew: ${needToUnloadCrew}`);

                    if (checkCargoResult.needToLoad || checkCargoResult.needToUnload || fuelToAdd > 0 || needToLoadCrew > 0 || needToUnloadCrew > 0) {
                        let transportLoadUnloadSingleTx = globalSettings.transportLoadUnloadSingleTx;
                        let transactions = [];
                        let unloadedAmountInTransaction = 0;

                        let resp = await execDock(fleet, fleet.starbaseCoord, transportLoadUnloadSingleTx);
                        if (resp) transactions.push(resp);

                        if (needToUnloadCrew) {
                            resp = await handleCrewUnloading(fleet, fleet.starbaseCoord, needToUnloadCrew, transportLoadUnloadSingleTx);
                            if (resp) transactions.push(resp);
                        }
                        if (needToLoadCrew) {
                            let crewResp = await handleCrewLoading(fleet, fleet.starbaseCoord, needToLoadCrew, transportLoadUnloadSingleTx);
                            if (crewResp && crewResp.name === 'NotEnoughCrew') {
                                if (globalSettings.transportStopOnError) {
                                    logger.log(1, `${utils.FleetTimeStamp(fleet.label)} Transporting - ERROR: Not enough crew`);
                                    updateFleetState(fleet, 'ERROR: Not enough crew');
                                    fleet.resupplying = false;
                                    return;
                                } else {
                                    logger.log(1, `${utils.FleetTimeStamp(fleet.label)} Not enough crew`);
                                }
                            } else if (transportLoadUnloadSingleTx && crewResp) {
                                transactions.push(crewResp);
                            }
                        }
                        //Unloading at Target
                        let fuelUnloadDeficit = 0;
                        if (hasUnloadManifest || checkCargoResult.needToUnload) {
                            resp = await handleTransportUnloading(fleet, fleet.starbaseCoord, unloadCargoManifest, transportLoadUnloadSingleTx);
                            fuelUnloadDeficit = resp.fuelUnloadDeficit;
                            transactions = transactions.concat(resp.transactions);
                        } else {
                            logger.log(1, `${utils.FleetTimeStamp(fleet.label)} Unloading skipped - No resources specified`);
                        }

                        let refuelResp = await handleTransportRefueling(fleet, fleet.starbaseCoord, [starbaseX, starbaseY], [destX, destY], true, fuelUnloadDeficit, loadCargoManifest, transportLoadUnloadSingleTx);
                        if (refuelResp.status === 0) {
                            updateFleetState(fleet, refuelResp.detail);
                            fleet.resupplying = false;
                            return;
                        } else if (transportLoadUnloadSingleTx && refuelResp && refuelResp.transactions) {
                            transactions = transactions.concat(refuelResp.transactions);
                        }

                        let fuelIndex = loadCargoManifest.findIndex(e => e.res === sageGameAcct.account.mints.fuel.toString());
                        if (fuelIndex > -1) {
                            loadCargoManifest[fuelIndex].amt = loadCargoManifest[fuelIndex].amt - refuelResp.amount;
                            if (transportLoadUnloadSingleTx && refuelResp.alreadyLoaded) {
                                loadCargoManifest[fuelIndex].alreadyLoadedInTransaction = refuelResp.alreadyLoaded;
                            }
                        }

                        if (hasLoadManifest) {
                            const loadedCargo = await handleTransportLoading(i, fleet.starbaseCoord, loadCargoManifest, transportLoadUnloadSingleTx, resp.unloadedAmount);
                            if (!loadedCargo.success && globalSettings.transportStopOnError) {
                                logger.log(1, `${utils.FleetTimeStamp(fleet.label)} ERROR: Unexpected error on cargo load`);
                                fleet.resupplying = false;
                                return;
                            } else if (transportLoadUnloadSingleTx) {
                                transactions = transactions.concat(loadedCargo.transactions);
                            }
                        } else {
                            logger.log(1, `${utils.FleetTimeStamp(fleet.label)} Loading skipped - No resources specified`);
                        }

                        let undockResult = await execUndock(fleet, fleet.starbaseCoord, transportLoadUnloadSingleTx);
                        if (transportLoadUnloadSingleTx) {
                            updateFleetState(fleet, 'Exec tx bundle');
                            transactions.push(undockResult);
                            await txSliceAndSend(transactions, fleet, 'LOAD/UNLOAD', 100, 5);
                            updateFleetState(fleet, 'Idle');
                            fleet.ressuplied = true;
                            await GM.setValue(fleet.publicKey.toString(), JSON.stringify(fleet));
                        }
                        fleet.resupplying = false;
                    }


                } else {
                    // Pas de chargement/déchargement nécessaire, marquer comme terminé
                    fleet.ressuplied = false;
                    fleet.resupplying = false;
                    logger.log(1, `${utils.FleetTimeStamp(fleet.label)} No cargo operations needed, moving`);
                    logger.log(4, `Moving fleet to ${fleet.destCoord} moveType: ${fleet.moveType}`);
                    const [destX, destY] = utils.ConvertCoords(fleet.destCoord);
                    const [starbaseX, starbaseY] = utils.ConvertCoords(fleet.starbaseCoord);
                    // Vérifier si on doit se déplacer vers la destination
                    if (fleetCoords[0] !== destX || fleetCoords[1] !== destY) {
                        logger.log(4, `${utils.FleetTimeStamp(fleet.label)} Initiating movement to destination: ${fleet.destCoord}`);
                        const moveDist = calculateMovementDistance(fleetCoords, [destX, destY]);
                        let isStarbaseAndWarpSubwarp = userFleets[i].moveType == 'warpsubwarp' && ((fleetCoords[0] == starbaseX && fleetCoords[1] == starbaseY) || (fleetCoords[0] == destX && fleetCoords[1] == destY));
                        logger.log(4, `${utils.FleetTimeStamp(fleet.label)} Moving to starbase: ${fleet.destCoord}`);
                        await handleMovement(i, moveDist, destX, destY, isStarbaseAndWarpSubwarp);

                        fleet.moving = false; // Attendre d'être à la destination
                        await GM.setValue(fleet.publicKey.toString(), JSON.stringify(fleet));
                    }
                }
            }
            // Vérifier si on doit se déplacer vers la destination
            if (userFleets[i].moveTarget !== '') {
                const targetX = userFleets[i].moveTarget.split(',').length > 1 ? userFleets[i].moveTarget.split(',')[0].trim() : '';
                const targetY = userFleets[i].moveTarget.split(',').length > 1 ? userFleets[i].moveTarget.split(',')[1].trim() : '';
                const moveDist = calculateMovementDistance(fleetCoords, [targetX, targetY]);
                let isStarbaseAndWarpSubwarp = userFleets[i].moveType == 'warpsubwarp' && ((fleetCoords[0] == starbaseX && fleetCoords[1] == starbaseY) || (fleetCoords[0] == destX && fleetCoords[1] == destY));
                await handleMovement(i, moveDist, targetX, targetY, isStarbaseAndWarpSubwarp);
            } else {
                cLog(1, `${FleetTimeStamp(userFleets[i].label)} Transporting - ERROR: Fleet must start at Target or Starbase`);
                updateFleetState(userFleets[i], 'ERROR: Fleet must start at Target or Starbase');
            }
        }

    }


    async function handleEmptyMove(i, fleetState, fleetCoords) {
        const fleet = userFleets[i];
        logger.log(4, `moveType: ${fleet.moveType}`);
        const [destX, destY] = utils.ConvertCoords(fleet.destCoord);
        const [starbaseX, starbaseY] = utils.ConvertCoords(fleet.starbaseCoord);
        if (fleetCoords[0] === starbaseX && fleetCoords[1] === starbaseY) {
            fleet.resupplying = true;
            fleet.moving = true;
            const fuelData = await getFleetFuelData(fleet, [starbaseX, starbaseY], [destX, destY], true);
            const fuelEntry = loadCargoManifest.find(e => e.res === sageGameAcct.account.mints.fuel.toString()) || {amt: 0};
            const totalFuel = fuelData.fuelNeeded + fuelEntry.amt;
            let fuelToAdd = Math.min(fuelData.capacity, totalFuel) - fuelData.amount;
            if (fuelToAdd > 0 && globalSettings.transportFuel100 && fuelToAdd < fuelData.capacity - fuelData.amount) {
                fuelToAdd = fuelData.capacity - fuelData.amount;
            }
            if (fuelToAdd > 0) {
                logger.log(3, `${utils.FleetTimeStamp(fleet.label)} Fuel needed: ${fuelData.fuelNeeded}, Fuel found: ${fuelData.amount}, Fuel to add: ${fuelToAdd}, Load: ${checkCargoResult.needToLoad}, Unload: ${checkCargoResult.needToUnload}, LoadCrew: ${needToLoadCrew}, UnloadCrew: ${needToUnloadCrew}`);
                let transactions = [];
                let refuelResp = await handleTransportRefueling(fleet, fleet.starbaseCoord, [starbaseX, starbaseY], [destX, destY], true, 0, loadCargoManifest, transportLoadUnloadSingleTx);
                if (refuelResp.status === 0) {
                    updateFleetState(fleet, refuelResp.detail);
                    fleet.resupplying = false;
                    return;
                } else if (refuelResp && refuelResp.transactions) {
                    transactions = transactions.concat(refuelResp.transactions);
                }
                let undockResult = await execUndock(fleet, fleet.starbaseCoord, transportLoadUnloadSingleTx);
                updateFleetState(fleet, 'Exec tx bundle');
                transactions.push(undockResult);
                await txSliceAndSend(transactions, fleet, 'LOAD/UNLOAD', 100, 5);
                updateFleetState(fleet, 'Idle');
                fleet.resupplying = false;
                await GM.setValue(fleet.publicKey.toString(), JSON.stringify(fleet));
                logger.log(1, `${utils.FleetTimeStamp(fleet.label)} No cargo operations needed, moving`);
                logger.log(4, `Moving fleet to ${fleet.destCoord} moveType: ${fleet.moveType}`);
                const [destX, destY] = utils.ConvertCoords(fleet.destCoord);
                const [starbaseX, starbaseY] = utils.ConvertCoords(fleet.starbaseCoord);
                // Vérifier si on doit se déplacer vers la destination
                if (fleetCoords[0] !== destX || fleetCoords[1] !== destY) {
                    logger.log(4, `${utils.FleetTimeStamp(fleet.label)} Initiating movement to destination: ${fleet.destCoord}`);
                    const moveDist = calculateMovementDistance(fleetCoords, [destX, destY]);
                    let isStarbaseAndWarpSubwarp = userFleets[i].moveType == 'warpsubwarp' && ((fleetCoords[0] == starbaseX && fleetCoords[1] == starbaseY) || (fleetCoords[0] == destX && fleetCoords[1] == destY));
                    logger.log(2, `${utils.FleetTimeStamp(fleet.label)} Moving to starbase: ${fleet.destCoord}`);
                    await handleMovement(i, moveDist, destX, destY, isStarbaseAndWarpSubwarp);
                    fleet.ressuplied = true;
                    fleet.moving = false; // Attendre d'être à la destination
                    await GM.setValue(fleet.publicKey.toString(), JSON.stringify(fleet));
                }
            }
        }

    }


    async function getFleetFuelData(fleet, currentPos, targetPos, roundTrip = true) {
        const moveDist = calculateMovementDistance(currentPos, targetPos);
        const fleetCurrentFuelTank = await rpc.getReadConnection().getParsedTokenAccountsByOwner(fleet.fuelTank, {programId: tokenProgramPK});
        const token = fleetCurrentFuelTank.value.find(item => item.account.data.parsed.info.mint === sageGameAcct.account.mints.fuel.toString());
        const account = token ? token.pubkey : await getFleetFuelToken(fleet);
        const amount = token ? token.account.data.parsed.info.tokenAmount.uiAmount - fleet.exitSubwarpWillBurnFuel : 0;
        const warpCost = calcWarpFuelReq(fleet, currentPos, targetPos, fleet.moveType == 'warpsubwarp');
        const subwarpCost = Math.ceil(calculateSubwarpFuelBurn(fleet, moveDist));

        //Calculate fuel needed
        const costMultiplier = roundTrip ? 2 : 1;
        let fuelNeeded = 0;
        if (fleet.moveType == 'warp' || fleet.moveType == 'warpsubwarp' || fleet.moveType == 'warp-subwarp-warp') {
            fuelNeeded = warpCost * costMultiplier;
            if (fuelNeeded > fleet.fuelCapacity) fuelNeeded = roundTrip ? warpCost + subwarpCost : subwarpCost;
        } else {
            fuelNeeded = subwarpCost * costMultiplier;
        }

        //logger.log(4, `${utils.FleetTimeStamp(fleet.label)} getFleetFuelData -> calcWarpFuelReq:`, currentPos, targetPos);
        return {
            account,
            token,
            amount,
            capacity: fleet.fuelCapacity,
            warpCost: warpCost,
            subwarpCost: subwarpCost,
            fuelNeeded: fuelNeeded
        }
    }

    async function getFleetMultiJumpFuelData(fleet, positions, roundTrip = false) {
        // Vérification des paramètres
        if (!positions || positions.length < 2) {
            throw new Error("Il faut au moins deux positions pour calculer les besoins en carburant.");
        }

        // Récupération des informations sur le carburant actuel
        const fleetCurrentFuelTank = await rpc.getReadConnection().getParsedTokenAccountsByOwner(fleet.fuelTank, {programId: tokenProgramPK});
        const token = fleetCurrentFuelTank.value.find(item => item.account.data.parsed.info.mint === sageGameAcct.account.mints.fuel.toString());
        const account = token ? token.pubkey : await getFleetFuelToken(fleet);
        const amount = token ? token.account.data.parsed.info.tokenAmount.uiAmount - fleet.exitSubwarpWillBurnFuel : 0;

        let totalWarpCost = 0;
        let totalSubwarpCost = 0;
        let totalFuelNeeded = 0;

        // Multiplicateur pour aller-retour
        const costMultiplier = roundTrip ? 2 : 1;

        // Parcourir chaque saut (de positions[i] à positions[i+1])
        for (let i = 0; i < positions.length - 1; i++) {
            const currentPos = positions[i];
            const targetPos = positions[i + 1];

            // Calcul de la distance pour le saut
            const moveDist = calculateMovementDistance(currentPos, targetPos);

            // Calcul des coûts en carburant pour ce saut
            const warpCost = calcWarpFuelReq(fleet, currentPos, targetPos, fleet.moveType == 'warpsubwarp');
            const subwarpCost = Math.ceil(calculateSubwarpFuelBurn(fleet, moveDist));

            // Ajout des coûts pour ce saut
            let fuelNeededForJump = 0;
            if (fleet.moveType == 'warp' || fleet.moveType == 'warpsubwarp' || fleet.moveType == 'warp-subwarp-warp') {
                fuelNeededForJump = warpCost * costMultiplier;
                if (fuelNeededForJump > fleet.fuelCapacity) {
                    fuelNeededForJump = roundTrip ? warpCost + subwarpCost : subwarpCost;
                }
            } else {
                fuelNeededForJump = subwarpCost * costMultiplier;
            }

            // Ajouter les coûts au total
            totalWarpCost += warpCost;
            totalSubwarpCost += subwarpCost;
            totalFuelNeeded += fuelNeededForJump;
        }

        // Si aller-retour, ajouter le retour au point de départ
        if (roundTrip && positions.length >= 2) {
            const lastPos = positions[positions.length - 1];
            const startPos = positions[0];
            const returnDist = calculateMovementDistance(lastPos, startPos);
            const returnWarpCost = calcWarpFuelReq(fleet, lastPos, startPos, fleet.moveType == 'warpsubwarp');
            const returnSubwarpCost = Math.ceil(calculateSubwarpFuelBurn(fleet, returnDist));

            let returnFuelNeeded = 0;
            if (fleet.moveType == 'warp' || fleet.moveType == 'warpsubwarp' || fleet.moveType == 'warp-subwarp-warp') {
                returnFuelNeeded = returnWarpCost;
                if (returnFuelNeeded > fleet.fuelCapacity) {
                    returnFuelNeeded = returnSubwarpCost;
                }
            } else {
                returnFuelNeeded = returnSubwarpCost;
            }

            totalWarpCost += returnWarpCost;
            totalSubwarpCost += returnSubwarpCost;
            totalFuelNeeded += returnFuelNeeded;
        }

        // Retourner les résultats
        return {
            account,
            token,
            amount,
            capacity: fleet.fuelCapacity,
            totalWarpCost,
            totalSubwarpCost,
            totalFuelNeeded
        };
    }

    async function fuelFleet(fleet, dockCoords, account, amount, returnTx) {
        logger.log(1, `${utils.FleetTimeStamp(fleet.label)} Filling fuel tank: ${amount}`);
        let fuelCargoTypeAcct = cargoTypes.find(item => item.account.mint.toString() == sageGameAcct.account.mints.fuel);
        const fuelResp = await execCargoFromStarbaseToFleet(
            fleet,
            fleet.fuelTank,
            account,
            sageGameAcct.account.mints.fuel.toString(),
            fuelCargoTypeAcct,
            dockCoords,
            amount,
            globalSettings.fleetForceConsumableAmount,
            returnTx
        );

        return fuelResp;
    }

    async function handleTransportRefueling(fleet, starbaseCoord, currentPos, targetPos, roundTrip = true, amountToDropOff = 0, transportManifest, returnTx) {
        logger.log(1, `${utils.FleetTimeStamp(fleet.label)} ⛽ Refueling`);
        updateFleetState(fleet, 'Refueling');
        let fuelResp = {status: 0, detail: '', amount: 0};

        const fuelData = await getFleetFuelData(fleet, currentPos, targetPos, roundTrip);

        if (fuelData.fuelNeeded > fuelData.capacity) {
            logger.log(1, `${utils.FleetTimeStamp(fleet.label)} ERROR: Fuel tank too small for round trip`);
            fuelResp.detail = 'ERROR: Fuel tank too small for round trip';
            return fuelResp;
        }
        const fuelEntry = transportManifest.find(e => e.res === sageGameAcct.account.mints.fuel.toString()) || {amt: 0};

        //Log fuel readouts
        const extraFuel = Math.floor(fuelData.amount - fuelData.fuelNeeded);
        logger.log(2, `${utils.FleetTimeStamp(fleet.label)} Current Fuel: ${fuelData.amount}`);
        logger.log(2, `${utils.FleetTimeStamp(fleet.label)} Warp Cost: ${fuelData.warpCost}`);
        logger.log(2, `${utils.FleetTimeStamp(fleet.label)} Subwarp Cost: ${fuelData.subwarpCost}`);
        logger.log(2, `${utils.FleetTimeStamp(fleet.label)} Fuel To Transport: ${fuelEntry.amt}`);
        logger.log(2, `${utils.FleetTimeStamp(fleet.label)} Extra Fuel: ${extraFuel}`);

        let transactions = [];
        let alreadyLoaded = 0;

        //Unload extra fuel from tank
        if (amountToDropOff > 0) {
            const fuelToUnload = Math.min(amountToDropOff, extraFuel);
            if (fuelToUnload > 0) {
                logger.log(1, `${utils.FleetTimeStamp(fleet.label)} Unloading extra fuel: ${fuelToUnload}`);
                let resp = await execCargoFromFleetToStarbase(fleet, fleet.fuelTank, sageGameAcct.account.mints.fuel.toString(), starbaseCoord, fuelToUnload, returnTx);
                alreadyLoaded -= fuelToUnload;
                if (returnTx && resp) {
                    transactions.push(resp);
                }
            }
        }

        //Calculate amount of fuel to add to the tank
        const totalFuel = fuelData.fuelNeeded + fuelEntry.amt;
        let fuelToAdd = Math.min(fuelData.capacity, totalFuel) - fuelData.amount;
        fuelResp.alreadyLoaded = alreadyLoaded;
        let topupFuel = "topupFuel" in transportManifest[0] ? transportManifest[0].topupFuel : false;
        //Bail if already has enough
        if (fuelToAdd <= 0 && !topupFuel) {
            fuelResp.status = 1;
            fuelResp.amount = fuelData.amount + fuelToAdd - fuelData.fuelNeeded;
            if (transactions.length > 0) fuelResp.transactions = transactions;
            return fuelResp;
        }

        if (globalSettings.transportFuel100 && roundTrip && fuelToAdd < fuelData.capacity - fuelData.amount) {
            fuelToAdd = fuelData.capacity - fuelData.amount;
        }
        if(topupFuel){
            fuelToAdd = fuelData.capacity - fuelData.amount;
        }
        //Put in the fuel
        logger.log(4, `SB ${starbaseCoord} fuel to add ${fuelToAdd} ${topupFuel ? '(Topped up)' : ''}`)

        let execResp = await fuelFleet(fleet, starbaseCoord, fuelData.account, fuelToAdd, returnTx);
        logger.log(4, `${JSON.stringify(execResp)}`);
        if (execResp && execResp.name == 'NotEnoughResource') {
            logger.log(1, `${utils.FleetTimeStamp(fleet.label)} ERROR: Not enough fuel`);
            if (globalSettings.emailNotEnoughFFA) await sendEMail(fleet.label + ' not enough fuel', '');
            fuelResp.detail = 'ERROR: Not enough fuel';
        } else {
            fuelResp.status = 1;
            fuelResp.amount = fuelData.amount + fuelToAdd - fuelData.fuelNeeded;
            alreadyLoaded += fuelToAdd;
            fuelResp.alreadyLoaded = alreadyLoaded;
            if (returnTx && execResp.tx) {
                transactions.push(execResp.tx);
            }
        }
        if (transactions.length > 0) fuelResp.transactions = transactions;

        return fuelResp
    }



    //new approach: squeeze as much as possible into a transaction by calculating the exact tx sizes, only make another tx if the max tx size is exceeded
    async function txSliceAndSend(transactions, fleet, opName, priorityFeeMultiplier, maxInstructionsPerTx) {
        // TODO: maxInstructionsPerTx is not longer used, remove later
        let txResult;
        let curPos = 0;
        let curSize = 1;
        let lastBlock = null;
        let allTxSlices = [];

        if (fleet.exitWarpSubwarpPending == 1) {
            transactions = [await execExitWarp(fleet, true)].concat(transactions);
            fleet.exitWarpSubwarpPending = 0;
        }
        if (fleet.exitWarpSubwarpPending == 2) {
            transactions = [await execExitSubwarp(fleet, true)].concat(transactions);
            fleet.exitWarpSubwarpPending = 0;
            fleet.exitSubwarpWillBurnFuel = 0;
        }

        while (curPos + curSize <= transactions.length) {

            let instructions = [];
            const priorityFee = 5;
            let curBlock = transactions.slice(curPos, curPos + curSize);

            instructions.push(solanaWeb3.ComputeBudgetProgram.setComputeUnitPrice({microLamports: priorityFee}));
            curBlock.forEach(item => instructions.push(item.instruction))

            let latestBH = 'EkSnNWid2cvwEVnVx9aBqawnmiCNiDgp3gUdkDPTKN1N'; //dummy block hash
            let messageV0 = new solanaWeb3.TransactionMessage({
                payerKey: userPublicKey,
                recentBlockhash: latestBH,
                instructions,
            }).compileToV0Message(addressLookupTables);
            let tx = new solanaWeb3.VersionedTransaction(messageV0);
            //if (extraSigner) tx.sign([extraSigner]);
            let txSize = 9999;
            try {
                txSize = tx.serialize().length;
            } catch (err) {
                // couldn't serialize due to "RangeError: encoding overruns Uint8Array", so we reached the limit, txSize is still 9999 now and we will use the tx from the previous loop
            }

            // check the size (use 1216 as max size instead of 1232, just to be sure, so we have 16 bytes of free space)
            // the first ix should always fit into a tx
            if (curSize > 1 && txSize > 1216) {
                allTxSlices.push(lastBlock);
                lastBlock = null;
                curPos += curSize - 1;
                curSize = 1;
            } else {
                curSize += 1;
            }

            lastBlock = curBlock;
        }
        if (lastBlock) {
            allTxSlices.push(lastBlock);
        }

        for (const transactionsSlice of allTxSlices) {
            if (transactionsSlice.length == 1)
                txResult = await txSignAndSend(transactionsSlice[0], fleet, opName, priorityFeeMultiplier);
            else
                txResult = await txSignAndSend(transactionsSlice, fleet, opName, priorityFeeMultiplier);
            if (fleet.state.includes('ERROR')) break;
        }
        return txResult;
    }

    async function getFleetAmmoBank(fleet) {
        return await rpc.getReadConnection().getParsedTokenAccountsByOwner(fleet.ammoBank, {programId: tokenProgramPK})
    }

    async function getFleetFuelBank(fleet) {
        return await rpc.getReadConnection().getParsedTokenAccountsByOwner(fleet.fuelTank, {programId: tokenProgramPK})
    }


    async function getFleetAmmoCount(fleet) {
        const ammoMint = sageGameAcct.account.mints.ammo.toString();
        const bank = await getFleetAmmoBank(fleet);
        const value = bank.value.find(item => item.account.data.parsed.info.mint === ammoMint);
        return value ? value.account.data.parsed.info.tokenAmount.uiAmount : 0;
    }

    async function getFleetFuelCount(fleet) {
        const fuelMint = sageGameAcct.account.mints.fuel.toString();
        const bank = await getFleetFuelBank(fleet);
        const value = bank.value.find(item => item.account.data.parsed.info.mint === fuelMint);
        return value ? value.account.data.parsed.info.tokenAmount.uiAmount : 0;
    }

    async function handleTransportUnloading(fleet, starbaseCoord, transportManifest, returnTx) {
        logger.log(1, `${utils.FleetTimeStamp(fleet.label)} 🚚 Unloading Transport`);
        updateFleetState(fleet, 'Unloading');

        const ammoMint = sageGameAcct.account.mints.ammo.toString();
        const fuelMint = sageGameAcct.account.mints.fuel.toString();

        const fleetCurrentCargo = await rpc.getReadConnection().getParsedTokenAccountsByOwner(fleet.cargoHold, {programId: tokenProgramPK});

        let transactions = [];
        let unloadedAmount = 0;

        //Unloading resources from manifest
        let fuelUnloadDeficit = 0;
        let ammoUnloadDeficit = 0;
        for (const entry of transportManifest) {
            if (entry.res !== '' && entry.amt > 0) {
                const isFuel = entry.res === sageGameAcct.account.mints.fuel.toString();
                const isAmmo = entry.res === ammoMint;
                const currentRes = fleetCurrentCargo.value.find(item => item.account.data.parsed.info.mint === entry.res);
                const currentResCnt = currentRes ? currentRes.account.data.parsed.info.tokenAmount.uiAmount : 0;

                if (isFuel) fuelUnloadDeficit = entry.amt;
                if (isAmmo) ammoUnloadDeficit = entry.amt;
                let amountToUnload = Math.min(currentResCnt, entry.amt);
                if (globalSettings.transportKeep1 && amountToUnload > 0) {
                    amountToUnload -= 1;
                }
                if (amountToUnload > 0) {
                    logger.log(1, `${utils.FleetTimeStamp(fleet.label)} Unloading ${amountToUnload} ${entry.res}`);
                    let resp = await execCargoFromFleetToStarbase(fleet, fleet.cargoHold, entry.res, starbaseCoord, amountToUnload, returnTx);
                    if (returnTx && resp) {
                        transactions.push(resp);
                    }
                    if (isFuel) fuelUnloadDeficit -= amountToUnload;
                    if (isAmmo) ammoUnloadDeficit -= amountToUnload;
                    unloadedAmount += amountToUnload * cargoItems.find(r => r.token === entry.res).size;
                } else {
                    logger.log(1, `${utils.FleetTimeStamp(fleet.label)} Unload ${entry.res} skipped - none found in ship's cargo hold`);
                }

            }
        }
        //Ammo bank unloading
        const ammoEntry = transportManifest.find(e => e.res === ammoMint);
        if (ammoEntry) {
            let currentAmmoCnt = await getFleetAmmoCount(fleet);
            let ammoToUnload = Math.min(currentAmmoCnt, ammoUnloadDeficit);
            if (globalSettings.transportKeep1 && ammoToUnload > 0) {
                ammoToUnload -= 1;
            }
            if (ammoToUnload > 0) {
                logger.log(1, `${utils.FleetTimeStamp(fleet.label)} Unloading Ammobanks: ${ammoToUnload}`);
                let resp = await execCargoFromFleetToStarbase(fleet, fleet.ammoBank, ammoMint, starbaseCoord, ammoToUnload, returnTx);
                if (returnTx && resp) {
                    transactions.push(resp);
                }
            }
        }
        /*//Fuel bank unloading
        const fuelEntry = transportManifest.find(e => e.res === fuelMint);
        if (fuelEntry) {
            let currentFuelCnt = await getFleetFuelCount(fleet);
            let fuelToUnload = Math.min(currentFuelCnt, fuelUnloadDeficit);
            if (globalSettings.transportKeep1 && fuelToUnload > 0) {
                fuelToUnload -= 1;
            }
            if (fuelToUnload > 0) {
                logger.log(1, `${utils.FleetTimeStamp(fleet.label)} Unloading Fuelbanks: ${fuelToUnload}`);
                let resp = await execCargoFromFleetToStarbase(fleet, fleet.fuelTank, fuelMint, starbaseCoord, fuelToUnload, returnTx);
                if (returnTx && resp) {
                    transactions.push(resp);
                }
            }
        }*/

        return {fuelUnloadDeficit, transactions, unloadedAmount};
    }


    async function handleTransportLoading(i, starbaseCoords, transportManifest, returnTx, alreadyUnloadedInTransaction) {
        logger.log(1, `${utils.FleetTimeStamp(userFleets[i].label)} 📦 Loading Transport`);
        updateFleetState(userFleets[i], 'Loading');

        //Use ammo banks if possible
        const ammoEntry = globalSettings.transportUseAmmoBank ? transportManifest.find(e => e.res === sageGameAcct.account.mints.ammo.toString()) : undefined;
        let resp = null;
        let transactions = [];
        let ammoLoadingIntoAmmoBank = ammoEntry ? (resp = await execLoadFleetAmmo(userFleets[i], starbaseCoords, ammoEntry.amt, returnTx)).amountLoaded : 0;
        if (returnTx && resp && resp.transaction) {
            transactions.push(resp.transaction);
            //when using a combined load tx, we need to take into account the amount loaded into the fuel tank, because the starbase still reports the original amount (otherwise we may get an ix error instead a "NotEnoughResource" error)
            ammoEntry.alreadyLoadedInTransaction = ammoLoadingIntoAmmoBank;
        }

        //Calculate remaining free cargo space
        logger.log(2, `${utils.FleetTimeStamp(userFleets[i].label)} Calculating cargoSpace ...`);
        const fleetCurrentCargo = await rpc.getReadConnection().getParsedTokenAccountsByOwner(userFleets[i].cargoHold, {programId: tokenProgramPK});
        const cargoCnt = fleetCurrentCargo.value.reduce((n, {account}) => n + account.data.parsed.info.tokenAmount.uiAmount * cargoItems.find(r => r.token == account.data.parsed.info.mint).size, 0);
        let cargoSpace = userFleets[i].cargoCapacity - cargoCnt;
        if (alreadyUnloadedInTransaction) cargoSpace += alreadyUnloadedInTransaction;
        const startingCargoSpace = cargoSpace;
        let expectedCnt = 0;
        logger.log(2, `${utils.FleetTimeStamp(userFleets[i].label)} cargoSpace remaining: ${cargoSpace}`);

        let notEnoughInfo = '';
        for (const entry of transportManifest) {
            if (entry.res && entry.amt > 0) {
                if (cargoSpace < 1) {
                    logger.log(1, `${utils.FleetTimeStamp(userFleets[i].label)} Cargo full - remaining loading process skipped`);
                    break;
                }

                const [fleetResourceToken] = await BrowserAnchor.anchor.web3.PublicKey.findProgramAddressSync(
                    [
                        userFleets[i].cargoHold.toBuffer(),
                        tokenProgramPK.toBuffer(),
                        new solanaWeb3.PublicKey(entry.res).toBuffer()
                    ],
                    programPK
                );
                const currentRes = fleetCurrentCargo.value.find(item => item.account.data.parsed.info.mint === entry.res);
                const fleetResAcct = currentRes ? currentRes.pubkey : fleetResourceToken;
                const resCargoTypeAcct = cargoTypes.find(item => item.account.mint.toString() == entry.res);
                const currentResAmt = currentRes ? currentRes.account.data.parsed.info.tokenAmount.uiAmount : 0;

                //Deduct ammo already loaded into ammobank if applicable
                const isAmmo = entry.res === sageGameAcct.account.mints.ammo.toString();
                //For ammo SLYA didn't check the ammo in the cargo room, added
                const resMax = Math.floor(Math.min(cargoSpace / cargoItems.find(r => r.token == entry.res).size, isAmmo ? entry.amt - ammoLoadingIntoAmmoBank - currentResAmt : entry.amt - currentResAmt));
                expectedCnt += resMax;
                if (resMax > 0) {
                    logger.log(1, `${utils.FleetTimeStamp(userFleets[i].label)} Attempting to load ${resMax} ${entry.res} from ${starbaseCoords}`);
                    const resp = await execCargoFromStarbaseToFleet(
                        userFleets[i],
                        userFleets[i].cargoHold,
                        fleetResAcct,
                        entry.res,
                        resCargoTypeAcct,
                        starbaseCoords,
                        resMax,
                        false,
                        returnTx,
                        ((returnTx && entry.alreadyLoadedInTransaction) ? entry.alreadyLoadedInTransaction : 0)
                    );
                    logger.log(1, `${utils.FleetTimeStamp(userFleets[i].label)} Loaded ${resp.amount} ${entry.res}: `, resp);
                    cargoSpace -= resp && resp.amount ? cargoItems.find(r => r.token == entry.res).size * resp.amount : 0;

                    if (resp && resp.name == 'NotEnoughResource') {
                        const resShort = cargoItems.find(r => r.token == entry.res).name;
                        logger.log(1, `${utils.FleetTimeStamp(userFleets[i].label)} Not enough ${resShort}`);
                        notEnoughInfo += 'Not enough ' + resShort + '\n';
                    } else if (returnTx && resp && resp.tx) {
                        transactions.push(resp.tx);
                    }
                }
            }
        }
        if (startingCargoSpace == cargoSpace && expectedCnt > 0) {
            updateFleetState(userFleets[i], 'ERROR: No cargo loaded');
            logger.log(2, `${utils.FleetTimeStamp(userFleets[i].label)} ERROR: No cargo loaded`);
            if (globalSettings.emailNoCargoLoaded) await sendEMail(userFleets[i].label + ' no cargo loaded', notEnoughInfo);
        }
        return {success: !userFleets[i].state.includes('ERROR'), transactions: transactions};
    }


    function updateFleetMiscStats(fleet, fleetAcctInfo) {
        let fleetAcctData = sageProgram.coder.accounts.decode('fleet', fleetAcctInfo.data);
        fleet.requiredCrew = fleetAcctData.stats.miscStats.requiredCrew;
        fleet.passengerCapacity = fleetAcctData.stats.miscStats.passengerCapacity;
        fleet.crewCount = fleetAcctData.stats.miscStats.crewCount;
    }

    async function operateFleet(i) {
        logger.log(4, `Operate fleet ${userFleets[i].label}`);
        if (globalErrorTracker.errorCount > 9) toggleAssistant('ERROR');

        // Ne pas exécuter les flottes en erreur
        if (userFleets[i].state.includes('ERROR')) return;

        userFleets[i].lastOp = Date.now();

        if (userFleets[i].stopping || userFleets[i].state.includes('STOPPED')) {
            userFleets[i].stopping = false;
            updateFleetState(userFleets[i], 'STOPPED');
            return;
        }

        const moving =
            userFleets[i].state.includes('Move [') ||
            userFleets[i].state.includes('Warp [') ||
            userFleets[i].state.includes('Subwarp [');
        const waitingForWarpCD = userFleets[i].state.includes('Warp C/D');
        const mining = userFleets[i].mineEnd && userFleets[i].state.includes('Mine') && (Date.now() < userFleets[i].mineEnd);
        const onTarget = userFleets[i].destCoord;

        if (moving) logger.log(4, `${utils.FleetTimeStamp(userFleets[i].label)} Operating moving fleet`);
        if (userFleets[i].resupplying || mining) return;
        if (!onTarget && waitingForWarpCD) return;
        let forceNewAutoMoveTarget = false;

        try {
            let fleetSavedData = await GM.getValue(userFleets[i].publicKey.toString(), '{}');
            let fleetParsedData = JSON.parse(fleetSavedData);
            userFleets[i].iterCnt++;
            logger.log(4, `${utils.FleetTimeStamp(userFleets[i].label)} <getAccountInfo> (${userFleets[i].state})`);
            let fleetAcctInfo = await getAccountInfo(userFleets[i].label, 'full fleet info', userFleets[i].publicKey);
            updateFleetMiscStats(userFleets[i], fleetAcctInfo);
            let [fleetState, extra] = getFleetState(fleetAcctInfo, userFleets[i]);
            logger.log(4, `${utils.FleetTimeStamp(userFleets[i].label)} chain fleet state: ${fleetState}`);
            let fleetCoords = fleetState === 'Idle' ? extra : [];
            let fleetMining = fleetState === 'MineAsteroid' ? extra : null;
            userFleets[i].startingCoords = fleetCoords;
            logger.log(4, `Starting coords ${fleetCoords} iterCount: ${userFleets[i].iterCnt} state:${fleetState} fleetCoords:${fleetCoords}`);

            if (moving && fleetState === 'Idle') {
                logger.log(4, `${utils.FleetTimeStamp(userFleets[i].label)} Fleet State Mismatch - Updating from ${userFleets[i].state} to ${fleetState}`);
                updateFleetState(userFleets[i], fleetState);
            }
            logger.log(4, `(userFleets[i].iterCnt < 2) && fleetState == 'StarbaseLoadingBay':${(userFleets[i].iterCnt < 2) && fleetState === 'StarbaseLoadingBay'}`);
            if ((userFleets[i].iterCnt < 2) && fleetState === 'StarbaseLoadingBay') {
                if (fleetParsedData.assignment === 'Mine' || fleetParsedData.assignment === 'Transport') {
                    await execStartupUndock(i, fleetParsedData.assignment);
                }
            } else if (fleetState === 'MoveWarp' || fleetState === 'MoveSubwarp') {
                logger.log(4, `${utils.FleetTimeStamp(userFleets[i].label)} executing handleMovement`);
                await handleMovement(i, null, null, null);
            } else if (fleetParsedData.assignment === 'Mine') {
                if (fleetState === 'MineAsteroid' && !userFleets[i].state.includes('Mine')) {
                    logger.log(1, `${utils.FleetTimeStamp(userFleets[i].label)} Fleet State Mismatch - retrying`);
                    for (let retryCount = 1; retryCount <= 4; retryCount++) {
                        await utils.wait(10000);
                        fleetAcctInfo = await getAccountInfo(userFleets[i].label, 'full fleet info', userFleets[i].publicKey);
                        [fleetState, extra] = getFleetState(fleetAcctInfo, userFleets[i]);
                        logger.log(1, `${utils.FleetTimeStamp(userFleets[i].label)} chain fleet state (after retry ${retryCount}/4): ${fleetState}`);
                        fleetCoords = fleetState === 'Idle' ? extra : [];
                        fleetMining = fleetState === 'MineAsteroid' ? extra : null;
                        userFleets[i].startingCoords = fleetCoords;
                        if (fleetState !== 'MineAsteroid') {
                            break;
                        }
                    }
                    if (fleetState === 'MineAsteroid' && !userFleets[i].state.includes('Mine')) {
                        logger.log(1, `${utils.FleetTimeStamp(userFleets[i].label)} Fleet State Mismatch - Updating to Mining again`);
                        updateFleetState(userFleets[i], 'Mine [' + utils.TimeToStr(new Date(Date.now())) + ']');
                    }
                }
                await handleMining(i, userFleets[i].state, fleetCoords, fleetMining);
            } else if (fleetParsedData.assignment === 'Transport') {
                logger.log(4, `${utils.FleetTimeStamp(userFleets[i].label)} executing handleSupply`);
                await handleSupply(i, fleetState, fleetCoords);
            } else if (fleetParsedData.assignment === 'Move') {
                logger.log(4, `${utils.FleetTimeStamp(userFleets[i].label)} executing handleEmptyMove`);
                await handleEmptyMove(i, fleetState, fleetCoords);
            }
        } catch (err) {
            logger.log(1, `${utils.FleetTimeStamp(userFleets[i].label)} ERROR`, err);
            logger.log(1, 'Error while operating fleet: ' + (err.message ? err.message : err));  // Remplacé logger.logError par logger.log
        }
    }

    async function startFleet(i) {
        //Bail if assistant is stopped

        let extraTime = 0;
        const fleet = userFleets[i];

        try {
            //logger.log(1,`${utils.FleetTimeStamp(userFleets[i].label)} Operating fleet ...`);
            const fleetSavedData = await GM.getValue(fleet.publicKey.toString(), '{}');
            const fleetParsedData = JSON.parse(fleetSavedData);

            //Bail if no assignment
            if (fleetParsedData.assignment) {
                fleet.fontColor = 'aquamarine';
                updateAssistStatus(fleet);
                await operateFleet(i);

                fleet.fontColor = 'white';
                updateAssistStatus(fleet);
            }
            //in case we stopped the fleet AND removed the assignment, we still need to check for the 'stopping' state
            else if (userFleets[i].stopping || userFleets[i].state.includes('STOPPED')) {
                userFleets[i].stopping = false;
                updateFleetState(userFleets[i], 'STOPPED');
            }
        } catch (error) {
            extraTime = 20000;
            logger.log(1, `${utils.FleetTimeStamp(fleet.label)} Uncaught error - waiting 20s longer`, error);

            fleet.fontColor = 'crimson';
            updateAssistStatus(fleet);
        }

        //Add extra wait time if an uncaught error occurred
        setTimeout(() => {
            startFleet(i);
        }, 10000 + extraTime);
    }

    async function getStarbasePlayerCargoHolds(starbasePlayer) {
        let starbasePlayerCargoHolds = await cargoProgram.account.cargoPod.all([
            {
                memcmp: {
                    offset: 41,
                    bytes: starbasePlayer.toBase58(),
                },
            },
        ]);

        let starbasePlayerCargoHoldsAndTokens = [];
        for (let cargoHold of starbasePlayerCargoHolds) {
            if (cargoHold.account && cargoHold.account.openTokenAccounts > 0) {
                let cargoHoldTokensRaw = await rpc.getReadConnection().getParsedTokenAccountsByOwner(cargoHold.publicKey, {programId: tokenProgramPK});
                let cargoHoldTokens = cargoHoldTokensRaw.value.map(item => ({
                    cargoHoldToken: item.pubkey,
                    mint: item.account.data.parsed.info.mint,
                    amount: item.account.data.parsed.info.tokenAmount.uiAmount
                }));
                starbasePlayerCargoHoldsAndTokens.push({
                    starbasePlayerCargoHold: cargoHold.publicKey,
                    cargoHoldTokens: cargoHoldTokens
                });
            }
        }
        return starbasePlayerCargoHoldsAndTokens;
    }

    function getStarbasePlayerCargoMaxItem(starbasePlayerCargoHoldsAndTokens, mint) {
        let cargoHold = starbasePlayerCargoHoldsAndTokens.reduce((prev, curr) => {
            let prevCargoHoldToken = prev && prev.cargoHoldTokens.find(item => item.mint === mint);
            let prevAmount = prevCargoHoldToken ? prevCargoHoldToken.amount : -1;
            let currCargoHoldToken = curr.cargoHoldTokens.find(item => item.mint === mint);
            let currAmount = currCargoHoldToken ? currCargoHoldToken.amount : -1;
            return prevAmount > currAmount ? prev : currAmount > -1 ? curr : null;
        });
        return cargoHold;
    }

    function getTargetRecipe(starbasePlayerCargoHoldsAndTokens, userCraft, targetAmount, special) {
        let targetRecipe = null;
        let outputExisting = 0;
        let allRecipes = craftRecipes.concat(upgradeRecipes);
        let craftRecipe = userCraft.name ? userCraft : allRecipes.find(item => item.name === userCraft.item);

        let starbasePlayerIngredientCargoHolds = [];
        for (let input of craftRecipe.input) {
            let craftAmount = input.amount * targetAmount;
            let starbasePlayerCargoHold = getStarbasePlayerCargoMaxItem(starbasePlayerCargoHoldsAndTokens, input.mint.toString());
            if (starbasePlayerCargoHold && starbasePlayerCargoHold.cargoHoldTokens) {
                let cargoHoldToken = starbasePlayerCargoHold.cargoHoldTokens.find(item => item.mint === input.mint.toString());
                cargoHoldToken = cargoHoldToken ? cargoHoldToken : {mint: input.mint.toString(), amount: 0};
                let amountCraftable = cargoHoldToken.amount ? Math.floor(cargoHoldToken.amount / input.amount) : 0;
                craftAmount = craftAmount - cargoHoldToken.amount;
                starbasePlayerIngredientCargoHolds.push({
                    starbasePlayerCargoHold: starbasePlayerCargoHold.starbasePlayerCargoHold,
                    cargoHoldToken: cargoHoldToken,
                    amountCraftable: amountCraftable,
                    craftAmount: craftAmount
                });
            } else {
                starbasePlayerIngredientCargoHolds.push({
                    starbasePlayerCargoHold: null,
                    cargoHoldToken: {mint: input.mint.toString()},
                    amountCraftable: 0,
                    craftAmount: craftAmount
                });
            }
        }

        let limitingIngredient = starbasePlayerIngredientCargoHolds.reduce((prev, curr) => prev && prev.amountCraftable < curr.amountCraftable ? prev : curr);

        logger.log(4, 'DEBUG limitingIngredient: ', limitingIngredient);
        logger.log(4, 'DEBUG targetAmount: ', targetAmount);
        if (limitingIngredient.amountCraftable < targetAmount) {
            for (let ingredient of starbasePlayerIngredientCargoHolds) {
                logger.log(4, 'DEBUG ingredient: ', ingredient);
                if (ingredient.craftAmount > 0) {
                    let filterData = ['SDU'];
                    if (special.includes('f2')) filterData.push('Framework', 'Framework 3');
                    else if (special.includes('f3')) filterData.push('Framework', 'Framework 2');
                    else filterData.push('Framework 2', 'Framework 3');
                    if (special.includes('t2')) filterData.push('Toolkit', 'Toolkit 3');
                    else if (special.includes('t3')) filterData.push('Toolkit', 'Toolkit 2');
                    else filterData.push('Toolkit 2', 'Toolkit 3');
                    let filteredCraftRecipes = craftRecipes.filter(item => !(filterData.includes(item.name)));
                    let ingredientRecipes = filteredCraftRecipes.filter(item => item.output.mint.toString() === ingredient.cargoHoldToken.mint);
                    for (let ingredientRecipe of ingredientRecipes) {
                        let checkRecipe = getTargetRecipe(starbasePlayerCargoHoldsAndTokens, ingredientRecipe, ingredient.craftAmount, special);
                        if (checkRecipe) targetRecipe = checkRecipe;
                    }
                }
            }
        } else {
            targetRecipe = {
                craftRecipe: craftRecipe,
                amountCraftable: limitingIngredient.amountCraftable,
                craftAmount: targetAmount
            };
        }

        return targetRecipe;
    }

    async function getStarbaseTime(starbase, activity) {
        const EMPTY_CRAFTING_SPEED_PER_TIER = [0, .2, .275, .35, .425, .5, .5];
        //const EMPTY_CRAFTING_SPEED_PER_TIER = [0, 1, 1, 1, 1, 1, 1];
        let currTime = Date.now() / 1000;
        let gameStateAcct = await sageProgram.account.gameState.fetch(sageGameAcct.account.gameState);
        let sbLevel = gameStateAcct.fleet.upkeep['level' + starbase.account.level];
        let lastGlobalUpdate, lastLocalUpdate, resAmount, resDepletionRate;
        if (activity === 'Craft') {
            lastGlobalUpdate = starbase.account.upkeepFoodGlobalLastUpdate.toNumber();
            lastLocalUpdate = starbase.account.upkeepFoodLastUpdate.toNumber();
            resAmount = starbase.account.upkeepFoodBalance.toNumber();
            resDepletionRate = sbLevel.foodDepletionRate / 100;
        } else {
            lastGlobalUpdate = starbase.account.upkeepToolkitGlobalLastUpdate.toNumber();
            lastLocalUpdate = starbase.account.upkeepToolkitLastUpdate.toNumber();
            resAmount = starbase.account.upkeepToolkitBalance.toNumber();
            resDepletionRate = sbLevel.toolkitDepletionRate / 100;
        }
        const timeSinceGlobalUpdate = currTime > lastGlobalUpdate ? currTime - lastGlobalUpdate : 0;
        const upkeepTimeRemaining = resDepletionRate > 0 ? resAmount / resDepletionRate : 0;
        const globalUpkeepTimeRemaining = Math.min(timeSinceGlobalUpdate, upkeepTimeRemaining);
        const localUpkeepTimeRemaining = lastLocalUpdate + globalUpkeepTimeRemaining > currTime ? currTime - lastLocalUpdate : globalUpkeepTimeRemaining;
        const resForLocalTimeDiff = localUpkeepTimeRemaining * resDepletionRate;
        const resRemainingLocalTimeDiff = resAmount - resForLocalTimeDiff;
        const resRemainingLocalTimeDiffMin = resRemainingLocalTimeDiff < 0 ? 0 : resRemainingLocalTimeDiff;
        const minUpkeepTimeRemaining = Math.min(localUpkeepTimeRemaining, upkeepTimeRemaining);
        const emptyAdjustment = minUpkeepTimeRemaining == upkeepTimeRemaining ? (timeSinceGlobalUpdate - minUpkeepTimeRemaining) * EMPTY_CRAFTING_SPEED_PER_TIER[starbase.account.level] : 0;
        let starbaseTime = activity === 'Craft' ? lastLocalUpdate + localUpkeepTimeRemaining + emptyAdjustment : lastLocalUpdate + localUpkeepTimeRemaining;
        //let starbaseTime = activity === 'Craft' ? lastLocalUpdate + timeSinceGlobalUpdate * EMPTY_CRAFTING_SPEED_PER_TIER[starbase.account.level] : lastLocalUpdate + localUpkeepTimeRemaining;
        return {starbaseTime: starbaseTime, resRemaining: resRemainingLocalTimeDiffMin};
    }

    async function updateCraft(userCraft) {
        let craftSavedData = await GM.getValue(userCraft.label, '{}');
        let craftParsedData = JSON.parse(craftSavedData);
        craftParsedData.state = userCraft.state;
        craftParsedData.craftingId = userCraft.craftingId;
        craftParsedData.craftingCoords = userCraft.craftingCoords;
        craftParsedData.feeAtlas = userCraft.feeAtlas;
        craftParsedData.errorCount = userCraft.errorCount;
        await GM.setValue(userCraft.label, JSON.stringify(craftParsedData));
    }

    async function craftTimeoutAfterError(userCraft) {
        let craftSavedData = await GM.getValue(userCraft.label, '{}');
        let craftParsedData = JSON.parse(craftSavedData);
        craftParsedData.errorCount = (typeof craftParsedData.errorCount == "undefined" ? 1 : craftParsedData.errorCount + 1);
        await GM.setValue(userCraft.label, JSON.stringify(craftParsedData));
        const waitMinutes = Math.min(20, craftParsedData.errorCount * 2 - 1);
        updateFleetState(userCraft, userCraft.state + " (" + waitMinutes + "m)", true);
        return waitMinutes * 60000;
    }


    async function startCraft(userCraft) {
        let localTimeout = 60000;
        try {
            const EMPTY_CRAFTING_SPEED_PER_TIER = [0, .2, .275, .35, .425, .5, .5];
            //const EMPTY_CRAFTING_SPEED_PER_TIER = [0, 1, 1, 1, 1, 1, 1];
            let craftSavedData = await GM.getValue(userCraft.label, '{}');
            let craftParsedData = JSON.parse(craftSavedData);
            userCraft = craftParsedData;
            updateFleetState(userCraft, userCraft.state);

            //if this job isn't active, we exit immediately and check every 10 seconds for an update, this saves at least 2 RPC requests. Also it prevents a error in getRecipe
            if (userCraft.state === 'Idle' && (!userCraft.item || !userCraft.coordinates || !userCraft.amount)) {
                setTimeout(() => {
                    startCraft(userCraft);
                }, 10000);
                return;
            }

            let targetX;
            let targetY;
            let starbase;
            let craftTime;
            let upgradeTime;
            let starbasePlayer;
            if (userCraft.craftingId) {

                // temporary, when updating SLYA there is no craftingCoords first, so we need a fallback. Can be removed later.
                if (!userCraft.craftingCoords) {
                    userCraft.craftingCoords = userCraft.coordinates;
                }
                targetX = userCraft.craftingCoords.split(',')[0].trim();
                targetY = userCraft.craftingCoords.split(',')[1].trim();
                starbase = await getStarbaseFromCoords(targetX, targetY, true);
                logger.log(2, utils.FleetTimeStamp(userCraft.label), 'starbase: ', starbase);
                craftTime = await getStarbaseTime(starbase, 'Craft');
                upgradeTime = await getStarbaseTime(starbase, 'Upgrade');
                logger.log(2, utils.FleetTimeStamp(userCraft.label), 'craftTime: ', craftTime);
                logger.log(2, utils.FleetTimeStamp(userCraft.label), 'upgradeTime: ', upgradeTime);

                starbasePlayer = await getStarbasePlayer(userProfileAcct, starbase.publicKey);
                starbasePlayer = starbasePlayer ? starbasePlayer.publicKey : await execRegisterStarbasePlayer('Craft', userCraft.craftingCoords);

                // Get all crafting instances at designated Starbase
                let craftingInstances = await sageProgram.account.craftingInstance.all([
                    {
                        memcmp: {
                            offset: 11,
                            bytes: starbasePlayer.toBase58(),
                        },
                    },
                ]);

                //let completeBN = new BrowserAnchor.anchor.BN(2);
                //let completeArr = completeBN.toTwos(64).toArrayLike(BrowserBuffer.Buffer.Buffer, "be", 2);
                //let complete58 = bs58.encode(completeArr);

                if (craftingInstances.length < 1) {
                    userCraft.craftingId = 0;
                    updateFleetState(userCraft, 'Idle');
                    await updateCraft(userCraft);
                    //await GM.setValue(userCraft.label, JSON.stringify(userCraft));
                }

                // Get all completed crafting processes at the designated Starbase
                let completedCraftingProcesses = [];
                let completedUpgradeProcesses = [];
                let craftingProcessRunning = false;
                for (let craftingInstance of craftingInstances) {
                    let craftingProcesses = await craftingProgram.account.craftingProcess.all([
                        {
                            memcmp: {
                                offset: 17,
                                bytes: craftingInstance.publicKey.toBase58(),
                            },
                        },
                        /*{
                                memcmp: {
                                    offset: 152,
                                    bytes: complete58,
                                },
                            },*/
                    ]);

                    for (let craftingProcess of craftingProcesses) {
                        if (userCraft.craftingId && craftingProcess.account.craftingId.toNumber() == userCraft.craftingId) craftingProcessRunning = true;
                        if (craftRecipes.some(item => item.publicKey.toString() === craftingProcess.account.recipe.toString())) {
                            //fix: if we found ANY other completed process in this starbase, the time for this crafting process wasn't updated, because the first if statement was true
                            //therefore we now only select the corresponding completed crafting process
                            //this also fixes: we only execute the main code block below when the condition ...
                            //if((!craftingProcessRunning) || completedCraftingProcesses.length || completedUpgradeProcesses.length)
                            //...is true. But when there was ANY completed craft at this starbase (even a manual one) the block was always unnecessarily executed
                            //todo: the later loop through completedCraftingProcesses isn't needed anymore, because we should only have exactly one completed process (this job)
                            if (craftingProcess.account.endTime.toNumber() < craftTime.starbaseTime && [2, 3].includes(craftingProcess.account.status) && userCraft.craftingId && craftingProcess.account.craftingId.toNumber() == userCraft.craftingId) {
                                completedCraftingProcesses.push({
                                    craftingProcess: craftingProcess.publicKey,
                                    craftingInstance: craftingInstance.publicKey,
                                    recipe: craftingProcess.account.recipe,
                                    status: craftingProcess.account.status,
                                    inputsChecksum: craftingProcess.account.inputsChecksum,
                                    outputsChecksum: craftingProcess.account.outputsChecksum,
                                    craftingId: craftingProcess.account.craftingId.toNumber(),
                                    quantity: craftingProcess.account.quantity.toNumber()
                                });
                            } else if (userCraft.craftingId && craftingProcess.account.craftingId.toNumber() == userCraft.craftingId) {
                                let craftRecipe = craftRecipes.find(item => item.publicKey.toString() === craftingProcess.account.recipe.toString());
                                let calcEndTime = Math.max(craftingProcess.account.endTime.toNumber() - craftTime.starbaseTime, 0);
                                let adjustedEndTime = craftTime.resRemaining > 0 ? calcEndTime : (calcEndTime) / EMPTY_CRAFTING_SPEED_PER_TIER[starbase.account.level];
                                //let adjustedEndTime = (calcEndTime) / EMPTY_CRAFTING_SPEED_PER_TIER[starbase.account.level];
                                //let craftTimeStr = 'Crafting [' + utils.TimeToStr(new Date(Date.now() + adjustedEndTime * 1000)) + ']';
                                let craftTimeStr = "&#9874; " + craftRecipe.name + (userCraft.item != craftRecipe.name ? ' (' + userCraft.item + ')' : '') + ' [' + utils.TimeToStr(new Date(Date.now() + adjustedEndTime * 1000)) + ']';
                                updateFleetState(userCraft, craftTimeStr);
                                await updateCraft(userCraft);
                                //update less frequently if we have a long-running crafting task (3 minutes if remaining time >12 minutes, 2 minutes if remaining time >8 minutes), update faster if <60 seconds left
                                if (adjustedEndTime > 900) localTimeout = 300000;
                                else if (adjustedEndTime > 180) localTimeout = adjustedEndTime * 1000 / 3;
                                else if (adjustedEndTime < 60) localTimeout = 30000;
                            }
                        } else {
                            //same fix here
                            if (craftingProcess.account.endTime.toNumber() < upgradeTime.starbaseTime && [2, 3].includes(craftingProcess.account.status) && userCraft.craftingId && craftingProcess.account.craftingId.toNumber() == userCraft.craftingId) {
                                completedUpgradeProcesses.push({
                                    craftingProcess: craftingProcess.publicKey,
                                    craftingInstance: craftingInstance.publicKey,
                                    recipe: craftingProcess.account.recipe,
                                    status: craftingProcess.account.status,
                                    craftingId: craftingProcess.account.craftingId.toNumber()
                                });
                            } else if (userCraft.craftingId && craftingProcess.account.craftingId.toNumber() == userCraft.craftingId) {
                                let upgradeTimeDiff = Math.max(craftingProcess.account.endTime.toNumber() - upgradeTime.starbaseTime, 0);
                                let upgradeTimeStr = upgradeTime.resRemaining > 0 ? 'Upgrading [' + utils.TimeToStr(new Date(Date.now() + upgradeTimeDiff * 1000)) + ']' : 'Paused [' + parseInt(upgradeTimeDiff / 60) + 'm remaining]';
                                updateFleetState(userCraft, upgradeTimeStr);
                                await updateCraft(userCraft);
                            }
                        }
                    }
                }

                if (!craftingProcessRunning) {
                    logger.log(1, `${utils.FleetTimeStamp(userCraft.label)} Crafting process not found. Setting state to Idle.`);
                    userCraft.craftingId = 0;
                    updateFleetState(userCraft, 'Idle');
                    await updateCraft(userCraft);
                }

                // only get current cargo holds if something needs to be completed
                if (completedCraftingProcesses.length || completedUpgradeProcesses.length) {
                    let starbasePlayerCargoHoldsAndTokens = await getStarbasePlayerCargoHolds(starbasePlayer);

                    for (let craftingProcess of completedCraftingProcesses) {
                        let craftRecipe = craftRecipes.find(item => item.publicKey.toString() === craftingProcess.recipe.toString());
                        if (userCraft.craftingId && craftingProcess.craftingId == userCraft.craftingId) {
                            logger.log(1, `${utils.FleetTimeStamp(userCraft.label)} Completing craft at [${targetX}, ${targetY}] for  ${craftRecipe.output.mint.toString()}`);
                            //updateFleetState(userCraft, 'Craft Completing');
                            updateFleetState(userCraft, 'Completing: ' + craftRecipe.name + (userCraft.item != craftRecipe.name ? ' (' + userCraft.item + ')' : ''));
                            await execCompleteCrafting(starbase, starbasePlayer, starbasePlayerCargoHoldsAndTokens, craftingProcess, userCraft);
                            if (!userCraft.state.includes('ERROR')) {
                                if (userCraft.craftingId && craftingProcess.craftingId == userCraft.craftingId) {
                                    userCraft.craftingId = 0;
                                    userCraft.errorCount = 0;
                                    updateFleetState(userCraft, 'Idle');
                                    await updateCraft(userCraft);
                                }
                            } else {
                                localTimeout = await craftTimeoutAfterError(userCraft);
                            }
                        }
                    }

                    for (let upgradeProcess of completedUpgradeProcesses) {
                        let craftingRecipe = upgradeRecipes.find(item => item.publicKey.toString() === upgradeProcess.recipe.toString());
                        if (userCraft.craftingId && upgradeProcess.craftingId == userCraft.craftingId) {
                            logger.log(1, `${utils.FleetTimeStamp(userCraft.label)} Completing upgrade at [${targetX}, ${targetY}] for  ${craftingRecipe.input[0].mint.toString()}`);
                            updateFleetState(userCraft, 'Upgrade Completing');
                            await execCompleteUpgrade(starbase, starbasePlayer, starbasePlayerCargoHoldsAndTokens, upgradeProcess, userCraft);
                            if (!userCraft.state.includes('ERROR')) {
                                if (userCraft.craftingId && upgradeProcess.craftingId == userCraft.craftingId) {
                                    userCraft.craftingId = 0;
                                    userCraft.errorCount = 0;
                                    updateFleetState(userCraft, 'Idle');
                                    await updateCraft(userCraft);
                                    //await GM.setValue(userCraft.label, JSON.stringify(userCraft));
                                }
                            } else {
                                localTimeout = await craftTimeoutAfterError(userCraft);
                            }
                        }
                    }
                }
            } else {
                userCraft.craftingId = 0; //set first, so the coords are not taken from the last crafting job
                updateFleetState(userCraft, 'Idle');
                await updateCraft(userCraft);
            }

            //we read the current data, as it may have changed by the user in the meantime
            craftSavedData = await GM.getValue(userCraft.label, '{}');
            craftParsedData = JSON.parse(craftSavedData);
            userCraft = craftParsedData;

            //only continue if the job is in a idle state and if we need something to craft, otherwise we save a cargo hold request
            if (userCraft.state === 'Idle' && userCraft.item && userCraft.coordinates && userCraft.amount > 0 && userCraft.crew > 0) {

                if (starbase && targetX == userCraft.coordinates.split(',')[0].trim() && targetY == userCraft.coordinates.split(',')[1].trim()) {
                    // we use the existing data from the craft completion, obviously the starbase wasn't changed by the user
                } else {
                    // fresh job with no previous completion or starbase was changed
                    targetX = userCraft.coordinates.split(',')[0].trim();
                    targetY = userCraft.coordinates.split(',')[1].trim();
                    starbase = await getStarbaseFromCoords(targetX, targetY, true);
                    craftTime = await getStarbaseTime(starbase, 'Craft');
                    upgradeTime = await getStarbaseTime(starbase, 'Upgrade');
                    starbasePlayer = await getStarbasePlayer(userProfileAcct, starbase.publicKey);
                    starbasePlayer = starbasePlayer ? starbasePlayer.publicKey : await execRegisterStarbasePlayer('Craft', userCraft.coordinates);
                }

                let starbasePlayerInfo = await sageProgram.account.starbasePlayer.fetch(starbasePlayer);
                let availableCrew = starbasePlayerInfo.totalCrew - starbasePlayerInfo.busyCrew.toNumber();
                let starbasePlayerCargoHoldsAndTokens = await getStarbasePlayerCargoHolds(starbasePlayer);

                let targetRecipe = getTargetRecipe(starbasePlayerCargoHoldsAndTokens, userCraft, Number(userCraft.amount), (userCraft.special ? userCraft.special : ''));



                logger.log(3, utils.FleetTimeStamp(userCraft.label), 'targetRecipe: ', targetRecipe);
                logger.log(3, utils.FleetTimeStamp(userCraft.label), 'starbasePlayerInfo: ', starbasePlayerInfo);
                logger.log(3, utils.FleetTimeStamp(userCraft.label), 'availableCrew: ', availableCrew);
                logger.log(3, utils.FleetTimeStamp(userCraft.label), 'userCraft: ', userCraft);
                logger.log(3, utils.FleetTimeStamp(userCraft.label), 'userCraft.crew: ', userCraft.crew);
                logger.log(3, utils.FleetTimeStamp(userCraft.label), 'userCraft.state: ', userCraft.state);

                if (availableCrew >= userCraft.crew && targetRecipe && targetRecipe.amountCraftable > 0 && userCraft.state === 'Idle') {
                    let craftAmount = Math.min(targetRecipe.craftAmount, targetRecipe.amountCraftable);
                    logger.log(1, `${utils.FleetTimeStamp(userCraft.label)} Starting craft at [${targetX}, ${targetY}] for ${craftAmount} ${targetRecipe.craftRecipe.name}`);
                    //updateFleetState(userCraft, 'Craft Starting');
                    let activityType = craftRecipes.some(item => item.name === targetRecipe.craftRecipe.name) ? 'Crafting' : 'Upgrading';

                    //Enough Atlas available for the craft?
                    let enoughAtlas = true;
                    let craftThresholdReached = true;
                    if (activityType == 'Crafting') {
                        const atlasNeeded = Number((craftAmount * targetRecipe.craftRecipe.feeAmount).toFixed(10));
                        const atlasParsedBalance = await rpc.getReadConnection().getParsedTokenAccountsByOwner(userPublicKey, {mint: new solanaWeb3.PublicKey('ATLASXmbPQxBUYbxPsV97usA3fPQYEqzQBUHgiFCUsXx')});
                        const atlasBalance = (atlasParsedBalance.value[0] ? atlasParsedBalance.value[0].account.data.parsed.info.tokenAmount.uiAmount : 0);
                        logger.log(3, utils.FleetTimeStamp(userCraft.label), 'atlas needed: ', atlasNeeded, ', atlas available: ', atlasBalance);
                        if (atlasBalance < atlasNeeded) {
                            enoughAtlas = false;
                        }
                        if (parseInt(userCraft.belowAmount)) {
                            let craftRecipe = craftRecipes.find(item => item.name === userCraft.item);

                            let starbasePlayerCargoHold = getStarbasePlayerCargoMaxItem(starbasePlayerCargoHoldsAndTokens, craftRecipe.publicKey.toString());
                            let amountAvailable = 0;
                            if (starbasePlayerCargoHold && starbasePlayerCargoHold.cargoHoldTokens) {
                                let cargoHoldToken = starbasePlayerCargoHold.cargoHoldTokens.find(item => item.mint === craftRecipe.output.mint.toString());
                                amountAvailable = (cargoHoldToken && cargoHoldToken.amount) ? cargoHoldToken.amount : 0;
                            }
                            if (amountAvailable >= parseInt(userCraft.belowAmount)) {
                                craftThresholdReached = false;
                                logger.log(3, utils.FleetTimeStamp(userCraft.label), 'crafting paused: starbase amount available ', amountAvailable, ', craft if stock is below:', parseInt(userCraft.belowAmount));
                            }
                        }
                    }
                    if (activityType == 'Upgrading' && starbase.account.level >= 5) {
                        updateFleetState(userCraft, 'Starbase has max level');
                    } else if (!enoughAtlas) {
                        updateFleetState(userCraft, 'Not enough Atlas: ' + targetRecipe.craftRecipe.name + (userCraft.item != targetRecipe.craftRecipe.name ? ' (' + userCraft.item + ')' : ''));
                    } else if (!craftThresholdReached) {
                        updateFleetState(userCraft, 'Stock not less than ' + parseInt(userCraft.belowAmount) + ': ' + userCraft.item);
                    } else {
                        let activityInfo = activityType == 'Crafting' ? "Starting: " + targetRecipe.craftRecipe.name + (userCraft.item != targetRecipe.craftRecipe.name ? ' (' + userCraft.item + ')' : '') : 'Upgrade Starting';
                        updateFleetState(userCraft, activityInfo);
                        let result = await execStartCrafting(starbase, starbasePlayer, starbasePlayerCargoHoldsAndTokens, targetRecipe.craftRecipe, craftAmount, userCraft);
                        if (!userCraft.state.includes('ERROR')) {
                            activityInfo = activityType == 'Crafting' ? "&#9874; " + targetRecipe.craftRecipe.name + (userCraft.item != targetRecipe.craftRecipe.name ? ' (' + userCraft.item + ')' : '') : 'Upgrading';
                            let craftDuration = (targetRecipe.craftRecipe.duration * craftAmount) / userCraft.crew;
                            let calcEndTime = utils.TimeToStr(new Date(Date.now() + craftDuration * 1000));
                            let upgradeTimeStr = upgradeTime.resRemaining > 0 ? calcEndTime : 'Paused';
                            let craftTimeStr = craftTime.resRemaining > 0 ? calcEndTime : utils.TimeToStr(new Date(Date.now() + ((craftDuration * 1000) / EMPTY_CRAFTING_SPEED_PER_TIER[starbase.account.level])));
                            //let craftTimeStr = utils.TimeToStr(new Date(Date.now() + ((craftDuration * 1000) / EMPTY_CRAFTING_SPEED_PER_TIER[starbase.account.level])));
                            let activityTimeStr = activityType == 'Crafting' ? craftTimeStr : upgradeTimeStr;
                            //updateFleetState(userCraft, activityType + ' [' + activityTimeStr + ']');
                            updateFleetState(userCraft, activityInfo + ' [' + activityTimeStr + ']');
                            userCraft.craftingId = result.craftingId;
                            userCraft.craftingCoords = userCraft.coordinates;
                            userCraft.feeAtlas = result.feeAtlas;
                            userCraft.errorCount = 0;
                            await updateCraft(userCraft);
                            //await GM.setValue(userCraft.label, JSON.stringify(userCraft));
                        } else {
                            localTimeout = await craftTimeoutAfterError(userCraft);
                        }
                    }
                } else if (userCraft.state === 'Idle') {
                    //updateFleetState(userCraft, 'Waiting for crew/material');
                    let materialStr = '';
                    if (targetRecipe === null) {
                        materialStr = ': ' + userCraft.item;
                    } else {
                        materialStr = ': ' + targetRecipe.craftRecipe.name + (userCraft.item != targetRecipe.craftRecipe.name ? ' (' + userCraft.item + ')' : '');
                    }
                    if (availableCrew < userCraft.crew && ((targetRecipe && targetRecipe.amountCraftable <= 0) || (!targetRecipe))) {
                        updateFleetState(userCraft, 'Waiting for crew/material' + materialStr);
                    } else if (availableCrew < userCraft.crew) {
                        updateFleetState(userCraft, 'Waiting for crew' + materialStr);
                    } else {
                        updateFleetState(userCraft, 'Waiting for material' + materialStr);
                    }
                    await updateCraft(userCraft);
                }
            }
        } catch (error) {
            logger.log(1, `${utils.FleetTimeStamp(userCraft.label)} Uncaught crafting error`, error);
        }
        setTimeout(() => {
            startCraft(userCraft);
        }, localTimeout);
    }


    function initUser() {
        return new Promise(async resolve => {

            if (globalSettings.mySecretKey) {
                let mySecret = JSON.parse(globalSettings.mySecretKey);
                customKeypair = solanaWeb3.Keypair.fromSecretKey(new Uint8Array(mySecret));
                logger.log(1, "SLYA uses custom key with public address:", customKeypair.publicKey.toString());
                userPublicKey = customKeypair.publicKey;
            } else if (typeof solflare === 'undefined') {
                let walletConn = phantom && phantom.solana ? await phantom.solana.connect() : await solana.connect();
                userPublicKey = walletConn.publicKey;
            } else {
                await solflare.connect();
                userPublicKey = solflare.publicKey;
            }

            if (globalSettings.saveProfile && globalSettings.savedProfile && globalSettings.savedProfile.length > 0) {
                logger.log(1, 'Skipping User Profile query, using saved profile');
                userProfileAcct = new solanaWeb3.PublicKey(globalSettings.savedProfile[0]);
                userProfileKeyIdx = globalSettings.savedProfile[1];
                pointsProfileKeyIdx = globalSettings.savedProfile[2];
            } else {
                logger.log(1, 'Getting User Profiles (this takes a while)');
                let userProfiles = await rpc.getReadConnection().getProgramAccounts(profileProgramPK);
                let foundProf = [];

                logger.log(2, 'initUser: userProfiles[0]', userProfiles[0]);
                for (let userProf of userProfiles) {
                    let userProfData = userProf.account.data.subarray(30);
                    let iter = 0;
                    while (userProfData.length >= 80) {
                        let currProf = userProfData.subarray(0, 80);
                        let profDecoded = profileProgram.coder.types.decode('ProfileKey', currProf);
                        if (profDecoded.key.toString() === userPublicKey.toString()) {
                            let [playerNameAcct] = await rpc.getReadConnection().getProgramAccounts(
                                profileProgramPK,
                                {
                                    filters: [
                                        {
                                            memcmp: {
                                                offset: 9,
                                                bytes: userProf.pubkey.toString(),
                                            },
                                        },
                                    ],
                                }
                            );
                            let playerName = playerNameAcct ? new TextDecoder().decode(playerNameAcct.account.data.subarray(42)) : '';

                            let permissionType, sagePermission, pointsPermission, pointsStorePermission;
                            switch (profDecoded.scope.toString()) {
                                case sageProgramPK.toString():
                                    permissionType = 'sage';
                                    break;
                                case pointsProgramId.toString():
                                    permissionType = 'points';
                                    break;
                                case pointsStoreProgramId.toString():
                                    permissionType = 'points_store';
                                    break;
                                case profileProgramPK.toString():
                                    permissionType = 'default';
                                    break;
                            }

                            let profAdded = foundProf.findIndex(item => item.profile === userProf.pubkey.toString());
                            profAdded > -1 ? foundProf[profAdded][permissionType] = iter : foundProf.push({
                                profile: userProf.pubkey.toString(),
                                name: playerName,
                                [permissionType]: iter
                            })
                            //foundProf.push({profile: userProf.pubkey.toString(), name: playerName, scope: permissionType, idx: iter})
                        }
                        userProfData = userProfData.subarray(80);
                        //iter > 0 && foundProf.push({profile: userProf, key: profDecoded, idx: iter});
                        iter += 1;
                    }
                }

                //Wait for user to select a profile if more than 1 is available
                let userProfile = foundProf.length > 1 ? await assistProfileToggle(foundProf) : foundProf[0];
                userProfileAcct = new solanaWeb3.PublicKey(userProfile.profile);
                userProfileKeyIdx = userProfile.sage || 0;
                pointsProfileKeyIdx = userProfile.points || 0;
                if (globalSettings.saveProfile) {

                    globalSettings.savedProfile = [userProfileAcct.toString(), userProfileKeyIdx, pointsProfileKeyIdx];

                    await GM.setValue(settingsGmKey, JSON.stringify(globalSettings));
                }
            }

            let profileFactionProgram = new BrowserAnchor.anchor.Program(profileFactionIDL, profileFactionProgramPK, anchorProvider);
            [userProfileFactionAcct] = await profileFactionProgram.account.profileFactionAccount.all([
                {
                    memcmp: {
                        offset: 9,
                        bytes: userProfileAcct.toBase58(),
                    },
                },
            ]);

            await getAllStarbasesForFaction(userProfileFactionAcct.account.faction);

            let redemptionConfigs = await pointsStoreProgram.account.redemptionConfig.all();
            userRedemptionConfigAcct = redemptionConfigs.find(item => item.account.faction === userProfileFactionAcct.account.faction).publicKey;

            buildXpAccounts(dataRunningXpCategory, userXpAccounts, "userDataRunningXpAccounts")
            buildXpAccounts(councilRankXpCategory, userXpAccounts, "userCouncilRankXpAccounts")
            buildXpAccounts(pilotingXpCategory, userXpAccounts, "userPilotingXpAccounts")
            buildXpAccounts(miningXpCategory, userXpAccounts, "userMiningXpAccounts")
            buildXpAccounts(craftingXpCategory, userXpAccounts, "userCraftingXpAccounts")
            buildXpAccounts(LPCategory, userXpAccounts, "userLPAccounts")

            let userOwnedFleetAccts = await sageProgram.account.fleet.all([
                {
                    memcmp: {
                        offset: 41,
                        bytes: userProfileAcct.toBase58(),
                    },
                },
            ]);
            logger.log(1, 'initUser: userOwnedFleetAccts', userOwnedFleetAccts);

            let userBorrowedFleetAccts = await sageProgram.account.fleet.all([
                {
                    memcmp: {
                        offset: 105,
                        bytes: userProfileAcct.toBase58(),
                    },
                },
            ]);
            logger.log(1, 'initUser: userBorrowedFleetAccts', userBorrowedFleetAccts);

            let userFleetAccts = userOwnedFleetAccts.concat(userBorrowedFleetAccts);
            logger.log(1, 'initUser: userFleetAccts', userFleetAccts);

            let excludeFleets = [];
            if (globalSettings.excludeFleets && globalSettings.excludeFleets.length > 0) {
                excludeFleets = globalSettings.excludeFleets.trim().replaceAll("\r", "").split("\n");
            }
            logger.log(1, 'initUser: excludeFleets ', excludeFleets);

            for (let fleet of userFleetAccts) {
                let fleetLabel = (new TextDecoder("utf-8").decode(new Uint8Array(fleet.account.fleetLabel))).replace(/\0/g, '');

                if (excludeFleets.includes(fleetLabel)) continue;

                let fleetSavedData = await GM.getValue(fleet.publicKey.toString(), '{}');
                let fleetParsedData = JSON.parse(fleetSavedData);
                let fleetDest = fleetParsedData && fleetParsedData.dest ? fleetParsedData.dest : '';

                let fleetMineResource = fleetParsedData && fleetParsedData.mineResource ? fleetParsedData.mineResource : '';
                let fleetStarbase = fleetParsedData && fleetParsedData.starbase ? fleetParsedData.starbase : '';
                let fleetMoveType = fleetParsedData && fleetParsedData.moveType ? fleetParsedData.moveType : 'warp';
                let fleetMoveTarget = fleetParsedData && fleetParsedData.moveTarget ? fleetParsedData.moveTarget : '';


                const [fleetRepairKitToken] = await BrowserAnchor.anchor.web3.PublicKey.findProgramAddressSync(
                    [
                        fleet.account.cargoHold.toBuffer(),
                        tokenProgramPK.toBuffer(),
                        new solanaWeb3.PublicKey(toolItem.token).toBuffer()
                    ],
                    programPK
                );

                const [fleetFuelToken] = await BrowserAnchor.anchor.web3.PublicKey.findProgramAddressSync(
                    [
                        fleet.account.fuelTank.toBuffer(),
                        tokenProgramPK.toBuffer(),
                        new solanaWeb3.PublicKey(fuelItem.token).toBuffer()
                    ],
                    programPK
                );
                const [fleetFoodToken] = await BrowserAnchor.anchor.web3.PublicKey.findProgramAddressSync(
                    [
                        fleet.account.cargoHold.toBuffer(),
                        tokenProgramPK.toBuffer(),
                        new solanaWeb3.PublicKey(foodItem.token).toBuffer()
                    ],
                    programPK
                );
                const ammoMint = sageGameAcct.account.mints.ammo;
                const parsedTokenAccounts = await rpc.getReadConnection().getParsedTokenAccountsByOwner(fleet.account.ammoBank, {programId: tokenProgramPK});
                const currentAmmoCnt = parsedTokenAccounts.value.find(item => item.account.data.parsed.info.mint === ammoMint.toString());
                let fleetCurrentCargo = await rpc.getReadConnection().getParsedTokenAccountsByOwner(fleet.account.cargoHold, {programId: tokenProgramPK});
                let currentFoodCnt = fleetCurrentCargo.value.find(item => item.pubkey.toString() === fleetFoodToken.toString());

                let fleetCurrentFuel = await rpc.getReadConnection().getParsedTokenAccountsByOwner(fleet.account.fuelTank, {programId: tokenProgramPK});
                let currentFuelCnt = fleetCurrentFuel.value.find(item => item.pubkey.toString() === fleetFuelToken.toString());
                let fleetAcctInfo = await getAccountInfo(fleetLabel, 'Full Account Info', fleet.publicKey);
                let [fleetState, extra] = getFleetState(fleetAcctInfo);
                let fleetCoords = fleetState == 'Idle' && extra ? extra : [];


                userFleets.push({
                    publicKey: fleet.publicKey,
                    label: fleetLabel,
                    state: fleetState,
                    exitWarpSubwarpPending: 0,
                    exitSubwarpWillBurnFuel: 0,
                    moveTarget: fleetMoveTarget,
                    startingCoords: fleetCoords,
                    cargoHold: fleet.account.cargoHold,
                    fuelTank: fleet.account.fuelTank,
                    ammoBank: fleet.account.ammoBank,
                    repairKitToken: fleetRepairKitToken,

                    fuelToken: fleetFuelToken,
                    foodToken: fleetFoodToken,
                    warpFuelConsumptionRate: fleet.account.stats.movementStats.warpFuelConsumptionRate,
                    warpSpeed: fleet.account.stats.movementStats.warpSpeed,
                    maxWarpDistance: fleet.account.stats.movementStats.maxWarpDistance,
                    subwarpFuelConsumptionRate: fleet.account.stats.movementStats.subwarpFuelConsumptionRate,
                    subwarpSpeed: fleet.account.stats.movementStats.subwarpSpeed,
                    cargoCapacity: fleet.account.stats.cargoStats.cargoCapacity,
                    fuelCapacity: fleet.account.stats.cargoStats.fuelCapacity,
                    ammoCapacity: fleet.account.stats.cargoStats.ammoCapacity,

                    requiredCrew: fleet.account.stats.miscStats.requiredCrew,
                    passengerCapacity: fleet.account.stats.miscStats.passengerCapacity,
                    crewCount: fleet.account.stats.miscStats.crewCount,
                    warpCooldown: fleet.account.stats.movementStats.warpCoolDown,
                    miningRate: fleet.account.stats.cargoStats.miningRate,
                    foodConsumptionRate: fleet.account.stats.cargoStats.foodConsumptionRate,
                    ammoConsumptionRate: fleet.account.stats.cargoStats.ammoConsumptionRate,
                    planetExitFuelAmount: fleet.account.stats.movementStats.planetExitFuelAmount,
                    destCoord: fleetDest,
                    starbaseCoord: fleetStarbase,
                    foodCnt: currentFoodCnt ? currentFoodCnt.account.data.parsed.info.tokenAmount.uiAmount : 0,
                    fuelCnt: currentFuelCnt ? currentFuelCnt.account.data.parsed.info.tokenAmount.uiAmount : 0,
                    ammoCnt: currentAmmoCnt ? currentAmmoCnt.account.data.parsed.info.tokenAmount.uiAmount : 0,
                    moveType: fleetMoveType,
                    mineResource: fleetMineResource,
                    minePlanet: null,
                    fontColor: 'white',
                    resupplied: false,
                    loadCargo: '[]',
                    unloadCargo: '[]',
                    moving: false

                });
            }

            userFleets.sort(function (a, b) {
                return a.label.toUpperCase().localeCompare(b.label.toUpperCase());
            });

            initComplete = true;
            let assistConfigBtn = document.querySelector('#assistConfigBtn');
            if (assistConfigBtn) assistConfigBtn.innerHTML = 'Config'; //configwait
            resolve();
        });
    }

    function isInitComplete(){
        return initComplete;
    }

    function getUserFleets(){
        return userFleets;
    }

    function getValidTargets(){
        return validTargets;
    }

    function getCraftableItems(){
        return craftableItems;
    }

    function getCargoItems(){
        return cargoItems;
    }

    exports.initUser = initUser;
    exports.getUserFleets = getUserFleets;
    exports.updateFleetState = updateFleetState;
    exports.isInitComplete = isInitComplete;
    exports.getFleetState = getFleetState;
    exports.operateFleet = operateFleet;
    exports.startCraft = startCraft;
    exports.updateAssistStatus = updateAssistStatus;
    exports.getAccountInfo = getAccountInfo;
    exports.updateFleetMiscStats= updateFleetMiscStats;
    exports.getValidTargets = getValidTargets;
    exports.getCraftableItems = getCraftableItems;
    exports.getCargoItems = getCargoItems;

    return exports;


}({}));

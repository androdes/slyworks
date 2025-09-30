var logger =(function (exports) {
    class Logger {
        constructor(debugLevel = 2, maxErrorEntries = 30) {
            this.debugLevel = debugLevel;
            this.errorLog = [];
            this.errorLogIndex = 0;
            this.maxErrorEntries = maxErrorEntries;
        }

        log(level, ...args) {
            if (level <= this.debugLevel) {
                console.log(...args);
            }
        }

        setLevel(level) {
            this.debugLevel = level;
        }

        fleetLog(fleetName, level, ...args) {
            this.log(level, `[${fleetName}] [${this.getTimeStamp()}]`, ...args);
        }

        logError(message, fleetName = null) {
            const errorEntry = {
                timestamp: Date.now(),
                fleetName,
                message
            };

            this.errorLog[this.errorLogIndex] = errorEntry;
            this.errorLogIndex = (this.errorLogIndex + 1) % this.maxErrorEntries;

            this.log(1, 'ERROR:', message, fleetName ? `(Fleet: ${fleetName})` : '');
        }

        getTimeStamp() {
            return new Date().toLocaleTimeString("en-GB", {
                hour12: false,
                hour: "2-digit",
                minute: "2-digit"
            });
        }

        getErrors(count = 10) {
            return this.errorLog
                .filter(e => e)
                .sort((a, b) => b.timestamp - a.timestamp)
                .slice(0, count);
        }
    }


    return new Logger();
})({});
var utils = (function(exports){
    function wait(ms) {
        return new Promise(resolve => {
            setTimeout(resolve, ms);
        });
    }

    function TimeToStr(date) {
        return date.toLocaleTimeString("en-GB", {hour12: false, hour: "2-digit", minute: "2-digit"});
    }

    function TimeStamp() {
        return `[${TimeToStr(new Date(Date.now()))}]`;
    }

    function FleetTimeStamp(fleetName) {
        return `[${fleetName}] ${TimeStamp()}`
    }

    function BoolToStr(bool) {
        return bool ? 'Y' : 'N'
    }

    function CoordsValid(c) {
        return !isNaN(parseInt(c[0])) && !isNaN(parseInt(c[1]));
    }

    function ConvertCoords(coords) {
        return coords.split(',').map(coord => parseInt(coord.trim()));
    }

    function CoordsEqual(a, b) {
        return Array.isArray(a) && Array.isArray(b) &&
            a.length === 2 && b.length === 2 &&
            Number(a[0]) === Number(b[0]) &&
            Number(a[1]) === Number(b[1])
    }

    function parseIntDefault(value, defaultValue) {
        const intValue = parseInt(value);
        return !intValue && intValue !== 0 ? defaultValue : intValue;
    }

    function parseBoolDefault(value, defaultValue) {
        if (typeof value == "boolean") return value;
        if (typeof value == "string") return value === "true" || value === "false" ? value === "true" : defaultValue;
        return defaultValue;
    }

    function parseStringDefault(value, defaultValue) {
        if (typeof value == "string") return value;
        return defaultValue;
    }

    function parseStringDefaultForced(value, defaultValue) {
        if (typeof value == "string" && value.length) return value;
        return defaultValue;
    }


    function parseIntKMG(val) {
        let multiplier = val.substr(-1).toLowerCase();
        if (multiplier === "k")
            return parseInt(val) * 1000;
        else if (multiplier === "m")
            return parseInt(val) * 1000000;
        else if (multiplier === "g")
            return parseInt(val) * 1000000000;
        else
            return parseInt(val);
    }
    exports.wait = wait;
    exports.TimeToStr = TimeToStr;
    exports.TimeStamp = TimeStamp;
    exports.FleetTimeStamp = FleetTimeStamp;
    exports.BoolToStr = BoolToStr;
    exports.CoordsValid = CoordsValid;
    exports.ConvertCoords = ConvertCoords;
    exports.CoordsEqual = CoordsEqual;
    exports.parseIntDefault = parseIntDefault;
    exports.parseBoolDefault = parseBoolDefault;
    exports.parseStringDefault = parseStringDefault;
    exports.parseStringDefaultForced = parseStringDefaultForced;
    exports.parseIntKMG = parseIntKMG;
    return exports;
})({});
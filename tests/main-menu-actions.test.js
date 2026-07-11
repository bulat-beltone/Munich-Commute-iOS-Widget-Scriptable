const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const scriptPath = path.join(__dirname, "..", "Munich Commute Widget.js");

function createScriptableMocks() {
    class MockAlert {
        constructor() {
            this.title = "";
            this.message = "";
            this.actions = [];
        }

        addAction(title) {
            this.actions.push(title);
        }

        addDestructiveAction(title) {
            this.actions.push(title);
        }

        addCancelAction(title) {
            this.cancelAction = title;
        }

        addTextField() {}

        async presentAlert() {
            return 0;
        }

        async presentSheet() {
            return 0;
        }

        textFieldValue() {
            return "";
        }
    }

    class MockColor {
        constructor(value) {
            this.value = value;
        }

        static white() {
            return new MockColor("#ffffff");
        }
    }

    return {
        Alert: MockAlert,
        Color: MockColor,
        Device: {
            screenResolution: () => ({ width: 1290, height: 2796 }),
            model: () => "test"
        },
        FileManager: {
            iCloud: () => ({
                documentsDirectory: () => "/tmp",
                joinPath: (...parts) => parts.join("/"),
                fileExists: () => false,
                listContents: () => [],
                readString: () => "",
                writeString: () => {},
                createDirectory: () => {},
                remove: () => {}
            })
        },
        Font: {
            boldSystemFont: size => ({ type: "bold", size }),
            caption1: () => ({ type: "caption1" }),
            caption2: () => ({ type: "caption2" }),
            semiboldSystemFont: size => ({ type: "semibold", size })
        },
        LinearGradient: class {},
        ListWidget: class {},
        Location: {},
        Pasteboard: { copy: () => {} },
        Point: class {},
        Request: class {},
        SFSymbol: { named: () => ({ applyFont: () => {}, image: {} }) },
        Script: { complete: () => {}, setWidget: () => {} },
        Size: class {
            constructor(width, height) {
                this.width = width;
                this.height = height;
            }
        },
        args: { widgetParameter: "" },
        config: { runsInWidget: true, runsFromHomeScreen: false, widgetFamily: "large" },
        console
    };
}

function loadWidgetExports() {
    const source = fs.readFileSync(scriptPath, "utf8")
        .replace(/\nawait main\(\);\nScript\.complete\(\);\s*$/, "");

    const context = vm.createContext(createScriptableMocks());
    vm.runInContext(`${source}
globalThis.__testExports = {
    MAIN_MENU_ACTIONS,
    MAIN_MENU_ACTION,
    getMainMenuActionForIndex,
    getDepartureVisualState,
    stationMatchesTypeCodes,
    pickNearestStation,
    NEAREST_MODE,
    NEAREST_TOKENS,
    NEAREST_MODE_TOKEN,
    parseWidgetParameters,
    applyParsedWidgetParameters,
    normalizeWidgetSize,
    buildDeparturesFromScenario,
    shouldShowPlatformBadge,
    buildNearestStationMenuActions,
    buildPresetParameterString,
    getLineGradientSuggestions,
    getNearestModeStationLabel,
    DEFAULT_PRESET_DEFINITIONS,
    ensureDefaultPresets,
    CONFIG,
    LINE_COLORS,
    askGradient,
    AVAILABLE_GRADIENTS
};`, context, { filename: scriptPath });

    return context.__testExports;
}

// Like loadWidgetExports, but swaps in an Alert mock whose presentSheet()
// returns pre-programmed indices (in order) so menu-driven tests (gradient
// picker, station-mode picker, ...) can simulate a specific tap without a
// real UI.
function loadWidgetExportsWithAlertResponses(responses) {
    const mocks = createScriptableMocks();
    const queue = [...responses];
    const presentedAlerts = [];

    class QueueAlert {
        constructor() {
            this.title = "";
            this.message = "";
            this.actions = [];
        }

        addAction(title) {
            this.actions.push(title);
        }

        addDestructiveAction(title) {
            this.actions.push(title);
        }

        addCancelAction(title) {
            this.cancelAction = title;
        }

        addTextField() {}

        async presentAlert() {
            return 0;
        }

        async presentSheet() {
            presentedAlerts.push(this);
            return queue.length ? queue.shift() : -1;
        }

        textFieldValue() {
            return "";
        }
    }

    mocks.Alert = QueueAlert;

    const source = fs.readFileSync(scriptPath, "utf8")
        .replace(/\nawait main\(\);\nScript\.complete\(\);\s*$/, "");

    const context = vm.createContext(mocks);
    vm.runInContext(`${source}
globalThis.__testExports = {
    askGradient,
    getLineGradientSuggestions,
    CONFIG,
    AVAILABLE_GRADIENTS
};`, context, { filename: scriptPath });

    return { exports: context.__testExports, presentedAlerts };
}

// Like loadWidgetExports, but backs FileManager.iCloud() with an in-memory
// Map so filesystem-touching functions (ensureDefaultPresets, settings
// persistence, ...) can be exercised and their writes inspected.
function loadWidgetExportsWithFileSystem() {
    const files = new Map();
    const mocks = createScriptableMocks();
    mocks.FileManager = {
        iCloud: () => ({
            documentsDirectory: () => "/tmp",
            joinPath: (...parts) => parts.join("/"),
            fileExists: p => files.has(p),
            listContents: dir => Array.from(files.keys())
                .filter(p => p.startsWith(`${dir}/`) && !p.slice(dir.length + 1).includes("/"))
                .map(p => p.slice(dir.length + 1)),
            readString: p => files.get(p) ?? "",
            writeString: (p, content) => files.set(p, content),
            createDirectory: () => {},
            remove: p => files.delete(p)
        })
    };

    const source = fs.readFileSync(scriptPath, "utf8")
        .replace(/\nawait main\(\);\nScript\.complete\(\);\s*$/, "");

    const context = vm.createContext(mocks);
    vm.runInContext(`${source}
globalThis.__testExports = {
    ensureDefaultPresets,
    DEFAULT_PRESET_DEFINITIONS,
    NEAREST_MODE,
    parseWidgetParameters
};`, context, { filename: scriptPath });

    return { exports: context.__testExports, files };
}

// Like loadWidgetExportsWithAlertResponses, but also mocks Location.current()
// and Request#loadJSON() so pickNearbyStationByLocation (and anything built
// on it) can be exercised end-to-end: location failures, network failures,
// empty results, and picking a specific entry from the nearby-station list.
function loadWidgetExportsForNearbyPicker({ locationError = false, stations = null, selectedIndex } = {}) {
    const mocks = createScriptableMocks();
    const queue = selectedIndex === undefined ? [] : [selectedIndex];

    class QueueAlert {
        constructor() {
            this.title = "";
            this.message = "";
            this.actions = [];
        }

        addAction(title) {
            this.actions.push(title);
        }

        addDestructiveAction(title) {
            this.actions.push(title);
        }

        addCancelAction(title) {
            this.cancelAction = title;
        }

        addTextField() {}

        async presentAlert() {
            return 0;
        }

        async presentSheet() {
            return queue.length ? queue.shift() : -1;
        }

        textFieldValue() {
            return "";
        }
    }

    mocks.Alert = QueueAlert;
    mocks.Location = {
        setAccuracyToHundredMeters: () => {},
        current: async () => {
            if (locationError) throw new Error("Location access denied");
            return { latitude: 48.14, longitude: 11.58 };
        }
    };
    mocks.Request = class {
        constructor(url) {
            this.url = url;
        }

        async loadJSON() {
            if (stations === null) throw new Error("Network error");
            return stations;
        }
    };

    const source = fs.readFileSync(scriptPath, "utf8")
        .replace(/\nawait main\(\);\nScript\.complete\(\);\s*$/, "");

    const context = vm.createContext(mocks);
    vm.runInContext(`${source}
globalThis.__testExports = { pickNearbyStationByLocation };`, context, { filename: scriptPath });

    return context.__testExports;
}

// Exercises the "apply Settings line/platform defaults for a nearest-mode
// widget" logic (applyNearestDefaultsIfNeeded, called from createWidget())
// directly, without building a full ListWidget UI. `scenario` is a raw JS
// snippet with access to all of the widget script's module-level state
// (nearestMode, userLines, DEFAULT_STATION_LINES, ...); it must assign
// whatever it wants returned to a `results` variable.
function runNearestDefaultsScenario(scenario) {
    const source = fs.readFileSync(scriptPath, "utf8")
        .replace(/\nawait main\(\);\nScript\.complete\(\);\s*$/, "");

    const context = vm.createContext(createScriptableMocks());
    vm.runInContext(`${source}
let results;
${scenario}
globalThis.__testExports = { results };`, context, { filename: scriptPath });

    // Round-trip through JSON: arrays/objects built inside the vm context
    // belong to a different realm, so Node's strict-equal assertions would
    // otherwise reject them even when their contents match exactly.
    return JSON.parse(JSON.stringify(context.__testExports.results));
}

test("main menu maps the visible View action to the view action id", () => {
    const { MAIN_MENU_ACTIONS, MAIN_MENU_ACTION, getMainMenuActionForIndex } = loadWidgetExports();

    const viewIndex = MAIN_MENU_ACTIONS.findIndex(action => action.label.includes("View Preset"));

    assert.notEqual(viewIndex, -1);
    assert.equal(getMainMenuActionForIndex(viewIndex), MAIN_MENU_ACTION.VIEW_SAVED_STATION);
});

test("main menu maps the visible Edit action to the edit action id", () => {
    const { MAIN_MENU_ACTIONS, MAIN_MENU_ACTION, getMainMenuActionForIndex } = loadWidgetExports();

    const editIndex = MAIN_MENU_ACTIONS.findIndex(action => action.label.includes("Edit Preset"));

    assert.notEqual(editIndex, -1);
    assert.equal(getMainMenuActionForIndex(editIndex), MAIN_MENU_ACTION.EDIT_SAVED_STATION);
});

test("cancelled departures dim the line badge, time, and destination text", () => {
    const { getDepartureVisualState } = loadWidgetExports();
    const state = getDepartureVisualState({ cancelled: true });

    assert.equal(state.lineBackgroundColor, "#FFFFFF");
    assert.equal(state.lineBackgroundOpacity, 0.10);
    assert.equal(state.lineTextOpacity, 0.30);
    assert.equal(state.timeTextOpacity, 0.30);
    assert.equal(state.destinationTextOpacity, 0.30);
});

test("non-cancelled departures render at full opacity with no dimming", () => {
    const { getDepartureVisualState } = loadWidgetExports();
    const state = getDepartureVisualState({ cancelled: false });

    assert.equal(state.lineBackgroundColor, null);
    assert.equal(state.lineBackgroundOpacity, 1);
    assert.equal(state.lineTextOpacity, 1);
    assert.equal(state.timeTextOpacity, 1);
    assert.equal(state.destinationTextOpacity, null);
});

test("main menu no longer exposes a dedicated Find Nearest S-Bahn action", () => {
    const { MAIN_MENU_ACTIONS, MAIN_MENU_ACTION } = loadWidgetExports();

    const index = MAIN_MENU_ACTIONS.findIndex(action => action.label.includes("Find Nearest S-Bahn"));

    assert.equal(index, -1);
    assert.equal(MAIN_MENU_ACTION.FIND_NEAREST_SBAHN, undefined);
});

test("stationMatchesTypeCodes detects a match from either transportTypes or products", () => {
    const { stationMatchesTypeCodes } = loadWidgetExports();

    assert.equal(stationMatchesTypeCodes({ transportTypes: ["SBAHN", "UBAHN"] }, ["SBAHN"]), true);
    assert.equal(stationMatchesTypeCodes({ products: ["SBAHN"] }, ["SBAHN"]), true);
    assert.equal(stationMatchesTypeCodes({ transportTypes: ["UBAHN", "BUS"] }, ["SBAHN"]), false);
    assert.equal(stationMatchesTypeCodes({}, ["SBAHN"]), false);
    assert.equal(stationMatchesTypeCodes(null, ["SBAHN"]), false);
});

test("stationMatchesTypeCodes treats an empty type list as no filter", () => {
    const { stationMatchesTypeCodes } = loadWidgetExports();

    assert.equal(stationMatchesTypeCodes({ transportTypes: ["BUS"] }, []), true);
    assert.equal(stationMatchesTypeCodes(null, []), true);
});

test("pickNearestStation returns the closest station of any type", () => {
    const { pickNearestStation, NEAREST_MODE } = loadWidgetExports();

    const stations = [
        { name: "Tram Stop", globalId: "t1", transportTypes: ["TRAM"], distanceInMeters: 50 },
        { name: "Marienplatz", globalId: "m1", transportTypes: ["SBAHN", "UBAHN"], distanceInMeters: 120 }
    ];

    const nearest = pickNearestStation(stations, NEAREST_MODE.ANY);
    assert.equal(nearest.name, "Tram Stop");
    assert.equal(nearest.globalId, "t1");
});

test("pickNearestStation in S-Bahn mode skips non-S-Bahn stops", () => {
    const { pickNearestStation, NEAREST_MODE } = loadWidgetExports();

    const stations = [
        { name: "Bus Stop", globalId: "b1", transportTypes: ["BUS"], distanceInMeters: 30 },
        { name: "Tram Stop", globalId: "t1", transportTypes: ["TRAM"], distanceInMeters: 80 },
        { name: "Hauptbahnhof", globalId: "h1", transportTypes: ["SBAHN", "BAHN"], distanceInMeters: 300 }
    ];

    const nearest = pickNearestStation(stations, NEAREST_MODE.SBAHN);
    assert.equal(nearest.name, "Hauptbahnhof");
    assert.equal(nearest.globalId, "h1");
});

test("pickNearestStation sorts defensively by distance", () => {
    const { pickNearestStation, NEAREST_MODE } = loadWidgetExports();

    const stations = [
        { name: "Far", globalId: "f1", transportTypes: ["SBAHN"], distanceInMeters: 900 },
        { name: "Near", globalId: "n1", transportTypes: ["SBAHN"], distanceInMeters: 100 }
    ];

    const nearest = pickNearestStation(stations, NEAREST_MODE.SBAHN);
    assert.equal(nearest.name, "Near");
});

test("pickNearestStation returns null when no station matches", () => {
    const { pickNearestStation, NEAREST_MODE } = loadWidgetExports();

    assert.equal(pickNearestStation([], NEAREST_MODE.ANY), null);
    assert.equal(pickNearestStation([{ name: "Bus", transportTypes: ["BUS"] }], NEAREST_MODE.SBAHN), null);
});

test("pickNearbyStationByLocation returns null when location access fails", async () => {
    const { pickNearbyStationByLocation } = loadWidgetExportsForNearbyPicker({ locationError: true });

    const result = await pickNearbyStationByLocation();
    assert.equal(result, null);
});

test("pickNearbyStationByLocation returns null when the nearby-stations request fails", async () => {
    const { pickNearbyStationByLocation } = loadWidgetExportsForNearbyPicker({ stations: null });

    const result = await pickNearbyStationByLocation();
    assert.equal(result, null);
});

test("pickNearbyStationByLocation returns null when nothing is nearby", async () => {
    const { pickNearbyStationByLocation } = loadWidgetExportsForNearbyPicker({ stations: [] });

    const result = await pickNearbyStationByLocation();
    assert.equal(result, null);
});

test("pickNearbyStationByLocation returns null when the user cancels the list instead of auto-picking one", async () => {
    const stations = [{ name: "Closest", globalId: "c1", distanceInMeters: 50, transportTypes: ["BUS"] }];
    const { pickNearbyStationByLocation } = loadWidgetExportsForNearbyPicker({ stations });

    const result = await pickNearbyStationByLocation();
    assert.equal(result, null);
});

test("pickNearbyStationByLocation returns whichever station the user actually selected from the list, not just the closest one", async () => {
    const stations = [
        { name: "Closest", globalId: "c1", distanceInMeters: 50, transportTypes: ["BUS"] },
        { name: "Second Closest", globalId: "s2", distanceInMeters: 150, transportTypes: ["SBAHN"] }
    ];
    const { pickNearbyStationByLocation } = loadWidgetExportsForNearbyPicker({ stations, selectedIndex: 1 });

    const result = await pickNearbyStationByLocation();
    assert.equal(result.name, "Second Closest");
    assert.equal(result.distanceInMeters, 150);
});

test("nearest tokens map to the correct resolution mode", () => {
    const { NEAREST_TOKENS, NEAREST_MODE } = loadWidgetExports();

    assert.equal(NEAREST_TOKENS["nearest"], NEAREST_MODE.ANY);
    assert.equal(NEAREST_TOKENS["nearest-sbahn"], NEAREST_MODE.SBAHN);
    assert.equal(NEAREST_TOKENS["nearest-s-bahn"], NEAREST_MODE.SBAHN);
});

test("parseWidgetParameters detects a nearest-sbahn token alongside other filters", () => {
    const { parseWidgetParameters, NEAREST_MODE } = loadWidgetExports();

    const parsed = parseWidgetParameters("nearest-sbahn; lines: S3, S4; gradient: blue");

    assert.equal(parsed.nearestMode, NEAREST_MODE.SBAHN);
    assert.equal(Array.from(parsed.lines).join(","), "S3,S4");
    assert.equal(parsed.gradient, "blue");
    assert.equal(parsed.hasExplicitStation, false);
});

test("parseWidgetParameters parses test data and preview size overrides", () => {
    const { parseWidgetParameters } = loadWidgetExports();

    const parsed = parseWidgetParameters("station: Marienplatz; test: on-time-mix.json; size: medium");

    assert.equal(parsed.station, "Marienplatz");
    assert.equal(parsed.testDataFile, "on-time-mix.json");
    assert.equal(parsed.previewWidgetSize, "medium");
    assert.equal(parsed.nearestMode, null);
});

test("parseWidgetParameters defaults to a plain station when no special tokens are present", () => {
    const { parseWidgetParameters } = loadWidgetExports();

    const parsed = parseWidgetParameters("Ostbahnhof; platform: 2");

    assert.equal(parsed.station, "Ostbahnhof");
    assert.equal(parsed.hasExplicitStation, false);
    assert.equal(Array.from(parsed.platforms).join(","), "2");
    assert.equal(parsed.nearestMode, null);
    assert.equal(parsed.testDataFile, null);
});

test("normalizeWidgetSize accepts short and full size names, rejects unknown values", () => {
    const { normalizeWidgetSize } = loadWidgetExports();

    assert.equal(normalizeWidgetSize("s"), "small");
    assert.equal(normalizeWidgetSize("Medium"), "medium");
    assert.equal(normalizeWidgetSize("L"), "large");
    assert.equal(normalizeWidgetSize("huge"), null);
    assert.equal(normalizeWidgetSize(""), null);
});

test("shouldShowPlatformBadge shows the platform when there is no platform filter", () => {
    const { shouldShowPlatformBadge, parseWidgetParameters, applyParsedWidgetParameters } = loadWidgetExports();

    applyParsedWidgetParameters(parseWidgetParameters("station: Marienplatz"));

    assert.equal(shouldShowPlatformBadge({ platform: "3" }), true);
});

test("shouldShowPlatformBadge hides the platform when the filter narrows to exactly one platform", () => {
    const { shouldShowPlatformBadge, parseWidgetParameters, applyParsedWidgetParameters } = loadWidgetExports();

    applyParsedWidgetParameters(parseWidgetParameters("station: Marienplatz; platform: 2"));

    assert.equal(shouldShowPlatformBadge({ platform: "2" }), false);
});

test("shouldShowPlatformBadge still shows the platform when the filter covers multiple platforms", () => {
    const { shouldShowPlatformBadge, parseWidgetParameters, applyParsedWidgetParameters } = loadWidgetExports();

    applyParsedWidgetParameters(parseWidgetParameters("station: Marienplatz; platform: 1,2"));

    assert.equal(shouldShowPlatformBadge({ platform: "1" }), true);
});

test("shouldShowPlatformBadge hides the platform when the departure has no platform info", () => {
    const { shouldShowPlatformBadge, parseWidgetParameters, applyParsedWidgetParameters } = loadWidgetExports();

    applyParsedWidgetParameters(parseWidgetParameters("station: Marienplatz"));

    assert.equal(shouldShowPlatformBadge({}), false);
    assert.equal(shouldShowPlatformBadge(null), false);
});

test("buildNearestStationMenuActions lists the Platform filter before the Line filter", () => {
    const { buildNearestStationMenuActions } = loadWidgetExports();

    const actions = buildNearestStationMenuActions("S3, S4", "1", false);

    assert.equal(actions[0].id, "platform");
    assert.equal(actions[1].id, "line");
});

test("buildNearestStationMenuActions omits 'Show without filters' when there are no saved defaults", () => {
    const { buildNearestStationMenuActions } = loadWidgetExports();

    const actions = buildNearestStationMenuActions("", "", false);

    assert.equal(actions.some(a => a.id === "showNoFilters"), false);
    assert.equal(actions[actions.length - 1].id, "show");
});

test("buildNearestStationMenuActions includes 'Show without filters' when defaults are configured", () => {
    const { buildNearestStationMenuActions } = loadWidgetExports();

    const actions = buildNearestStationMenuActions("S3", "1", true);

    const showNoFiltersIndex = actions.findIndex(a => a.id === "showNoFilters");
    const showIndex = actions.findIndex(a => a.id === "show");
    assert.notEqual(showNoFiltersIndex, -1);
    assert.ok(showNoFiltersIndex < showIndex);
});

test("buildNearestStationMenuActions reflects the current platform and line values in labels", () => {
    const { buildNearestStationMenuActions } = loadWidgetExports();

    const withValues = buildNearestStationMenuActions("S3, S4", "2", false);
    assert.equal(withValues[0].label, "🛤 Platform: 2");
    assert.equal(withValues[1].label, "🚆 Line: S3, S4");

    const withoutValues = buildNearestStationMenuActions("", "", false);
    assert.equal(withoutValues[0].label, "🛤 Platform: all");
    assert.equal(withoutValues[1].label, "🚆 Line: all");
});

test("Settings menu no longer exposes a Transport Types entry", () => {
    const source = fs.readFileSync(scriptPath, "utf8");
    const settingsMenuMatch = source.match(/async function showSettings\(\) \{[\s\S]*?\n\}/);

    assert.ok(settingsMenuMatch, "showSettings function not found");
    assert.equal(/Transport Types/.test(settingsMenuMatch[0]), false);
    assert.equal(/showSettingsTransportTypes/.test(source), false);
});

test("Settings no longer exposes a Station Types default (it was only used for the removed nearest-mode picker)", () => {
    // Regression test for: the Station Types Settings default silently
    // narrowed "Nearest (no filter)" presets/parameters to whatever types
    // were configured there, contradicting the "no filter" label. It's
    // superseded by the "Nearest" (truly unfiltered) and "Nearest S-Bahn"
    // built-in presets, so the setting itself has been removed.
    const source = fs.readFileSync(scriptPath, "utf8");

    assert.equal(/DEFAULT_STATION_TYPES/.test(source), false, "DEFAULT_STATION_TYPES should have been removed");
    assert.equal(/showSettingsStationTypes/.test(source), false, "showSettingsStationTypes should have been removed");
    assert.equal(/🚉 Station Types/.test(source), false, "'Station Types' Settings entry should have been removed");
});

test("pickNearestStation in ANY mode is never filtered by type, even without a Settings default", () => {
    const { pickNearestStation, NEAREST_MODE } = loadWidgetExports();

    const stations = [
        { name: "Bus Stop", globalId: "b1", transportTypes: ["BUS"], distanceInMeters: 20 },
        { name: "Tram Stop", globalId: "t1", transportTypes: ["TRAM"], distanceInMeters: 50 }
    ];

    const nearest = pickNearestStation(stations, NEAREST_MODE.ANY);
    assert.equal(nearest.name, "Bus Stop");
});

test("buildDeparturesFromScenario converts test fixture rows into departure objects", () => {
    const { buildDeparturesFromScenario } = loadWidgetExports();

    const now = 1_700_000_000_000;
    const departures = buildDeparturesFromScenario({
        departures: [
            { line: "S3", destination: "Mammendorf", minutesFromNow: 5, transportType: "SBAHN", platform: 1 },
            { line: "S4", destination: "Geltendorf", minutesFromNow: 10, delayMinutes: 4, cancelled: true, platform: 2 }
        ]
    }, now);

    assert.equal(departures.length, 2);
    assert.equal(departures[0].label, "S3");
    assert.equal(departures[0].delayInMinutes, 0);
    assert.equal(departures[0].plannedDepartureTime, now + 5 * 60 * 1000);
    assert.equal(departures[0].realtimeDepartureTime, now + 5 * 60 * 1000);

    assert.equal(departures[1].cancelled, true);
    assert.equal(departures[1].delayInMinutes, 4);
    assert.equal(departures[1].plannedDepartureTime, now + 10 * 60 * 1000);
    assert.equal(departures[1].realtimeDepartureTime, now + 14 * 60 * 1000);
});

test("buildPresetParameterString writes a plain station preset", () => {
    const { buildPresetParameterString } = loadWidgetExports();

    const result = buildPresetParameterString({
        station: "Marienplatz",
        lines: "S1, S2",
        platform: "1",
        gradient: "blue"
    });

    assert.equal(result, "station: Marienplatz; lines: S1, S2; platform: 1; gradient: blue");
});

test("buildPresetParameterString omits station and uses the bare 'nearest' token for the no-filter live-location mode", () => {
    const { buildPresetParameterString, NEAREST_MODE } = loadWidgetExports();

    const result = buildPresetParameterString({
        station: "Marienplatz",
        lines: "",
        platform: "",
        gradient: "black",
        nearestMode: NEAREST_MODE.ANY
    });

    assert.equal(result, "nearest; gradient: black");
    assert.equal(result.includes("station:"), false);
});

test("buildPresetParameterString round-trips through parseWidgetParameters back into ANY nearest mode", () => {
    const { buildPresetParameterString, parseWidgetParameters, NEAREST_MODE } = loadWidgetExports();

    const parameterString = buildPresetParameterString({
        lines: "S3, S4",
        platform: "2",
        gradient: "teal",
        nearestMode: NEAREST_MODE.ANY
    });

    const parsed = parseWidgetParameters(parameterString);
    assert.equal(parsed.nearestMode, NEAREST_MODE.ANY);
    assert.equal(parsed.hasExplicitStation, false);
    assert.equal(Array.from(parsed.lines).join(","), "S3,S4");
    assert.equal(Array.from(parsed.platforms).join(","), "2");
    assert.equal(parsed.gradient, "teal");
});

test("buildPresetParameterString uses the canonical token for nearest-sbahn mode", () => {
    const { buildPresetParameterString, NEAREST_MODE } = loadWidgetExports();

    const result = buildPresetParameterString({
        gradient: "black",
        nearestMode: NEAREST_MODE.SBAHN
    });

    assert.equal(result, "nearest-sbahn; gradient: black");
});

test("buildPresetParameterString includes an optional test data file", () => {
    const { buildPresetParameterString, NEAREST_MODE } = loadWidgetExports();

    const result = buildPresetParameterString({
        gradient: "black",
        nearestMode: NEAREST_MODE.ANY,
        testDataFile: "on-time-mix.json"
    });

    assert.equal(result, "nearest; gradient: black; test: on-time-mix.json");
});

test("NEAREST_MODE_TOKEN is the inverse of NEAREST_TOKENS for each mode", () => {
    const { NEAREST_MODE_TOKEN, NEAREST_TOKENS, NEAREST_MODE } = loadWidgetExports();

    assert.equal(NEAREST_MODE_TOKEN[NEAREST_MODE.ANY], "nearest");
    assert.equal(NEAREST_MODE_TOKEN[NEAREST_MODE.SBAHN], "nearest-sbahn");
    assert.equal(NEAREST_TOKENS[NEAREST_MODE_TOKEN[NEAREST_MODE.ANY]], NEAREST_MODE.ANY);
    assert.equal(NEAREST_TOKENS[NEAREST_MODE_TOKEN[NEAREST_MODE.SBAHN]], NEAREST_MODE.SBAHN);
});

test("Create Preset wizard offers a '📍 Find Nearest' station option that resolves to a concrete station", () => {
    // Regression test for: the old "Nearest (no filter)" option silently
    // re-applied the (now-removed) Station Types Settings default instead of
    // truly showing "no filter", and gave no way to actually choose/preview
    // which nearby station would be used — it just auto-picked one. "Find
    // Nearest" is back, but now it always shows a real list (via
    // pickNearbyStationByLocation, shared with 🔎 Find Nearest Station) and
    // resolves to a fixed station, same as searching by name — it does not
    // create a live-location preset. That mode is only available via the
    // built-in "Nearest" / "Nearest S-Bahn" presets (see ensureDefaultPresets).
    const source = fs.readFileSync(scriptPath, "utf8");

    const askStationModeMatch = source.match(/function askStationMode\(\) \{[\s\S]*?\n\}/);
    assert.ok(askStationModeMatch, "askStationMode helper not found");
    assert.ok(/📍 Find Nearest/.test(askStationModeMatch[0]), "'📍 Find Nearest' label not found");
    // The old, misleading "Nearest (no filter)" wizard *option* is gone — that
    // exact label may still appear elsewhere (getNearestModeStationLabel uses
    // it to describe an existing live-location preset's Station field), just
    // not as a choice offered by this picker.
    assert.equal(/📍 Nearest \(no filter\)/.test(askStationModeMatch[0]), false, "the old, misleading 'Nearest (no filter)' option should be gone from the picker");

    const createSavedStationMatch = source.match(/async function createSavedStation\(\) \{[\s\S]*?\n\}/);
    assert.ok(createSavedStationMatch, "createSavedStation function not found");
    assert.ok(/askStationMode\(\)/.test(createSavedStationMatch[0]), "createSavedStation does not offer the station mode picker");
    assert.ok(/pickNearbyStationByLocation/.test(createSavedStationMatch[0]), "createSavedStation does not use pickNearbyStationByLocation");
    assert.equal(/nearestMode/.test(createSavedStationMatch[0]), false, "createSavedStation should not create a live-location preset");
});

test("pickNearbyStationByLocation and findNearestStation share the same nearby-station picker", () => {
    const source = fs.readFileSync(scriptPath, "utf8");

    assert.ok(/async function pickNearbyStationByLocation\(\)/.test(source), "pickNearbyStationByLocation helper not found");

    const findNearestStationMatch = source.match(/async function findNearestStation\(\) \{[\s\S]*?\n\}/);
    assert.ok(findNearestStationMatch, "findNearestStation function not found");
    assert.ok(/pickNearbyStationByLocation\(\)/.test(findNearestStationMatch[0]), "findNearestStation does not reuse pickNearbyStationByLocation");
});

test("ensureDefaultPresets creates the built-in 'Nearest' and 'Nearest S-Bahn' presets", () => {
    const { exports, files } = loadWidgetExportsWithFileSystem();
    const { ensureDefaultPresets, DEFAULT_PRESET_DEFINITIONS, NEAREST_MODE, parseWidgetParameters } = exports;

    assert.deepEqual(Array.from(DEFAULT_PRESET_DEFINITIONS, p => p.name), ["Nearest", "Nearest S-Bahn"]);
    assert.equal(DEFAULT_PRESET_DEFINITIONS[0].nearestMode, NEAREST_MODE.ANY);
    assert.equal(DEFAULT_PRESET_DEFINITIONS[1].nearestMode, NEAREST_MODE.SBAHN);

    ensureDefaultPresets();

    const nearestFile = files.get("/tmp/Munich Commute/Nearest.txt");
    const nearestSbahnFile = files.get("/tmp/Munich Commute/Nearest S-Bahn.txt");
    assert.ok(nearestFile, "Nearest.txt should have been created");
    assert.ok(nearestSbahnFile, "Nearest S-Bahn.txt should have been created");

    const nearestParsed = parseWidgetParameters(nearestFile);
    assert.equal(nearestParsed.nearestMode, NEAREST_MODE.ANY);
    assert.equal(nearestParsed.hasExplicitStation, false);

    const nearestSbahnParsed = parseWidgetParameters(nearestSbahnFile);
    assert.equal(nearestSbahnParsed.nearestMode, NEAREST_MODE.SBAHN);

    // Settings.json should now record that the defaults were seeded.
    const settings = JSON.parse(files.get("/tmp/Munich Commute/Settings.json"));
    assert.equal(settings.defaultPresetsSeeded, true);
});

test("ensureDefaultPresets does not recreate a preset the user deleted, once already seeded", () => {
    const { exports, files } = loadWidgetExportsWithFileSystem();
    const { ensureDefaultPresets } = exports;

    ensureDefaultPresets();
    assert.ok(files.has("/tmp/Munich Commute/Nearest.txt"));

    // User deletes the "Nearest" preset via Edit Preset.
    files.delete("/tmp/Munich Commute/Nearest.txt");

    // A later call within the same run (guarded by the in-memory
    // DEFAULT_PRESETS_SEEDED flag, mirroring a fresh script run that already
    // persisted defaultPresetsSeeded: true in Settings.json) must not bring it back.
    ensureDefaultPresets();
    assert.equal(files.has("/tmp/Munich Commute/Nearest.txt"), false);
});

test("getNearestModeStationLabel distinguishes ANY and S-Bahn live-location modes", () => {
    const { getNearestModeStationLabel, NEAREST_MODE } = loadWidgetExports();

    assert.equal(getNearestModeStationLabel(NEAREST_MODE.ANY), "📍 Nearest (no filter)");
    assert.equal(getNearestModeStationLabel(NEAREST_MODE.SBAHN), "📍 Nearest S-Bahn");
    assert.equal(getNearestModeStationLabel(null), null);
});

test("getLineGradientSuggestions suggests a match for a single filtered S-Bahn line", () => {
    const { getLineGradientSuggestions } = loadWidgetExports();

    const suggestions = getLineGradientSuggestions("S3");
    assert.equal(suggestions.length, 1);
    assert.equal(suggestions[0].name, "s3");
    assert.equal(suggestions[0].label, "Match S3");
    assert.equal(suggestions[0].emoji, "🎨");
    assert.equal(suggestions[0].lineLabel, "S3");

    assert.equal(getLineGradientSuggestions("s4")[0].name, "s4");
});

test("getLineGradientSuggestions suggests a match for a single filtered U-Bahn line", () => {
    const { getLineGradientSuggestions } = loadWidgetExports();

    const suggestions = getLineGradientSuggestions("U3");
    assert.equal(suggestions.length, 1);
    assert.equal(suggestions[0].name, "u3");
    assert.equal(suggestions[0].label, "Match U3");
    assert.equal(suggestions[0].lineLabel, "U3");
});

test("getLineGradientSuggestions skips U7 and U8, which don't have a single hue", () => {
    const { getLineGradientSuggestions } = loadWidgetExports();

    assert.equal(getLineGradientSuggestions("U7").length, 0);
    assert.equal(getLineGradientSuggestions("u8").length, 0);
});

test("getLineGradientSuggestions offers all three surface-transport options for an unrecognized line", () => {
    const { getLineGradientSuggestions } = loadWidgetExports();

    const suggestions = getLineGradientSuggestions("58");
    assert.equal(suggestions.length, 3);
    assert.deepEqual(Array.from(suggestions, s => s.name), ["bus", "regionalbus", "tram"]);
    assert.deepEqual(Array.from(suggestions, s => s.label), ["Match Bus", "Match Regional Bus", "Match Tram"]);
    Array.from(suggestions).forEach(s => assert.equal(s.lineLabel, "58"));
});

test("getLineGradientSuggestions returns no suggestions when there is no single-line filter", () => {
    const { getLineGradientSuggestions } = loadWidgetExports();

    assert.equal(getLineGradientSuggestions("").length, 0);
    assert.equal(getLineGradientSuggestions(null).length, 0);
    assert.equal(getLineGradientSuggestions("S3, S4").length, 0);
    assert.equal(getLineGradientSuggestions("S3, 58").length, 0);
});

test("CONFIG.gradients has a line-matched gradient for every S-Bahn and single-hue U-Bahn line", () => {
    const { CONFIG, LINE_COLORS } = loadWidgetExports();

    const sbahnLines = Object.keys(LINE_COLORS.SBAHN).filter(key => !key.endsWith("_fg"));
    const singleHueUbahnLines = Object.keys(LINE_COLORS.UBAHN).filter(key => !key.includes("_gradient_"));

    for (const line of [...sbahnLines, ...singleHueUbahnLines]) {
        const gradient = CONFIG.gradients[line.toLowerCase()];
        assert.ok(gradient, `expected a gradient for ${line}`);
        assert.match(gradient.top, /^#[0-9a-f]{6}$/i);
        assert.match(gradient.bottom, /^#[0-9a-f]{6}$/i);
    }

    // U7 and U8 use a two-color badge already, so no single-hue gradient is generated for them.
    assert.equal(CONFIG.gradients.u7, undefined);
    assert.equal(CONFIG.gradients.u8, undefined);
});

test("CONFIG.gradients has a line-matched gradient for Bus, Regional Bus, and Tram", () => {
    const { CONFIG } = loadWidgetExports();

    for (const key of ["bus", "regionalbus", "tram"]) {
        const gradient = CONFIG.gradients[key];
        assert.ok(gradient, `expected a gradient for ${key}`);
        assert.match(gradient.top, /^#[0-9a-f]{6}$/i);
        assert.match(gradient.bottom, /^#[0-9a-f]{6}$/i);
    }
});

test("line gradients follow the same lightness recipe as the hand-picked accent gradients", () => {
    const { CONFIG } = loadWidgetExports();

    // S4's badge color (#DB3B4B) shares the same hue family as the
    // hand-picked "red" gradient, so the generated gradient should line up
    // with it exactly if the shared recipe (39%/20% top, 46%/8% bottom) is
    // applied correctly.
    assert.equal(CONFIG.gradients.s4.top.toLowerCase(), CONFIG.gradients.red.top.toLowerCase());
    assert.equal(CONFIG.gradients.s4.bottom.toLowerCase(), CONFIG.gradients.red.bottom.toLowerCase());
});

test("askGradient lists the line-match suggestion first and resolves it when selected", async () => {
    const { exports, presentedAlerts } = loadWidgetExportsWithAlertResponses([0]);
    const { askGradient, getLineGradientSuggestions } = exports;

    const suggestions = getLineGradientSuggestions("S3");
    const gradient = await askGradient("black", { suggestions });

    assert.equal(gradient, "s3");
    assert.equal(presentedAlerts[0].actions[0], "🎨 Match S3 (suggested)");
});

test("askGradient lists all three surface-transport suggestions for an unrecognized line", async () => {
    const { exports, presentedAlerts } = loadWidgetExportsWithAlertResponses([2]);
    const { askGradient, getLineGradientSuggestions } = exports;

    const suggestions = getLineGradientSuggestions("58");
    const gradient = await askGradient("black", { suggestions });

    assert.deepEqual(presentedAlerts[0].actions.slice(0, 3), [
        "🚌 Match Bus (suggested)",
        "🚍 Match Regional Bus (suggested)",
        "🚊 Match Tram (suggested)"
    ]);
    // Index 2 is the third suggestion (Tram).
    assert.equal(gradient, "tram");
});

test("askGradient still resolves regular gradients correctly when suggestions are shown", async () => {
    const { exports } = loadWidgetExportsWithAlertResponses([1]);
    const { askGradient, getLineGradientSuggestions, AVAILABLE_GRADIENTS } = exports;

    const suggestions = getLineGradientSuggestions("S3");
    const gradient = await askGradient("black", { suggestions });

    // Index 1 is one past the single suggestion, i.e. the first AVAILABLE_GRADIENTS entry.
    assert.equal(gradient, AVAILABLE_GRADIENTS[0].name);
});

test("askGradient behaves as before when there are no suggestions", async () => {
    const { exports } = loadWidgetExportsWithAlertResponses([0]);
    const { askGradient, AVAILABLE_GRADIENTS } = exports;

    const gradient = await askGradient("black", { suggestions: [] });
    assert.equal(gradient, AVAILABLE_GRADIENTS[0].name);
});

test("askGradient with allowKeepCurrent marks the suggestion as current when it matches the saved gradient", async () => {
    const { exports, presentedAlerts } = loadWidgetExportsWithAlertResponses([0]);
    const { askGradient } = exports;

    const gradient = await askGradient("s3", {
        allowKeepCurrent: true,
        suggestions: [{ name: "s3", label: "Match S3", emoji: "🎨", lineLabel: "S3" }]
    });

    assert.equal(gradient, "s3");
    assert.equal(presentedAlerts[0].actions[0], "🎨 Match S3 (current)");
});

test("askGradient with allowKeepCurrent falls back to the current gradient via Continue, accounting for the suggestion offset", async () => {
    const suggestions = [{ name: "s3", label: "Match S3", emoji: "🎨", lineLabel: "S3" }];
    const { exports } = loadWidgetExportsWithAlertResponses([]);
    const { AVAILABLE_GRADIENTS } = exports;

    // With a suggestion shown, "Continue" (keep current) shifts one slot later.
    const { exports: exportsWithContinue } = loadWidgetExportsWithAlertResponses([AVAILABLE_GRADIENTS.length + 1]);
    const gradient = await exportsWithContinue.askGradient("blue", { allowKeepCurrent: true, suggestions });

    assert.equal(gradient, "blue");
});

test("nearest-mode Settings defaults are applied once, and are not silently reapplied after being explicitly cleared", () => {
    // Regression test for: tapping a "nearest-sbahn" widget, closing the
    // preview, then choosing "Show without filters" (or manually clearing
    // the Line/Platform fields) kept showing the Settings default filter
    // instead of actually clearing it.
    const results = runNearestDefaultsScenario(`
        DEFAULT_STATION_LINES = "S3, S4";
        DEFAULT_STATION_PLATFORM = "1";
        nearestMode = NEAREST_MODE.SBAHN;
        userLines = null;
        userPlatforms = null;

        results = [];
        const snapshot = () => results.push({ lines: userLines, platforms: userPlatforms });

        // First widget build for the live-location widget tap: no explicit
        // filter was given yet, so the Settings defaults should be applied.
        applyNearestDefaultsIfNeeded();
        snapshot();

        // User taps "Show without filters" (or clears the fields manually);
        // presentNearestPreview() sets both back to null to mean "no filter".
        userLines = null;
        userPlatforms = null;

        // Rebuilding the widget for that request (createWidget() runs again)
        // must NOT silently reapply the Settings defaults on top of the
        // user's explicit "no filter" choice.
        applyNearestDefaultsIfNeeded();
        snapshot();
    `);

    assert.deepEqual(results[0], { lines: ["S3", "S4"], platforms: ["1"] });
    assert.deepEqual(results[1], { lines: null, platforms: null });
});

test("applyParsedWidgetParameters resets the nearest-defaults guard for a fresh parameter context", () => {
    const results = runNearestDefaultsScenario(`
        DEFAULT_STATION_LINES = "S3, S4";
        DEFAULT_STATION_PLATFORM = "";

        results = [];
        const snapshot = () => results.push({ lines: userLines });

        applyParsedWidgetParameters(parseWidgetParameters("nearest-sbahn"));
        applyNearestDefaultsIfNeeded();
        snapshot(); // first context: no explicit filter, so defaults applied

        // A second, distinct nearest-mode context within the same script run
        // (e.g. via View/Edit Preset) with its own explicit line filter.
        applyParsedWidgetParameters(parseWidgetParameters("nearest-sbahn; lines: U3"));
        snapshot(); // explicit filter from the new preset, untouched so far
        applyNearestDefaultsIfNeeded();
        snapshot(); // still U3 — an explicit filter must not be overridden by defaults
    `);

    assert.deepEqual(results[0], { lines: ["S3", "S4"] });
    assert.deepEqual(results[1], { lines: ["U3"] });
    assert.deepEqual(results[2], { lines: ["U3"] });
});

test("nearest-mode Settings defaults are not applied at all when there is no line/platform default configured", () => {
    const results = runNearestDefaultsScenario(`
        DEFAULT_STATION_LINES = "";
        DEFAULT_STATION_PLATFORM = "";
        nearestMode = NEAREST_MODE.ANY;
        userLines = null;
        userPlatforms = null;

        applyNearestDefaultsIfNeeded();
        results = { lines: userLines, platforms: userPlatforms };
    `);

    assert.deepEqual(results, { lines: null, platforms: null });
});

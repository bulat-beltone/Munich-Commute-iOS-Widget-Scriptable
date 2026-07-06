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
    buildPresetParameterString
};`, context, { filename: scriptPath });

    return context.__testExports;
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

test("Create Preset wizard offers a 'Nearest (no filter)' station option", () => {
    const source = fs.readFileSync(scriptPath, "utf8");

    assert.ok(/askStationMode/.test(source), "askStationMode helper not found");
    assert.ok(/📍 Nearest \(no filter\)/.test(source), "'Nearest (no filter)' label not found");

    const createSavedStationMatch = source.match(/async function createSavedStation\(\) \{[\s\S]*?\n\}/);
    assert.ok(createSavedStationMatch, "createSavedStation function not found");
    assert.ok(/askStationMode\(\)/.test(createSavedStationMatch[0]), "createSavedStation does not offer the station mode picker");
});

test("Settings menu no longer exposes a Transport Types entry", () => {
    const source = fs.readFileSync(scriptPath, "utf8");
    const settingsMenuMatch = source.match(/async function showSettings\(\) \{[\s\S]*?\n\}/);

    assert.ok(settingsMenuMatch, "showSettings function not found");
    assert.equal(/Transport Types/.test(settingsMenuMatch[0]), false);
    assert.equal(/showSettingsTransportTypes/.test(source), false);
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

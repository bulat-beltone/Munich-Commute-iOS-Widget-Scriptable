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
    stationServesSbahn,
    pickNearestStation,
    NEAREST_MODE,
    NEAREST_TOKENS,
    parseWidgetParameters,
    applyParsedWidgetParameters,
    normalizeWidgetSize,
    buildDeparturesFromScenario,
    shouldShowPlatformBadge
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

test("main menu maps the visible Find Nearest S-Bahn action to its id", () => {
    const { MAIN_MENU_ACTIONS, MAIN_MENU_ACTION, getMainMenuActionForIndex } = loadWidgetExports();

    const index = MAIN_MENU_ACTIONS.findIndex(action => action.label.includes("Find Nearest S-Bahn"));

    assert.notEqual(index, -1);
    assert.equal(getMainMenuActionForIndex(index), MAIN_MENU_ACTION.FIND_NEAREST_SBAHN);
});

test("stationServesSbahn detects the S-Bahn from either transportTypes or products", () => {
    const { stationServesSbahn } = loadWidgetExports();

    assert.equal(stationServesSbahn({ transportTypes: ["SBAHN", "UBAHN"] }), true);
    assert.equal(stationServesSbahn({ products: ["SBAHN"] }), true);
    assert.equal(stationServesSbahn({ transportTypes: ["UBAHN", "BUS"] }), false);
    assert.equal(stationServesSbahn({}), false);
    assert.equal(stationServesSbahn(null), false);
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

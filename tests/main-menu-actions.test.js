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
    askStationMode,
    getLineGradientSuggestions,
    CONFIG,
    AVAILABLE_GRADIENTS
};`, context, { filename: scriptPath });

    return { exports: context.__testExports, presentedAlerts };
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

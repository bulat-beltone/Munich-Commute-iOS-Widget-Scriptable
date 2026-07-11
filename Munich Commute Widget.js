// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-green; icon-glyph: subway;
// noinspection LanguageDetectionInspection

// Updated 27 Feb, 2026
// Check for updates here: https://github.com/bulat-beltone/Munich-Commute-iOS-Widget-Scriptable

// ============================================================================
// USER CONFIGURATION (Quick Access)
// ============================================================================

// Default widget parameters (when no parameter is provided)
const DEFAULT_WIDGET_PARAMETERS = "station: Marienplatz; platform: 1; lines: S3, S4";

// Subtract this many minutes from displayed departure times
let SUBTRACT_MINUTES = 1;
let SHOW_SUBTRACT_MINUTES = true; // Show "-X" indicator in widget header

// Default values pre-filled in Find Nearest and Create New station flows
let DEFAULT_STATION_LINES = "";
let DEFAULT_STATION_PLATFORM = "";

// Restricts which station types "Find Nearest Station" searches for (set to
// false/leave all false to search any nearby station regardless of type).
const DEFAULT_STATION_TYPES = {
    sbahn: false,
    ubahn: false,
    bus: false,
    regionalBus: false,
    tram: false,
    train: false
};

// Transport types to display (set to false to hide a type)
const TRANSPORT_TYPES = {
    sbahn: true,
    ubahn: true,
    bus: false,
    regionalBus: false,
    tram: false,
    train: false
};

// Shared mapping between the internal transport-type keys used throughout
// Settings and the MVG API's transport type codes.
const TRANSPORT_TYPE_API_CODES = {
    sbahn: "SBAHN",
    ubahn: "UBAHN",
    bus: "BUS",
    regionalBus: "REGIONAL_BUS",
    tram: "TRAM",
    train: "BAHN"
};

function getEnabledTypeCodes(typesConfig) {
    return Object.entries(typesConfig)
        .filter(([_, enabled]) => enabled)
        .map(([type]) => TRANSPORT_TYPE_API_CODES[type]);
}

const TRANSPORT_TYPE_LABELS = {
    sbahn: "S-Bahn",
    ubahn: "U-Bahn",
    bus: "Bus",
    regionalBus: "Regional Bus",
    tram: "Tram",
    train: "Train"
};

// Human-readable summary of enabled types, e.g. "S-Bahn, Tram", or "any" when
// none are enabled (no filter).
function getStationTypesSummaryLabel(typesConfig) {
    const enabledLabels = Object.entries(typesConfig)
        .filter(([_, enabled]) => enabled)
        .map(([type]) => TRANSPORT_TYPE_LABELS[type]);
    return enabledLabels.length > 0 ? enabledLabels.join(", ") : "any";
}

// ============================================================================
// ADVANCED CONFIGURATION
// ============================================================================

const CONFIG = {
    offsetInMinutes: 0, // Only show connections that are X minutes in the future
    departuresLimit: 80, // Maximum number of departures to fetch from the API
    defaultTransportTypes: "SBAHN,UBAHN,TRAM,BUS,REGIONAL_BUS,BAHN",

    // Gradient backgrounds
    gradients: {
        black: { top: "#1A1A1A", bottom: "#0A0A0A" },
        grey: { top: "#2A2A2A", bottom: "#1A1A1A" },
        red: { top: "#471F23", bottom: "#1E0B0D" },
        blue: { top: "#1F2347", bottom: "#0B0D1E" },
        green: { top: "#23471F", bottom: "#0D1E0B" },
        purple: { top: "#471F47", bottom: "#110B1E" },
        teal: { top: "#1F4747", bottom: "#0B1E1E" }
    }
};

// Profile directory for saved stations
const PROFILE_DIRECTORY_NAME = "Munich Commute";
const TEST_DATA_DIRECTORY_NAME = "TestData";
const SETTINGS_FILE_NAME = "Settings.json";

// Caches the last resolved nearest station per mode, so the widget can still
// render when a live GPS fix is unavailable during background refresh.
const NEAREST_CACHE_FILE_NAME = "NearestCache.json";

// Widget parameter tokens that trigger live "nearest station" resolution.
// `any` picks the closest station of any type; `sbahn` picks the closest
// station served by the S-Bahn.
const NEAREST_MODE = Object.freeze({ ANY: "any", SBAHN: "sbahn" });
const NEAREST_TOKENS = Object.freeze({
    "nearest": NEAREST_MODE.ANY,
    "nearest-station": NEAREST_MODE.ANY,
    "nearest-sbahn": NEAREST_MODE.SBAHN,
    "nearest-s-bahn": NEAREST_MODE.SBAHN
});
// Canonical widget-parameter token written back out for each mode (the
// inverse of NEAREST_TOKENS) when a preset is saved for a live-location mode.
const NEAREST_MODE_TOKEN = Object.freeze({
    [NEAREST_MODE.ANY]: "nearest",
    [NEAREST_MODE.SBAHN]: "nearest-sbahn"
});
const WIDGET_SETUP_VIDEO_URL = "https://www.youtube.com/results?search_query=scriptable+widget+setup";
const AVAILABLE_GRADIENTS = [
    { name: "black", label: "Black", emoji: "⚫" },
    { name: "red", label: "Red", emoji: "🔴" },
    { name: "blue", label: "Blue", emoji: "🔵" },
    { name: "green", label: "Green", emoji: "🟢" },
    { name: "purple", label: "Purple", emoji: "🟣" },
    { name: "teal", label: "Teal", emoji: "🩵" }
];

const MAIN_MENU_ACTION = Object.freeze({
    CREATE_SAVED_STATION: "createSavedStation",
    EDIT_SAVED_STATION: "editSavedStation",
    VIEW_SAVED_STATION: "viewSavedStation",
    FIND_NEAREST_STATION: "findNearestStation",
    SETTINGS: "settings",
    HOW_TO_ADD_WIDGET: "howToAddWidget"
});

const MAIN_MENU_ACTIONS = Object.freeze([
    { id: MAIN_MENU_ACTION.FIND_NEAREST_STATION, label: "🔎 Find Nearest Station" },
    { id: MAIN_MENU_ACTION.CREATE_SAVED_STATION, label: "➕ Create Preset" },
    { id: MAIN_MENU_ACTION.VIEW_SAVED_STATION, label: "👀 View Preset" },
    { id: MAIN_MENU_ACTION.EDIT_SAVED_STATION, label: "✏️ Edit Preset" },
    { id: MAIN_MENU_ACTION.HOW_TO_ADD_WIDGET, label: "ℹ️ How to Add Widget" },
    { id: MAIN_MENU_ACTION.SETTINGS, label: "⚙️ Settings" },
]);

const CANCELLED_DEPARTURE_LINE_COLOR = "#FFFFFF";
const CANCELLED_DEPARTURE_LINE_BACKGROUND_OPACITY = 0.10;
const CANCELLED_DEPARTURE_TEXT_OPACITY = 0.30;
const CANCELLED_DEPARTURE_MARK_COLOR = "#DB5C5C";
const CANCELLED_DEPARTURE_MARK_SYMBOL = "xmark.circle";

// Platform badge: a small rounded square shown right next to the
// destination name, styled the same muted white as the cancelled badge.
const PLATFORM_BADGE_CORNER_RADIUS = 3;

// ============================================================================
// WIDGET SIZE CONFIGURATION
// ============================================================================

const WIDGET_CONFIG = {
    primaryDepartureFontSize: 24,
    secondaryDepartureFontSize: 18,
    lineBadgeSize: new Size(24, 15),
    lineBadgeFont: Font.boldSystemFont(11),
    platformBadgeSize: new Size(13, 13),
    platformBadgeFont: Font.boldSystemFont(10),
    destinationFont: Font.caption2(),
    textWithOpacity: 0.5,
    delayFont: Font.boldSystemFont(12),

    small: {
        itemsCount: 2,
        stationNameFont: Font.semiboldSystemFont(13),
        iconSize: new Size(16, 16)
    },
    medium: {
        itemsCount: 4,
        columns: 2,
        stationNameFont: Font.semiboldSystemFont(13),
        iconSize: new Size(16, 16)
    },
    large: {
        itemsCount: 6,
        stationNameFont: Font.semiboldSystemFont(16),
        iconSize: new Size(16, 16)
    }
};

const WIDGET_SIZES = ["small", "medium", "large"];

function getWidgetConfig(widgetSize) {
    const sizeConfig = WIDGET_CONFIG[widgetSize] || WIDGET_CONFIG.large;
    const shared = {};
    for (const key of Object.keys(WIDGET_CONFIG)) {
        if (!WIDGET_SIZES.includes(key)) shared[key] = WIDGET_CONFIG[key];
    }
    return { ...shared, ...sizeConfig };
}

// ============================================================================
// COLOR DEFINITIONS
// ============================================================================

const LINE_COLORS = {
    UBAHN: {
        U1: "#438136",
        U2: "#C40C37",
        U3: "#F36E31",
        U4: "#0AB38D",
        U5: "#B8740E",
        U6: "#006CB3",
        // U7 and U8 have gradient backgrounds
        U7_gradient_top: "#C40C37", // U2
        U7_gradient_bottom: "#438136", // U1
        U8_gradient_top: "#C40C37", // U2
        U8_gradient_bottom: "#F36E31" // U3
    },
    SBAHN: {
        S1: "#16BAE7",
        S2: "#6BA626",
        S3: "#834DF0",
        S4: "#DB3B4B",
        S5: "#005E82",
        S6: "#00975F",
        S7: "#A6372B",
        S20: "#E84563",
        // S8 has black background with yellow text
        S8: "#ffffff1f", // transparent white 12%
        S8_fg: "#f3bc31" // yellow text
    },
    BUS: "#00586A",
    REGIONAL_BUS: "#4682B4",
    TRAM: "#D82020"
};

// ============================================================================
// LINE-MATCHED GRADIENTS
// ============================================================================
// Generates a background gradient for each line using the exact same
// lightness/saturation "recipe" as the hand-picked accent gradients above
// (red, blue, green, purple, teal): a top tone at 39% saturation / 20%
// lightness and a darker, richer bottom tone at 46% saturation / 8%
// lightness — only the hue changes, taken straight from the line's own
// badge color. That's what lets a "Match S3" suggestion look and feel like
// it belongs in the same palette as the manually curated gradients.
//
function hexToRgbChannels(hex) {
    const clean = hex.replace("#", "");
    return [
        parseInt(clean.substring(0, 2), 16),
        parseInt(clean.substring(2, 4), 16),
        parseInt(clean.substring(4, 6), 16)
    ];
}

function rgbToHueDegrees(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    if (delta === 0) return 0;

    let hue;
    if (max === r) hue = ((g - b) / delta) % 6;
    else if (max === g) hue = (b - r) / delta + 2;
    else hue = (r - g) / delta + 4;

    hue *= 60;
    return hue < 0 ? hue + 360 : hue;
}

function hslToHex(hue, saturationPercent, lightnessPercent) {
    const s = saturationPercent / 100;
    const l = lightnessPercent / 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
    const m = l - c / 2;

    let r, g, b;
    if (hue < 60) [r, g, b] = [c, x, 0];
    else if (hue < 120) [r, g, b] = [x, c, 0];
    else if (hue < 180) [r, g, b] = [0, c, x];
    else if (hue < 240) [r, g, b] = [0, x, c];
    else if (hue < 300) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];

    const toHex = channel => Math.round((channel + m) * 255).toString(16).padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

const LINE_GRADIENT_RECIPE = {
    topSaturation: 39,
    topLightness: 20,
    bottomSaturation: 46,
    bottomLightness: 8
};

function buildLineGradient(hexColor) {
    const [r, g, b] = hexToRgbChannels(hexColor);
    const hue = rgbToHueDegrees(r, g, b);
    return {
        top: hslToHex(hue, LINE_GRADIENT_RECIPE.topSaturation, LINE_GRADIENT_RECIPE.topLightness),
        bottom: hslToHex(hue, LINE_GRADIENT_RECIPE.bottomSaturation, LINE_GRADIENT_RECIPE.bottomLightness)
    };
}

// The gradient config key used for a given line, e.g. "S3" -> "s3".
function lineGradientName(line) {
    return line.toLowerCase();
}

// S8's own badge "color" is a translucent white overlay, not a real hue —
// its line-matched gradient is generated from its yellow accent text color
// instead, since that's the color that actually reads as "S8" to a rider.
const SBAHN_GRADIENT_SOURCE_COLORS = {
    S1: LINE_COLORS.SBAHN.S1,
    S2: LINE_COLORS.SBAHN.S2,
    S3: LINE_COLORS.SBAHN.S3,
    S4: LINE_COLORS.SBAHN.S4,
    S5: LINE_COLORS.SBAHN.S5,
    S6: LINE_COLORS.SBAHN.S6,
    S7: LINE_COLORS.SBAHN.S7,
    S8: LINE_COLORS.SBAHN.S8_fg,
    S20: LINE_COLORS.SBAHN.S20
};

// U7 and U8 render with a two-color gradient badge already (see
// LINE_COLORS.UBAHN above) instead of a single brand color, so there's no
// single hue to derive a line-matched gradient from — they're intentionally
// left out here.
const UBAHN_GRADIENT_SOURCE_COLORS = {
    U1: LINE_COLORS.UBAHN.U1,
    U2: LINE_COLORS.UBAHN.U2,
    U3: LINE_COLORS.UBAHN.U3,
    U4: LINE_COLORS.UBAHN.U4,
    U5: LINE_COLORS.UBAHN.U5,
    U6: LINE_COLORS.UBAHN.U6
};

for (const [line, hexColor] of Object.entries({ ...SBAHN_GRADIENT_SOURCE_COLORS, ...UBAHN_GRADIENT_SOURCE_COLORS })) {
    CONFIG.gradients[lineGradientName(line)] = buildLineGradient(hexColor);
}

// Bus, Regional Bus, and Tram badges all use a single flat brand color for
// every route (unlike S-Bahn/U-Bahn, this app doesn't assign individual
// colors per route number for surface transport), so there's one
// line-matched gradient per mode rather than one per specific line.
const SURFACE_TRANSPORT_GRADIENTS = [
    { name: "bus", label: "Match Bus", emoji: "🚌", color: LINE_COLORS.BUS },
    { name: "regionalbus", label: "Match Regional Bus", emoji: "🚍", color: LINE_COLORS.REGIONAL_BUS },
    { name: "tram", label: "Match Tram", emoji: "🚊", color: LINE_COLORS.TRAM }
];

for (const surfaceTransport of SURFACE_TRANSPORT_GRADIENTS) {
    CONFIG.gradients[surfaceTransport.name] = buildLineGradient(surfaceTransport.color);
}

// When a preset's line filter narrows down to exactly one line, this
// returns the gradient suggestion(s) that match that line's own color:
//  - a single suggestion when it's a known S-Bahn or U-Bahn line with a
//    generated gradient (U7/U8 are excluded — see above)
//  - none when it's a known rail line without a generated gradient (U7/U8)
//  - all three surface-transport suggestions when the line isn't a
//    recognized S-Bahn/U-Bahn label — Bus/Regional Bus/Tram routes aren't
//    individually distinguishable by color in this app, so we can't tell
//    which of the three a given line number belongs to and offer all of
//    them as candidates instead
//  - none when the filter covers zero or multiple lines
function getLineGradientSuggestions(linesFilterText) {
    const parsedLines = parseLineFilter(linesFilterText);
    if (!parsedLines || parsedLines.length !== 1) return [];

    const [line] = parsedLines;
    // U7/U8 don't have a plain LINE_COLORS.UBAHN[line] entry (only their
    // "_gradient_top"/"_gradient_bottom" pair), so they need an explicit
    // check to still be recognized as rail lines here.
    const isRailLine = Boolean(
        LINE_COLORS.SBAHN[line] || LINE_COLORS.UBAHN[line] || LINE_COLORS.UBAHN[`${line}_gradient_top`]
    );

    if (isRailLine) {
        const gradientName = lineGradientName(line);
        if (!CONFIG.gradients[gradientName]) return []; // U7 / U8 — no single hue
        return [{ name: gradientName, label: `Match ${line}`, emoji: "🎨", lineLabel: line }];
    }

    return SURFACE_TRANSPORT_GRADIENTS.map(surfaceTransport => ({
        name: surfaceTransport.name,
        label: surfaceTransport.label,
        emoji: surfaceTransport.emoji,
        lineLabel: line
    }));
}

// ============================================================================
// PARAMETER PARSING
// ============================================================================

// Set when a preset name was provided as the widget parameter but no matching
// file was found, so the widget can show an error instead of a silent fallback.
let missingPresetName = null;

// Set to a NEAREST_MODE value when the widget should resolve the nearest station
// from the current location instead of a fixed station name.
let nearestMode = null;

// When the nearest station is resolved from GPS/nearby data we already have its
// globalId, so the widget can skip the name-based station lookup.
let resolvedGlobalId = null;

function resolveWidgetParameter(rawParameter) {
    const trimmedParameter = (rawParameter || "").trim();
    if (!trimmedParameter) return DEFAULT_WIDGET_PARAMETERS;

    // "nearest" / "nearest-sbahn" are live-location tokens, not preset files.
    if (NEAREST_TOKENS[trimmedParameter.toLowerCase()]) {
        return trimmedParameter;
    }

    // Backward-compatible: treat full key:value strings as inline parameters
    if (trimmedParameter.includes(":")) {
        return trimmedParameter;
    }

    // If only a profile name is provided, load it from iCloud .txt file
    const fileManager = FileManager.iCloud();
    const documentsDirectory = fileManager.documentsDirectory();
    const profileDirectory = fileManager.joinPath(documentsDirectory, PROFILE_DIRECTORY_NAME);
    const profileFileName = `${trimmedParameter}.txt`;
    const profileFileCandidates = [
        fileManager.joinPath(profileDirectory, profileFileName),
        fileManager.joinPath(documentsDirectory, profileFileName)
    ];

    for (const profileFilePath of profileFileCandidates) {
        if (!fileManager.fileExists(profileFilePath)) continue;

        const loadedProfileContent = fileManager.readString(profileFilePath).trim();
        if (loadedProfileContent) {
            console.log(`[INFO] Loaded widget parameters from '${profileFilePath}'.`);
            return loadedProfileContent;
        }
        console.log(`[WARN] Parameter profile file '${profileFilePath}' is empty. Falling back to defaults.`);
        return DEFAULT_WIDGET_PARAMETERS;
    }

    console.log(`[WARN] No widget parameter profile found for '${trimmedParameter}'.`);
    missingPresetName = trimmedParameter;
    return DEFAULT_WIDGET_PARAMETERS;
}

// Parse widget parameters
const paramString = resolveWidgetParameter(args.widgetParameter);
let userStation = "Marienplatz";
let userPlatforms = null;
let userLines = null;
let userGradient = "black";
let userTestDataFile = null;
let userPreviewWidgetSize = null;

function normalizeWidgetSize(value) {
    if (!value) return null;
    const normalized = value.toLowerCase().trim();
    if (normalized === "s" || normalized === "small") return "small";
    if (normalized === "m" || normalized === "medium") return "medium";
    if (normalized === "l" || normalized === "large") return "large";
    return null;
}

function parseWidgetParameters(rawParamString) {
    const parameters = rawParamString ? rawParamString.split(";") : [];
    const parsed = {
        station: "Marienplatz",
        platforms: null,
        lines: null,
        gradient: "black",
        testDataFile: null,
        previewWidgetSize: null,
        nearestMode: null,
        hasExplicitStation: false
    };

    parameters.forEach(param => {
        const trimmedParam = param.trim();
        if (!trimmedParam) return;

        // Allow first positional parameter to be a station name or a
        // "nearest"/"nearest-sbahn" live-location token.
        if (!trimmedParam.includes(":")) {
            const nearestToken = NEAREST_TOKENS[trimmedParam.toLowerCase()];
            if (nearestToken) {
                parsed.nearestMode = nearestToken;
                return;
            }
            if (!parsed.hasExplicitStation) {
                parsed.station = trimmedParam;
            }
            return;
        }

        const [key, ...valueParts] = trimmedParam.split(":").map(part => part.trim());
        const value = valueParts.join(":").trim();

        switch (key.toLowerCase()) {
            case "station":
                parsed.station = value;
                parsed.hasExplicitStation = true;
                break;
            case "platform":
                parsed.platforms = parsePlatformFilter(value);
                break;
            case "lines":
                parsed.lines = parseLineFilter(value);
                break;
            case "gradient":
            case "background":
                if (CONFIG.gradients[value.toLowerCase()]) {
                    parsed.gradient = value.toLowerCase();
                }
                break;
            case "test":
                parsed.testDataFile = value;
                break;
            case "size":
            case "widget":
            case "widgetsize":
                parsed.previewWidgetSize = normalizeWidgetSize(value);
                break;
        }
    });

    return parsed;
}

function applyParsedWidgetParameters(parsed) {
    userStation = parsed.station;
    userPlatforms = parsed.platforms;
    userLines = parsed.lines;
    userGradient = parsed.gradient;
    userTestDataFile = parsed.testDataFile;
    userPreviewWidgetSize = parsed.previewWidgetSize;
    nearestMode = parsed.nearestMode;
    // Any previously resolved globalId belonged to a different parameter set
    // (e.g. a prior preset in an edit/preview loop) and must not leak here.
    resolvedGlobalId = null;
}

applyParsedWidgetParameters(parseWidgetParameters(paramString));

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatStationName(station) {
    return station
        .replaceAll(" ", "&")
        .replaceAll("ß", "ss")
        .replaceAll("ü", "ue")
        .replaceAll("ä", "ae")
        .replaceAll("ö", "oe");
}

function formatDepartureTime(timestamp) {
    const date = new Date(timestamp);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

function formatDistance(meters) {
    return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${meters} m`;
}

function sanitizeProfileName(inputName) {
    return (inputName || "")
        .trim()
        .replace(/\.txt$/i, "")
        .replace(/[\\/:*?"<>|]/g, "_");
}

function parseCommaSeparatedFilter(value, normalizer = text => text) {
    if (!value) return null;

    const parsedValues = value
        .split(",")
        .map(part => normalizer(part.trim()))
        .filter(Boolean);

    return parsedValues.length ? parsedValues : null;
}

function parsePlatformFilter(value) {
    return parseCommaSeparatedFilter(value, platform => platform.replace(/^0+/, "") || "0");
}

function getPlatformLabels(platformValue) {
    if (platformValue === undefined || platformValue === null) return [];

    return String(platformValue)
        .split(",")
        .map(part => part.trim().replace(/^0+/, "") || "0")
        .filter(Boolean);
}

function parseLineFilter(value) {
    return parseCommaSeparatedFilter(value, line => line.toUpperCase());
}

// The platform badge is only redundant when the platform filter has already
// narrowed things down to a single, known platform. Any other case (no
// filter, or a filter covering multiple platforms) still benefits from
// showing which platform each departure uses.
function shouldShowPlatformBadge(departure) {
    if (!departure || departure.platform === undefined || departure.platform === null || departure.platform === "") {
        return false;
    }
    if (Array.isArray(userPlatforms) && userPlatforms.length === 1) {
        return false;
    }
    return true;
}

function filterDeparturesByUserPreferences(departures) {
    return departures.filter(entry => {
        const lineLabel = (entry.label || "").toUpperCase();
        const platformLabels = getPlatformLabels(entry.platform);
        const lineMatches = userLines ? userLines.includes(lineLabel) : true;
        const platformMatches = userPlatforms
            ? platformLabels.some(platformLabel => userPlatforms.includes(platformLabel))
            : true;
        return lineMatches && platformMatches;
    });
}

function buildDeparturesFromScenario(data, now = Date.now()) {
    const rows = Array.isArray(data?.departures) ? data.departures : [];
    return rows.map(row => {
        const minutesFromNow = typeof row.minutesFromNow === "number" ? row.minutesFromNow : 0;
        const delayMinutes = typeof row.delayMinutes === "number" ? row.delayMinutes : 0;
        const plannedDepartureTime = now + minutesFromNow * 60 * 1000;
        const delayInMinutes = delayMinutes > 0 ? delayMinutes : 0;
        const realtimeDepartureTime = plannedDepartureTime + delayInMinutes * 60 * 1000;

        return {
            plannedDepartureTime,
            realtimeDepartureTime,
            realtime: true,
            delayInMinutes,
            transportType: row.transportType || "SBAHN",
            label: row.line || "",
            destination: row.destination || "",
            cancelled: row.cancelled === true,
            platform: row.platform
        };
    });
}

function loadTestDataFile(fileName) {
    const trimmedFileName = (fileName || "").trim();
    if (!trimmedFileName) return null;

    const fileManager = FileManager.iCloud();
    const documentsDirectory = fileManager.documentsDirectory();
    const profileDirectory = fileManager.joinPath(documentsDirectory, PROFILE_DIRECTORY_NAME);
    const testDataCandidates = [
        fileManager.joinPath(
            fileManager.joinPath(profileDirectory, TEST_DATA_DIRECTORY_NAME),
            trimmedFileName
        ),
        fileManager.joinPath(
            fileManager.joinPath(documentsDirectory, TEST_DATA_DIRECTORY_NAME),
            trimmedFileName
        )
    ];

    for (const testDataPath of testDataCandidates) {
        if (!fileManager.fileExists(testDataPath)) continue;

        try {
            return JSON.parse(fileManager.readString(testDataPath));
        } catch (e) {
            console.log(`[ERROR] Failed to parse test data '${testDataPath}': ${e.message}`);
            return null;
        }
    }

    console.log(`[WARN] Test data file not found: '${trimmedFileName}'`);
    return null;
}

function getLineColor(transportType, label) {
    if (transportType === "UBAHN" || transportType === "SBAHN") {
        return LINE_COLORS[transportType][label] || "#FFFFFF";
    }
    return LINE_COLORS[transportType] || "#FFFFFF";
}

function getDepartureVisualState(departure) {
    if (departure && departure.cancelled === true) {
        return {
            lineBackgroundColor: CANCELLED_DEPARTURE_LINE_COLOR,
            lineBackgroundOpacity: CANCELLED_DEPARTURE_LINE_BACKGROUND_OPACITY,
            lineTextOpacity: CANCELLED_DEPARTURE_TEXT_OPACITY,
            timeTextOpacity: CANCELLED_DEPARTURE_TEXT_OPACITY,
            destinationTextOpacity: CANCELLED_DEPARTURE_TEXT_OPACITY
        };
    }

    return {
        lineBackgroundColor: null,
        lineBackgroundOpacity: 1,
        lineTextOpacity: 1,
        timeTextOpacity: 1,
        destinationTextOpacity: null
    };
}

function addCancelledDepartureMark(timeRowStack, departureFont, departureFontSize) {
    timeRowStack.addSpacer(4);
    const cancelSymbol = SFSymbol.named(CANCELLED_DEPARTURE_MARK_SYMBOL);
    cancelSymbol.applyFont(departureFont);
    const cancelIcon = timeRowStack.addImage(cancelSymbol.image);
    cancelIcon.imageSize = new Size(departureFontSize, departureFontSize);
    cancelIcon.tintColor = new Color(CANCELLED_DEPARTURE_MARK_COLOR);
}

async function presentWidgetPreview(widget, widgetSize) {
    switch (widgetSize) {
        case "small":
            await widget.presentSmall();
            break;
        case "medium":
            await widget.presentMedium();
            break;
        default:
            await widget.presentLarge();
    }
}

function getPreviewWidgetSize() {
    return userPreviewWidgetSize || "large";
}

// Renders the widget at the given size and presents it, restoring the previous
// widget family afterwards. Used by every in-app preview flow.
async function previewWidget(size = "large") {
    const previousWidgetFamily = config.widgetFamily;
    config.widgetFamily = size;
    try {
        const widget = await createWidget();
        await presentWidgetPreview(widget, size);
    } finally {
        config.widgetFamily = previousWidgetFamily;
    }
}

function getAdjustedDepartureTimestamp(departure) {
    let recalculatedTime = departure.realtimeDepartureTime;
    if (typeof recalculatedTime !== 'number' && typeof departure.plannedDepartureTime === 'number' && typeof departure.delayInMinutes === 'number') {
        recalculatedTime = departure.plannedDepartureTime + (departure.delayInMinutes * 60 * 1000);
    }
    return recalculatedTime - (SUBTRACT_MINUTES * 60 * 1000);
}

function getDepartureFonts(index, widgetConfig) {
    const departureFontSize = index === 0
        ? widgetConfig.primaryDepartureFontSize
        : widgetConfig.secondaryDepartureFontSize;
    const departureFont = Font.boldSystemFont(departureFontSize);
    return { departureFontSize, departureFont };
}

function addStyledLineBadge(parentStack, departure, widgetConfig, badgeTopPadding) {
    const departureVisualState = getDepartureVisualState(departure);
    const lineBadgeContainer = parentStack.addStack();
    lineBadgeContainer.layoutVertically();
    lineBadgeContainer.setPadding(badgeTopPadding, 0, 0, 0);
    const lineStack = lineBadgeContainer.addStack();
    lineStack.size = widgetConfig.lineBadgeSize;
    lineStack.centerAlignContent();

    const lineName = lineStack.addText(departure.label);
    const lineColor = getLineColor(departure.transportType, departure.label);
    const transportColors = LINE_COLORS[departure.transportType];
    const label = departure.label;
    const gradTopKey = label + "_gradient_top";
    const gradBottomKey = label + "_gradient_bottom";
    let backgroundHandled = false;

    if (departureVisualState.lineBackgroundColor) {
        lineStack.backgroundColor = new Color(
            departureVisualState.lineBackgroundColor,
            departureVisualState.lineBackgroundOpacity
        );
        lineStack.cornerRadius = 4;
        lineName.textColor = Color.white();
        backgroundHandled = true;
    } else if (transportColors && transportColors[gradTopKey] && transportColors[gradBottomKey]) {
        const grad = new LinearGradient();
        grad.colors = [new Color(transportColors[gradTopKey]), new Color(transportColors[gradBottomKey])];
        grad.locations = [0.5, 0.51];
        grad.startPoint = new Point(0, 0);
        grad.endPoint = new Point(0, 1);
        lineStack.backgroundGradient = grad;
        lineStack.cornerRadius = 4;
        backgroundHandled = true;
        lineName.textColor = Color.white();
    }
    if (!backgroundHandled) {
        lineStack.backgroundColor = new Color(lineColor);
        lineStack.cornerRadius = 4;
        const fgKey = label + "_fg";
        if (transportColors && transportColors[fgKey]) {
            lineName.textColor = new Color(transportColors[fgKey]);
        } else {
            lineName.textColor = Color.white();
        }
    }

    lineName.font = widgetConfig.lineBadgeFont;
    lineName.textOpacity = departureVisualState.lineTextOpacity;
    lineName.centerAlignText();
    lineName.minimumScaleFactor = 0.4;

    return departureVisualState;
}

function addDepartureTimeRow(parentStack, departure, index, widgetConfig, departureVisualState) {
    // Actual (real-time) arrival time as a single "HH:MM" text — a single
    // text layer renders the colon more cleanly than separate hour/minute
    // layers. When delayed, the delay in minutes is shown as a small raised
    // red "+N" next to it (top-aligned so it reads like a superscript).
    const { departureFontSize, departureFont } = getDepartureFonts(index, widgetConfig);
    const adjustedTime = getAdjustedDepartureTimestamp(departure);
    const timeRowStack = parentStack.addStack();
    timeRowStack.layoutHorizontally();
    timeRowStack.topAlignContent();

    const mainTimeText = timeRowStack.addText(formatDepartureTime(adjustedTime));
    mainTimeText.textColor = Color.white();
    mainTimeText.textOpacity = departureVisualState.timeTextOpacity;
    mainTimeText.font = departureFont;
    mainTimeText.lineLimit = 1;

    const isDelayed = departure.delayInMinutes > 0;
    if (isDelayed && !departure.cancelled) {
        timeRowStack.addSpacer(2);
        
        const delayText = timeRowStack.addText('+' + departure.delayInMinutes);
        delayText.textColor = new Color(CANCELLED_DEPARTURE_MARK_COLOR);
        delayText.textOpacity = departureVisualState.timeTextOpacity;
        delayText.font = widgetConfig.delayFont;
        delayText.lineLimit = 1;
    }

    if (departure.cancelled) {
        addCancelledDepartureMark(timeRowStack, departureFont, departureFontSize);
    }
}

function addDepartureDestination(parentStack, departure, widgetConfig, departureVisualState) {
    const destinationRow = parentStack.addStack();
    destinationRow.layoutHorizontally();
    destinationRow.centerAlignContent();

    // Truncate long destination names with an ellipsis instead of shrinking
    // the font — no minimumScaleFactor here, so iOS falls back to its
    // default tail-truncation for a single-line text.
    const destinationName = destinationRow.addText(departure.destination);
    destinationName.font = widgetConfig.destinationFont;
    destinationName.textColor = Color.white();
    destinationName.textOpacity = departureVisualState.destinationTextOpacity ?? widgetConfig.textWithOpacity;
    destinationName.lineLimit = 1;

    if (shouldShowPlatformBadge(departure)) {
        destinationRow.addSpacer(4);
        addPlatformBadge(destinationRow, departure, widgetConfig, departureVisualState);
    }
}

// Small rounded square shown right after the destination name, styled the
// same muted white as the cancelled badge, showing which platform the
// departure uses.
function addPlatformBadge(parentStack, departure, widgetConfig, departureVisualState) {
    const badge = parentStack.addStack();
    badge.size = widgetConfig.platformBadgeSize;
    badge.centerAlignContent();
    badge.backgroundColor = new Color(CANCELLED_DEPARTURE_LINE_COLOR, CANCELLED_DEPARTURE_LINE_BACKGROUND_OPACITY * departureVisualState.lineTextOpacity);
    badge.cornerRadius = PLATFORM_BADGE_CORNER_RADIUS;

    const platformText = badge.addText(String(departure.platform));
    platformText.font = widgetConfig.platformBadgeFont;
    platformText.textColor = new Color(CANCELLED_DEPARTURE_LINE_COLOR);
    platformText.textOpacity = CANCELLED_DEPARTURE_TEXT_OPACITY * departureVisualState.lineTextOpacity;
    platformText.centerAlignText();
    platformText.lineLimit = 1;
    platformText.minimumScaleFactor = 0.6;
}

function addDepartureRowContent(rowStack, departure, index, widgetConfig) {
    rowStack.layoutHorizontally();
    rowStack.topAlignContent();

    const departureVisualState = addStyledLineBadge(rowStack, departure, widgetConfig, index === 0 ? 5 : 3);
    rowStack.addSpacer(8);

    const infoStack = rowStack.addStack();
    infoStack.layoutVertically();
    infoStack.spacing = 0;

    addDepartureTimeRow(infoStack, departure, index, widgetConfig, departureVisualState);
    addDepartureDestination(infoStack, departure, widgetConfig, departureVisualState);

    rowStack.addSpacer();
}

function addDepartureListRow(mainStack, departure, index, widgetConfig, isLast) {
    const rowStack = mainStack.addStack();
    addDepartureRowContent(rowStack, departure, index, widgetConfig);

    if (!isLast) {
        mainStack.addSpacer(12);
    }
}

function addDepartureGrid(mainStack, departures, widgetConfig) {
    const count = Math.min(widgetConfig.itemsCount, departures.length);
    const columns = widgetConfig.columns || 2;
    const numRows = Math.ceil(count / columns);

    for (let row = 0; row < numRows; row++) {
        if (row > 0) {
            mainStack.addSpacer(12);
        }

        const rowStack = mainStack.addStack();
        rowStack.layoutHorizontally();
        rowStack.centerAlignContent();

        for (let col = 0; col < columns; col++) {
            const itemIndex = col * numRows + row;
            if (col > 0) {
                rowStack.addSpacer(8);
            }

            if (itemIndex < count) {
                const columnStack = rowStack.addStack();
                addDepartureRowContent(columnStack, departures[itemIndex], itemIndex, widgetConfig);
            } else {
                rowStack.addSpacer();
            }
        }
    }
}

// ============================================================================
// UI HELPER FUNCTIONS (for wizards)
// ============================================================================

// Presents a simple informational/error alert with a single dismiss button.
async function showMessage(title, message, actionLabel = "OK") {
    const alert = new Alert();
    alert.title = title;
    alert.message = message;
    alert.addAction(actionLabel);
    await alert.presentAlert();
}

// Presents a selection sheet built from an array of { id, label, destructive? }
// actions and returns the chosen action's id, or null when cancelled.
async function presentMenu({ title, message = "", actions, cancelLabel = "Cancel" }) {
    const menu = new Alert();
    menu.title = title;
    menu.message = message;
    actions.forEach(action => {
        if (action.destructive) menu.addDestructiveAction(action.label);
        else menu.addAction(action.label);
    });
    menu.addCancelAction(cancelLabel);

    const selectedIndex = await menu.presentSheet();
    if (selectedIndex === -1) return null;
    return actions[selectedIndex].id;
}

async function askText({ title, message = "", defaultValue = "", placeholder = "", isOptional = false }) {
    const alert = new Alert();
    alert.title = title;
    alert.message = message;
    alert.addTextField(placeholder, defaultValue);
    alert.addAction("Continue");
    alert.addCancelAction("Cancel");

    const selectedAction = await alert.presentAlert();
    if (selectedAction === -1) {
        return null;
    }

    const value = alert.textFieldValue(0).trim();
    if (!value && !isOptional) {
        return askText({ title, message: "This value is required.", defaultValue, placeholder, isOptional });
    }

    return value;
}

// Shared line/platform filter prompts used by the Create and Edit preset wizards.
function askLinesFilter(defaultValue = "") {
    return askText({
        title: "Lines (optional)",
        message: "Filter by specific lines (comma-separated).\nLeave empty to show all lines.",
        placeholder: defaultValue || "S1, S2, U3",
        defaultValue,
        isOptional: true
    });
}

function askPlatformFilter(defaultValue = "") {
    return askText({
        title: "Platform (optional)",
        message: "Filter by platform numbers (comma-separated), e.g. 1, 2.\nLeave empty to show all platforms.",
        placeholder: defaultValue || "1, 2",
        defaultValue,
        isOptional: true
    });
}

// Lets the user pick between a specific, searched-for station and the live
// "nearest station" mode (no station-type filter — matches the default,
// unfiltered behavior of 🔎 Find Nearest Station / the `nearest` parameter).
function askStationMode() {
    return presentMenu({
        title: "Station",
        message: "Search for a specific station, or always track the nearest one to your current location.",
        actions: [
            { id: "search", label: "🔎 Search by Name" },
            { id: "nearest", label: "📍 Nearest (no filter)" }
        ]
    });
}

// Presents the gradient picker. With allowKeepCurrent, adds a "Continue"
// action that keeps defaultGradient unchanged (used by the edit flow);
// without it, there is no such shortcut (used by the create flow).
// Builds the "you could match its color" hint shown above the gradient
// picker. Handles both the single-suggestion case (a specific rail line)
// and the multi-suggestion case (an unrecognized line, where Bus/Regional
// Bus/Tram are all offered as candidates since we can't tell them apart).
function describeGradientSuggestions(suggestions) {
    if (!suggestions.length) return "";

    const lineLabel = suggestions[0].lineLabel;
    if (suggestions.length === 1) {
        return `Since you're only showing ${lineLabel}, you could match its color.`;
    }

    const modeNames = suggestions.map(s => s.label.replace(/^Match /, "")).join(", ");
    return `Since you're only showing ${lineLabel}, you could match its transport color below (${modeNames}).`;
}

// Presents the gradient picker. With allowKeepCurrent, adds a "Continue"
// action that keeps defaultGradient unchanged (used by the edit flow);
// without it, there is no such shortcut (used by the create flow). When
// suggestions are given (see getLineGradientSuggestions), they are listed
// first with a hint explaining why they're suggested.
async function askGradient(defaultGradient = "black", { allowKeepCurrent = false, suggestions = [] } = {}) {
    const suggestionSuffix = allowKeepCurrent ? " (current)" : " (suggested, default)";
    const suggestionActions = suggestions.map(s => ({
        id: s.name,
        label: `${s.emoji} ${s.label}${s.name === defaultGradient ? suggestionSuffix : " (suggested)"}`
    }));

    const highlightSuffix = allowKeepCurrent ? " (current)" : " (default)";
    const gradientActions = AVAILABLE_GRADIENTS.map(g => ({
        id: g.name,
        label: `${g.emoji} ${g.label}${g.name === defaultGradient ? highlightSuffix : ""}`
    }));

    const actions = [...suggestionActions, ...gradientActions];
    if (allowKeepCurrent) actions.push({ id: defaultGradient, label: "Continue" });

    const baseMessage = allowKeepCurrent
        ? "Pick a new widget background color, or keep the current one."
        : "Select the widget background color.";
    const suggestionHint = describeGradientSuggestions(suggestions);

    return presentMenu({
        title: "Choose a color",
        message: suggestionHint ? `${baseMessage} ${suggestionHint}` : baseMessage,
        actions
    });
}

function getWidgetSetupInstructions() {
    return `Open Scriptable app
    Run "Munich Commute Widget"
    Tap ➕ Create Preset
    
    Then add Scriptable widget to Home Screen:
    
    Script:
    "Munich Commute Widget"
    
    When Interacting:
    "Run Script"

    Parameter:
    Just paste
    Preset name will be copied to clipboard`;
}

function getPostCreateInstructions(parameterName) {
    return `Preset "${parameterName}" saved!

    Now add Scriptable widget to Home Screen:

    Script:
    "Munich Commute Widget"

    When Interacting:
    "Run Script"

    Parameter:
    Just paste
    Preset name already copied to clipboard`;
}

// Looks up stations matching a name via the MVG locations API. Returns the
// matching STATION entries, or null if the request itself failed (as opposed
// to succeeding with zero matches).
async function findStationsByName(stationName) {
    const formattedStation = formatStationName(stationName);
    const url = `https://www.mvg.de/api/bgw-pt/v3/locations?query=${formattedStation}`;
    try {
        const response = await new Request(url).loadJSON();
        return response.filter(entry => entry.type === "STATION");
    } catch (e) {
        console.log(`[ERROR] Failed to search stations: ${e.message}`);
        return null;
    }
}

async function searchAndSelectStation(typedStation) {
    const stations = await findStationsByName(typedStation);

    if (stations === null) {
        await showMessage("Network error", "Could not search for stations. Check your internet connection.");
        return null;
    }

    if (stations.length === 0) {
        await showMessage("No station found", `No station found for "${typedStation}"`);
        return null;
    }

    const shownStations = stations.slice(0, 10);
    const selectedName = await presentMenu({
        title: "Select station",
        message: `Found ${stations.length} match${stations.length > 1 ? 'es' : ''} for "${typedStation}"`,
        actions: shownStations.map(station => ({ id: station.name, label: station.name }))
    });

    return selectedName;
}

// ============================================================================
// MVG API FUNCTIONS
// ============================================================================

async function getStationId(stationName) {
    const stations = await findStationsByName(stationName);
    if (stations === null) return null;

    // Prefer exact name match (case-insensitive)
    const exactMatch = stations.find(s => s.name.toLowerCase() === stationName.toLowerCase());
    const selectedStation = exactMatch || stations[0] || null;

    if (selectedStation) {
        console.log(`[INFO]   - Station matched: "${selectedStation.name}" (globalId: ${selectedStation.globalId})`);
        if (!exactMatch && stations.length > 1) {
            console.log(`[WARN]   - No exact match for "${stationName}". Using first result. Available: ${stations.slice(0, 5).map(s => s.name).join(', ')}`);
        }
    }

    return selectedStation ? { globalId: selectedStation.globalId, name: selectedStation.name } : null;
}

async function getDepartures(globalId) {
    const transportTypes = getEnabledTypeCodes(TRANSPORT_TYPES);

    const types = transportTypes.length > 0
        ? transportTypes.join(',')
        : CONFIG.defaultTransportTypes;

    const baseUrl = 'https://www.mvg.de/api/bgw-pt/v3/departures';
    const url = `${baseUrl}?globalId=${globalId}&limit=${CONFIG.departuresLimit}&offsetInMinutes=${CONFIG.offsetInMinutes}&transportTypes=${types}`;

    try {
        return await new Request(url).loadJSON();
    } catch (e) {
        console.log(`[ERROR] Failed to fetch departures: ${e.message}`);
        return [];
    }
}

// ============================================================================
// NEAREST STATION (LIVE LOCATION)
// ============================================================================

// A station matches when its transport types intersect with typeCodes.
// An empty typeCodes list means "no filter" — any station matches.
// The nearby endpoint uses `transportTypes`; the bundled dataset uses `products`.
function stationMatchesTypeCodes(station, typeCodes) {
    if (!typeCodes || typeCodes.length === 0) return true;
    const types = (station && (station.transportTypes || station.products)) || [];
    return Array.isArray(types) && typeCodes.some(code => types.includes(code));
}

// Picks the closest station from a nearby-stations response. In SBAHN mode,
// only S-Bahn stations are considered; in ANY mode, the Station Types default
// from Settings is applied (or no filter at all if none are enabled there).
function pickNearestStation(stations, mode) {
    if (!Array.isArray(stations) || stations.length === 0) return null;

    const typeCodes = mode === NEAREST_MODE.SBAHN
        ? ["SBAHN"]
        : getEnabledTypeCodes(DEFAULT_STATION_TYPES);
    const candidates = stations.filter(station => stationMatchesTypeCodes(station, typeCodes));

    if (candidates.length === 0) return null;

    // The API returns stations sorted by distance, but sort defensively so a
    // change in ordering can never surface a farther station.
    candidates.sort((a, b) =>
        (a.distanceInMeters ?? Infinity) - (b.distanceInMeters ?? Infinity));

    const nearest = candidates[0];
    return {
        name: nearest.name,
        globalId: nearest.globalId,
        distanceInMeters: nearest.distanceInMeters
    };
}

async function getCurrentLocationSafe() {
    try {
        Location.setAccuracyToHundredMeters();
        const location = await Location.current();
        return { latitude: location.latitude, longitude: location.longitude };
    } catch (e) {
        console.log(`[WARN] Could not determine current location: ${e}`);
        return null;
    }
}

function buildNearbyStationsUrl(latitude, longitude) {
    return `https://www.mvg.de/api/bgw-pt/v3/stations/nearby?latitude=${latitude}&longitude=${longitude}`;
}

async function fetchNearbyStations(latitude, longitude) {
    try {
        const stations = await new Request(buildNearbyStationsUrl(latitude, longitude)).loadJSON();
        return Array.isArray(stations) ? stations : [];
    } catch (e) {
        console.log(`[ERROR] Failed to fetch nearby stations: ${e}`);
        return [];
    }
}

function saveNearestCache(mode, station) {
    try {
        const fileManager = FileManager.iCloud();
        const cachePath = fileManager.joinPath(ensureAppDirectory(), NEAREST_CACHE_FILE_NAME);
        let cache = {};
        if (fileManager.fileExists(cachePath)) {
            try {
                cache = JSON.parse(fileManager.readString(cachePath)) || {};
            } catch (e) {
                cache = {};
            }
        }
        cache[mode] = {
            name: station.name,
            globalId: station.globalId,
            timestamp: Date.now()
        };
        fileManager.writeString(cachePath, JSON.stringify(cache, null, 2));
    } catch (e) {
        console.log(`[WARN] Failed to cache nearest station: ${e}`);
    }
}

function loadNearestCache(mode) {
    try {
        const fileManager = FileManager.iCloud();
        const cachePath = fileManager.joinPath(getAppDirectory(), NEAREST_CACHE_FILE_NAME);
        if (!fileManager.fileExists(cachePath)) return null;
        const cache = JSON.parse(fileManager.readString(cachePath));
        const entry = cache && cache[mode];
        if (entry && entry.globalId) {
            return { name: entry.name, globalId: entry.globalId, fromCache: true };
        }
    } catch (e) {
        console.log(`[WARN] Failed to read nearest cache: ${e}`);
    }
    return null;
}

// Resolves the nearest station for the given mode. Tries a live GPS fix first
// and caches the result; if the fix or network call fails (common during
// background widget refresh), it falls back to the most recent cached station.
async function resolveNearestStation(mode) {
    const location = await getCurrentLocationSafe();
    if (location) {
        console.log(`[INFO] Current location: ${location.latitude}, ${location.longitude}`);
        const stations = await fetchNearbyStations(location.latitude, location.longitude);
        const nearest = pickNearestStation(stations, mode);
        if (nearest) {
            console.log(`[INFO] Nearest ${mode} station: ${nearest.name} (${nearest.distanceInMeters}m)`);
            saveNearestCache(mode, nearest);
            return nearest;
        }
        console.log(`[WARN] No matching station found nearby for mode '${mode}'.`);
    }

    const cached = loadNearestCache(mode);
    if (cached) {
        console.log(`[INFO] Falling back to cached nearest ${mode} station: ${cached.name}`);
    }
    return cached;
}

// ============================================================================
// WIDGET CREATION & RENDERING
// ============================================================================

// Applies one of CONFIG.gradients as the widget's background, falling back
// to black for an unrecognized/missing gradient name.
function applyGradientBackground(widget, gradientName) {
    const palette = CONFIG.gradients[gradientName] || CONFIG.gradients.black;
    const gradient = new LinearGradient();
    gradient.colors = [new Color(palette.top), new Color(palette.bottom)];
    gradient.locations = [0.0, 1.0];
    widget.backgroundGradient = gradient;
}

function createMessageWidget(title, symbolName = "exclamationmark.triangle") {
    const widget = new ListWidget();
    widget.useDefaultPadding();
    applyGradientBackground(widget, userGradient);

    widget.addSpacer();

    const iconRow = widget.addStack();
    iconRow.layoutHorizontally();
    iconRow.addSpacer();
    const symbol = SFSymbol.named(symbolName);
    symbol.applyFont(Font.boldSystemFont(28));
    const icon = iconRow.addImage(symbol.image);
    icon.imageSize = new Size(34, 34);
    icon.tintColor = Color.white();
    iconRow.addSpacer();

    widget.addSpacer(10);

    const titleRow = widget.addStack();
    titleRow.layoutHorizontally();
    titleRow.addSpacer();
    const titleText = titleRow.addText(title);
    titleText.font = Font.semiboldSystemFont(16);
    titleText.textColor = Color.white();
    titleText.centerAlignText();
    titleText.lineLimit = 2;
    titleText.minimumScaleFactor = 0.7;
    titleRow.addSpacer();

    widget.addSpacer();

    return widget;
}

async function createWidget() {
    if (missingPresetName) {
        console.log(`[ERROR]   - Preset not found for widget parameter: '${missingPresetName}'`);
        return createMessageWidget(
            `"${missingPresetName}" preset not found`,
            "questionmark.folder"
        );
    }

    console.log('[INFO] Step 2: Determining widget and device info...');
    const widgetSize = config.widgetFamily || 'large';
    console.log(`[INFO]   - Widget family: ${widgetSize}`);
    const widgetConfig = getWidgetConfig(widgetSize);
    console.log(`[INFO]   - Device: ${Device.model()}`);

    if (nearestMode) {
        // Apply the Find Nearest defaults from Settings unless the widget
        // parameter already specified an explicit line/platform filter.
        if (userLines === null && DEFAULT_STATION_LINES) {
            userLines = parseLineFilter(DEFAULT_STATION_LINES);
            console.log(`[INFO]   - Applying default line filter: ${DEFAULT_STATION_LINES}`);
        }
        if (userPlatforms === null && DEFAULT_STATION_PLATFORM) {
            userPlatforms = parsePlatformFilter(DEFAULT_STATION_PLATFORM);
            console.log(`[INFO]   - Applying default platform filter: ${DEFAULT_STATION_PLATFORM}`);
        }
    }

    let departures = [];

    if (userTestDataFile) {
        // Test data bypasses live GPS/API calls entirely (including nearest
        // resolution), so the "nearest" header treatment can still be
        // previewed offline with fixed fixture departures.
        console.log(`[INFO] Step 3: Loading test departures from '${userTestDataFile}'...`);
        const testData = loadTestDataFile(userTestDataFile);
        if (!testData) {
            return createMessageWidget(
                `Test data not found`,
                "questionmark.folder"
            );
        }
        departures = buildDeparturesFromScenario(testData);
        console.log(`[INFO]   - Test departures loaded: ${departures.length}`);
    } else {
        if (nearestMode) {
            console.log(`[INFO] Step 3: Resolving nearest station (mode: ${nearestMode})...`);
            const nearest = await resolveNearestStation(nearestMode);
            if (!nearest) {
                const label = nearestMode === NEAREST_MODE.SBAHN ? "S-Bahn station" : "station";
                return createMessageWidget(
                    `No nearby ${label} — location unavailable`,
                    "location.slash"
                );
            }
            userStation = nearest.name;
            resolvedGlobalId = nearest.globalId;
        }

        let globalId;
        if (resolvedGlobalId) {
            globalId = resolvedGlobalId;
            console.log(`[INFO] Step 3: Using resolved station "${userStation}" (globalId: ${globalId})`);
        } else {
            console.log('[INFO] Step 3: Fetching station ID...');
            const stationResult = await getStationId(userStation);
            if (!stationResult) {
                console.log(`[ERROR]   - Station not found for name: ${userStation}`);
                const searchedStation = userStation.replace(/^München-/, '');
                return createMessageWidget(
                    `"${searchedStation}" not found`,
                    "exclamationmark.magnifyingglass"
                );
            }
            globalId = stationResult.globalId;
            userStation = stationResult.name; // Use the actual station name from the API
            console.log(`[INFO]   - Station ID found: ${globalId}`);
        }

        console.log('[INFO] Step 4: Fetching departures from MVG API...');
        departures = await getDepartures(globalId);
        console.log(`[INFO]   - Departures fetched: ${departures.length}`);
    }

    console.log('[INFO] Step 5: Filtering departures by user preferences...');
    departures = filterDeparturesByUserPreferences(departures);
    console.log(`[INFO]   - Departures after filter: ${departures.length}`);

    if (departures.length === 0) {
        console.log(`[WARN]   - No departures found for station: ${userStation}`);
        const stationLabel = userStation.replace(/^München-/, '');
        const filterBits = [];
        if (userLines) filterBits.push(userLines.join(", "));
        if (userPlatforms) filterBits.push(`Pl. ${userPlatforms.join(", ")}`);
        const noDeparturesTitle = filterBits.length
            ? `No ${filterBits.join(" · ")} at ${stationLabel}`
            : `No departures at ${stationLabel}`;
        return createMessageWidget(noDeparturesTitle, "tram.fill");
    }

    console.log('[INFO] Step 6: Building widget UI...');
    const widget = new ListWidget();
    widget.useDefaultPadding();

    applyGradientBackground(widget, userGradient);

    // Create main vertical stack for all widget content
    const mainStack = widget.addStack();
    mainStack.layoutVertically();
    mainStack.topAlignContent();

    // HEADING - Station Name & Time
    const headerStack = mainStack.addStack();
    headerStack.layoutHorizontally();
    headerStack.spacing = 8;

    // Create horizontal stack for the icon and station name
    const titleStack = headerStack.addStack();
    titleStack.layoutHorizontally();
    titleStack.centerAlignContent();
    titleStack.spacing = 2;

    // Add header icon: a location pin for live-location mode, otherwise the tram icon
    const headerSymbolName = nearestMode ? "location.fill" : "tram.fill";
    const tramSymbol = SFSymbol.named(headerSymbolName);
    tramSymbol.applyFont(widgetConfig.stationNameFont);
    const tramIcon = titleStack.addImage(tramSymbol.image);
    tramIcon.imageSize = widgetConfig.iconSize;
    tramIcon.tintColor = Color.white();

    // Display station name, removing "München-" prefix if present.
    // In live-location mode, prefix with "Nearest:" to make the mode obvious.
    const displayStationName = userStation.replace(/^München-/, '');
    const titleLabel = nearestMode ? `Nearest: ${displayStationName}` : displayStationName;
    const stationName = titleStack.addText(titleLabel);
    stationName.textColor = Color.white();
    stationName.leftAlignText();
    stationName.font = widgetConfig.stationNameFont;
    stationName.lineLimit = 1;

    // Subtract minutes indicator
    if (SHOW_SUBTRACT_MINUTES && SUBTRACT_MINUTES > 0) {
        headerStack.addSpacer();
        const subMins = headerStack.addText(`-${SUBTRACT_MINUTES}`);
        subMins.textColor = Color.white();
        subMins.textOpacity = widgetConfig.textWithOpacity;
        subMins.font = widgetConfig.stationNameFont;
    }

    // Add space between header and departure information
    mainStack.addSpacer();

    const departureCount = Math.min(widgetConfig.itemsCount, departures.length);
    if (widgetConfig.columns > 1) {
        addDepartureGrid(mainStack, departures, widgetConfig);
    } else {
        for (let i = 0; i < departureCount; i++) {
            addDepartureListRow(mainStack, departures[i], i, widgetConfig, i === departureCount - 1);
        }
    }

    return widget;
}

// ============================================================================
// WIZARD FLOWS
// ============================================================================

// Shows the widget preview for a resolved "nearest" station. Used both by
// the Find Nearest Station wizard and by the filter/action menu that follows
// it, so every preview in that flow renders identically.
async function presentNearestPreview(stationName, lines, platform) {
    userStation = stationName;
    userLines = parseLineFilter(lines);
    userPlatforms = parsePlatformFilter(platform);
    userGradient = "black";

    await previewWidget("large");
}

// Platform is listed first: not every station numbers its platforms the
// same way, so figuring out the right platform/direction is usually the
// first thing to do before narrowing down to the relevant trains by line.
function buildNearestStationMenuActions(lines, platform, hasDefaults) {
    const actions = [
        { id: "platform", label: `🛤 Platform: ${platform || "all"}` },
        { id: "line", label: `🚆 Line: ${lines || "all"}` },
        { id: "save", label: "💾 Save as Preset" }
    ];
    if (hasDefaults) actions.push({ id: "showNoFilters", label: "⏭️ Show without filters" });
    actions.push({ id: "show", label: "▶️ Show" });
    return actions;
}

// Interactive filter/action menu for a resolved "nearest" station, shown
// after its preview has been closed.
async function runNearestStationMenu({ stationName, messagePrefix, initialLines, initialPlatform }) {
    let lines = initialLines || "";
    let platform = initialPlatform || "";
    const hasDefaults = !!(DEFAULT_STATION_LINES || DEFAULT_STATION_PLATFORM);

    while (true) {
        const actions = buildNearestStationMenuActions(lines, platform, hasDefaults);
        const action = await presentMenu({
            title: stationName,
            message: `${messagePrefix ? messagePrefix + " " : ""}Set filters, show departures, or save as a preset.\nTap Cancel when done.`,
            actions
        });
        if (action === null) return null;

        if (action === "platform") {
            const newPlatform = await askText({
                title: "Platform filter (optional)",
                message: "Filter by platform numbers, e.g. 1, 2.\nLeave empty to show all platforms.",
                placeholder: "1, 2",
                defaultValue: platform,
                isOptional: true
            });
            if (newPlatform !== null) platform = newPlatform;
        } else if (action === "line") {
            const newLines = await askText({
                title: "Line filter (optional)",
                message: "Filter by specific lines, e.g. S3, S4.\nLeave empty to show all lines.",
                placeholder: "S1, S2, U3",
                defaultValue: lines,
                isOptional: true
            });
            if (newLines !== null) lines = newLines;
        } else if (action === "show") {
            await presentNearestPreview(stationName, lines, platform);
        } else if (action === "save") {
            const gradient = await askGradient("black", { suggestions: getLineGradientSuggestions(lines) });
            if (gradient === null) continue; // Colour prompt cancelled — stay in the menu.
            const savedName = await persistPreset({
                station: stationName,
                lines,
                platform,
                gradient,
                suggestedName: stationName
            });
            if (savedName) {
                console.log(`[INFO]   - Saved preset from Find Nearest: '${savedName}'`);
                await showPostCreateInstructions(savedName);
                return null;
            }
            // Name prompt cancelled — stay in the menu.
        } else if (action === "showNoFilters") {
            // Preview without filters, but keep the configured defaults for next time.
            await presentNearestPreview(stationName, "", "");
        }
    }
}

async function findNearestStation() {
    const mode = NEAREST_MODE.ANY;

    // Request location permission and get current location
    Location.setAccuracyToHundredMeters();
    let location;
    try {
        location = await Location.current();
    } catch (e) {
        await showMessage("Location Error", "Could not get your location. Please enable location access in Settings.");
        return null;
    }

    const userLat = location.latitude;
    const userLon = location.longitude;
    console.log(`[INFO] Current location: ${userLat}, ${userLon}`);

    let stations;
    try {
        stations = await new Request(buildNearbyStationsUrl(userLat, userLon)).loadJSON();
    } catch (e) {
        await showMessage("Network error", "Could not search for nearby stations. Check your internet connection.");
        return null;
    }

    if (!Array.isArray(stations) || stations.length === 0) {
        await showMessage("No stations found", "No stations found nearby.");
        return null;
    }

    // Restrict to whatever Station Types filter is configured in Settings
    // (empty/all-disabled means no filter — search any nearby station).
    const activeTypeCodes = getEnabledTypeCodes(DEFAULT_STATION_TYPES);
    const typeLabel = getStationTypesSummaryLabel(DEFAULT_STATION_TYPES);

    if (activeTypeCodes.length > 0) {
        stations = stations.filter(station => stationMatchesTypeCodes(station, activeTypeCodes));
        if (stations.length === 0) {
            await showMessage(`No ${typeLabel} nearby`, `No ${typeLabel} stations were found near your current location.`);
            return null;
        }
    }

    console.log(`[INFO] Found ${stations.length} nearby ${activeTypeCodes.length > 0 ? typeLabel + " " : ""}stations`);

    // API returns stations already sorted by distance with distanceInMeters
    const nearestStations = stations.slice(0, 10);

    // Prime the widget cache with the closest match so the "nearest"
    // widget parameter has a fallback when it cannot get a live GPS fix.
    const cacheCandidate = pickNearestStation(stations, mode);
    if (cacheCandidate) saveNearestCache(mode, cacheCandidate);

    const selectedIndex = await presentMenu({
        title: activeTypeCodes.length > 0 ? `Select Nearest ${typeLabel}` : "Select Nearest Station",
        message: `Found ${nearestStations.length} ${activeTypeCodes.length > 0 ? typeLabel + " " : ""}stations nearby:`,
        actions: nearestStations.map((station, index) => ({
            id: index,
            label: `${station.name} (${formatDistance(station.distanceInMeters)})`
        }))
    });
    if (selectedIndex === null) return null;

    const nearestStation = nearestStations[selectedIndex].name;
    const selectedDistance = nearestStations[selectedIndex].distanceInMeters;
    console.log(`[INFO] Selected station: ${nearestStation} (${selectedDistance}m away)`);

    const distanceLabel = `${formatDistance(selectedDistance)} away`;

    const lines = DEFAULT_STATION_LINES;
    const platform = DEFAULT_STATION_PLATFORM;

    // Show the selected station right away with its (possibly empty) default
    // filter. The filter/action menu only appears once this preview is
    // closed, so the user sees real departures before being asked anything.
    await presentNearestPreview(nearestStation, lines, platform);

    return await runNearestStationMenu({
        stationName: nearestStation,
        messagePrefix: `${distanceLabel}.`,
        initialLines: lines,
        initialPlatform: platform
    });
}

async function persistPreset({ station, lines, platform, gradient, suggestedName, nearestMode }) {
    const profileNameInput = await askText({
        title: "Preset name",
        message: "Give this preset a short name (e.g., \"Home\", \"Work\").\nThis becomes the widget parameter.",
        placeholder: suggestedName || station,
        defaultValue: suggestedName || station
    });
    if (profileNameInput === null) return null;

    const profileName = sanitizeProfileName(profileNameInput);
    if (!profileName) {
        await showMessage("Invalid preset name", "Please use at least one valid character.");
        return null;
    }

    const fileManager = FileManager.iCloud();
    const profileDirectory = ensureAppDirectory();
    const profilePath = fileManager.joinPath(profileDirectory, `${profileName}.txt`);
    fileManager.writeString(profilePath, buildPresetParameterString({ station, lines, platform, gradient, nearestMode }));

    Pasteboard.copy(profileName);
    return profileName;
}

async function createSavedStation() {
    const stationMode = await askStationMode();
    if (stationMode === null) return null;

    const useNearest = stationMode === "nearest";
    let station = null;

    if (!useNearest) {
        const stationInput = await askText({
            title: "Station",
            message: "Type the station name to search.",
            placeholder: "Marienplatz"
        });
        if (stationInput === null) return null;

        station = await searchAndSelectStation(stationInput);
        if (station === null) return null;
    }

    const lines = await askLinesFilter(DEFAULT_STATION_LINES);
    if (lines === null) return null;

    const platform = await askPlatformFilter(DEFAULT_STATION_PLATFORM);
    if (platform === null) return null;

    const gradient = await askGradient("black", { suggestions: getLineGradientSuggestions(lines) });
    if (gradient === null) return null;

    const nearestMode = useNearest ? NEAREST_MODE.ANY : null;
    const profileName = await persistPreset({
        station,
        lines,
        platform,
        gradient,
        nearestMode,
        suggestedName: useNearest ? "Nearest" : station
    });
    if (profileName === null) return null;

    // Show widget preview directly, reusing the same parse/apply pipeline
    // used for widget parameters so live-location resolution kicks in.
    applyParsedWidgetParameters(parseWidgetParameters(
        buildPresetParameterString({ station, lines, platform, gradient, nearestMode })
    ));

    await previewWidget("large");

    return profileName;
}

async function viewSavedStation() {
    const selected = await selectPreset("View Preset", "Select a preset to open:");
    if (selected === null) return false;

    const profileName = selected.profileName;
    console.log(`[INFO]   - Loading saved station profile: '${profileName}'`);

    const selectedParameterString = resolveWidgetParameter(profileName);
    applyParsedWidgetParameters(parseWidgetParameters(selectedParameterString));

    await previewWidget(getPreviewWidgetSize());

    return true;
}

async function editSavedStation() {
    const selected = await selectPreset("Edit Preset", "Select a preset to edit:");
    if (selected === null) return null;

    const fileManager = FileManager.iCloud();
    const { profileName: originalProfileName, profileDirectory, profilePath: originalProfilePath } = selected;
    const content = fileManager.readString(originalProfilePath).trim();

    // Parse existing values
    const existingParams = parseWidgetParameters(content);
    let station = existingParams.station;
    let presetNearestMode = existingParams.nearestMode || null;
    let platform = existingParams.platforms ? existingParams.platforms.join(", ") : "";
    let lines = existingParams.lines ? existingParams.lines.join(", ") : "";
    let gradient = existingParams.gradient;
    let testDataFile = existingParams.testDataFile || "";

    let profileName = originalProfileName;

    // Parameter picker loop — user selects which field to edit
    while (true) {
        const stationLabel = presetNearestMode ? "📍 Nearest (no filter)" : (station || "—");
        const fieldChoice = await presentMenu({
            title: `Edit: ${profileName}`,
            message: "Select a parameter to edit:",
            actions: [
                { id: "station", label: `🚉 Station: ${stationLabel}` },
                { id: "lines", label: `🚆 Lines: ${lines || "all"}` },
                { id: "platform", label: `🛤 Platform: ${platform || "all"}` },
                { id: "gradient", label: `🎨 Gradient: ${gradient}` },
                { id: "name", label: `📝 Name: ${profileName}` },
                { id: "copyName", label: "📋 Copy Preset Name" },
                { id: "delete", label: "🗑️ Delete Preset", destructive: true },
                { id: "save", label: "✅ Save" }
            ]
        });
        if (fieldChoice === null) return null;

        if (fieldChoice === "station") {
            const stationMode = await askStationMode();
            if (stationMode === null) continue; // Picker cancelled — stay in the menu.

            if (stationMode === "nearest") {
                presetNearestMode = NEAREST_MODE.ANY;
                station = null;
            } else {
                // If the preset was previously in live-location mode there's no
                // concrete station to compare against, so force a real search
                // instead of silently accepting the "Marienplatz" placeholder.
                const previousStation = presetNearestMode ? null : station;
                const stationInput = await askText({
                    title: "Station",
                    message: "Type the station name to search.",
                    placeholder: previousStation || "Marienplatz",
                    defaultValue: previousStation || ""
                });
                if (stationInput === null) return null;
                if (stationInput === previousStation) {
                    station = previousStation;
                } else {
                    const newStation = await searchAndSelectStation(stationInput);
                    if (newStation === null) return null;
                    station = newStation;
                }
                presetNearestMode = null;
            }
        } else if (fieldChoice === "lines") {
            const newLines = await askLinesFilter(lines);
            if (newLines === null) return null;
            lines = newLines;
        } else if (fieldChoice === "platform") {
            const newPlatform = await askPlatformFilter(platform);
            if (newPlatform === null) return null;
            platform = newPlatform;
        } else if (fieldChoice === "gradient") {
            const newGradient = await askGradient(gradient, { allowKeepCurrent: true, suggestions: getLineGradientSuggestions(lines) });
            if (newGradient === null) return null;
            gradient = newGradient;
        } else if (fieldChoice === "name") {
            const nameInput = await askText({
                title: "Preset name",
                message: "Change the name or press Continue to keep it.",
                placeholder: profileName,
                defaultValue: profileName
            });
            if (nameInput === null) return null;
            profileName = sanitizeProfileName(nameInput) || profileName;
        } else if (fieldChoice === "copyName") {
            Pasteboard.copy(profileName);
        } else if (fieldChoice === "delete") {
            const deleted = await confirmAndDeletePreset(profileDirectory, profileName);
            if (deleted) return null;
        } else if (fieldChoice === "save") {
            break;
        }
    }

    const updatedProfilePath = fileManager.joinPath(profileDirectory, `${profileName}.txt`);
    if (profileName !== originalProfileName && fileManager.fileExists(updatedProfilePath)) {
        await showMessage("Name already exists", `A preset named "${profileName}" already exists.`);
        return null;
    }

    const parameterString = buildPresetParameterString({
        station,
        lines,
        platform,
        gradient,
        nearestMode: presetNearestMode,
        testDataFile
    });

    fileManager.writeString(updatedProfilePath, parameterString);
    if (profileName !== originalProfileName) {
        fileManager.remove(originalProfilePath);
    }
    Pasteboard.copy(profileName);

    // Show widget preview directly
    applyParsedWidgetParameters(parseWidgetParameters(parameterString));

    await previewWidget("large");

    return profileName;
}

async function confirmAndDeletePreset(profileDirectory, profileName) {
    const confirmAlert = new Alert();
    confirmAlert.title = "Delete Preset?";
    confirmAlert.message = `Are you sure you want to delete "${profileName}"? This cannot be undone.`;
    confirmAlert.addDestructiveAction("Delete");
    confirmAlert.addCancelAction("Cancel");

    const confirmed = await confirmAlert.presentAlert();
    if (confirmed !== 0) return false;

    const fileManager = FileManager.iCloud();
    fileManager.remove(fileManager.joinPath(profileDirectory, `${profileName}.txt`));

    await showMessage("Deleted", `"${profileName}" has been deleted.`);

    return true;
}

function getAppDirectory() {
    const fileManager = FileManager.iCloud();
    return fileManager.joinPath(fileManager.documentsDirectory(), PROFILE_DIRECTORY_NAME);
}

// Serializes a preset into the "key: value; ..." widget parameter string.
// When `nearestMode` is set, the station is omitted entirely and the bare
// live-location token (e.g. `nearest`) is used instead — the same format
// documented for widget parameters — rather than a literal `station: nearest`,
// which `parseWidgetParameters` would treat as a (non-existent) station name.
function buildPresetParameterString({ station, lines, platform, gradient, nearestMode, testDataFile }) {
    const parts = nearestMode
        ? [NEAREST_MODE_TOKEN[nearestMode] || NEAREST_MODE_TOKEN[NEAREST_MODE.ANY]]
        : [`station: ${station}`];
    if (lines) parts.push(`lines: ${lines}`);
    if (platform) parts.push(`platform: ${platform}`);
    parts.push(`gradient: ${gradient || "black"}`);
    if (testDataFile) parts.push(`test: ${testDataFile}`);
    return parts.join("; ");
}

// Prompts the user to pick a saved preset, showing a "No Presets" message when
// none exist. Returns { profileName, profileDirectory, profilePath } or null.
async function selectPreset(title, message) {
    const fileManager = FileManager.iCloud();
    const profileDirectory = getAppDirectory();
    const files = fileManager.fileExists(profileDirectory) ? listPresetNames(profileDirectory) : [];

    if (files.length === 0) {
        await showMessage("No Presets", "You haven't created any presets yet.");
        return null;
    }

    const profileName = await presentMenu({
        title,
        message,
        actions: files.map(f => ({ id: f, label: f }))
    });
    if (profileName === null) return null;

    return {
        profileName,
        profileDirectory,
        profilePath: fileManager.joinPath(profileDirectory, `${profileName}.txt`)
    };
}

function listPresetNames(profileDirectory) {
    const fileManager = FileManager.iCloud();
    return fileManager.listContents(profileDirectory)
        .filter(fileName => fileName.endsWith(".txt"))
        .map(fileName => fileName.replace(/\.txt$/, ""))
        .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

function ensureAppDirectory() {
    const fileManager = FileManager.iCloud();
    const dir = getAppDirectory();
    if (!fileManager.fileExists(dir)) fileManager.createDirectory(dir, true);
    return dir;
}

function loadSettings() {
    const fileManager = FileManager.iCloud();
    const settingsPath = fileManager.joinPath(getAppDirectory(), SETTINGS_FILE_NAME);
    if (!fileManager.fileExists(settingsPath)) return;
    try {
        const saved = JSON.parse(fileManager.readString(settingsPath));
        if (saved.defaultStationTypes) Object.assign(DEFAULT_STATION_TYPES, saved.defaultStationTypes);
        if (typeof saved.subtractMinutes === "number") SUBTRACT_MINUTES = saved.subtractMinutes;
        if (typeof saved.showSubtractMinutes === "boolean") SHOW_SUBTRACT_MINUTES = saved.showSubtractMinutes;
        if (typeof saved.defaultStationLines === "string") DEFAULT_STATION_LINES = saved.defaultStationLines;
        if (typeof saved.defaultStationPlatform === "string") DEFAULT_STATION_PLATFORM = saved.defaultStationPlatform;
    } catch (e) {
        console.log(`[WARN] Failed to load settings: ${e}`);
    }
}

function saveSettings() {
    const fileManager = FileManager.iCloud();
    const settingsPath = fileManager.joinPath(ensureAppDirectory(), SETTINGS_FILE_NAME);
    fileManager.writeString(settingsPath, JSON.stringify({
        defaultStationTypes: { ...DEFAULT_STATION_TYPES },
        subtractMinutes: SUBTRACT_MINUTES,
        showSubtractMinutes: SHOW_SUBTRACT_MINUTES,
        defaultStationLines: DEFAULT_STATION_LINES,
        defaultStationPlatform: DEFAULT_STATION_PLATFORM
    }, null, 2));
}

async function showSettingsStationDefaults() {
    while (true) {
        const action = await presentMenu({
            title: "Station Defaults",
            message: "Pre-filled filters when using Find Nearest Station.",
            actions: [
                { id: "stationTypes", label: `🚉 Station Types: ${getStationTypesSummaryLabel(DEFAULT_STATION_TYPES)}` },
                { id: "lines",        label: `🚆 Lines: ${DEFAULT_STATION_LINES || "all"}` },
                { id: "platform",     label: `🛤 Platform: ${DEFAULT_STATION_PLATFORM || "all"}` },
                { id: "back",         label: "← Back" },
            ]
        });
        if (action === null || action === "back") return;

        if (action === "stationTypes") {
            await showSettingsStationTypes();
        } else if (action === "lines") {
            const input = await askText({
                title: "Default Lines",
                message: "Lines to pre-fill when using Find Nearest Station (comma-separated).\nLeave empty for no default.",
                defaultValue: DEFAULT_STATION_LINES,
                placeholder: "S1, S2, U3",
                isOptional: true
            });
            if (input === null) return;
            DEFAULT_STATION_LINES = input;
            saveSettings();
        } else if (action === "platform") {
            const input = await askText({
                title: "Default Platform",
                message: "Platform to pre-fill when using Find Nearest Station.\nLeave empty for no default.",
                defaultValue: DEFAULT_STATION_PLATFORM,
                placeholder: "1, 2",
                isOptional: true
            });
            if (input === null) return;
            DEFAULT_STATION_PLATFORM = input;
            saveSettings();
        }
    }
}

// Restricts which station types "Find Nearest Station" searches for. Leaving
// everything unchecked means no filter — search any nearby station.
async function showSettingsStationTypes() {
    while (true) {
        const typeEmoji = {
            sbahn: "🚇", ubahn: "🚇", bus: "🚌",
            regionalBus: "🚌", tram: "🚊", train: "🚂"
        };
        const actions = Object.keys(TRANSPORT_TYPE_LABELS).map(key => ({
            id: key,
            label: `${typeEmoji[key]} ${TRANSPORT_TYPE_LABELS[key]}: ${DEFAULT_STATION_TYPES[key] ? "✅" : "❌"}`
        }));
        actions.push({ id: "back", label: "← Back" });

        const action = await presentMenu({
            title: "Station Types",
            message: "Restrict Find Nearest Station to these types.\nLeave all unchecked to search any station.",
            actions
        });
        if (action === null || action === "back") return;

        DEFAULT_STATION_TYPES[action] = !DEFAULT_STATION_TYPES[action];
        saveSettings();
    }
}

async function showSettings() {
    while (true) {
        const action = await presentMenu({
            title: "Settings",
            message: "Tap a setting to change it.",
            cancelLabel: "Done",
            actions: [
                { id: "stationDefaults",  label: "🚉 Station Defaults →" },
                { id: "subtractMinutes",  label: `⏱ Subtract Minutes: ${SUBTRACT_MINUTES}` },
                { id: "showSubtractMins", label: `👁 Show Subtracted Minutes: ${SHOW_SUBTRACT_MINUTES ? "✅" : "❌"}` },
            ]
        });
        if (action === null) return;

        if (action === "stationDefaults") {
            await showSettingsStationDefaults();
        } else if (action === "subtractMinutes") {
            const input = await askText({
                title: "Subtract Minutes",
                message: "Minutes to subtract from all departure times.",
                defaultValue: String(SUBTRACT_MINUTES),
                placeholder: "1"
            });
            if (input === null) return;
            const parsed = parseInt(input, 10);
            if (!isNaN(parsed) && parsed >= 0) SUBTRACT_MINUTES = parsed;
            saveSettings();
        } else if (action === "showSubtractMins") {
            SHOW_SUBTRACT_MINUTES = !SHOW_SUBTRACT_MINUTES;
            saveSettings();
        }
    }
}

async function showHowToAddWidgetInstructions() {
    await showMessage("How to Add Widget", getWidgetSetupInstructions(), "Done");
}

async function showPostCreateInstructions(profileName) {
    await showMessage("Add to Home Screen", getPostCreateInstructions(profileName), "Done");
}

async function showMainMenu() {
    const menu = new Alert();
    menu.title = "Munich Commute Widget";
    menu.message = "What would you like to do?";
    MAIN_MENU_ACTIONS.forEach(action => menu.addAction(action.label));
    menu.addCancelAction("Cancel");

    const selectedAction = await menu.presentSheet();
    return selectedAction;
}

function getMainMenuActionForIndex(selectedIndex) {
    const selectedAction = MAIN_MENU_ACTIONS[selectedIndex];
    return selectedAction ? selectedAction.id : null;
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

// Maps each main-menu action id to the handler that runs it (including any
// follow-up logging/instructions). Unmapped ids (e.g. cancel) fall through.
const MAIN_MENU_HANDLERS = {
    [MAIN_MENU_ACTION.CREATE_SAVED_STATION]: async () => {
        const savedProfile = await createSavedStation();
        if (savedProfile) {
            console.log(`[INFO]   - Created saved station profile: '${savedProfile}'`);
            await showPostCreateInstructions(savedProfile);
        }
    },
    [MAIN_MENU_ACTION.EDIT_SAVED_STATION]: async () => {
        const editedProfile = await editSavedStation();
        if (editedProfile) console.log(`[INFO]   - Edited saved station profile: '${editedProfile}'`);
    },
    [MAIN_MENU_ACTION.VIEW_SAVED_STATION]: async () => {
        const viewedProfile = await viewSavedStation();
        if (viewedProfile) console.log('[INFO]   - Viewed saved station profile.');
    },
    // Find Nearest handles its own preview loop and optional save, so there is
    // nothing to render afterwards.
    [MAIN_MENU_ACTION.FIND_NEAREST_STATION]: () => findNearestStation(),
    [MAIN_MENU_ACTION.SETTINGS]: () => showSettings(),
    [MAIN_MENU_ACTION.HOW_TO_ADD_WIDGET]: () => showHowToAddWidgetInstructions()
};

async function main() {
    console.log('[INFO] Munich Commute Widget script started');
    loadSettings();
    console.log('[INFO] Step 1: Parsing parameters...');
    console.log(`[INFO]   - Station: '${userStation}'`);
    console.log(`[INFO]   - Platforms: '${userPlatforms}'`);
    console.log(`[INFO]   - Lines: '${userLines}'`);
    console.log(`[INFO]   - Gradient: '${userGradient}'`);
    console.log(`[INFO]   - Transport Types: using default configuration`);

    // Check if launched from widget tap (not running inside widget, but has widget parameter or launched from home screen)
    const launchedFromWidgetTap = !config.runsInWidget && (config.runsFromHomeScreen || args.widgetParameter);

    if (!config.runsInWidget && !launchedFromWidgetTap) {
        const menuChoice = await showMainMenu();
        const menuAction = getMainMenuActionForIndex(menuChoice);
        const handler = MAIN_MENU_HANDLERS[menuAction];

        if (handler) {
            await handler();
        } else {
            console.log('[INFO]   - User cancelled main menu.');
        }
        return;
    } else if (launchedFromWidgetTap) {
        console.log('[INFO]   - Launched from widget tap, skipping menu and showing widget directly.');
    }

    const widget = await createWidget();
    console.log('[INFO] Step 7: Widget construction complete.');

    if (!config.runsInWidget) {
        const widgetSize = config.widgetFamily || 'large';
        console.log(`[INFO] Step 8: Presenting ${widgetSize} widget preview.`);
        await presentWidgetPreview(widget, widgetSize);

        // Tapping a "nearest" widget resolves a station dynamically, just
        // like a preset — so once this preview is closed, offer the same
        // filter/action menu as Find Nearest Station (Platform first).
        if (nearestMode && resolvedGlobalId) {
            await runNearestStationMenu({
                stationName: userStation,
                initialLines: userLines ? userLines.join(", ") : "",
                initialPlatform: userPlatforms ? userPlatforms.join(", ") : ""
            });
        }
    }

    Script.setWidget(widget);
    console.log('[INFO] Step 9: Script finished.');
}

await main();
Script.complete();

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

// Transport types to display (set to false to hide a type)
const TRANSPORT_TYPES = {
    sbahn: true,
    ubahn: true,
    bus: false,
    regionalBus: false,
    tram: false,
    train: false
};

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
    FIND_NEAREST_SBAHN: "findNearestSbahn",
    SETTINGS: "settings",
    HOW_TO_ADD_WIDGET: "howToAddWidget"
});

const MAIN_MENU_ACTIONS = Object.freeze([
    { id: MAIN_MENU_ACTION.FIND_NEAREST_STATION, label: "🔎 Find Nearest Station" },
    { id: MAIN_MENU_ACTION.FIND_NEAREST_SBAHN, label: "🚈 Find Nearest S-Bahn" },
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

// Platform badge: a small rounded, translucent-white square shown at the
// right edge of a departure row.
const PLATFORM_BADGE_COLOR = "#FFFFFF";
const PLATFORM_BADGE_BACKGROUND_OPACITY = 0.18;
const PLATFORM_BADGE_CORNER_RADIUS = 4;

// ============================================================================
// WIDGET SIZE CONFIGURATION
// ============================================================================

const WIDGET_CONFIG = {
    primaryDepartureFontSize: 24,
    secondaryDepartureFontSize: 18,
    lineBadgeSize: new Size(24, 15),
    lineBadgeFont: Font.boldSystemFont(11),
    platformBadgeSize: new Size(18, 18),
    platformBadgeFont: Font.boldSystemFont(10),
    destinationFont: Font.caption2(),
    textWithOpacity: 0.5,

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
        stationNameFont: Font.semiboldSystemFont(20),
        iconSize: new Size(24, 24)
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
    let usedGradient = false;

    if (departureVisualState.lineBackgroundColor) {
        lineStack.backgroundColor = new Color(
            departureVisualState.lineBackgroundColor,
            departureVisualState.lineBackgroundOpacity
        );
        lineStack.cornerRadius = 4;
        lineName.textColor = Color.white();
        usedGradient = true;
    } else if (transportColors && transportColors[gradTopKey] && transportColors[gradBottomKey]) {
        const grad = new LinearGradient();
        grad.colors = [new Color(transportColors[gradTopKey]), new Color(transportColors[gradBottomKey])];
        grad.locations = [0.5, 0.51];
        grad.startPoint = new Point(0, 0);
        grad.endPoint = new Point(0, 1);
        lineStack.backgroundGradient = grad;
        lineStack.cornerRadius = 4;
        usedGradient = true;
        lineName.textColor = Color.white();
    }
    if (!usedGradient) {
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
    // Always render the actual (real-time) arrival time in white — the
    // planned-vs-delayed distinction is intentionally not shown.
    const { departureFontSize, departureFont } = getDepartureFonts(index, widgetConfig);
    const adjustedTime = getAdjustedDepartureTimestamp(departure);
    const timeRowStack = parentStack.addStack();
    timeRowStack.layoutHorizontally();
    timeRowStack.centerAlignContent();

    const displayDate = new Date(adjustedTime);
    const hours = displayDate.getHours().toString().padStart(2, '0');
    const minutes = displayDate.getMinutes().toString().padStart(2, '0');

    const hoursText = timeRowStack.addText(hours);
    hoursText.textColor = Color.white();
    hoursText.textOpacity = departureVisualState.timeTextOpacity;
    hoursText.font = departureFont;
    hoursText.lineLimit = 1;

    timeRowStack.addSpacer(index === 0 ? 2 : 1);

    const minutesText = timeRowStack.addText(':' + minutes);
    minutesText.textColor = Color.white();
    minutesText.textOpacity = departureVisualState.timeTextOpacity;
    minutesText.font = departureFont;
    minutesText.lineLimit = 1;

    if (departure.cancelled) {
        addCancelledDepartureMark(timeRowStack, departureFont, departureFontSize);
    }
}

function addDepartureDestination(parentStack, departure, widgetConfig, departureVisualState) {
    // Truncate long destination names with an ellipsis instead of shrinking
    // the font — no minimumScaleFactor here, so iOS falls back to its
    // default tail-truncation for a single-line text.
    const destinationName = parentStack.addText(departure.destination);
    destinationName.font = widgetConfig.destinationFont;
    destinationName.textColor = Color.white();
    destinationName.textOpacity = departureVisualState.destinationTextOpacity ?? widgetConfig.textWithOpacity;
    destinationName.lineLimit = 1;
}

// Small rounded, translucent-white square at the right edge of a row,
// showing which platform the departure uses.
function addPlatformBadge(parentStack, departure, widgetConfig, departureVisualState) {
    const badge = parentStack.addStack();
    badge.size = widgetConfig.platformBadgeSize;
    badge.centerAlignContent();
    badge.backgroundColor = new Color(PLATFORM_BADGE_COLOR, PLATFORM_BADGE_BACKGROUND_OPACITY * departureVisualState.lineTextOpacity);
    badge.cornerRadius = PLATFORM_BADGE_CORNER_RADIUS;

    const platformText = badge.addText(String(departure.platform));
    platformText.font = widgetConfig.platformBadgeFont;
    platformText.textColor = Color.white();
    platformText.textOpacity = departureVisualState.lineTextOpacity;
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

    if (shouldShowPlatformBadge(departure)) {
        const platformContainer = rowStack.addStack();
        platformContainer.layoutVertically();
        platformContainer.setPadding(index === 0 ? 5 : 3, 0, 0, 0);
        addPlatformBadge(platformContainer, departure, widgetConfig, departureVisualState);
    }
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
        rowStack.topAlignContent();

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

async function askGradient(defaultGradient = "black") {
    const alert = new Alert();
    alert.title = "Choose a color";
    alert.message = "Select the widget background color.";

    AVAILABLE_GRADIENTS.forEach(g => {
        const displayLabel = `${g.emoji} ${g.label}`;
        if (g.name === defaultGradient) {
            alert.addAction(`${displayLabel} (default)`);
        } else {
            alert.addAction(displayLabel);
        }
    });
    alert.addCancelAction("Cancel");

    const selectedIndex = await alert.presentSheet();
    if (selectedIndex === -1) {
        return null;
    }

    return AVAILABLE_GRADIENTS[selectedIndex].name;
}

async function askGradientOrKeepCurrent(defaultGradient = "black") {
    const alert = new Alert();
    alert.title = "Choose a color";
    alert.message = "Pick a new widget background color, or keep the current one.";

    AVAILABLE_GRADIENTS.forEach(g => {
        const displayLabel = `${g.emoji} ${g.label}`;
        if (g.name === defaultGradient) {
            alert.addAction(`${displayLabel} (current)`);
        } else {
            alert.addAction(displayLabel);
        }
    });
    alert.addAction("Continue");
    alert.addCancelAction("Cancel");

    const selectedIndex = await alert.presentSheet();
    if (selectedIndex === -1) return null;
    if (selectedIndex === AVAILABLE_GRADIENTS.length) return defaultGradient;

    return AVAILABLE_GRADIENTS[selectedIndex].name;
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

async function searchAndSelectStation(typedStation) {
    const formattedStation = formatStationName(typedStation);
    const url = `https://www.mvg.de/api/bgw-pt/v3/locations?query=${formattedStation}`;

    let response;
    try {
        response = await new Request(url).loadJSON();
    } catch (e) {
        const errorAlert = new Alert();
        errorAlert.title = "Network error";
        errorAlert.message = "Could not search for stations. Check your internet connection.";
        errorAlert.addAction("OK");
        await errorAlert.presentAlert();
        return null;
    }

    const stations = response.filter(entry => entry.type === "STATION");

    if (stations.length === 0) {
        const noMatchAlert = new Alert();
        noMatchAlert.title = "No station found";
        noMatchAlert.message = `No station found for "${typedStation}"`;
        noMatchAlert.addAction("OK");
        await noMatchAlert.presentAlert();
        return null;
    }

    const selectionAlert = new Alert();
    selectionAlert.title = "Select station";
    selectionAlert.message = `Found ${stations.length} match${stations.length > 1 ? 'es' : ''} for "${typedStation}"`;

    const shownStations = stations.slice(0, 10);
    shownStations.forEach(station => selectionAlert.addAction(station.name));
    selectionAlert.addCancelAction("Cancel");

    const selectedIndex = await selectionAlert.presentSheet();
    if (selectedIndex === -1) {
        return null;
    }

    return shownStations[selectedIndex].name;
}

// ============================================================================
// MVG API FUNCTIONS
// ============================================================================

async function getStationId(stationName) {
    const formattedStation = formatStationName(stationName);
    const url = `https://www.mvg.de/api/bgw-pt/v3/locations?query=${formattedStation}`;

    let response;
    try {
        response = await new Request(url).loadJSON();
    } catch (e) {
        console.log(`[ERROR] Failed to fetch station ID: ${e.message}`);
        return null;
    }

    const stations = response.filter(entry => entry.type === "STATION");

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
    const transportTypeMapping = {
        sbahn: "SBAHN",
        ubahn: "UBAHN",
        bus: "BUS",
        regionalBus: "REGIONAL_BUS",
        tram: "TRAM",
        train: "BAHN"
    };

    const transportTypes = Object.entries(TRANSPORT_TYPES)
        .filter(([_, enabled]) => enabled)
        .map(([type]) => transportTypeMapping[type]);

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

// A station serves the S-Bahn when its transport types include "SBAHN".
// The nearby endpoint uses `transportTypes`; the bundled dataset uses `products`.
function stationServesSbahn(station) {
    const types = (station && (station.transportTypes || station.products)) || [];
    return Array.isArray(types) && types.includes("SBAHN");
}

// Picks the closest station from a nearby-stations response. When mode is
// "sbahn", only stations served by the S-Bahn are considered.
function pickNearestStation(stations, mode) {
    if (!Array.isArray(stations) || stations.length === 0) return null;

    const candidates = mode === NEAREST_MODE.SBAHN
        ? stations.filter(stationServesSbahn)
        : stations.slice();

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

async function fetchNearbyStations(latitude, longitude) {
    const url = `https://www.mvg.de/api/bgw-pt/v3/stations/nearby?latitude=${latitude}&longitude=${longitude}`;
    try {
        const stations = await new Request(url).loadJSON();
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

function createMessageWidget(title, symbolName = "exclamationmark.triangle") {
    const widget = new ListWidget();
    widget.useDefaultPadding();

    const palette = CONFIG.gradients[userGradient] || CONFIG.gradients.black;
    const gradient = new LinearGradient();
    gradient.colors = [new Color(palette.top), new Color(palette.bottom)];
    gradient.locations = [0.0, 1.0];
    widget.backgroundGradient = gradient;

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

    // Apply gradient background
    const gradient = new LinearGradient();
    gradient.colors = [
        new Color(CONFIG.gradients[userGradient].top),
        new Color(CONFIG.gradients[userGradient].bottom)
    ];
    gradient.locations = [0.0, 1.0];
    widget.backgroundGradient = gradient;

    // Create main vertical stack for all widget content
    const mainStack = widget.addStack();
    mainStack.layoutVertically();
    mainStack.topAlignContent();
    console.log('[INFO]   - Added main vertical stack');

    // HEADING - Station Name & Time
    const headerStack = mainStack.addStack();
    headerStack.layoutHorizontally();
    headerStack.spacing = 8;
    console.log('[INFO]   - Added header stack');

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
    console.log('[INFO]   - Added station name and icon');

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
    console.log('[INFO]   - Added spacer after header');

    const departureCount = Math.min(widgetConfig.itemsCount, departures.length);
    if (widgetConfig.columns > 1) {
        addDepartureGrid(mainStack, departures, widgetConfig);
        for (let i = 0; i < departureCount; i++) {
            console.log(`[INFO]   - Added grid cell for departure ${i + 1}: line ${departures[i].label}, destination ${departures[i].destination}`);
        }
    } else {
        for (let i = 0; i < departureCount; i++) {
            addDepartureListRow(
                mainStack,
                departures[i],
                i,
                widgetConfig,
                i === departureCount - 1
            );
            console.log(`[INFO]   - Added row for departure ${i + 1}: line ${departures[i].label}, destination ${departures[i].destination}`);
        }
    }
    console.log('[INFO]   - Finished adding departure rows');

    return widget;
}

// ============================================================================
// WIZARD FLOWS
// ============================================================================

async function findNearestStation({ sbahnOnly = false } = {}) {
    const mode = sbahnOnly ? NEAREST_MODE.SBAHN : NEAREST_MODE.ANY;
    const widgetToken = sbahnOnly ? "nearest-sbahn" : "nearest";

    // Request location permission and get current location
    Location.setAccuracyToHundredMeters();
    let location;
    try {
        location = await Location.current();
    } catch (e) {
        const errorAlert = new Alert();
        errorAlert.title = "Location Error";
        errorAlert.message = "Could not get your location. Please enable location access in Settings.";
        errorAlert.addAction("OK");
        await errorAlert.presentAlert();
        return null;
    }

    const userLat = location.latitude;
    const userLon = location.longitude;
    console.log(`[INFO] Current location: ${userLat}, ${userLon}`);

    // Use the proper nearby stations API endpoint
    const url = `https://www.mvg.de/api/bgw-pt/v3/stations/nearby?latitude=${userLat}&longitude=${userLon}`;

    let stations;
    try {
        stations = await new Request(url).loadJSON();
    } catch (e) {
        const errorAlert = new Alert();
        errorAlert.title = "Network error";
        errorAlert.message = "Could not search for nearby stations. Check your internet connection.";
        errorAlert.addAction("OK");
        await errorAlert.presentAlert();
        return null;
    }

    if (!Array.isArray(stations) || stations.length === 0) {
        const noMatchAlert = new Alert();
        noMatchAlert.title = "No stations found";
        noMatchAlert.message = "No stations found nearby.";
        noMatchAlert.addAction("OK");
        await noMatchAlert.presentAlert();
        return null;
    }

    if (sbahnOnly) {
        stations = stations.filter(stationServesSbahn);
        if (stations.length === 0) {
            const noMatchAlert = new Alert();
            noMatchAlert.title = "No S-Bahn nearby";
            noMatchAlert.message = "No S-Bahn stations were found near your current location.";
            noMatchAlert.addAction("OK");
            await noMatchAlert.presentAlert();
            return null;
        }
    }

    console.log(`[INFO] Found ${stations.length} nearby ${sbahnOnly ? "S-Bahn " : ""}stations`);

    // API returns stations already sorted by distance with distanceInMeters
    const nearestStations = stations.slice(0, 10);

    // Prime the widget cache with the closest match so the "${widgetToken}"
    // widget parameter has a fallback when it cannot get a live GPS fix.
    const cacheCandidate = pickNearestStation(stations, mode);
    if (cacheCandidate) saveNearestCache(mode, cacheCandidate);

    // Show selection alert
    const selectionAlert = new Alert();
    selectionAlert.title = sbahnOnly ? "Select Nearest S-Bahn" : "Select Nearest Station";
    selectionAlert.message = `Found ${nearestStations.length} ${sbahnOnly ? "S-Bahn " : ""}stations nearby:`;

    nearestStations.forEach(station => {
        const distance = station.distanceInMeters >= 1000
            ? `${(station.distanceInMeters / 1000).toFixed(1)} km`
            : `${station.distanceInMeters} m`;
        selectionAlert.addAction(`${station.name} (${distance})`);
    });
    selectionAlert.addCancelAction("Cancel");

    const selectedIndex = await selectionAlert.presentSheet();
    if (selectedIndex === -1) return null;

    const nearestStation = nearestStations[selectedIndex].name;
    const selectedDistance = nearestStations[selectedIndex].distanceInMeters;
    console.log(`[INFO] Selected station: ${nearestStation} (${selectedDistance}m away)`);

    const distanceLabel = selectedDistance >= 1000
        ? `${(selectedDistance / 1000).toFixed(1)} km away`
        : `${selectedDistance} m away`;

    let lines = DEFAULT_STATION_LINES;
    let platform = DEFAULT_STATION_PLATFORM;
    const hasDefaults = !!(DEFAULT_STATION_LINES || DEFAULT_STATION_PLATFORM);

    const presentPreview = async (overrideLines, overridePlatform) => {
        userStation = nearestStation;
        userLines = parseLineFilter(overrideLines === undefined ? lines : overrideLines);
        userPlatforms = parsePlatformFilter(overridePlatform === undefined ? platform : overridePlatform);
        userGradient = "black";

        const previousWidgetFamily = config.widgetFamily;
        config.widgetFamily = "large";
        try {
            const widget = await createWidget();
            await widget.presentLarge();
        } finally {
            config.widgetFamily = previousWidgetFamily;
        }
    };

    while (true) {
        const actions = [
            { id: "line", label: `🚆 Line: ${lines || "all"}` },
            { id: "platform", label: `🛤 Platform: ${platform || "all"}` },
            { id: "save", label: "💾 Save as Preset" },
            { id: "useInWidget", label: "📍 Use live location in widget" },
            { id: "show", label: "▶️ Show" }
        ];
        if (hasDefaults) actions.push({ id: "showNoFilters", label: "▶️ Show without filters" });

        const filterMenu = new Alert();
        filterMenu.title = nearestStation;
        filterMenu.message = `${distanceLabel}. Set filters, show departures, or save as a preset.\nTap Cancel when done.`;
        actions.forEach(a => filterMenu.addAction(a.label));
        filterMenu.addCancelAction("Cancel");

        const filterChoice = await filterMenu.presentSheet();
        if (filterChoice === -1) return null;
        const action = actions[filterChoice].id;

        if (action === "line") {
            const newLines = await askText({
                title: "Line filter (optional)",
                message: "Filter by specific lines, e.g. S3, S4.\nLeave empty to show all lines.",
                placeholder: "S1, S2, U3",
                defaultValue: lines,
                isOptional: true
            });
            if (newLines !== null) lines = newLines;
        } else if (action === "platform") {
            const newPlatform = await askText({
                title: "Platform filter (optional)",
                message: "Filter by platform numbers, e.g. 1, 2.\nLeave empty to show all platforms.",
                placeholder: "1, 2",
                defaultValue: platform,
                isOptional: true
            });
            if (newPlatform !== null) platform = newPlatform;
        } else if (action === "show") {
            await presentPreview();
        } else if (action === "save") {
            const gradient = await askGradient();
            if (gradient === null) continue; // Colour prompt cancelled — stay in the menu.
            const savedName = await persistPreset({
                station: nearestStation,
                lines,
                platform,
                gradient,
                suggestedName: nearestStation
            });
            if (savedName) {
                console.log(`[INFO]   - Saved preset from Find Nearest: '${savedName}'`);
                await showPostCreateInstructions(savedName);
                return null;
            }
            // Name prompt cancelled — stay in the menu.
        } else if (action === "useInWidget") {
            Pasteboard.copy(widgetToken);
            const infoAlert = new Alert();
            infoAlert.title = "Live location widget";
            infoAlert.message = `Set your widget's Parameter to:\n\n${widgetToken}\n\n(copied to clipboard)\n\nThe widget will always show departures for the ${sbahnOnly ? "closest S-Bahn station" : "closest station"} to your current location. If iOS can't get a location while the widget refreshes, it falls back to the last known ${sbahnOnly ? "S-Bahn " : ""}station.`;
            infoAlert.addAction("OK");
            await infoAlert.presentAlert();
        } else if (action === "showNoFilters") {
            // Preview without filters, but keep the configured defaults for next time.
            await presentPreview("", "");
        }
    }
}

async function promptForStationSelection() {
    // Parse default parameters to prefill the wizard
    const defaultParams = DEFAULT_WIDGET_PARAMETERS.split(";");
    let defaultStation = "Marienplatz";
    let defaultPlatform = "";
    let defaultLines = "";
    let defaultGradient = "black";

    defaultParams.forEach(param => {
        const trimmedParam = param.trim();
        if (!trimmedParam.includes(":")) {
            defaultStation = trimmedParam;
            return;
        }

        const [key, ...valueParts] = trimmedParam.split(":").map(part => part.trim());
        const value = valueParts.join(":").trim();

        switch (key.toLowerCase()) {
            case "station":
                defaultStation = value;
                break;
            case "platform":
                defaultPlatform = value;
                break;
            case "lines":
                defaultLines = value;
                break;
            case "gradient":
            case "background":
                defaultGradient = value;
                break;
        }
    });

    // Station selection
    const stationInput = await askText({
        title: "Station",
        message: "Type the station name to search.",
        placeholder: defaultStation,
        defaultValue: defaultStation
    });
    if (stationInput === null) return null;

    const station = await searchAndSelectStation(stationInput);
    if (station === null) return null;

    // Lines selection (optional)
    const lines = await askText({
        title: "Lines (optional)",
        message: "Filter by specific lines, e.g. S3, S4.\nLeave empty to show all lines.",
        placeholder: defaultLines || "S1, S2, U3",
        defaultValue: defaultLines,
        isOptional: true
    });
    if (lines === null) return null;

    // Platform selection (optional)
    const platform = await askText({
        title: "Platform (optional)",
        message: "Filter by platform numbers, e.g. 1, 2.\nLeave empty to show all platforms.",
        placeholder: defaultPlatform || "1, 2",
        defaultValue: defaultPlatform,
        isOptional: true
    });
    if (platform === null) return null;

    // Return a config object to apply to the widget (no gradient for Find Station)
    return {
        station: station,
        platform: platform,
        lines: lines,
        gradient: defaultGradient // Use default gradient from config
    };
}

async function persistPreset({ station, lines, platform, gradient, suggestedName }) {
    const profileNameInput = await askText({
        title: "Preset name",
        message: "Give this preset a short name (e.g., \"Home\", \"Work\").\nThis becomes the widget parameter.",
        placeholder: suggestedName || station,
        defaultValue: suggestedName || station
    });
    if (profileNameInput === null) return null;

    const profileName = sanitizeProfileName(profileNameInput);
    if (!profileName) {
        const errorAlert = new Alert();
        errorAlert.title = "Invalid preset name";
        errorAlert.message = "Please use at least one valid character.";
        errorAlert.addAction("OK");
        await errorAlert.presentAlert();
        return null;
    }

    const parameterParts = [`station: ${station}`];
    if (lines) parameterParts.push(`lines: ${lines}`);
    if (platform) parameterParts.push(`platform: ${platform}`);
    parameterParts.push(`gradient: ${gradient || "black"}`);

    const fileManager = FileManager.iCloud();
    const profileDirectory = ensureAppDirectory();
    const profilePath = fileManager.joinPath(profileDirectory, `${profileName}.txt`);
    fileManager.writeString(profilePath, parameterParts.join("; "));

    Pasteboard.copy(profileName);
    return profileName;
}

async function createSavedStation() {
    const stationInput = await askText({
        title: "Station",
        message: "Type the station name to search.",
        placeholder: "Marienplatz"
    });
    if (stationInput === null) return null;

    const station = await searchAndSelectStation(stationInput);
    if (station === null) return null;

    const lines = await askText({
        title: "Lines (optional)",
        message: "Filter by specific lines (comma-separated).\nLeave empty to show all lines.",
        placeholder: DEFAULT_STATION_LINES || "S1, S2, U3",
        defaultValue: DEFAULT_STATION_LINES,
        isOptional: true
    });
    if (lines === null) return null;

    const platform = await askText({
        title: "Platform (optional)",
        message: "Filter by platform numbers (comma-separated), e.g. 1, 2.\nLeave empty to show all platforms.",
        placeholder: DEFAULT_STATION_PLATFORM || "1, 2",
        defaultValue: DEFAULT_STATION_PLATFORM,
        isOptional: true
    });
    if (platform === null) return null;

    const gradient = await askGradient();
    if (gradient === null) return null;

    const profileName = await persistPreset({ station, lines, platform, gradient, suggestedName: station });
    if (profileName === null) return null;

    // Show widget preview directly
    userStation = station;
    userPlatforms = parsePlatformFilter(platform);
    userLines = parseLineFilter(lines);
    if (CONFIG.gradients[gradient]) userGradient = gradient;

    const previousWidgetFamily = config.widgetFamily;
    config.widgetFamily = "large";
    try {
        const widget = await createWidget();
        await widget.presentLarge();
    } finally {
        config.widgetFamily = previousWidgetFamily;
    }

    return profileName;
}

async function viewSavedStation() {
    const fileManager = FileManager.iCloud();
    const documentsDirectory = fileManager.documentsDirectory();
    const profileDirectory = fileManager.joinPath(documentsDirectory, PROFILE_DIRECTORY_NAME);

    if (!fileManager.fileExists(profileDirectory)) {
        const errorAlert = new Alert();
        errorAlert.title = "No Presets";
        errorAlert.message = "You haven't created any presets yet.";
        errorAlert.addAction("OK");
        await errorAlert.presentAlert();
        return false;
    }

    const files = listPresetNames(profileDirectory);

    if (files.length === 0) {
        const errorAlert = new Alert();
        errorAlert.title = "No Presets";
        errorAlert.message = "You haven't created any presets yet.";
        errorAlert.addAction("OK");
        await errorAlert.presentAlert();
        return false;
    }

    const selectAlert = new Alert();
    selectAlert.title = "View Preset";
    selectAlert.message = "Select a preset to open:";
    files.forEach(f => selectAlert.addAction(f));
    selectAlert.addCancelAction("Cancel");

    const selectedIndex = await selectAlert.presentSheet();
    if (selectedIndex === -1) return false;

    const profileName = files[selectedIndex];
    console.log(`[INFO]   - Loading saved station profile: '${profileName}'`);

    const selectedParameterString = resolveWidgetParameter(profileName);
    applyParsedWidgetParameters(parseWidgetParameters(selectedParameterString));

    const previewSize = getPreviewWidgetSize();
    const previousWidgetFamily = config.widgetFamily;
    config.widgetFamily = previewSize;

    try {
        const widget = await createWidget();
        await presentWidgetPreview(widget, previewSize);
    } finally {
        config.widgetFamily = previousWidgetFamily;
    }

    return true;
}

async function editSavedStation() {
    const fileManager = FileManager.iCloud();
    const documentsDirectory = fileManager.documentsDirectory();
    const profileDirectory = fileManager.joinPath(documentsDirectory, PROFILE_DIRECTORY_NAME);

    if (!fileManager.fileExists(profileDirectory)) {
        const errorAlert = new Alert();
        errorAlert.title = "No Presets";
        errorAlert.message = "You haven't created any presets yet.";
        errorAlert.addAction("OK");
        await errorAlert.presentAlert();
        return null;
    }

    const files = listPresetNames(profileDirectory);

    if (files.length === 0) {
        const errorAlert = new Alert();
        errorAlert.title = "No Presets";
        errorAlert.message = "You haven't created any presets yet.";
        errorAlert.addAction("OK");
        await errorAlert.presentAlert();
        return null;
    }

    const selectAlert = new Alert();
    selectAlert.title = "Edit Preset";
    selectAlert.message = "Select a preset to edit:";
    files.forEach(f => selectAlert.addAction(f));
    selectAlert.addCancelAction("Cancel");

    const selectedIndex = await selectAlert.presentSheet();
    if (selectedIndex === -1) return null;

    const originalProfileName = files[selectedIndex];
    const originalProfilePath = fileManager.joinPath(profileDirectory, `${originalProfileName}.txt`);
    const content = fileManager.readString(originalProfilePath).trim();

    // Parse existing values
    const existingParams = parseWidgetParameters(content);
    let station = existingParams.station;
    let platform = existingParams.platforms ? existingParams.platforms.join(", ") : "";
    let lines = existingParams.lines ? existingParams.lines.join(", ") : "";
    let gradient = existingParams.gradient;
    let testDataFile = existingParams.testDataFile || "";

    let profileName = originalProfileName;

    // Parameter picker loop — user selects which field to edit
    while (true) {
        const editMenu = new Alert();
        editMenu.title = `Edit: ${profileName}`;
        editMenu.message = "Select a parameter to edit:";
        editMenu.addAction(`🚉 Station: ${station || "—"}`);
        editMenu.addAction(`🚆 Lines: ${lines || "all"}`);
        editMenu.addAction(`🛤 Platform: ${platform || "all"}`);
        editMenu.addAction(`🎨 Gradient: ${gradient}`);
        editMenu.addAction(`🧪 Test data: ${testDataFile || "—"}`);
        editMenu.addAction(`📝 Name: ${profileName}`);
        editMenu.addDestructiveAction("🗑️ Delete Preset");
        editMenu.addAction("✅ Save");
        editMenu.addCancelAction("Cancel");

        const fieldChoice = await editMenu.presentSheet();
        if (fieldChoice === -1) return null;

        if (fieldChoice === 0) {
            const stationInput = await askText({
                title: "Station",
                message: "Type the station name to search.",
                placeholder: station,
                defaultValue: station
            });
            if (stationInput === null) return null;
            if (stationInput !== station) {
                const newStation = await searchAndSelectStation(stationInput);
                if (newStation === null) return null;
                station = newStation;
            }
        } else if (fieldChoice === 1) {
            const newLines = await askText({
                title: "Lines (optional)",
                message: "Filter by specific lines (comma-separated).\nLeave empty to show all lines.",
                placeholder: lines || "S1, S2, U3",
                defaultValue: lines,
                isOptional: true
            });
            if (newLines === null) return null;
            lines = newLines;
        } else if (fieldChoice === 2) {
            const newPlatform = await askText({
                title: "Platform (optional)",
                message: "Filter by platform numbers (comma-separated), e.g. 1, 2.\nLeave empty to show all platforms.",
                placeholder: platform || "1, 2",
                defaultValue: platform,
                isOptional: true
            });
            if (newPlatform === null) return null;
            platform = newPlatform;
        } else if (fieldChoice === 3) {
            const newGradient = await askGradientOrKeepCurrent(gradient);
            if (newGradient === null) return null;
            gradient = newGradient;
        } else if (fieldChoice === 4) {
            const testInput = await askText({
                title: "Test data file (optional)",
                message: "JSON filename in Munich Commute/TestData/.\nLeave empty for live API data.",
                placeholder: testDataFile || "on-time-mix.json",
                defaultValue: testDataFile,
                isOptional: true
            });
            if (testInput === null) return null;
            testDataFile = testInput;
        } else if (fieldChoice === 5) {
            const nameInput = await askText({
                title: "Preset name",
                message: "Change the name or press Continue to keep it.",
                placeholder: profileName,
                defaultValue: profileName
            });
            if (nameInput === null) return null;
            profileName = sanitizeProfileName(nameInput) || profileName;
        } else if (fieldChoice === 6) {
            // Destructive "Delete Preset" action (added before "Save", so it is index 6).
            const deleted = await confirmAndDeletePreset(profileDirectory, profileName);
            if (deleted) return null;
        } else if (fieldChoice === 7) {
            break; // Save
        }
    }

    const updatedProfilePath = fileManager.joinPath(profileDirectory, `${profileName}.txt`);
    if (profileName !== originalProfileName && fileManager.fileExists(updatedProfilePath)) {
        const errorAlert = new Alert();
        errorAlert.title = "Name already exists";
        errorAlert.message = `A preset named "${profileName}" already exists.`;
        errorAlert.addAction("OK");
        await errorAlert.presentAlert();
        return null;
    }

    const parameterParts = [`station: ${station}`];
    if (lines) parameterParts.push(`lines: ${lines}`);
    if (platform) parameterParts.push(`platform: ${platform}`);
    parameterParts.push(`gradient: ${gradient}`);
    if (testDataFile) parameterParts.push(`test: ${testDataFile}`);

    fileManager.writeString(updatedProfilePath, parameterParts.join("; "));
    if (profileName !== originalProfileName) {
        fileManager.remove(originalProfilePath);
    }
    Pasteboard.copy(profileName);

    // Show widget preview directly
    applyParsedWidgetParameters(parseWidgetParameters(parameterParts.join("; ")));

    const previousWidgetFamily = config.widgetFamily;
    config.widgetFamily = "large";
    try {
        const widget = await createWidget();
        await widget.presentLarge();
    } finally {
        config.widgetFamily = previousWidgetFamily;
    }

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

    const successAlert = new Alert();
    successAlert.title = "Deleted";
    successAlert.message = `"${profileName}" has been deleted.`;
    successAlert.addAction("OK");
    await successAlert.presentAlert();

    return true;
}

function getAppDirectory() {
    const fileManager = FileManager.iCloud();
    return fileManager.joinPath(fileManager.documentsDirectory(), PROFILE_DIRECTORY_NAME);
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
        if (saved.transportTypes) Object.assign(TRANSPORT_TYPES, saved.transportTypes);
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
        transportTypes: { ...TRANSPORT_TYPES },
        subtractMinutes: SUBTRACT_MINUTES,
        showSubtractMinutes: SHOW_SUBTRACT_MINUTES,
        defaultStationLines: DEFAULT_STATION_LINES,
        defaultStationPlatform: DEFAULT_STATION_PLATFORM
    }, null, 2));
}


async function showSettingsTransportTypes() {
    while (true) {
        const actions = [
            { id: "sbahn",       label: `🚇 S-Bahn: ${TRANSPORT_TYPES.sbahn ? "✅" : "❌"}` },
            { id: "ubahn",       label: `🚇 U-Bahn: ${TRANSPORT_TYPES.ubahn ? "✅" : "❌"}` },
            { id: "bus",         label: `🚌 Bus: ${TRANSPORT_TYPES.bus ? "✅" : "❌"}` },
            { id: "regionalBus", label: `🚌 Regional Bus: ${TRANSPORT_TYPES.regionalBus ? "✅" : "❌"}` },
            { id: "tram",        label: `🚊 Tram: ${TRANSPORT_TYPES.tram ? "✅" : "❌"}` },
            { id: "train",       label: `🚂 Train: ${TRANSPORT_TYPES.train ? "✅" : "❌"}` },
            { id: "back",        label: "← Back" },
        ];
        const menu = new Alert();
        menu.title = "Transport Types";
        menu.message = "Tap to toggle each transport type.";
        actions.forEach(a => menu.addAction(a.label));
        menu.addCancelAction("Cancel");

        const idx = await menu.presentSheet();
        if (idx === -1) return;
        const action = actions[idx].id;
        if (action === "back") return;

        if (action === "sbahn") TRANSPORT_TYPES.sbahn = !TRANSPORT_TYPES.sbahn;
        else if (action === "ubahn") TRANSPORT_TYPES.ubahn = !TRANSPORT_TYPES.ubahn;
        else if (action === "bus") TRANSPORT_TYPES.bus = !TRANSPORT_TYPES.bus;
        else if (action === "regionalBus") TRANSPORT_TYPES.regionalBus = !TRANSPORT_TYPES.regionalBus;
        else if (action === "tram") TRANSPORT_TYPES.tram = !TRANSPORT_TYPES.tram;
        else if (action === "train") TRANSPORT_TYPES.train = !TRANSPORT_TYPES.train;
        saveSettings();
    }
}

async function showSettingsStationDefaults() {
    while (true) {
        const actions = [
            { id: "lines",    label: `🚆 Lines: ${DEFAULT_STATION_LINES || "all"}` },
            { id: "platform", label: `🛤 Platform: ${DEFAULT_STATION_PLATFORM || "all"}` },
            { id: "back",     label: "← Back" },
        ];
        const menu = new Alert();
        menu.title = "Station Defaults";
        menu.message = "Pre-filled filters when using Find Nearest Station.";
        actions.forEach(a => menu.addAction(a.label));
        menu.addCancelAction("Cancel");

        const idx = await menu.presentSheet();
        if (idx === -1) return;
        const action = actions[idx].id;
        if (action === "back") return;

        if (action === "lines") {
            const input = await askText({
                title: "Default Lines",
                message: "Lines to pre-fill when using Find Nearest Station (comma-separated).\nLeave empty for no default.",
                defaultValue: DEFAULT_STATION_LINES,
                placeholder: "S1, S2, U3",
                isOptional: true
            });
            if (input === null) return;
            DEFAULT_STATION_LINES = input;
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
        }
        saveSettings();
    }
}

async function showSettings() {
    while (true) {
        const actions = [
            { id: "transportTypes",   label: "🚇 Transport Types →" },
            { id: "stationDefaults",  label: "🚉 Station Defaults →" },
            { id: "subtractMinutes",  label: `⏱ Subtract Minutes: ${SUBTRACT_MINUTES}` },
            { id: "showSubtractMins", label: `👁 Show Subtracted Minutes: ${SHOW_SUBTRACT_MINUTES ? "✅" : "❌"}` },
        ];
        const menu = new Alert();
        menu.title = "Settings";
        menu.message = "Tap a setting to change it.";
        actions.forEach(a => menu.addAction(a.label));
        menu.addCancelAction("Done");

        const idx = await menu.presentSheet();
        if (idx === -1) return;
        const action = actions[idx].id;

        if (action === "transportTypes") {
            await showSettingsTransportTypes();
        } else if (action === "stationDefaults") {
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
    const instructionsAlert = new Alert();
    instructionsAlert.title = "How to Add Widget";
    instructionsAlert.message = getWidgetSetupInstructions();
    instructionsAlert.addAction("Done");
    await instructionsAlert.presentAlert();
}

async function showPostCreateInstructions(profileName) {
    const instructionsAlert = new Alert();
    instructionsAlert.title = "Add to Home Screen";
    instructionsAlert.message = getPostCreateInstructions(profileName);
    instructionsAlert.addAction("Done");
    await instructionsAlert.presentAlert();
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

        if (menuAction === MAIN_MENU_ACTION.CREATE_SAVED_STATION) {
            // Create Saved Station - wizard
            const savedProfile = await createSavedStation();
            if (savedProfile) {
                console.log(`[INFO]   - Created saved station profile: '${savedProfile}'`);
                await showPostCreateInstructions(savedProfile);
            }
            return;
        } else if (menuAction === MAIN_MENU_ACTION.EDIT_SAVED_STATION) {
            // Edit Saved Station
            const editedProfile = await editSavedStation();
            if (editedProfile) {
                console.log(`[INFO]   - Edited saved station profile: '${editedProfile}'`);
            }
            return;
        } else if (menuAction === MAIN_MENU_ACTION.VIEW_SAVED_STATION) {
            // View Saved Station - open selected profile in large size
            const viewedProfile = await viewSavedStation();
            if (viewedProfile) {
                console.log('[INFO]   - Viewed saved station profile.');
            }
            return;
        } else if (menuAction === MAIN_MENU_ACTION.FIND_NEAREST_STATION) {
            // Find Nearest Station - wizard with geolocation.
            // Handles its own preview loop and optional save, so nothing to render afterwards.
            await findNearestStation();
            return;
        } else if (menuAction === MAIN_MENU_ACTION.FIND_NEAREST_SBAHN) {
            // Find Nearest S-Bahn - same wizard, restricted to S-Bahn stations.
            await findNearestStation({ sbahnOnly: true });
            return;
        } else if (menuAction === MAIN_MENU_ACTION.SETTINGS) {
            await showSettings();
            return;
        } else if (menuAction === MAIN_MENU_ACTION.HOW_TO_ADD_WIDGET) {
            await showHowToAddWidgetInstructions();
            return;
        } else {
            // Cancelled
            console.log('[INFO]   - User cancelled main menu.');
            return;
        }
    } else if (launchedFromWidgetTap) {
        console.log('[INFO]   - Launched from widget tap, skipping menu and showing widget directly.');
    }

    const widget = await createWidget();
    console.log('[INFO] Step 7: Widget construction complete.');

    if (!config.runsInWidget) {
        const widgetSize = config.widgetFamily || 'large';
        switch(widgetSize) {
            case 'small':
                console.log('[INFO] Step 8: Presenting small widget preview.');
                await widget.presentSmall();
                break;
            case 'large':
                console.log('[INFO] Step 8: Presenting large widget preview.');
                await widget.presentLarge();
                break;
            default:
                console.log('[INFO] Step 8: Presenting medium widget preview.');
                await widget.presentMedium();
        }
    }

    Script.setWidget(widget);
    console.log('[INFO] Step 9: Script finished.');
}

await main();
Script.complete();

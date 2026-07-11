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


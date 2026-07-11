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


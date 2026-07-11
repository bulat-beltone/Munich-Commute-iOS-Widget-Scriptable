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

// Tracks whether the Settings line/platform defaults have already been
// applied for the current parameter context. createWidget() runs more than
// once per script execution in the interactive "nearest" widget flow (once
// per Show / Show without filters / filter edit), and without this guard it
// would treat every explicit "no filter" choice the same as "not yet
// decided" and silently reapply the defaults each time. See
// applyParsedWidgetParameters(), which resets this for a fresh context.
let nearestDefaultsApplied = false;

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
    // Fresh parameter context — the Settings defaults haven't been
    // considered for it yet.
    nearestDefaultsApplied = false;
}

applyParsedWidgetParameters(parseWidgetParameters(paramString));


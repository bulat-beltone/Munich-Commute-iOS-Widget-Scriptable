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
const SUBTRACT_MINUTES = 1;
const SHOW_SUBTRACT_MINUTES = false; // Show "-X" indicator in widget header

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
        grey: { top: "#2A2A2A", bottom: "#1A1A1A" },
        red: { top: "#471F23", bottom: "#1E0B0D" },
        blue: { top: "#1F2347", bottom: "#0B0D1E" },
        green: { top: "#23471F", bottom: "#0D1E0B" },
        purple: { top: "#471F47", bottom: "#110B1E" },
        teal: { top: "#1F4747", bottom: "#0B1E1E" }
    }
};

// Profile directory for saved stations
const PROFILE_DIRECTORY_NAME = "Munich Commute. Saved Stations";
const AVAILABLE_GRADIENTS = ["grey", "red", "blue", "green", "purple", "teal"];

// Fixed secondary departure font (for departures 2-6)
const DEPARTURE_SECONDARY_FONT = Font.boldSystemFont(15);

// ============================================================================
// WIDGET SIZE CONFIGURATION
// ============================================================================

function getDeparturePrimaryFont() {
    const screenResolution = Device.screenResolution();
    const screenWidth = Math.min(screenResolution.width, screenResolution.height);

    // Primary font: dynamic size for first departure
    const primarySize = Math.floor(screenWidth / 58);
    const clampedPrimary = Math.max(18, Math.min(28, primarySize));

    console.log(`[DEBUG] Dynamic primary font: screenWidth=${screenWidth}, size=${clampedPrimary}`);
    return Font.boldSystemFont(clampedPrimary);
}

const WIDGET_CONFIG = {
    small: {
        itemsCount: 2,
        stationNameFont: Font.semiboldSystemFont(13),
        iconSize: new Size(16, 16),
        lineBadgeSize: new Size(24, 15),
        lineBadgeFont: Font.boldSystemFont(11),
        destinationFont: Font.caption1(),
        textWithOpacity: 0.5
    },
    medium: {
        itemsCount: 2,
        stationNameFont: Font.semiboldSystemFont(13),
        iconSize: new Size(16, 16),
        lineBadgeSize: new Size(24, 15),
        lineBadgeFont: Font.boldSystemFont(11),
        destinationFont: Font.caption1(),
        textWithOpacity: 0.5
    },
    large: {
        itemsCount: 6,
        stationNameFont: Font.semiboldSystemFont(20),
        iconSize: new Size(24, 24),
        lineBadgeSize: new Size(24, 15),
        lineBadgeFont: Font.boldSystemFont(11),
        destinationFont: Font.caption1(),
        textWithOpacity: 0.5
    }
};

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
        S8: "#ffffff1a", // transparent white 10%
        S8_fg: "#f3bc31" // yellow text
    },
    BUS: "#00586A",
    REGIONAL_BUS: "#4682B4",
    TRAM: "#D82020"
};

// ============================================================================
// PARAMETER PARSING
// ============================================================================

function resolveWidgetParameter(rawParameter) {
    const trimmedParameter = (rawParameter || "").trim();
    if (!trimmedParameter) return DEFAULT_WIDGET_PARAMETERS;

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

    console.log(`[WARN] No widget parameter profile found for '${trimmedParameter}'. Falling back to defaults.`);
    return DEFAULT_WIDGET_PARAMETERS;
}

// Parse widget parameters
const paramString = resolveWidgetParameter(args.widgetParameter);
const parameters = paramString ? paramString.split(";") : [];
let userStation = "Marienplatz";
let userPlatforms = null;
let userLines = null;
let userGradient = "grey";
let hasExplicitStation = false;

// Parse parameters in any order
parameters.forEach(param => {
    const trimmedParam = param.trim();
    if (!trimmedParam) return;

    // Allow first positional parameter to be station name
    if (!trimmedParam.includes(":")) {
        if (!hasExplicitStation) {
            userStation = trimmedParam;
        }
        return;
    }

    const [key, ...valueParts] = trimmedParam.split(":").map(part => part.trim());
    const value = valueParts.join(":").trim();

    switch (key.toLowerCase()) {
        case "station":
            userStation = value;
            hasExplicitStation = true;
            break;
        case "platform":
            userPlatforms = value ? Number(value) : null;
            break;
        case "lines":
            userLines = value ? value.split(",").map(line => line.trim()) : null;
            break;
        case "gradient":
        case "background": // backward compatibility
            if (CONFIG.gradients[value.toLowerCase()]) {
                userGradient = value.toLowerCase();
            }
            break;
    }
});

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

function getLineColor(transportType, label) {
    if (transportType === "UBAHN" || transportType === "SBAHN") {
        return LINE_COLORS[transportType][label] || "#FFFFFF";
    }
    return LINE_COLORS[transportType] || "#FFFFFF";
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

async function askGradient(defaultGradient = "grey") {
    const alert = new Alert();
    alert.title = "Choose a color";
    alert.message = "Select the widget background color.";

    AVAILABLE_GRADIENTS.forEach(gradient => {
        if (gradient === defaultGradient) {
            alert.addAction(`${gradient} (default)`);
        } else {
            alert.addAction(gradient);
        }
    });
    alert.addCancelAction("Cancel");

    const selectedIndex = await alert.presentSheet();
    if (selectedIndex === -1) {
        return null;
    }

    return AVAILABLE_GRADIENTS[selectedIndex];
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
// WIDGET CREATION & RENDERING
// ============================================================================

async function createWidget() {
    console.log('[INFO] Step 2: Determining widget and device info...');
    const widgetSize = config.widgetFamily || 'large';
    console.log(`[INFO]   - Widget family: ${widgetSize}`);
    const widgetConfig = WIDGET_CONFIG[widgetSize];
    const primaryDepartureFont = getDeparturePrimaryFont();
    console.log(`[INFO]   - Device: ${Device.model()}`);

    console.log('[INFO] Step 3: Fetching station ID...');
    const stationResult = await getStationId(userStation);
    if (!stationResult) {
        let errorWidget = new ListWidget();
        errorWidget.addText("Station not found");
        console.log(`[ERROR]   - Station not found for name: ${userStation}`);
        return errorWidget;
    }
    const globalId = stationResult.globalId;
    userStation = stationResult.name; // Use the actual station name from the API
    console.log(`[INFO]   - Station ID found: ${globalId}`);

    console.log('[INFO] Step 4: Fetching departures from MVG API...');
    let departures = await getDepartures(globalId);
    console.log(`[INFO]   - Departures fetched: ${departures.length}`);

    console.log('[INFO] Step 5: Filtering departures by user preferences...');
    departures = departures.filter(entry => {
        const lineMatches = userLines ? userLines.includes(entry.label) : true;
        const platformMatches = userPlatforms ? entry.platform === userPlatforms : true;
        return lineMatches && platformMatches;
    });
    console.log(`[INFO]   - Departures after filter: ${departures.length}`);

    if (departures.length === 0) {
        const widget = new ListWidget();
        widget.addText(userStation.replace(/^München-/, ''));
        widget.addSpacer(4);
        widget.addText("No departures found");
        console.log(`[WARN]   - No departures found for station: ${userStation}`);
        return widget;
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

    // Add tram icon
    const tramSymbol = SFSymbol.named("tram.fill");
    tramSymbol.applyFont(widgetConfig.stationNameFont);
    const tramIcon = titleStack.addImage(tramSymbol.image);
    tramIcon.imageSize = widgetConfig.iconSize;
    tramIcon.tintColor = Color.white();

    // Display station name, removing "München-" prefix if present
    const stationName = titleStack.addText(userStation.replace(/^München-/, ''));
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

    // Add rows for each departure
    for (let i = 0; i < Math.min(widgetConfig.itemsCount, departures.length); i++) {
        const rowStack = mainStack.addStack();
        rowStack.layoutHorizontally();
        rowStack.topAlignContent();
        const lineBadgeContainer = rowStack.addStack();
        lineBadgeContainer.layoutVertically();
        lineBadgeContainer.setPadding(i === 0 ? 5 : 3, 0, 0, 0);
        const lineStack = lineBadgeContainer.addStack();
        lineStack.size = widgetConfig.lineBadgeSize;
        console.log(`[DEBUG] lineStack.size set to: width=${widgetConfig.lineBadgeSize.width}, height=${widgetConfig.lineBadgeSize.height}`);
        lineStack.centerAlignContent();

        const lineName = lineStack.addText(departures[i].label);
        const lineColor = getLineColor(departures[i].transportType, departures[i].label);

        // Versatile badge background: use gradient if keys exist
        const transportColors = LINE_COLORS[departures[i].transportType];
        const label = departures[i].label;
        const gradTopKey = label + "_gradient_top";
        const gradBottomKey = label + "_gradient_bottom";
        let usedGradient = false;
        if (transportColors && transportColors[gradTopKey] && transportColors[gradBottomKey]) {
            const topColor = transportColors[gradTopKey];
            const bottomColor = transportColors[gradBottomKey];
            let grad = new LinearGradient();
            grad.colors = [new Color(topColor), new Color(bottomColor)];
            grad.locations = [0.5, 0.51]; // sharp transition
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
        lineName.centerAlignText();
        lineName.minimumScaleFactor = 0.4;

        rowStack.addSpacer(8);

        // Create a vertical stack for time and destination
        const infoStack = rowStack.addStack();
        infoStack.layoutVertically();
        infoStack.spacing = 0;

        // DEPARTURE TIME
        let recalculatedTime = departures[i].realtimeDepartureTime;
        if (typeof recalculatedTime !== 'number' && typeof departures[i].plannedDepartureTime === 'number' && typeof departures[i].delayInMinutes === 'number') {
            recalculatedTime = departures[i].plannedDepartureTime + (departures[i].delayInMinutes * 60 * 1000);
        }
        const adjustedTime = recalculatedTime - (SUBTRACT_MINUTES * 60 * 1000);

        if (departures[i].delayInMinutes > 0) {
            // Delayed: show planned and delayed minutes
            const timeRowStack = infoStack.addStack();
            timeRowStack.layoutHorizontally();
            timeRowStack.centerAlignContent();

            const plannedDate = new Date(departures[i].plannedDepartureTime - (SUBTRACT_MINUTES * 60 * 1000));
            const plannedTimeStr = formatDepartureTime(plannedDate);
            const plannedTimeText = timeRowStack.addText(plannedTimeStr);
            plannedTimeText.textColor = Color.white();
            plannedTimeText.font = i === 0 ? primaryDepartureFont : DEPARTURE_SECONDARY_FONT;
            plannedTimeText.lineLimit = 1;

            timeRowStack.addSpacer(4);

            const delayedDate = new Date(adjustedTime);
            const delayedMinutes = delayedDate.getMinutes().toString().padStart(2, '0');
            const colonMinutesText = timeRowStack.addText(':' + delayedMinutes);
            colonMinutesText.textColor = new Color('#DB5C5C');
            colonMinutesText.font = i === 0 ? primaryDepartureFont : DEPARTURE_SECONDARY_FONT;
            colonMinutesText.lineLimit = 1;
        } else {
            // Not delayed: show only main time
            const timeRowStack = infoStack.addStack();
            timeRowStack.layoutHorizontally();
            timeRowStack.centerAlignContent();
            const mainTime = timeRowStack.addText(formatDepartureTime(adjustedTime));
            mainTime.textColor = Color.white();
            mainTime.font = i === 0 ? primaryDepartureFont : DEPARTURE_SECONDARY_FONT;
            mainTime.lineLimit = 1;
        }

        // DESTINATION NAME (with platform if available)
        const platformSuffix = departures[i].platform ? `, Pl. ${departures[i].platform}` : '';
        const destinationName = infoStack.addText(departures[i].destination + platformSuffix);
        destinationName.font = widgetConfig.destinationFont;
        destinationName.textColor = Color.white();
        destinationName.textOpacity = widgetConfig.textWithOpacity;
        destinationName.lineLimit = 1;
        destinationName.minimumScaleFactor = 0.5;

        rowStack.addSpacer();

        // Add vertical spacing between rows
        if (i < Math.min(widgetConfig.itemsCount, departures.length) - 1) {
            mainStack.addSpacer(12);
        }
        console.log(`[INFO]   - Added row for departure ${i + 1}: line ${departures[i].label}, destination ${departures[i].destination}`);
    }
    console.log('[INFO]   - Finished adding departure rows');

    return widget;
}

// ============================================================================
// WIZARD FLOWS
// ============================================================================

async function promptForStationSelection() {
    // Parse default parameters to prefill the wizard
    const defaultParams = DEFAULT_WIDGET_PARAMETERS.split(";");
    let defaultStation = "Marienplatz";
    let defaultPlatform = "";
    let defaultLines = "";
    let defaultGradient = "grey";

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

    // Platform selection (optional)
    const platform = await askText({
        title: "Platform (optional)",
        message: "Filter by platform number.\nLeave empty to show all platforms.",
        placeholder: defaultPlatform || "1",
        defaultValue: defaultPlatform,
        isOptional: true
    });
    if (platform === null) return null;

    // Lines selection (optional)
    const lines = await askText({
        title: "Lines (optional)",
        message: "Filter by specific lines, e.g. S3, S4.\nLeave empty to show all lines.",
        placeholder: defaultLines || "S1, S2, U3",
        defaultValue: defaultLines,
        isOptional: true
    });
    if (lines === null) return null;

    // Return a config object to apply to the widget (no gradient for Find Station)
    return {
        station: station,
        platform: platform,
        lines: lines,
        gradient: defaultGradient // Use default gradient from config
    };
}

async function createSavedStation() {
    const profileNameInput = await askText({
        title: "Saved station name",
        message: "Give this station a short name (e.g., \"Home\", \"Work\").\nThis becomes the widget parameter.",
        placeholder: "Home"
    });

    if (profileNameInput === null) return null;

    const profileName = sanitizeProfileName(profileNameInput);
    if (!profileName) {
        const errorAlert = new Alert();
        errorAlert.title = "Invalid profile name";
        errorAlert.message = "Please use at least one valid character.";
        errorAlert.addAction("OK");
        await errorAlert.presentAlert();
        return null;
    }

    const stationInput = await askText({
        title: "Station",
        message: "Type the station name to search.",
        placeholder: "Marienplatz"
    });
    if (stationInput === null) return null;

    const station = await searchAndSelectStation(stationInput);
    if (station === null) return null;

    const platform = await askText({
        title: "Platform (optional)",
        message: "Filter by platform number.\nLeave empty to show all platforms.",
        placeholder: "1",
        isOptional: true
    });
    if (platform === null) return null;

    const lines = await askText({
        title: "Lines (optional)",
        message: "Filter by specific lines (comma-separated).\nLeave empty to show all lines.",
        placeholder: "S1, S2, U3",
        isOptional: true
    });
    if (lines === null) return null;

    const gradient = await askGradient();
    if (gradient === null) return null;

    // Build the parameter string
    const parameterParts = [`station:${station}`];
    if (platform) parameterParts.push(`platform:${platform}`);
    if (lines) parameterParts.push(`lines:${lines}`);
    parameterParts.push(`gradient:${gradient}`);

    const content = parameterParts.join(";");

    // Save to file
    const fileManager = FileManager.iCloud();
    const documentsDirectory = fileManager.documentsDirectory();
    const profileDirectory = fileManager.joinPath(documentsDirectory, PROFILE_DIRECTORY_NAME);

    if (!fileManager.fileExists(profileDirectory)) {
        fileManager.createDirectory(profileDirectory, true);
    }

    const profilePath = fileManager.joinPath(profileDirectory, `${profileName}.txt`);
    fileManager.writeString(profilePath, content);

    // Copy profile name to clipboard
    Pasteboard.copy(profileName);

    // Show success with instructions
    const successAlert = new Alert();
    successAlert.title = "Station Saved!";
    successAlert.message = `"${profileName}" copied to clipboard.\n\nHow to add the widget:\n\n1. Go to your Home Screen\n2. Long-press → tap "+"\n3. Search "Scriptable" → Add widget\n4. Long-press the widget → "Edit Widget"\n5. Select "Munich Commute Widget"\n6. Paste "${profileName}" as Parameter`;
    successAlert.addAction("Done");
    successAlert.addAction("Show Saved File");

    const successAction = await successAlert.presentAlert();
    if (successAction === 1) {
        QuickLook.present(profilePath);
    }

    return profileName;
}

async function showMainMenu() {
    const menu = new Alert();
    menu.title = "Munich Commute Widget";
    menu.message = "What would you like to do?";
    menu.addAction("Find Station");
    menu.addAction("Create Saved Station");
    menu.addCancelAction("Cancel");

    const selectedAction = await menu.presentSheet();
    return selectedAction;
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
    console.log('[INFO] Munich Commute Widget script started');
    console.log('[INFO] Step 1: Parsing parameters...');
    console.log(`[INFO]   - Station: '${userStation}'`);
    console.log(`[INFO]   - Platforms: '${userPlatforms}'`);
    console.log(`[INFO]   - Lines: '${userLines}'`);
    console.log(`[INFO]   - Gradient: '${userGradient}'`);
    console.log(`[INFO]   - Transport Types: using default configuration`);

    if (!config.runsInWidget) {
        const menuChoice = await showMainMenu();

        if (menuChoice === 0) {
            // Find Station - wizard with prefilled defaults
            const config = await promptForStationSelection();
            if (config) {
                userStation = config.station;
                userPlatforms = config.platform ? Number(config.platform) : null;
                userLines = config.lines ? config.lines.split(",").map(line => line.trim()) : null;
                userGradient = config.gradient;
                console.log(`[INFO]   - Station configured from wizard: '${userStation}'`);
            } else {
                console.log('[INFO]   - User cancelled station selection.');
                return;
            }
        } else if (menuChoice === 1) {
            // Create Saved Station - wizard
            const savedProfile = await createSavedStation();
            if (savedProfile) {
                console.log(`[INFO]   - Created saved station profile: '${savedProfile}'`);
            }
            return;
        } else {
            // Cancelled
            console.log('[INFO]   - User cancelled main menu.');
            return;
        }
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

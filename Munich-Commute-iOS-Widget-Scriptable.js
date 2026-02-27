// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-green; icon-glyph: subway;
// noinspection LanguageDetectionInspection

// Updated 27 Feb, 2026
// Check for updates here: https://github.com/bulat-beltone/Munich-Commute-iOS-Widget-Scriptable

// Example usage:
// Marienplatz; types: sbahn; platform: 1; lines: S1; gradient: purple;

// Default parameters
const DEFAULT_WIDGET_PARAMETERS = "station: Marienplatz; platform: 1; lines: S3, S4";

// Configuration
const CONFIG = {
    subtractMinutes: 1, // Subtract this many minutes from current time display

    // Transport types to display (true = display, false = hide)
    transportTypes: {
        sbahn: true,
        ubahn: true,
        bus: true,
        regionalBus: true,
        tram: true,
        train: true
    },
    offsetInMinutes: 0, // Only show connections that are X minutes in the future
    departuresLimit: 80, // Maximum number of departures to fetch from the API
    defaultTransportTypes: "SBAHN,UBAHN,TRAM,BUS,REGIONAL_BUS,BAHN",

    // Gradient backgrounds
    gradients: {
        grey: {
            top: "#2A2A2A",
            bottom: "#1A1A1A"
        },
        red: {
            top: "#471F23",
            bottom: "#1E0B0D"
        },
        blue: {
            top: "#1F2347",
            bottom: "#0B0D1E"
        },
        green: {
            top: "#23471F",
            bottom: "#0D1E0B"
        },
        purple: {
            top: "#471F47",
            bottom: "#110B1E"
        },
        teal: {
            top: "#1F4747",
            bottom: "#0B1E1E"
        }
    }
};


function resolveWidgetParameter(rawParameter) {
    const trimmedParameter = (rawParameter || "").trim();
    if (!trimmedParameter) return DEFAULT_WIDGET_PARAMETERS;

    // Backward-compatible: treat full key:value strings as inline parameters.
    if (trimmedParameter.includes(":")) {
        return trimmedParameter;
    }

    // New: if only a profile name is provided, load it from iCloud .txt file.
    // Example widget parameter: "Home" -> reads "Home.txt".
    const fileManager = FileManager.iCloud();
    const documentsDirectory = fileManager.documentsDirectory();
    const profileDirectory = fileManager.joinPath(documentsDirectory, "MunichCommuteWidgetParams");
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
let userGradient = "grey"; // Default gradient
let hasExplicitStation = false;

// Parse parameters in any order
parameters.forEach(param => {
    const trimmedParam = param.trim();
    if (!trimmedParam) return;

    // Allow first positional parameter to be station name, e.g. "Marienplatz; platform: 1"
    if (!trimmedParam.includes(":")) {
        if (!hasExplicitStation) {
            userStation = trimmedParam;
        }
        return;
    }

    // Split into key and value
    const [key, ...valueParts] = trimmedParam.split(":").map(part => part.trim());
    const value = valueParts.join(":").trim(); // Rejoin in case there are colons in the value

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
            // Check if the gradient exists in our config
            if (CONFIG.gradients[value.toLowerCase()]) {
                userGradient = value.toLowerCase();
            }
            break;
        case "background": // For backward compatibility
            // If it's a valid gradient name, use it
            if (CONFIG.gradients[value.toLowerCase()]) {
                userGradient = value.toLowerCase();
            }
            break;
    }
});



// Known widget pixel dimensions for selected devices (screenshot height in pixels as key)
const DEVICE_WIDGET_SIZES = {
    2778: { // iPhone 12 Pro Max and similar
        small: { width: 510, height: 510 },
        medium: { width: 1092, height: 510 },
        large: { width: 1092, height: 1146 }
    },
    2532: { // iPhone 12/12 Pro and similar
        small: { width: 474, height: 474 },
        medium: { width: 1014, height: 474 },
        large: { width: 1014, height: 1062 }
    },
    2796: { // iPhone 14 Pro Max / 15 Plus / 15 Pro Max / 16 Plus
        small:  { width: 510, height: 510 },
        medium: { width: 1092, height: 510 },
        large:  { width: 1092, height: 1146 }
    },
    2556: { // iPhone 14 Pro / 15 / 15 Pro / 16
        small:  { width: 474, height: 474 },
        medium: { width: 1017, height: 474 },
        large:  { width: 1017, height: 1062 }
    },
    2688: { // iPhone 11 Pro Max, XS Max
        small: { width: 507, height: 507 },
        medium: { width: 1080, height: 507 },
        large: { width: 1080, height: 1137 }
    },
    1792: { // iPhone 11, XR
        small: { width: 338, height: 338 },
        medium: { width: 720, height: 338 },
        large: { width: 720, height: 758 }
    },
    2436: { // iPhone minis and 5.8" X/XS/11 Pro
        small: { width: 465, height: 465 },
        medium: { width: 987, height: 465 },
        large: { width: 987, height: 1035 }
    },
    2208: { // Plus phones
        small: { width: 471, height: 471 },
        medium: { width: 1044, height: 471 },
        large: { width: 1044, height: 1071 }
    },
    2001: { // Plus in Display Zoom mode
        small: { width: 444, height: 444 },
        medium: { width: 963, height: 444 },
        large: { width: 963, height: 972 }
    },
    1624: { // 11/XR in Display Zoom
        small: { width: 310, height: 310 },
        medium: { width: 658, height: 310 },
        large: { width: 658, height: 690 }
    },
    1334: { // SE2, 6/7/8
        small: { width: 296, height: 296 },
        medium: { width: 642, height: 296 },
        large: { width: 642, height: 648 }
    },
    1136: { // SE1
        small: { width: 282, height: 282 },
        medium: { width: 584, height: 282 },
        large: { width: 584, height: 622 }
    },
    2868: { // iPhone 16 Pro Max
        small: { width: 558, height: 558 },
        medium: { width: 1209, height: 558 },
        large: { width: 1209, height: 1270 }
    },
    2622: { // iPhone 16 Pro
        small: { width: 537, height: 537 },
        medium: { width: 1164, height: 537 },
        large: { width: 1164, height: 1212 }
    }
};

function getWidgetDimensions(family) {
    const heightKey = Device.screenResolution().height.toString();
    const mapping = DEVICE_WIDGET_SIZES[heightKey];
    console.log(`[DEBUG] Device heightKey: ${heightKey}, family: ${family}`);
    if (mapping && mapping[family]) {
        console.log(`[DEBUG] Found mapping for family '${family}':`, mapping[family]);
        return mapping[family];
    }

    const screenWidth = Device.screenResolution().width;
    const screenHeight = Device.screenResolution().height;
    console.log(`[DEBUG] Fallback widget size for family '${family}': screenWidth=${screenWidth}, screenHeight=${screenHeight}`);
    switch (family) {
        case 'small':
            return { width: screenWidth / 2, height: screenWidth / 2 };
        case 'medium':
            return { width: screenWidth, height: screenWidth / 2 };
        default:
            return { width: screenWidth, height: screenHeight / 2 };
    }
}

function getPrimaryDepartureFont() {
    const screenResolution = Device.screenResolution();
    const referenceWidth = Math.max(screenResolution.width, screenResolution.height);
    const calculatedFontSize = Math.floor(referenceWidth / 127);
    const minFontSize = 16;
    const maxFontSize = 30;
    const clampedFontSize = Math.max(minFontSize, Math.min(maxFontSize, calculatedFontSize));
    console.log(`[DEBUG] Dynamic primary font: referenceWidth=${referenceWidth}, calculated=${calculatedFontSize}, clamped=${clampedFontSize}`);
    return Font.boldSystemFont(clampedFontSize);
}

// Widget size configurations
const WIDGET_CONFIG = {
    small: {
        // General widget properties
        itemsCount: 2,
        columnHeight: 30,
        spacing: 4,

        // Header section (station name and current time)
        stationNameFont: Font.semiboldSystemFont(13),        // Station name font
        lastUpdatedTimeFont: Font.systemFont(12),    // Last updated time font
        iconSize: new Size(16, 16),                         // Icon size for header

        // Line badge (S1, U3, etc.)
        lineBadgeSize: new Size(24, 15),
        lineBadgeFont: Font.boldSystemFont(11),         // Line number/name font

        // Departure time
        departurePrimaryFont: Font.boldSystemFont(22),    // First/main departure time
        departureSecondaryFont: Font.boldSystemFont(15), // Other departure times

        // Destination
        destinationFont: Font.caption1(),       // Destination text

        textWithOpacity: 0.5, // any text with opacity

        // Layout sizes
        destinationColumnSize: new Size(60, 15),  // Size for destination column
        departureTimeColumnSize: new Size(40, 15), // Size for departure time column
        footerHeight: 20,
        footerFont: Font.caption2()             // Footer information
    },
    medium: {
        // General widget properties
        itemsCount: 2,
        columnHeight: 30,
        spacing: 4,

        // Header section (station name and current time)
        stationNameFont: Font.semiboldSystemFont(13),        // Station name font
        lastUpdatedTimeFont: Font.systemFont(12),    // Last updated time font
        iconSize: new Size(16, 16),                         // Icon size for header

        // Line badge (S1, U3, etc.)
        lineBadgeSize: new Size(24, 15),
        lineBadgeFont: Font.boldSystemFont(11),         // Line number/name font

        // Departure time
        departurePrimaryFont: Font.boldSystemFont(22),    // First/main departure time
        departureSecondaryFont: Font.boldSystemFont(15), // Other departure times

        // Destination
        destinationFont: Font.caption1(),       // Destination text
        textWithOpacity: 0.5,                // Destination text opacity

        // Layout sizes
        destinationColumnSize: new Size(240, 15), // Size for destination column
        departureTimeColumnSize: new Size(60, 15), // Size for departure time column
    },
    large: {
        // General widget properties
        itemsCount: 6,
        columnHeight: 40,
        spacing: 8,

        // Header section (station name and current time)
        stationNameFont: Font.semiboldSystemFont(20),        // Station name font
        lastUpdatedTimeFont: Font.systemFont(15),    // Last updated time font
        iconSize: new Size(24, 24),                         // Icon size for header

        // Line badge (S1, U3, etc.)
        lineBadgeSize: new Size(24, 15),
        lineBadgeFont: Font.boldSystemFont(11),         // Line number/name font

        // Departure time
        departurePrimaryFont: Font.boldSystemFont(22),    // First/main departure time
        departureSecondaryFont: Font.boldSystemFont(15), // Other departure times

        // Destination
        destinationFont: Font.caption1(),       // Destination text
        textWithOpacity: 0.5,                // Destination text opacity

        // Layout sizes
        destinationColumnSize: new Size(200, 20), // Size for destination column
        departureTimeColumnSize: new Size(60, 20), // Size for departure time column
    }
};

// Line colors for different transport types
const LINE_COLORS = {
    UBAHN: {
        U1: "#438136",
        U2: "#C40C37",
        U3: "#F36E31",
        U4: "#0AB38D",
        U5: "#B8740E",
        U6: "#006CB3",

        // U7 and U8 are special cases, they have a gradient background
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
        
        // S8 is a special case, it has a black background and a yellow text color
        S8: "#ffffff1a", // transparent white 10% to have a contrast with black background
        S8_fg: "#f3bc31" // yellow text
    },
    BUS: "#00586A",
    REGIONAL_BUS: "#4682B4",
    TRAM: "#D82020"
};

// Helper Functions
function formatStationName(station) {
    return station.replace(" ", "&")
        .replace("ß", "ss")
        .replace("ü", "ue")
        .replace("ä", "ae")
        .replace("ö", "oe");
}

function formatDepartureTime(timestamp) {
    const date = new Date(timestamp);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

function calculateDeparture(delay, time) {
    return {
        recalculatedTime: delay === undefined ? time : delay + time,
        isDelayed: delay !== undefined
    };
}

function truncate(text, maxLength = 22) {
    return text.length > maxLength ? text.substr(0, maxLength - 1) + '...' : text;
}

function getLineColor(transportType, label) {
    if (transportType === "UBAHN" || transportType === "SBAHN") {
        return LINE_COLORS[transportType][label] || "#FFFFFF";
    }
    return LINE_COLORS[transportType] || "#FFFFFF";
}

// API Integration
async function getStationId(stationName) {
    const formattedStation = formatStationName(stationName);
    const url = `https://www.mvg.de/api/bgw-pt/v3/locations?query=${formattedStation}`;
    const response = await new Request(url).loadJSON();
    
    const stations = response.filter(entry => entry.type === "STATION");
    
    // Prefer exact name match (case-insensitive) to avoid e.g. "Berg am Laim" when user wants "Laim"
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

async function promptForStationSelection() {
    const stationPrompt = new Alert();
    stationPrompt.title = "Choose station";
    stationPrompt.message = "Type a station name";
    stationPrompt.addTextField("Station", userStation);
    stationPrompt.addAction("Search");
    stationPrompt.addCancelAction("Cancel");

    const selectedAction = await stationPrompt.presentAlert();
    if (selectedAction === -1) {
        return null;
    }

    const typedStation = stationPrompt.textFieldValue(0).trim();
    if (!typedStation) {
        return null;
    }

    const formattedStation = formatStationName(typedStation);
    const url = `https://www.mvg.de/api/bgw-pt/v3/locations?query=${formattedStation}`;
    const response = await new Request(url).loadJSON();
    const stations = response.filter(entry => entry.type === "STATION");

    if (stations.length === 0) {
        const noMatchAlert = new Alert();
        noMatchAlert.title = "No station found";
        noMatchAlert.message = `No station found for \"${typedStation}\"`;
        noMatchAlert.addAction("OK");
        await noMatchAlert.presentAlert();
        return null;
    }

    if (stations.length === 1) {
        return stations[0].name;
    }

    const selectionAlert = new Alert();
    selectionAlert.title = "Select station";
    selectionAlert.message = `Found ${stations.length} matches for \"${typedStation}\"`;

    const shownStations = stations.slice(0, 10);
    shownStations.forEach(station => selectionAlert.addAction(station.name));
    selectionAlert.addCancelAction("Cancel");

    const selectedIndex = await selectionAlert.presentSheet();
    if (selectedIndex === -1) {
        return null;
    }

    return shownStations[selectedIndex].name;
}

async function getDepartures(globalId) {
    // Create a mapping from internal keys to API expected values
    const transportTypeMapping = {
        sbahn: "SBAHN",
        ubahn: "UBAHN",
        bus: "BUS",
        regionalBus: "REGIONAL_BUS",
        tram: "TRAM",
        train: "BAHN"
    };

    const transportTypes = Object.entries(CONFIG.transportTypes)
        .filter(([_, enabled]) => enabled)
        .map(([type]) => transportTypeMapping[type]);

    const types = transportTypes.length > 0 
        ? transportTypes.join(',') 
        : CONFIG.defaultTransportTypes;

    const baseUrl = 'https://www.mvg.de/api/bgw-pt/v3/departures';
    const url = `${baseUrl}?globalId=${globalId}&limit=${CONFIG.departuresLimit}&offsetInMinutes=${CONFIG.offsetInMinutes}&transportTypes=${types}`;
    return await new Request(url).loadJSON();
}

// Widget Creation
async function createWidget() {
    console.log('[INFO] Step 2: Determining widget and device info...');
    const widgetSize = config.widgetFamily || 'large';
    console.log(`[INFO]   - Widget family: ${widgetSize}`);
    const widgetConfig = WIDGET_CONFIG[widgetSize];
    const primaryDepartureFont = getPrimaryDepartureFont();
    const { width: widgetWidth, height: widgetHeight } = getWidgetDimensions(widgetSize);
    const deviceHeight = Device.screenResolution().height.toString();
    const deviceModel = Device.model();
    console.log(`[INFO]   - Device: ${deviceModel} (${deviceHeight}px)`);

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
    tramIcon.imageSize = widgetConfig.iconSize; // Use the icon size from widget config
    tramIcon.tintColor = Color.white();
    
    // Display station name, removing "München-" prefix if present
    const stationName = titleStack.addText(userStation.replace(/^München-/, ''));
    stationName.textColor = Color.white();
    stationName.leftAlignText();
    stationName.font = widgetConfig.stationNameFont;
    stationName.lineLimit = 1;
    console.log('[INFO]   - Added station name and icon');
    
    // Subtract minutes
    if (CONFIG.subtractMinutes > 0) {
        headerStack.addSpacer(); // pushes subMins to the right
        const subMins = headerStack.addText(`-${CONFIG.subtractMinutes}`);
        subMins.textColor = Color.white();
        subMins.textOpacity = widgetConfig.textWithOpacity;
        subMins.font = widgetConfig.stationNameFont;
    }

    // Add space between header and departure information
    mainStack.addSpacer();
    console.log('[INFO]   - Added spacer after header');

    // Add rows for each departure, limited by itemsCount from widget configuration
    for (let i = 0; i < Math.min(widgetConfig.itemsCount, departures.length); i++) {
        const rowStack = mainStack.addStack();
        rowStack.layoutHorizontally();
        rowStack.topAlignContent();
        const lineBadgeContainer = rowStack.addStack();
        lineBadgeContainer.layoutVertically();
        lineBadgeContainer.setPadding(i === 0 ? 5 : 3, 0, 0, 0); // 8px for first, 4px for rest
        const lineStack = lineBadgeContainer.addStack();
        lineStack.size = widgetConfig.lineBadgeSize;
        console.log(`[DEBUG] lineStack.size set to: width=${widgetConfig.lineBadgeSize.width}, height=${widgetConfig.lineBadgeSize.height}`);
        lineStack.centerAlignContent(); // Keep centering the text within the badge

        const lineName = lineStack.addText(departures[i].label);
        const lineColor = getLineColor(departures[i].transportType, departures[i].label);
        
        // Versatile badge background: use gradient if *_gradient_top and *_gradient_bottom exist
        const transportColors = LINE_COLORS[departures[i].transportType];
        const label = departures[i].label;
        const gradTopKey = label + "_gradient_top";
        const gradBottomKey = label + "_gradient_bottom";
        let usedGradient = false;
        if (transportColors && transportColors[gradTopKey] && transportColors[gradBottomKey]) {
            // Use gradient if both keys exist
            const topColor = transportColors[gradTopKey];
            const bottomColor = transportColors[gradBottomKey];
            let grad = new LinearGradient();
            grad.colors = [new Color(topColor), new Color(bottomColor)];
            grad.locations = [0.5, 0.51]; // sharp transition between colors
            grad.startPoint = new Point(0, 0);
            grad.endPoint = new Point(0, 1); // vertical gradient
            lineStack.backgroundGradient = grad;
            lineStack.cornerRadius = 4;
            usedGradient = true;
            lineName.textColor = Color.white();
        }
        if (!usedGradient) {
            // Use standard MVG colors for all other lines
            lineStack.backgroundColor = new Color(lineColor);
            lineStack.cornerRadius = 4;
            // Check for fg color (e.g., S8_fg)
            const fgKey = label + "_fg";
            if (transportColors && transportColors[fgKey]) {
                lineName.textColor = new Color(transportColors[fgKey]);
            } else {
                lineName.textColor = Color.white();
            }
        }

        lineName.font = widgetConfig.lineBadgeFont;
        lineName.centerAlignText();
        lineName.minimumScaleFactor = 0.4; // Allow text to shrink if needed

        // Spacing between line and info
        rowStack.addSpacer(8);

        // Create a vertical stack for planned and main time
        const infoStack = rowStack.addStack();
        infoStack.layoutVertically();
        infoStack.spacing = 0; // Increase spacing between time and destination
        

        // DEPARTURE TIME
        // Calculate actual departure time, accounting for delays
        // Use realtimeDepartureTime if available, otherwise calculate from plannedDepartureTime and delayInMinutes
        let recalculatedTime = departures[i].realtimeDepartureTime;
        if (typeof recalculatedTime !== 'number' && typeof departures[i].plannedDepartureTime === 'number' && typeof departures[i].delayInMinutes === 'number') {
            recalculatedTime = departures[i].plannedDepartureTime + (departures[i].delayInMinutes * 60 * 1000);
        }
        // Subtract CONFIG.subtractMinutes from recalculatedTime
        const adjustedTime = recalculatedTime - (CONFIG.subtractMinutes * 60 * 1000);

        if (departures[i].delayInMinutes > 0) {
            // If delayed, show planned and delayed minutes together: HH:MM-mm
            const timeRowStack = infoStack.addStack();
            timeRowStack.layoutHorizontally();
            timeRowStack.centerAlignContent();

            // Planned/original time (white)
            const plannedDate = new Date(departures[i].plannedDepartureTime - (CONFIG.subtractMinutes * 60 * 1000));
            const plannedTimeStr = formatDepartureTime(plannedDate);
            const plannedTimeText = timeRowStack.addText(plannedTimeStr);
            plannedTimeText.textColor = Color.white();
            if (i === 0) {
                plannedTimeText.font = primaryDepartureFont;
            } else {
                plannedTimeText.font = widgetConfig.departureSecondaryFont;
            }
            plannedTimeText.centerAlignText();
            plannedTimeText.lineLimit = 1;
            plannedTimeText.minimumScaleFactor = 0.65;

            // Add 4px spacing
            timeRowStack.addSpacer(4);

            // Colon and delayed minutes (bold, red, same font as planned time)
            const delayedDate = new Date(adjustedTime);
            const delayedMinutes = delayedDate.getMinutes().toString().padStart(2, '0');
            const colonMinutesText = timeRowStack.addText(':' + delayedMinutes);
            colonMinutesText.textColor = new Color('#DB5C5C');
            if (i === 0) {
                colonMinutesText.font = primaryDepartureFont;
            } else {
                colonMinutesText.font = widgetConfig.departureSecondaryFont;
            }
            colonMinutesText.centerAlignText();
            colonMinutesText.lineLimit = 1;
            colonMinutesText.minimumScaleFactor = 0.65;
        } else {
            // Not delayed, show only main time in white
            const timeRowStack = infoStack.addStack();
            timeRowStack.layoutHorizontally();
            timeRowStack.centerAlignContent();
            const mainTime = timeRowStack.addText(formatDepartureTime(adjustedTime));
            mainTime.textColor = Color.white();
            if (i === 0) {
                mainTime.font = primaryDepartureFont;
            } else {
                mainTime.font = widgetConfig.departureSecondaryFont;
            }
            mainTime.lineLimit = 1;
            mainTime.minimumScaleFactor = 0.65;
        }


        // DESTINATION NAME
        // Destination directly below time, no special alignment needed
        const destinationName = infoStack.addText(departures[i].destination);
        destinationName.font = widgetConfig.destinationFont;
        destinationName.textColor = Color.white();
        destinationName.textOpacity = widgetConfig.textWithOpacity;
        destinationName.lineLimit = 1;
        
        // Add a spacer to push the contents to the left
        rowStack.addSpacer();
        
        // Add vertical spacing between rows
        if (i < Math.min(widgetConfig.itemsCount, departures.length) - 1) {
            mainStack.addSpacer(12); // More space after the first row
        }
        console.log(`[INFO]   - Added row for departure ${i + 1}: line ${departures[i].label}, destination ${departures[i].destination}`);
    }
    console.log('[INFO]   - Finished adding departure rows');

    return widget;
}

// Main execution
console.log('[INFO] Munich Commute Widget script started');
console.log('[INFO] Step 1: Parsing parameters...');
console.log(`[INFO]   - Station: '${userStation}'`);
console.log(`[INFO]   - Platforms: '${userPlatforms}'`);
console.log(`[INFO]   - Lines: '${userLines}'`);
console.log(`[INFO]   - Gradient: '${userGradient}'`);
console.log(`[INFO]   - Transport Types: using default configuration`);

if (!config.runsInWidget) {
    const selectedStation = await promptForStationSelection();
    if (selectedStation) {
        userStation = selectedStation;
        console.log(`[INFO]   - Station selected from prompt: '${userStation}'`);
    } else {
        console.log('[INFO]   - Using station from parameters/defaults.');
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
Script.complete();
console.log('[INFO] Step 9: Script finished.');

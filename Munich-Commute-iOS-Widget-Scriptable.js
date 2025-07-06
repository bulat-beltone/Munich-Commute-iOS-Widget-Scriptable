// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-green; icon-glyph: subway;
// noinspection LanguageDetectionInspection

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

// Parse widget parameters
const parameters = args.widgetParameter ? args.widgetParameter.split(";") : [];
let userStation = "Marienplatz";
let userPlatforms = null;
let userLines = null;
let userGradient = "grey"; // Default gradient
let userTransportTypes = null;

// Parse parameters in any order
parameters.forEach(param => {
    const trimmedParam = param.trim();
    if (!trimmedParam) return;

    // Split into key and value
    const [key, ...valueParts] = trimmedParam.split(":").map(part => part.trim());
    const value = valueParts.join(":").trim(); // Rejoin in case there are colons in the value

    switch (key.toLowerCase()) {
        case "station":
            userStation = value;
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
        case "types":
            userTransportTypes = value ? value.split(",").map(type => type.trim()) : null;
            break;
    }
});

// Apply transport type settings if specified
if (userTransportTypes) {
    // Reset all transport types to false first
    Object.keys(CONFIG.transportTypes).forEach(key => {
        CONFIG.transportTypes[key] = false;
    });
    
    // Enable only the specified types
    userTransportTypes.forEach(type => {
        const typeKey = type.toLowerCase();
        switch (typeKey) {
            case "sbahn":
                CONFIG.transportTypes.sbahn = true;
                break;
            case "ubahn":
                CONFIG.transportTypes.ubahn = true;
                break;
            case "bus":
                CONFIG.transportTypes.bus = true;
                break;
            case "regional_bus":
                CONFIG.transportTypes.regionalBus = true;
                break;
            case "tram":
                CONFIG.transportTypes.tram = true;
                break;
            case "bahn":
                CONFIG.transportTypes.train = true;
                break;
        }
    });
}

// Widget size configurations
const WIDGET_CONFIG = {
    small: {
        // General widget properties
        itemsCount: 2,
        columnHeight: 30,
        spacing: 4,
        padding: 3,

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
        destinationOpacity: 0.5,                // Destination text opacity

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
        padding: 3,

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
        destinationOpacity: 0.5,                // Destination text opacity

        // Layout sizes
        destinationColumnSize: new Size(240, 15), // Size for destination column
        departureTimeColumnSize: new Size(60, 15), // Size for departure time column
    },
    large: {
        // General widget properties
        itemsCount: 6,
        columnHeight: 40,
        spacing: 8,
        padding: 5,

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
        destinationOpacity: 0.5,                // Destination text opacity

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
        U6: "#006CB3"
    },
    SBAHN: {
        S1: "#16BAE7",
        S2: "#76B82A",
        S3: "#834DF0",
        S4: "#DB3B4B",
        S5: "#005E82",
        S6: "#00975F",
        S7: "#943126",
        S8: "#000000",
        S20: "#ED6B83"
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
    
    const firstStation = response.find(entry => entry.type === "STATION");
    return firstStation?.globalId || null;
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
    // Determine widget size (small, medium, large) and get corresponding configuration
    const widgetSize = config.widgetFamily || 'large';
    const widgetConfig = WIDGET_CONFIG[widgetSize];
    
    // Get station ID from the station name provided by user
    const globalId = await getStationId(userStation);
    if (!globalId) {
        let errorWidget = new ListWidget();
        errorWidget.addText("Station not found");
        return errorWidget;
    }

    // Fetch all departure information from MVG API
    let departures = await getDepartures(globalId);

    // Debug: Print departures data in a readable way with friendly explanations
    console.log("\n===== MVG Departures Debug =====");
    if (Array.isArray(departures)) {
        departures.slice(0, 5).forEach((dep, idx) => {
            console.log(`Departure #${idx + 1}:`);
            console.log(`  Line: ${dep.label}`);
            console.log(`  Destination: ${dep.destination}`);
            console.log(`  RealtimeDepartureTime: ${dep.realtimeDepartureTime}`);
            console.log(`  Delay: ${dep.delay} (${typeof dep.delay})`);
            console.log(`  TransportType: ${dep.transportType}`);
            // Friendly explanation for delay
            if (dep.delay === undefined) {
                console.log("    → No delay info: The API may not provide real-time delay data. Look for other fields like 'departureDelay', 'delayMinutes', or 'live'.");
            } else if (Number(dep.delay) === 0) {
                console.log("    → On time: The train is scheduled to depart as planned. If all delays are 0, the API may not provide real-time delay info.");
            } else if (Number(dep.delay) > 0) {
                console.log("    → Delayed: The train is delayed. The time should turn red in the widget. If not, check if 'delay' is a string and convert it to a number in your code.");
            } else if (Number(dep.delay) < 0) {
                console.log("    → Early: The train is early. The time should turn blue in the widget.");
            }
            console.log("-----------------------------");
        });
        if (departures.length > 5) {
            console.log(`...and ${departures.length - 5} more departures.`);
        }
        // General advice
        console.log("\nWhat to do:");
        console.log("- If all delays are 0 or undefined, check for other fields in the data that might indicate delay (e.g., 'departureDelay', 'delayMinutes', 'live').");
        console.log("- If you find another field, update your code to use it instead of 'delay'.");
        console.log("- If you see positive delay values, your code should work. If not, check if the value is a string and convert it to a number before comparing.");
        console.log("- If the departures array is empty, check your station name, parameters, and internet connection.");
    } else {
        console.log("Departures data is not an array:", departures);
        console.log("→ This usually means there was an API or network issue, or the station name is incorrect.");
    }
    console.log("===== End of Debug =====\n");

    // Ensure departures is an array
    if (!Array.isArray(departures)) {
        departures = [];
    }

    // Filter departures according to user preferences (specific lines or platforms)
    departures = departures.filter(entry => {
        const lineMatches = userLines ? userLines.includes(entry.label) : true;
        const platformMatches = userPlatforms ? entry.platform === userPlatforms : true;
        return lineMatches && platformMatches;
    });

    // If no departures, show a message and return the widget
    if (departures.length === 0) {
        const widget = new ListWidget();
        widget.addText(userStation.replace(/^München-/, ''));
        widget.addSpacer(4);
        widget.addText("No departures found");
        return widget;
    }

    // Initialize widget container
    const widget = new ListWidget();
    
    // Apply gradient background
    const gradient = new LinearGradient();
    gradient.colors = [
        new Color(CONFIG.gradients[userGradient].top),
        new Color(CONFIG.gradients[userGradient].bottom)
    ];
    gradient.locations = [0.0, 1.0];
    widget.backgroundGradient = gradient;
    
    // Use default system padding instead of manual values
    widget.useDefaultPadding();

    // Calculate content width based on column sizes and spacing
    const contentWidth = widgetConfig.lineBadgeSize.width + widgetConfig.destinationColumnSize.width + widgetConfig.departureTimeColumnSize.width + 2 * widgetConfig.spacing;

    // Create main vertical stack for all widget content
    const mainStack = widget.addStack();
    mainStack.layoutVertically();
    mainStack.topAlignContent();


    // HEADING - Station Name & Time


    // Create header section with station name
    const headerStack = mainStack.addStack();
    headerStack.layoutVertically();
    headerStack.size = new Size(contentWidth, 0); // Use auto height

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

    // Add space between header and departure information
    mainStack.addSpacer();


    // Add rows for each departure, limited by itemsCount from widget configuration
    for (let i = 0; i < Math.min(widgetConfig.itemsCount, departures.length); i++) {
        // Create horizontal stack for this departure row
        const rowStack = mainStack.addStack();
        rowStack.size = new Size(contentWidth, 0); 
        rowStack.layoutHorizontally();
        rowStack.topAlignContent();


        // LINE NAME

        // Create a container for the line badge with margin
        const lineBadgeContainer = rowStack.addStack();
        lineBadgeContainer.layoutVertically();
        lineBadgeContainer.addSpacer(i === 0 ? 5 : 4); // 5px for first train, 4px for others
        
        // First column: Transport line identification (e.g., S1, U3, Bus 100)
        const lineStack = lineBadgeContainer.addStack();
        lineStack.size = widgetConfig.lineBadgeSize;
        lineStack.centerAlignContent(); // Keep centering the text within the badge

        const lineName = lineStack.addText(departures[i].label);
        const lineColor = getLineColor(departures[i].transportType, departures[i].label);
        
        // Special handling for U7 and U8 lines which have different color schemes
        if (departures[i].label === "U7" || departures[i].label === "U8") {
            lineStack.backgroundColor = new Color(departures[i].label === "U7" ? "#C40C37" : "#F36E31");
            lineName.textColor = new Color(departures[i].label === "U7" ? "#438136" : "#C40C37");
        } else {
            // Use standard MVG colors for all other lines
            lineStack.backgroundColor = new Color(lineColor);
            lineStack.cornerRadius = 4;
            lineName.textColor = Color.white();
        }

        lineName.font = widgetConfig.lineBadgeFont;
        lineName.centerAlignText();
        lineName.minimumScaleFactor = 0.4; // Allow text to shrink if needed

        // Spacing between line and info
        rowStack.addSpacer(8);

        // Create a vertical stack for the time and destination
        const infoStack = rowStack.addStack();
        infoStack.layoutVertically();
        infoStack.spacing = 0; // Increase spacing between time and destination
        

        // DEPARTURE TIME


        // Calculate actual departure time, accounting for delays
        const { recalculatedTime, isDelayed } = calculateDeparture(
            departures[i].delay,
            departures[i].realtimeDepartureTime
        );
        // Subtract CONFIG.subtractMinutes from recalculatedTime
        const adjustedTime = recalculatedTime - (CONFIG.subtractMinutes * 60 * 1000);
        // Time row (no need for a separate horizontal stack)
        const departureTime = infoStack.addText(formatDepartureTime(adjustedTime));
        
        // Make the first train time bigger and bolder
        if (i === 0) {
            departureTime.font = widgetConfig.departurePrimaryFont;
        } else {
            departureTime.font = widgetConfig.departureSecondaryFont;
        }

        if (departures[i].delay > 0) {
            departureTime.textColor = new Color("#DB3B4B"); // Red for delayed
        } else if (departures[i].delay < 0) {
            departureTime.textColor = new Color("#16BAE7"); // Optional: blue for early
        } else {
            departureTime.textColor = Color.white();
        }


        // DESTINATION NAME


        // Destination directly below time, no special alignment needed
        const destinationName = infoStack.addText(departures[i].destination);
        destinationName.font = widgetConfig.destinationFont;
        destinationName.textColor = Color.white();
        destinationName.textOpacity = widgetConfig.destinationOpacity;
        destinationName.lineLimit = 1;
        
        // Add a spacer to push the contents to the left
        rowStack.addSpacer();
        
        // Add vertical spacing between rows
        if (i < Math.min(widgetConfig.itemsCount, departures.length) - 1) {
            mainStack.addSpacer(12); // More space after the first row
        }
    }

    return widget;
}

// Main execution
const widget = await createWidget();

if (!config.runInWidget) {
    const widgetSize = config.widgetFamily || 'large';
    switch(widgetSize) {
        case 'small':
            await widget.presentSmall();
            break;
        case 'large':
            await widget.presentLarge();
            break;
        default:
            await widget.presentMedium();
    }
}

Script.setWidget(widget);
Script.complete();
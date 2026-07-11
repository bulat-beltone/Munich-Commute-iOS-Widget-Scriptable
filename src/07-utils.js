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


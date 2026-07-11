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

// Applies the Find Nearest defaults from Settings unless the widget
// parameter already specified an explicit line/platform filter. Only does
// this once per parameter context (see nearestDefaultsApplied, reset in
// applyParsedWidgetParameters) — otherwise every later widget rebuild in the
// interactive filter menu (e.g. "Show without filters", or manually clearing
// a filter to empty) would have the defaults silently reapplied on top of
// the user's explicit choice, since a cleared filter also parses to null.
function applyNearestDefaultsIfNeeded() {
    if (!nearestMode || nearestDefaultsApplied) return;
    nearestDefaultsApplied = true;

    if (userLines === null && DEFAULT_STATION_LINES) {
        userLines = parseLineFilter(DEFAULT_STATION_LINES);
        console.log(`[INFO]   - Applying default line filter: ${DEFAULT_STATION_LINES}`);
    }
    if (userPlatforms === null && DEFAULT_STATION_PLATFORM) {
        userPlatforms = parsePlatformFilter(DEFAULT_STATION_PLATFORM);
        console.log(`[INFO]   - Applying default platform filter: ${DEFAULT_STATION_PLATFORM}`);
    }
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

    applyNearestDefaultsIfNeeded();

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


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


// ============================================================================
// UI HELPER FUNCTIONS (for wizards)
// ============================================================================

// Presents a simple informational/error alert with a single dismiss button.
async function showMessage(title, message, actionLabel = "OK") {
    const alert = new Alert();
    alert.title = title;
    alert.message = message;
    alert.addAction(actionLabel);
    await alert.presentAlert();
}

// Presents a selection sheet built from an array of { id, label, destructive? }
// actions and returns the chosen action's id, or null when cancelled.
async function presentMenu({ title, message = "", actions, cancelLabel = "Cancel" }) {
    const menu = new Alert();
    menu.title = title;
    menu.message = message;
    actions.forEach(action => {
        if (action.destructive) menu.addDestructiveAction(action.label);
        else menu.addAction(action.label);
    });
    menu.addCancelAction(cancelLabel);

    const selectedIndex = await menu.presentSheet();
    if (selectedIndex === -1) return null;
    return actions[selectedIndex].id;
}

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

// Shared line/platform filter prompts used by the Create and Edit preset wizards.
function askLinesFilter(defaultValue = "") {
    return askText({
        title: "Lines (optional)",
        message: "Filter by specific lines (comma-separated).\nLeave empty to show all lines.",
        placeholder: defaultValue || "S1, S2, U3",
        defaultValue,
        isOptional: true
    });
}

function askPlatformFilter(defaultValue = "") {
    return askText({
        title: "Platform (optional)",
        message: "Filter by platform numbers (comma-separated), e.g. 1, 2.\nLeave empty to show all platforms.",
        placeholder: defaultValue || "1, 2",
        defaultValue,
        isOptional: true
    });
}

// Lets the user pick between a specific, searched-for station and the live
// "nearest station" mode (no station-type filter — matches the default,
// unfiltered behavior of 🔎 Find Nearest Station / the `nearest` parameter).
function askStationMode() {
    return presentMenu({
        title: "Station",
        message: "Search for a specific station, or always track the nearest one to your current location.",
        actions: [
            { id: "search", label: "🔎 Search by Name" },
            { id: "nearest", label: "📍 Nearest (no filter)" }
        ]
    });
}

// Presents the gradient picker. With allowKeepCurrent, adds a "Continue"
// action that keeps defaultGradient unchanged (used by the edit flow);
// without it, there is no such shortcut (used by the create flow).
// Builds the "you could match its color" hint shown above the gradient
// picker. Handles both the single-suggestion case (a specific rail line)
// and the multi-suggestion case (an unrecognized line, where Bus/Regional
// Bus/Tram are all offered as candidates since we can't tell them apart).
function describeGradientSuggestions(suggestions) {
    if (!suggestions.length) return "";

    const lineLabel = suggestions[0].lineLabel;
    if (suggestions.length === 1) {
        return `Since you're only showing ${lineLabel}, you could match its color.`;
    }

    const modeNames = suggestions.map(s => s.label.replace(/^Match /, "")).join(", ");
    return `Since you're only showing ${lineLabel}, you could match its transport color below (${modeNames}).`;
}

// Presents the gradient picker. With allowKeepCurrent, adds a "Continue"
// action that keeps defaultGradient unchanged (used by the edit flow);
// without it, there is no such shortcut (used by the create flow). When
// suggestions are given (see getLineGradientSuggestions), they are listed
// first with a hint explaining why they're suggested.
async function askGradient(defaultGradient = "black", { allowKeepCurrent = false, suggestions = [] } = {}) {
    const suggestionSuffix = allowKeepCurrent ? " (current)" : " (suggested, default)";
    const suggestionActions = suggestions.map(s => ({
        id: s.name,
        label: `${s.emoji} ${s.label}${s.name === defaultGradient ? suggestionSuffix : " (suggested)"}`
    }));

    const highlightSuffix = allowKeepCurrent ? " (current)" : " (default)";
    const gradientActions = AVAILABLE_GRADIENTS.map(g => ({
        id: g.name,
        label: `${g.emoji} ${g.label}${g.name === defaultGradient ? highlightSuffix : ""}`
    }));

    const actions = [...suggestionActions, ...gradientActions];
    if (allowKeepCurrent) actions.push({ id: defaultGradient, label: "Continue" });

    const baseMessage = allowKeepCurrent
        ? "Pick a new widget background color, or keep the current one."
        : "Select the widget background color.";
    const suggestionHint = describeGradientSuggestions(suggestions);

    return presentMenu({
        title: "Choose a color",
        message: suggestionHint ? `${baseMessage} ${suggestionHint}` : baseMessage,
        actions
    });
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

// Looks up stations matching a name via the MVG locations API. Returns the
// matching STATION entries, or null if the request itself failed (as opposed
// to succeeding with zero matches).
async function findStationsByName(stationName) {
    const formattedStation = formatStationName(stationName);
    const url = `https://www.mvg.de/api/bgw-pt/v3/locations?query=${formattedStation}`;
    try {
        const response = await new Request(url).loadJSON();
        return response.filter(entry => entry.type === "STATION");
    } catch (e) {
        console.log(`[ERROR] Failed to search stations: ${e.message}`);
        return null;
    }
}

async function searchAndSelectStation(typedStation) {
    const stations = await findStationsByName(typedStation);

    if (stations === null) {
        await showMessage("Network error", "Could not search for stations. Check your internet connection.");
        return null;
    }

    if (stations.length === 0) {
        await showMessage("No station found", `No station found for "${typedStation}"`);
        return null;
    }

    const shownStations = stations.slice(0, 10);
    const selectedName = await presentMenu({
        title: "Select station",
        message: `Found ${stations.length} match${stations.length > 1 ? 'es' : ''} for "${typedStation}"`,
        actions: shownStations.map(station => ({ id: station.name, label: station.name }))
    });

    return selectedName;
}


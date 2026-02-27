// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: purple; icon-glyph: magic;

const PROFILE_DIRECTORY_NAME = "MunichCommuteWidgetParams";
const AVAILABLE_GRADIENTS = ["grey", "red", "blue", "green", "purple", "teal"];

function formatStationName(station) {
    return station.replace(" ", "&")
        .replace("ß", "ss")
        .replace("ü", "ue")
        .replace("ä", "ae")
        .replace("ö", "oe");
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
        errorAlert.message = `Could not search for stations. Check your internet connection.`;
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

    // Always show selection to confirm the station
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

function sanitizeProfileName(inputName) {
    return (inputName || "")
        .trim()
        .replace(/\.txt$/i, "")
        .replace(/[\\/:*?"<>|]/g, "_");
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

async function askGradient(defaultGradient = "grey") {
    const alert = new Alert();
    alert.title = "Choose a color";
    alert.message = "Select the widget gradient/background color.";

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

async function main() {
    const profileNameInput = await askText({
        title: "Profile name",
        message: "This will become <name>.txt (and widget parameter value).",
        placeholder: "Home"
    });

    if (profileNameInput === null) return;

    const profileName = sanitizeProfileName(profileNameInput);
    if (!profileName) {
        const errorAlert = new Alert();
        errorAlert.title = "Invalid profile name";
        errorAlert.message = "Please use at least one valid character.";
        errorAlert.addAction("OK");
        await errorAlert.presentAlert();
        return;
    }

    const stationInput = await askText({
        title: "Station",
        message: "Example: München-Langwied",
        placeholder: "München-Langwied"
    });
    if (stationInput === null) return;

    const station = await searchAndSelectStation(stationInput);
    if (station === null) return;

    const platform = await askText({
        title: "Platform (optional)",
        message: "Leave empty to include all platforms.",
        placeholder: "1",
        isOptional: true
    });
    if (platform === null) return;

    const lines = await askText({
        title: "Lines (optional)",
        message: "Comma-separated, e.g. S1,S2,U3",
        placeholder: "S1,S2",
        isOptional: true
    });
    if (lines === null) return;

    const gradient = await askGradient();
    if (gradient === null) return;

    const parameterParts = [`station:${station}`];
    if (platform) parameterParts.push(`platform:${platform}`);
    if (lines) parameterParts.push(`lines:${lines}`);
    parameterParts.push(`gradient:${gradient}`);

    const content = parameterParts.join(";");

    const fileManager = FileManager.iCloud();
    const documentsDirectory = fileManager.documentsDirectory();
    const profileDirectory = fileManager.joinPath(documentsDirectory, PROFILE_DIRECTORY_NAME);

    if (!fileManager.fileExists(profileDirectory)) {
        fileManager.createDirectory(profileDirectory, true);
    }

    const profilePath = fileManager.joinPath(profileDirectory, `${profileName}.txt`);
    fileManager.writeString(profilePath, content);

    const successAlert = new Alert();
    successAlert.title = "Profile saved";
    successAlert.message = `Saved to:\n${profilePath}\n\nUse this as widget parameter:\n${profileName}\n\nContent:\n${content}`;
    successAlert.addAction("Done");
    await successAlert.presentAlert();

    QuickLook.present(profilePath);
}

(async () => {
    await main();
})();

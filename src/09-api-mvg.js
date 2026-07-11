// ============================================================================
// MVG API FUNCTIONS
// ============================================================================

async function getStationId(stationName) {
    const stations = await findStationsByName(stationName);
    if (stations === null) return null;

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
    const transportTypes = getEnabledTypeCodes(TRANSPORT_TYPES);

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


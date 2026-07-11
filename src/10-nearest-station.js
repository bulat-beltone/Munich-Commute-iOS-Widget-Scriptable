// ============================================================================
// NEAREST STATION (LIVE LOCATION)
// ============================================================================

// A station matches when its transport types intersect with typeCodes.
// An empty typeCodes list means "no filter" — any station matches.
// The nearby endpoint uses `transportTypes`; the bundled dataset uses `products`.
function stationMatchesTypeCodes(station, typeCodes) {
    if (!typeCodes || typeCodes.length === 0) return true;
    const types = (station && (station.transportTypes || station.products)) || [];
    return Array.isArray(types) && typeCodes.some(code => types.includes(code));
}

// Picks the closest station from a nearby-stations response. In SBAHN mode,
// only S-Bahn stations are considered; in ANY mode, the Station Types default
// from Settings is applied (or no filter at all if none are enabled there).
function pickNearestStation(stations, mode) {
    if (!Array.isArray(stations) || stations.length === 0) return null;

    const typeCodes = mode === NEAREST_MODE.SBAHN
        ? ["SBAHN"]
        : getEnabledTypeCodes(DEFAULT_STATION_TYPES);
    const candidates = stations.filter(station => stationMatchesTypeCodes(station, typeCodes));

    if (candidates.length === 0) return null;

    // The API returns stations sorted by distance, but sort defensively so a
    // change in ordering can never surface a farther station.
    candidates.sort((a, b) =>
        (a.distanceInMeters ?? Infinity) - (b.distanceInMeters ?? Infinity));

    const nearest = candidates[0];
    return {
        name: nearest.name,
        globalId: nearest.globalId,
        distanceInMeters: nearest.distanceInMeters
    };
}

async function getCurrentLocationSafe() {
    try {
        Location.setAccuracyToHundredMeters();
        const location = await Location.current();
        return { latitude: location.latitude, longitude: location.longitude };
    } catch (e) {
        console.log(`[WARN] Could not determine current location: ${e}`);
        return null;
    }
}

function buildNearbyStationsUrl(latitude, longitude) {
    return `https://www.mvg.de/api/bgw-pt/v3/stations/nearby?latitude=${latitude}&longitude=${longitude}`;
}

async function fetchNearbyStations(latitude, longitude) {
    try {
        const stations = await new Request(buildNearbyStationsUrl(latitude, longitude)).loadJSON();
        return Array.isArray(stations) ? stations : [];
    } catch (e) {
        console.log(`[ERROR] Failed to fetch nearby stations: ${e}`);
        return [];
    }
}

function saveNearestCache(mode, station) {
    try {
        const fileManager = FileManager.iCloud();
        const cachePath = fileManager.joinPath(ensureAppDirectory(), NEAREST_CACHE_FILE_NAME);
        let cache = {};
        if (fileManager.fileExists(cachePath)) {
            try {
                cache = JSON.parse(fileManager.readString(cachePath)) || {};
            } catch (e) {
                cache = {};
            }
        }
        cache[mode] = {
            name: station.name,
            globalId: station.globalId,
            timestamp: Date.now()
        };
        fileManager.writeString(cachePath, JSON.stringify(cache, null, 2));
    } catch (e) {
        console.log(`[WARN] Failed to cache nearest station: ${e}`);
    }
}

function loadNearestCache(mode) {
    try {
        const fileManager = FileManager.iCloud();
        const cachePath = fileManager.joinPath(getAppDirectory(), NEAREST_CACHE_FILE_NAME);
        if (!fileManager.fileExists(cachePath)) return null;
        const cache = JSON.parse(fileManager.readString(cachePath));
        const entry = cache && cache[mode];
        if (entry && entry.globalId) {
            return { name: entry.name, globalId: entry.globalId, fromCache: true };
        }
    } catch (e) {
        console.log(`[WARN] Failed to read nearest cache: ${e}`);
    }
    return null;
}

// Resolves the nearest station for the given mode. Tries a live GPS fix first
// and caches the result; if the fix or network call fails (common during
// background widget refresh), it falls back to the most recent cached station.
async function resolveNearestStation(mode) {
    const location = await getCurrentLocationSafe();
    if (location) {
        console.log(`[INFO] Current location: ${location.latitude}, ${location.longitude}`);
        const stations = await fetchNearbyStations(location.latitude, location.longitude);
        const nearest = pickNearestStation(stations, mode);
        if (nearest) {
            console.log(`[INFO] Nearest ${mode} station: ${nearest.name} (${nearest.distanceInMeters}m)`);
            saveNearestCache(mode, nearest);
            return nearest;
        }
        console.log(`[WARN] No matching station found nearby for mode '${mode}'.`);
    }

    const cached = loadNearestCache(mode);
    if (cached) {
        console.log(`[INFO] Falling back to cached nearest ${mode} station: ${cached.name}`);
    }
    return cached;
}


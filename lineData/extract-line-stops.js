#!/usr/bin/env node

// Extract ordered stops for a given transport line from GTFS data.
// Usage: node extract-line-stops.js S3
//        node extract-line-stops.js S4
//        node extract-line-stops.js U6
//
// Output: creates a JSON file in lineData/ folder (e.g. lineData/S3.json)
//
// Data source: MVV OpenData GTFS (gesamt_gtfs folder)
// License: Creative Commons Attribution (cc-by), Münchner Verkehrs- und Tarifverbund GmbH (MVV)

const fs = require("fs");
const path = require("path");

const GTFS_DIR = path.join(__dirname, "MVV GTFS Data", "gesamt_gtfs");
const OUTPUT_DIR = path.join(__dirname, "lineData");

// Simple CSV parser that handles quoted fields
function parseCSV(filePath) {
    let content = fs.readFileSync(filePath, "utf-8");
    // Strip BOM if present, normalize line endings
    if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);
    content = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const lines = content.split("\n").filter(line => line.trim());
    const headers = parseCSVLine(lines[0]);
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length === headers.length) {
            const row = {};
            headers.forEach((h, idx) => row[h] = values[idx]);
            rows.push(row);
        }
    }
    return rows;
}

function parseCSVLine(line) {
    const values = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (inQuotes) {
            if (ch === '"' && line[i + 1] === '"') {
                current += '"';
                i++;
            } else if (ch === '"') {
                inQuotes = false;
            } else {
                current += ch;
            }
        } else {
            if (ch === '"') {
                inQuotes = true;
            } else if (ch === ",") {
                values.push(current);
                current = "";
            } else {
                current += ch;
            }
        }
    }
    values.push(current);
    return values;
}

// Extract parent station ID from a platform-level stop_id
// e.g. "de:09179:6160:22:26" → "de:09179:6160"
function parentStationId(stopId) {
    const parts = stopId.split(":");
    return parts.slice(0, 3).join(":");
}

function main() {
    const lineName = process.argv[2];
    if (!lineName) {
        console.error("Usage: node extract-line-stops.js <LINE_NAME>");
        console.error("Example: node extract-line-stops.js S3");
        process.exit(1);
    }

    console.log(`\nExtracting stops for line: ${lineName}`);
    console.log("=".repeat(50));

    // Step 1: Find the route
    console.log("\n[1/5] Reading routes.txt...");
    const routes = parseCSV(path.join(GTFS_DIR, "routes.txt"));
    const matchingRoutes = routes.filter(
        r => r.route_short_name === lineName && !r.route_long_name.includes("Schienenersatzverkehr")
    );

    if (matchingRoutes.length === 0) {
        // Show all available line names for reference
        const allSEV = routes.filter(r => r.route_long_name.includes("Schienenersatzverkehr"));
        const realRoutes = routes.filter(r => !r.route_long_name.includes("Schienenersatzverkehr"));
        const lineNames = [...new Set(realRoutes.map(r => r.route_short_name))].sort();
        console.error(`\nNo route found for "${lineName}" (excluding replacement bus services).`);
        console.error(`\nAvailable lines: ${lineNames.join(", ")}`);
        process.exit(1);
    }

    const route = matchingRoutes[0];
    console.log(`   Found: ${route.route_id} — "${route.route_long_name}"`);

    if (!route.route_id) {
        console.error("Error: route_id is undefined. CSV parsing issue.");
        process.exit(1);
    }

    // Step 2: Find all trips for this route
    console.log("\n[2/5] Reading trips.txt...");
    const trips = parseCSV(path.join(GTFS_DIR, "trips.txt"));
    const routeTrips = trips.filter(t => t.route_id === route.route_id);
    console.log(`   Found ${routeTrips.length} trips for this route`);

    // Show unique headsigns (destinations)
    const headsigns = [...new Set(routeTrips.map(t => t.trip_headsign))];
    console.log(`   Destinations: ${headsigns.join(", ")}`);

    // Step 3: Read stop_times for all trips of this route, find the longest one
    console.log("\n[3/5] Reading stop_times.txt (this may take a moment)...");
    const allStopTimes = parseCSV(path.join(GTFS_DIR, "stop_times.txt"));

    const tripIds = new Set(routeTrips.map(t => t.trip_id));
    const stopTimesByTrip = {};
    for (const st of allStopTimes) {
        if (tripIds.has(st.trip_id)) {
            if (!stopTimesByTrip[st.trip_id]) stopTimesByTrip[st.trip_id] = [];
            stopTimesByTrip[st.trip_id].push(st);
        }
    }

    // Find the trip with the most stops (= the full-length service)
    let longestTripId = null;
    let maxStops = 0;
    for (const [tripId, stops] of Object.entries(stopTimesByTrip)) {
        if (stops.length > maxStops) {
            maxStops = stops.length;
            longestTripId = tripId;
        }
    }

    console.log(`   Longest trip: ${longestTripId} (${maxStops} stops)`);

    // Sort by stop_sequence
    const tripStops = stopTimesByTrip[longestTripId]
        .sort((a, b) => parseInt(a.stop_sequence) - parseInt(b.stop_sequence));

    // Step 4: Resolve stop names and coordinates
    console.log("\n[4/5] Reading stops.txt...");
    const allStops = parseCSV(path.join(GTFS_DIR, "stops.txt"));

    // Build lookup: stop_id → stop data (only parent stations, location_type = "1")
    const parentStops = {};
    for (const s of allStops) {
        if (s.location_type === "1") {
            parentStops[s.stop_id] = s;
        }
    }

    // Resolve each stop in the trip
    const resolvedStops = [];
    for (const ts of tripStops) {
        const parentId = parentStationId(ts.stop_id);
        const station = parentStops[parentId];
        if (station) {
            // Avoid duplicates (same parent station, different platform)
            if (resolvedStops.length === 0 || resolvedStops[resolvedStops.length - 1].id !== parentId) {
                resolvedStops.push({
                    id: parentId,
                    name: station.stop_name,
                    lat: parseFloat(station.stop_lat),
                    lon: parseFloat(station.stop_lon)
                });
            }
        } else {
            console.warn(`   Warning: Could not resolve stop ${ts.stop_id} (parent: ${parentId})`);
        }
    }

    // Step 5: Output
    console.log("\n[5/5] Writing output...");

    // Find the trip info for the longest trip
    const tripInfo = routeTrips.find(t => t.trip_id === longestTripId);

    const output = {
        line: lineName,
        routeId: route.route_id,
        routeName: route.route_long_name,
        direction: `${resolvedStops[0].name} → ${resolvedStops[resolvedStops.length - 1].name}`,
        stopsCount: resolvedStops.length,
        dataSource: "MVV OpenData GTFS (cc-by), Münchner Verkehrs- und Tarifverbund GmbH (MVV)",
        extractedAt: new Date().toISOString().split("T")[0],
        stops: resolvedStops
    };

    // Create output directory
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const outputPath = path.join(OUTPUT_DIR, `${lineName}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

    console.log(`   Saved to: ${outputPath}`);

    // Print summary
    console.log("\n" + "=".repeat(50));
    console.log(`${lineName}: ${output.direction}`);
    console.log("=".repeat(50));
    resolvedStops.forEach((s, i) => {
        console.log(`  ${String(i + 1).padStart(2)}. ${s.name} (${s.lat}, ${s.lon})`);
    });
    console.log(`\nTotal: ${resolvedStops.length} stops`);
}

main();

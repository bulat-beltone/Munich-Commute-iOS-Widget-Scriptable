# Cursor Chat History

## Default widget parameters (Feb 17, 2026)
**Task:** Add a default parameter string so the widget uses it when no parameters are set in Scriptable.
**Change:** Added `DEFAULT_WIDGET_PARAMETERS = "station:Marienplatz; platform:1; lines:S3, S4"`. When `args.widgetParameter` is empty, this string is parsed instead. Same parsing logic for both. Flow: no params set → widget shows Marienplatz, platform 1, lines S3/S4. Params set → unchanged.

## Laim S3 Filter Problem

### Feb 17, 2026
**Issue:** S3 line doesn't show on Laim station widget even though S3 runs through Laim.  
**User filter:** `station:Laim; lines:S3,S4; platform:1; background: Green;`

**Investigation findings:**
1. **Case-sensitive line matching** — `userLines.includes(entry.label)` did exact match. If API returned label with different casing, it would fail.
2. **Platform type mismatch** — `entry.platform === userPlatforms` used strict equality (`===`). `userPlatforms` was a Number but API may return string. `"1" === 1` → `false` in JS.
3. **Most likely cause** — S3 at Laim may use a different platform than S4. The `platform:1` filter may be hiding S3 if it departs from platform 2.

**Fixes applied (round 1):**
- Added detailed `[FILTER]` logging showing every departure before/after filtering, with label, platform, type info, and KEPT/REJECTED status
- Changed line matching to case-insensitive (`toLowerCase()` comparison)
- Changed platform comparison from `===` to `==` (loose equality) to handle string/number type mismatch

### Feb 17, 2026 (API investigation)
**Root cause found:** Made direct API calls to confirm.

**API test results:**
- MVG API query for "Laim" returns "Berg am Laim" as **first** STATION result
- `getStationId()` used `.find()` → picked "Berg am Laim" (de:09162:910) instead of "Laim" (de:09162:9)
- **Berg am Laim has NO S3** — only S2, S4, S6
- **Laim has S3** — S3 Mammendorf (platform 1), S3 Holzkirchen (platform 3)
- Widget was querying the entirely wrong station!

**Fix applied (round 2):**
- `getStationId()` now prefers exact name match (case-insensitive) over first result
- Falls back to first STATION if no exact match
- Added logging showing matched station name and warning if no exact match found

**Fix applied (round 3):**
- `getStationId()` now returns `{ globalId, name }` instead of just the ID
- `createWidget()` updates `userStation` to the real API-matched name
- Widget header now shows the actual station name from the API, not the user-typed string
- Prevents misleading display when API matches a different station than typed

## Location-aware widget (direction detection)

### Feb 17, 2026
**Goal:** Widget that uses current GPS location to find closest station and show departures in the right direction (toward home).

**Approach:** Create ordered stop lists for S3/S4 from GTFS data. Compare current stop index vs target stop index to determine travel direction, then filter departures accordingly.

**GTFS data extraction:**
- Downloaded MVV OpenData GTFS from mvv-muenchen.de (cc-by license)
- Created `extract-line-stops.js` — reusable script that extracts ordered stops for any line from GTFS data
- Usage: `node extract-line-stops.js S3` (or S4, U6, etc.)
- Joins routes.txt → trips.txt → stop_times.txt → stops.txt, picks longest trip, outputs JSON
- Generated `lineData/S3.json` (31 stops: Mammendorf → Holzkirchen) and `lineData/S4.json` (34 stops: Geltendorf → Ebersberg)
- Shared Stammstrecke: Pasing → Laim → ... → Marienplatz → ... → Ostbahnhof (stops 10-20 in S3, 11-21 in S4)

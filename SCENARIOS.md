# Usage Scenarios

Feature specification and manual QA checklist for pre-publish testing.

Status: ✅ done · ⚠️ partial / known nuance · ❌ not implemented

---

## 1. First Install

**Scenario:** user discovers the widget → downloads Scriptable → copies the script → runs it.

- [ ] Script copied to `iCloud Drive/Scriptable/`
- [ ] First launch (no parameter) opens the main menu
- [ ] Video walkthrough available alongside

**Status:** ⚠️ Video is published with the Reddit post — no in-app button by design. On first launch the user sees the main menu and proceeds to `➕ Create Preset`.

---

## 2. Creating the First Preset

**Scenario:** runs the widget → goes through the wizard → adds the widget to the home screen.

- [ ] `➕ Create Preset`: search for a station → select exact match
- [ ] Line filter (optional)
- [ ] Platform filter (optional)
- [ ] Choose colour (gradient)
- [ ] Preset name → name copied to clipboard
- [ ] Widget preview shown
- [ ] "Add to Home Screen" instructions shown
- [ ] Widget added to home screen with the preset name as the parameter

**Status:** ✅ `createSavedStation` wizard + `getPostCreateInstructions`.

---

## 3. Checking the Widget

**Scenario:** unlocks phone → glances at the widget.

- [ ] Widget shows current departures
- [ ] Tapping the widget opens a full-size view with fresh data

**Status:** ✅ Works.
⚠️ **Apple limitation:** there is a delay before the widget reflects live data — iOS decides when to refresh. Explain this in the video. Departure times themselves indicate freshness (a "last updated HH:MM" label was considered and intentionally omitted).

---

## 4. Adding a New Preset

**Scenario:** searches for a station → selects exact match → sets platform and line filters → picks a colour → saves as a new preset.

- [ ] Search returns stations, shows up to 10 matches
- [ ] Line / platform filters applied
- [ ] Colour (gradient) selected
- [ ] Preset saved to `Munich Commute/<Name>.txt`

**Status:** ✅ `createSavedStation`.

---

## 5. Finding the Nearest Station

**Scenario:** enables location → finds nearby stations → selects one to check departures when away from their usual spot.

- [ ] Location requested; access denied handled gracefully
- [ ] List of nearby stations with distance
- [ ] Filter menu: Line / Platform / Show / Save as Preset / (Show without filters)
- [ ] `▶️ Show` → preview → closing returns to the menu (adjust filters and show again)
- [ ] `💾 Save as Preset` → pick colour → name → saves the station as a preset
- [ ] `Cancel` → exits when done
- [ ] `Show without filters` previews everything but does not clear configured defaults

**Status:** ✅ `findNearestStation` (looped menu + optional save). The feature goal is "quick look at what's nearby"; saving is optional with no nagging prompts.

---

## 5a. Finding the Nearest S-Bahn

**Scenario:** user only cares about the S-Bahn and wants the closest S-Bahn station, not the closest bus/tram stop.

- [ ] `🚈 Find Nearest S-Bahn` filters the nearby list to stations served by the S-Bahn
- [ ] Graceful message when no S-Bahn station is nearby
- [ ] `📍 Use live location in widget` copies the `nearest-sbahn` token and shows setup instructions
- [ ] Running the flow primes the nearest-station cache used by the widget

**Status:** ✅ `findNearestStation({ sbahnOnly: true })` reusing the shared preview loop.

---

## 5b. Live-location Widget (`nearest` / `nearest-sbahn`)

**Scenario:** user sets the widget parameter to `nearest` or `nearest-sbahn` so it always tracks the closest station to their current location.

- [ ] `nearest` resolves the closest station of any type
- [ ] `nearest-sbahn` resolves the closest station whose transport types include `SBAHN`
- [ ] Live GPS fix is used when available and the result is cached
- [ ] When iOS denies a background GPS fix, the widget falls back to the cached station instead of erroring
- [ ] With neither location nor cache, a styled "location unavailable" screen is shown
- [ ] Station Defaults (Line / Platform) from Settings are applied automatically; explicit `lines:`/`platform:` in the parameter override them
- [ ] Header uses a 📍 location icon and the title reads "Nearest: [station]"

**Status:** ✅ `resolveNearestStation` + `NearestCache.json`. S-Bahn detection uses the nearby endpoint's `transportTypes` (falls back to `products` for the bundled dataset).

---

## 6. Checking Departures with Delays

**Scenario:** the next departure is delayed; the widget should just show the actual (real-time) arrival time, not the planned/delayed split.

- [ ] Time shown is always the actual/real-time arrival, in white, whether delayed or not
- [ ] No separate planned-time / red-delay-minutes display
- [ ] Line, destination, and platform remain readable

**Status:** ✅ Implemented in `createWidget` — always renders `formatDepartureTime(adjustedTime)` (derived from `realtimeDepartureTime`, falling back to `plannedDepartureTime + delayInMinutes`) in white, regardless of `delayInMinutes`.

---

## 6a. Checking Cancelled Departures

**Scenario:** the next matching departure is cancelled; it should remain visible so the user understands why the expected train is not active.

- [ ] Cancelled departure row remains in the list
- [ ] Line badge, time, and destination text all appear dimmed (~30% opacity) on the gradient background
- [ ] Line badge background turns a subtle translucent white instead of the active line color
- [ ] A small ❌ mark appears next to the time to make the cancellation obvious at a glance

**Status:** ✅ Implemented via `getDepartureVisualState`, `addCancelledDepartureMark`, and the shared row-rendering helpers.

---

## 6b. Previewing with Fixture Data (`test:`)

**Scenario:** a developer wants to check how a specific delay/cancellation/layout combination renders without depending on live API data or being physically near a station.

- [ ] `test:<file>.json` loads fixture departures from `Munich Commute/TestData/<file>.json` (or `TestData/<file>.json`)
- [ ] Live station lookup and MVG API calls are skipped entirely
- [ ] Missing/invalid test data file shows a styled "Test data not found" screen
- [ ] Combining `test:` with `nearest` / `nearest-sbahn` still renders the live-location header, but skips GPS/network entirely
- [ ] The **✏️ Edit Preset** flow can set/clear a preset's test data file

**Status:** ✅ `loadTestDataFile` + `buildDeparturesFromScenario`.

---

## 6c. Long Destination Names & the Platform Badge

**Scenario:** each departure row renders as a 2x2 grid — line badge and time on top, platform badge and destination underneath — and both the destination and the platform badge should be readable without the destination font shrinking illegibly.

- [ ] Long destination names are truncated with an ellipsis (`…`), not shrunk to a smaller font
- [ ] The destination is left-aligned underneath the time, and vertically centered against the platform badge
- [ ] A small rounded, translucent-white platform badge appears directly under the line badge (right-aligned within a column the same width as the line badge) when the departure has platform info
- [ ] The badge is hidden only when the active platform filter narrows to exactly **one** platform (any other case — no filter, or a filter covering multiple platforms — still shows it)
- [ ] The badge dims along with the rest of the row when the departure is cancelled
- [ ] All colors, opacities, and sizes for the row (line badge, time, platform badge, destination, cancelled styling) come from `WIDGET_CONFIG` and can be tweaked there without touching layout logic

**Status:** ✅ `addDepartureRowContent` (2x2 grid layout), `addDepartureDestination` (no `minimumScaleFactor`, so iOS falls back to tail-truncation), `addPlatformBadge`, `shouldShowPlatformBadge`.

---

## 7. Editing an Existing Preset

**Scenario:** changes station name, platform filter, or line filter without recreating the configuration from scratch.

- [ ] `✏️ Edit Preset`: select a preset
- [ ] Edit individual fields (station, lines, platform, gradient, test data, name)
- [ ] Duplicate name protection
- [ ] Preview shown after saving

**Status:** ✅ `editSavedStation`.

---

## 8. Deleting a Preset

**Scenario:** removes a preset that's no longer needed.

- [ ] `✏️ Edit Preset`: select a preset → tap the destructive `🗑️ Delete Preset` action in the edit menu → confirm → file removed
- [ ] Cancelling the confirmation keeps the preset intact

**Status:** ✅ `confirmAndDeletePreset`, invoked from within the Edit Preset flow (there is no separate top-level "Delete Preset" menu item).

---

## 8a. Previewing a Preset at a Specific Size (`size:`)

**Scenario:** checking how a saved preset looks as a medium or small widget without adding it to the home screen at that size.

- [ ] `👀 View Preset` respects a `size:` / `widget:` / `widgetsize:` override (`small`/`s`, `medium`/`m`, `large`/`l`) if present in the preset
- [ ] Without an override, the preview defaults to large size
- [ ] The override only affects the in-app preview, not the actual home-screen widget

**Status:** ✅ `normalizeWidgetSize` + `getPreviewWidgetSize` + `presentWidgetPreview`, used by `viewSavedStation`.

---

## 9. Settings

- [ ] Transport types (S-Bahn, U-Bahn, Bus, Tram, etc.) — toggle
- [ ] Default filters for Find Nearest
- [ ] Subtract Minutes + `-N` indicator

**Status:** ✅ `showSettings`.

---

## Edge Cases

- [x] Station not found → styled error screen (icon + station name)
- [x] No departures (filters too strict) → styled error screen with station and active filters in the title
- [x] No internet → alert in the wizard flows
- [x] Unknown preset name in widget parameter → "Preset not found" screen with the preset name

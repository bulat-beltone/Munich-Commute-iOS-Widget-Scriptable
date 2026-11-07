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

- [ ] `➕ Create Preset`: choose **🔎 Search by Name** or **📍 Find Nearest**
- [ ] Search by Name: search for a station → select exact match
- [ ] Find Nearest: location requested → list of nearby stations with distance shown → user picks one (never auto-picked)
- [ ] Line filter (optional)
- [ ] Platform filter (optional)
- [ ] Choose colour (gradient)
- [ ] Filtering to a single S-Bahn or U-Bahn line (e.g. `S3`, `U3`) surfaces a "Match <line>" suggested gradient built from that line's own color
- [ ] Filtering to `U7` or `U8` surfaces no line-match suggestion (two-color badge, no single hue)
- [ ] Filtering to any other single line (e.g. a bus/tram route number) surfaces all three surface-transport suggestions (Match Bus / Match Regional Bus / Match Tram), since this app doesn't track a color per bus/tram route
- [ ] Preset name → name copied to clipboard
- [ ] Widget preview shown
- [ ] "Add to Home Screen" instructions shown
- [ ] Widget added to home screen with the preset name as the parameter

**Status:** ✅ `createSavedStation` wizard + `getPostCreateInstructions`. Line-matched gradient suggestions via `getLineGradientSuggestions` (S-Bahn, U-Bahn except U7/U8, and Bus/Regional Bus/Tram). The station step offers **🔎 Search by Name** and **📍 Find Nearest** (via `askStationMode` + `pickNearbyStationByLocation`, shared with `🔎 Find Nearest Station`) — either way the result is a fixed station, never a live-location mode. The live-location modes are covered by the built-in "Nearest" / "Nearest S-Bahn" presets instead (see 5a).

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

## 5a. Built-in "Nearest" Presets (replaces the old Station Types Settings default)

**Scenario:** a first-time user should get the live-location "nearest station" feature without knowing the `nearest` widget-parameter syntax, and without going through a dedicated wizard step. Previously, **➕ Create Preset** offered a **📍 Nearest (no filter)** station option, but it silently re-applied the (then-existing) Station Types Settings default — so "no filter" wasn't actually true, and there was no way to preview/choose among nearby stations the way `🔎 Find Nearest Station` does. That Settings default has been removed; two ready-made presets take its place as the discoverable entry point for live-location tracking. (The Create/Edit Preset wizard's own "find a nearby station" option was reinstated separately — see 5d — but it resolves to a fixed station via a real list, not a live-location mode.)

- [ ] On first launch of the interactive menu, two presets exist automatically: `Nearest` and `Nearest S-Bahn` — visible immediately in **👀 View Preset** / **✏️ Edit Preset**, no user action required
- [ ] `Nearest` contains the bare `nearest` token, no Type filter — truly unfiltered, any nearby station
- [ ] `Nearest S-Bahn` contains `nearest; types: SBAHN` — the same unified live-location mode as `Nearest`, just with its Type filter set to S-Bahn only (not a separate hardcoded preset/mode)
- [ ] Both are freely editable like any other preset: Lines / Platform / Gradient / Type / Name can all be changed via **✏️ Edit Preset**
- [ ] Deleting one via **🗑️ Delete Preset** does not bring it back on a later launch (guarded by `defaultPresetsSeeded` in `Settings.json`, set once ever)
- [ ] **⚙️ Settings → Station Defaults** no longer has a `🚉 Station Types` entry; only **Lines** / **Platform** remain
- [ ] `🔎 Find Nearest Station` and the `nearest` live-location token always search **any** nearby station, unfiltered (no Settings-level type restriction exists any more)

**Status:** ✅ `ensureDefaultPresets`, `DEFAULT_PRESET_DEFINITIONS`, `DEFAULT_PRESETS_SEEDED`. `DEFAULT_STATION_TYPES` and `showSettingsStationTypes` have been removed.

---

## 5b. Live-location Widget (`nearest`, optionally with a `types:` filter)

**Scenario:** user sets the widget parameter to `nearest` (optionally with `types:`) so it always tracks the closest station to their current location — either directly (via the built-in `Nearest` / `Nearest S-Bahn` presets, see 5a) or by hand-editing a preset file / widget parameter. There is only **one** live-location mode; "S-Bahn only" is just that mode with its Type filter set to `["SBAHN"]`, not a separate hardcoded mode.

- [ ] `nearest` resolves the closest station of **any** type by default, or restricted by an optional `types:` filter (see 5e), e.g. `nearest; types: SBAHN` for S-Bahn-only
- [ ] Live GPS fix is used when available and the result is cached
- [ ] When iOS denies a background GPS fix, the widget falls back to the cached station (for that same Type filter) instead of erroring
- [ ] With neither location nor cache, a styled "location unavailable" screen is shown
- [ ] Station Defaults (Line / Platform) from Settings are applied automatically; explicit `lines:`/`platform:` in the parameter override them
- [ ] Header uses a 📍 location icon and the title reads "Nearest: [station]"
- [ ] **Backward compatibility:** the legacy `nearest-sbahn` / `nearest-s-bahn` tokens are still parsed correctly, resolving to `nearest` plus an implicit S-Bahn Type filter (`NEAREST_TOKEN_TYPES`) — but are never written by the app any more; a later explicit `types:` in the same parameter string overrides the implicit filter

**Status:** ✅ `resolveNearestStation` + `NearestCache.json`. S-Bahn detection uses the nearby endpoint's `transportTypes` (falls back to `products` for the bundled dataset).

---

## 5c. Editing a Live-location Preset's Station Field

**Scenario:** a user opens **✏️ Edit Preset** on the built-in `Nearest` or `Nearest S-Bahn` preset (or any other `nearest` preset) and taps the **Station** field.

- [ ] `✏️ Edit Preset` shows `🚉 Station: 📍 Nearest` for any live-location preset, regardless of its Type filter (the filter itself is shown separately in the **🌐 Type** row — see 5e)
- [ ] Tapping **Station** offers the same **🔎 Search by Name** / **📍 Find Nearest** choice as Create Preset (there is no "keep live-location mode" branch any more) and converts the preset to whichever fixed station results, leaving live-location mode (and its Type filter) behind
- [ ] The rest of the fields (Lines / Platform / Gradient / Name) behave the same as for a regular station preset

**Status:** ✅ `getNearestModeStationLabel`, `buildPresetParameterString`, wired into `editSavedStation`.

---

## 5d. "📍 Find Nearest" in Create/Edit Preset (reinstated, but resolves via a real list)

**Scenario:** a user creating or editing a preset wants to pick a nearby station without typing its name, the same way **🔎 Find Nearest Station** works — see a list of nearby stations with distances, and choose one. This option previously existed as **📍 Nearest (no filter)**, but that version auto-picked a station via live GPS resolution on every widget refresh (and silently applied the — now removed — Station Types Settings default); it was removed and reinstated as this simpler, list-based picker that resolves to one fixed station at creation/edit time.

- [ ] `➕ Create Preset` → Station step offers **🔎 Search by Name** and **📍 Find Nearest**
- [ ] Choosing **📍 Find Nearest** requests location, fetches nearby stations, and shows a list with distances — same list/UX as `🔎 Find Nearest Station`
- [ ] Selecting a station from that list uses it as a normal, fixed preset station (no `nearest` token is written)
- [ ] Location error / network error / no nearby stations / cancelling the list are all handled gracefully — none of them fall back to auto-picking a station
- [ ] Lines / Platform / Gradient / Name steps behave the same as for a regular, searched-for station preset
- [ ] `✏️ Edit Preset` → **Station** field offers the same **🔎 Search by Name** / **📍 Find Nearest** choice
- [ ] The same nearby-station picker (and its GPS-cache-priming side effect for the `nearest` live-location token) is shared between this wizard option and `🔎 Find Nearest Station`, so behavior is identical between the two

**Status:** ✅ `askStationMode`, `pickNearbyStationByLocation`, wired into `createSavedStation`, `editSavedStation`, and `findNearestStation`.

---

## 5e. Per-preset Type Filter for "Nearest" — unified, single live-location mode

**Scenario:** a user editing any `nearest` preset (including the built-in `Nearest S-Bahn`) wants to restrict which nearby station types it considers — e.g. keep S-Bahn only, or U-Bahn + Tram — without hand-editing the preset file. There is a single, unified live-location mode; "S-Bahn only" is just this generic Type filter set to `["SBAHN"]`, not a separate hardcoded mode/preset. This means `Nearest S-Bahn` is edited through the exact same Type editor as `Nearest`, and any other type combination (e.g. "U-Bahn + Tram only") is equally supported without needing a dedicated preset for it.

- [ ] `✏️ Edit Preset` on **any** `nearest` preset (including `Nearest S-Bahn`) shows a `🌐 Type: <summary>` action (e.g. `any`, `S-Bahn`, `S-Bahn, Tram`)
- [ ] This action is **not** shown for a regular, fixed-station preset
- [ ] Tapping **Type** opens a toggle list (S-Bahn, U-Bahn, Bus, Regional Bus, Tram, Train) with a ✅/❌ indicator per type and a `← Back` action; leaving everything unchecked means "any type" (no filter)
- [ ] Saving persists the filter as `types: <CODES>` in the preset file, alongside the bare `nearest` token (e.g. `nearest; types: SBAHN,TRAM; gradient: black`) — the preset is never written with a `nearest-sbahn` token, even when its Type filter is exactly `["SBAHN"]`
- [ ] Switching the preset's **Station** field away from live-location mode (to a fixed station via Search/Find Nearest) clears the Type filter, since it no longer applies
- [ ] The live-location widget honors the filter: with it set, `nearest` only considers nearby stations matching those types; with it empty, behavior is unchanged (any nearby station)
- [ ] The GPS-unavailable fallback cache is keyed per Type filter, so two differently-filtered `nearest` presets never overwrite each other's cached fallback station; an unfiltered `nearest` keeps the original `"any"` cache key for backward compatibility
- [ ] Editing `Nearest S-Bahn`'s Type filter to something else (or back to unfiltered) works exactly like editing any other `nearest` preset's Type filter — there is no special-cased "S-Bahn mode" left anywhere in the code

**Status:** ✅ `askNearestTypesFilter`, `codesToTypesConfig`, `getNearestTypesSummaryLabel`, `getNearestCacheKey`, wired into `editSavedStation`, `pickNearestStation`, `resolveNearestStation`, and `buildPresetParameterString`/`parseWidgetParameters` (`types:` parameter). `NEAREST_MODE` now has a single `ANY` value; legacy `nearest-sbahn`/`nearest-s-bahn` parsing is preserved via `NEAREST_TOKEN_TYPES` for backward compatibility only.

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

**Scenario:** a departure has a long destination name and/or a platform, and both should be readable without the destination font shrinking illegibly.

- [ ] Long destination names are truncated with an ellipsis (`…`), not shrunk to a smaller font
- [ ] A small rounded, translucent-white platform badge appears at the right edge of the row when the departure has platform info
- [ ] The badge is hidden only when the active platform filter narrows to exactly **one** platform (any other case — no filter, or a filter covering multiple platforms — still shows it)
- [ ] The badge dims along with the rest of the row when the departure is cancelled

**Status:** ✅ `addDepartureDestination` (no `minimumScaleFactor`, so iOS falls back to tail-truncation), `addPlatformBadge`, `shouldShowPlatformBadge`.

---

## 7. Editing an Existing Preset

**Scenario:** changes station name, platform filter, or line filter without recreating the configuration from scratch.

- [ ] `✏️ Edit Preset`: select a preset
- [ ] Edit individual fields (station, lines, platform, gradient, test data, name)
- [ ] Editing the gradient reflects the current line filter — if it narrows to a single line, the matching suggestion(s) appear (marked "(current)" if that gradient is already saved)
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

- [ ] Station Defaults (Lines / Platform) for Find Nearest / Create Preset
- [ ] Subtract Minutes + `-N` indicator
- [ ] No global Transport Types toggle — per-preset type filtering for `nearest`-mode presets lives in **✏️ Edit Preset → 🌐 Type** instead (see 5e)

**Status:** ✅ `showSettings`.

---

## Edge Cases

- [x] Station not found → styled error screen (icon + station name)
- [x] No departures (filters too strict) → styled error screen with station and active filters in the title
- [x] No internet → alert in the wizard flows
- [x] Unknown preset name in widget parameter → "Preset not found" screen with the preset name

# Task History

## Nearest station as built-in presets

### 2026-07-11
- User reported that choosing "📍 Nearest (no filter)" in the ➕ Create Preset wizard didn't really behave as "no filter" — it silently auto-selected a station because it still applied the (now-removed) Station Types default from Settings, and there was no way to preview/choose among nearby stations the way 🔎 Find Nearest Station does.
- User also noted the `nearest` / `nearest-sbahn` live-location widget parameter wasn't discoverable anywhere in the app UI.
- Decision: turn the two live-location modes into built-in presets ("Nearest" = `nearest`, no filter; "Nearest S-Bahn" = `nearest-sbahn`, since S-Bahn is the natural "filtered nearest" default and needs no arbitrary line guessing) that are created automatically the first time the app runs, so they show up in 👀 View Preset / ✏️ Edit Preset immediately. Removed the "📍 Nearest (no filter)" option from the ➕ Create Preset / ✏️ Edit Preset station picker (editing Station now always searches by name), and removed the Station Types Settings default entirely since it existed only to support that removed wizard option and `Find Nearest Station`'s type filter (which now always searches unfiltered).
- Implemented `ensureDefaultPresets` (guarded by a persisted `defaultPresetsSeeded` flag so deleted defaults don't reappear), removed `askStationMode`/`DEFAULT_STATION_TYPES`/`showSettingsStationTypes`, added `getNearestModeStationLabel` for correct ANY vs S-Bahn labeling in Edit Preset, and updated README/SCENARIOS docs plus regression tests.

### 2026-07-11 (follow-up)
- User liked the "Find Nearest" option in Create Preset and asked to bring it back, but fixed: it should show a list of nearby stations and let the user pick, not auto-choose one.
- Reinstated `askStationMode` (relabeled "📍 Find Nearest" instead of the old, misleading "📍 Nearest (no filter)") in both Create Preset and Edit Preset's Station field. Extracted the nearby-station lookup/list/selection logic out of `findNearestStation` into a shared `pickNearbyStationByLocation` helper so the wizard option and the standalone 🔎 Find Nearest Station flow behave identically (real list, real choice, graceful handling of location/network failures — never an automatic pick).
- Crucially, this "Find Nearest" wizard option resolves to a concrete, fixed station (like search-by-name) — it does not create a live-location `nearest`/`nearest-sbahn` preset. That dynamic, always-tracking behavior remains exclusively the built-in `Nearest` / `Nearest S-Bahn` presets from the earlier change.

### 2026-07-11 (follow-up 2)
- User initially suspected the type filtering on "Nearest S-Bahn" wasn't working, then retracted it ("No, my bad, it works 👌 Don't edit preset nearest S-Bahn") — confirmed `NEAREST_MODE.SBAHN`'s hardcoded S-Bahn-only filtering in `pickNearestStation` was correct all along; left it completely untouched per the user's explicit request.
- Follow-up ask: if a preset's Station is the (unfiltered) "Nearest" live-location mode, ✏️ Edit Preset should offer a way to restrict/keep-only certain types from the UI — there was no way to do this after the Station Types Settings default was removed.
- Added a generic, per-preset `types:` widget parameter (comma-separated MVG type codes, e.g. `nearest; types: SBAHN,TRAM`) that only applies to `NEAREST_MODE.ANY`. Added a `🌐 Type` action to ✏️ Edit Preset, shown only for ANY-mode presets — never for `Nearest S-Bahn` (SBAHN mode always hardcodes S-Bahn-only, untouched) or regular fixed-station presets. `askNearestTypesFilter` presents a toggle list (S-Bahn/U-Bahn/Bus/Regional Bus/Tram/Train), mirroring the removed Settings-level Station Types toggle but scoped to one preset.
- `pickNearestStation` gained an optional third `explicitTypeCodes` argument, used only in ANY mode; SBAHN mode ignores it entirely, preserving "Nearest S-Bahn" exactly as-is. `resolveNearestStation` now also derives a cache key via new `getNearestCacheKey` (SBAHN stays `"sbahn"`, ANY stays `"any"` unless a Type filter is set, in which case it gets its own `"any:<sorted codes>"` slot) so two differently-filtered `nearest` presets never clobber each other's GPS-unavailable fallback.
- Editing a preset's Station field away from live-location mode now also clears its Type filter, since it no longer applies to a fixed station. Updated README/SCENARIOS docs and added regression tests (parsing/serialization, filtering behavior, cache-key isolation, the toggle-editor UI, and the Edit Preset menu gating).

## Cancelled train rendering

### 2026-06-30
- User reported cancelled S3 departures can appear active in the Munich commute widget.
- Live MVG departure data includes `cancelled`, plus related fields such as `infos`, `messages`, `platformChanged`, `sev`, `realtime`, and `occupancy`.
- Decision: keep cancelled departures visible because space is limited, but make them visually inactive by dimming the time and line badge/label with gray/opacity instead of adding text.
- Implemented compact cancelled-departure styling: translucent gray line badge, dimmed line text, and dimmed departure time. Added a regression test and documented the behavior.

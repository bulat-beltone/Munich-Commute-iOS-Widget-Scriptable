# Task History

## Nearest station as built-in presets

### 2026-07-11
- User reported that choosing "📍 Nearest (no filter)" in the ➕ Create Preset wizard didn't really behave as "no filter" — it silently auto-selected a station because it still applied the (now-removed) Station Types default from Settings, and there was no way to preview/choose among nearby stations the way 🔎 Find Nearest Station does.
- User also noted the `nearest` / `nearest-sbahn` live-location widget parameter wasn't discoverable anywhere in the app UI.
- Decision: turn the two live-location modes into built-in presets ("Nearest" = `nearest`, no filter; "Nearest S-Bahn" = `nearest-sbahn`, since S-Bahn is the natural "filtered nearest" default and needs no arbitrary line guessing) that are created automatically the first time the app runs, so they show up in 👀 View Preset / ✏️ Edit Preset immediately. Removed the "📍 Nearest (no filter)" option from the ➕ Create Preset / ✏️ Edit Preset station picker (editing Station now always searches by name), and removed the Station Types Settings default entirely since it existed only to support that removed wizard option and `Find Nearest Station`'s type filter (which now always searches unfiltered).
- Implemented `ensureDefaultPresets` (guarded by a persisted `defaultPresetsSeeded` flag so deleted defaults don't reappear), removed `askStationMode`/`DEFAULT_STATION_TYPES`/`showSettingsStationTypes`, added `getNearestModeStationLabel` for correct ANY vs S-Bahn labeling in Edit Preset, and updated README/SCENARIOS docs plus regression tests.

## Cancelled train rendering

### 2026-06-30
- User reported cancelled S3 departures can appear active in the Munich commute widget.
- Live MVG departure data includes `cancelled`, plus related fields such as `infos`, `messages`, `platformChanged`, `sev`, `realtime`, and `occupancy`.
- Decision: keep cancelled departures visible because space is limited, but make them visually inactive by dimming the time and line badge/label with gray/opacity instead of adding text.
- Implemented compact cancelled-departure styling: translucent gray line badge, dimmed line text, and dimmed departure time. Added a regression test and documented the behavior.

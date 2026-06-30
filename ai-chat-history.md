# Task History

## Cancelled train rendering

### 2026-06-30
- User reported cancelled S3 departures can appear active in the Munich commute widget.
- Live MVG departure data includes `cancelled`, plus related fields such as `infos`, `messages`, `platformChanged`, `sev`, `realtime`, and `occupancy`.
- Decision: keep cancelled departures visible because space is limited, but make them visually inactive by dimming the time and line badge/label with gray/opacity instead of adding text.
- Implemented compact cancelled-departure styling: gray line badge, dimmed line text, and dimmed departure time. Added a regression test and documented the behavior.

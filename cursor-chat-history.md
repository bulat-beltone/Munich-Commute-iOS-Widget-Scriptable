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

**Fixes applied:**
- Added detailed `[FILTER]` logging showing every departure before/after filtering, with label, platform, type info, and KEPT/REJECTED status
- Changed line matching to case-insensitive (`toLowerCase()` comparison)
- Changed platform comparison from `===` to `==` (loose equality) to handle string/number type mismatch
- User needs to run widget and check Scriptable console logs to confirm which issue it is

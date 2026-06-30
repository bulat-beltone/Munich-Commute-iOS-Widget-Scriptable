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

## 6. Checking Departures with Delays

**Scenario:** the next departure is delayed; the delay should be shown clearly without losing readability of the time, line, and destination.

- [ ] Planned departure time shown in white
- [ ] Delayed minutes shown in red
- [ ] Line, destination, and platform remain readable

**Status:** ✅ Implemented in `createWidget` (`delayInMinutes > 0` branch).

---

## 6a. Checking Cancelled Departures

**Scenario:** the next matching departure is cancelled; it should remain visible so the user understands why the expected train is not active.

- [ ] Cancelled departure row remains in the list
- [ ] Departure time appears dimmed/gray on the gradient background
- [ ] Line badge appears gray instead of active line color
- [ ] No extra cancellation text is added, preserving widget space

**Status:** ✅ Implemented via `getDepartureVisualState` and row rendering opacity/color.

---

## 7. Editing an Existing Preset

**Scenario:** changes station name, platform filter, or line filter without recreating the configuration from scratch.

- [ ] `✏️ Edit Preset`: select a preset
- [ ] Edit individual fields (station, lines, platform, gradient, name)
- [ ] Duplicate name protection
- [ ] Preview shown after saving

**Status:** ✅ `editSavedStation`.

---

## 8. Deleting a Preset

- [ ] `🗑️ Delete Preset`: select → confirm → file removed

**Status:** ✅ `deleteSavedStation`.

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

# Munich Commute iOS Widget

A widget for iOS that displays real-time Munich public transport departures.
Works based on Scriptable app.

## Features

- **Filtering** by transport types or platform
- **All transport types** supported (S-Bahn, U-Bahn, Bus, Tram, Regional trains)
- **Nearest station in the widget** — a widget that always tracks the closest station (or closest **S-Bahn**) to your current location
- **Real-time departures** using official MVV API
- **Actual arrival time** always shown in white — delayed and on-time departures use the same simple display
- **Platform badge** — a small rounded, translucent-white square shows which platform each departure uses; hidden only when your filter already narrows things down to a single platform
- **Cancelled departures** remain visible with a subtle ❌ mark, dimmed line badge, time, and destination text
- **Test data preview** — preview any widget size with fixture departures, without hitting the live API
- **Customizable colors**, including a **suggested line-matched color** when a preset filters down to a single S-Bahn line (e.g. filtering to just `S3` suggests a gradient built from S3's own color). U-Bahn, Bus, and Tram are planned for a future update.

Color options:
- grey
- red
- blue
- green
- purple
- teal
- one line-matched gradient per S-Bahn line (`s1`, `s2`, `s3`, `s4`, `s5`, `s6`, `s7`, `s8`, `s20`) — suggested automatically, or selectable manually

## Installation

1. Download the [Scriptable app](https://apps.apple.com/app/scriptable/id1405459188) from the App Store
2. Copy the contents of `Munich Commute Widget.js` to a new script in Scriptable
3. Add the script as a widget to your home screen

> **File location:** Scriptable scripts are usually stored in iCloud Drive → **Scriptable** folder (`iCloud Drive/Scriptable/`). You can open this folder in the Files app to copy the script directly.

## Usage

### In-App Menu

When you open `Munich Commute Widget.js` in Scriptable, you'll see a menu with these options:

| Action | Description |
|--------|-------------|
| 🔎 Find Nearest Station | Show departures for the nearest station using GPS (respects the **Station Types** default in Settings, if configured) |
| ➕ Create Preset | Save a station configuration to a file for use as a widget |
| 👀 View Preset | Preview a preset as a widget (at its saved size, or an overridden size) |
| ✏️ Edit Preset | Edit a preset's configuration, or delete it |
| ℹ️ How to Add Widget | Step-by-step widget setup instructions |
| ⚙️ Settings | Configure transport types, timing, and defaults |

> Deleting a preset is done from **✏️ Edit Preset** — select the preset, then tap the destructive **🗑️ Delete Preset** action in the edit menu.

#### ➕ Create Preset
A wizard to create a reusable station configuration:

1. **Station** — Search and select from MVG stations
2. **Lines** (optional) — Filter by specific lines (e.g., S1, S2, U3)
3. **Platform** (optional) — Filter by platform number
4. **Color** — Choose a background gradient
5. **Preset name** — A short name like "Home" or "Work"

After saving:
- The preset name is **copied to your clipboard**
- A "Add to Home Screen" screen appears with setup instructions
- The preset is saved to `Munich Commute/<PresetName>.txt` inside the Scriptable iCloud folder

#### ✏️ Edit Preset
Select an existing preset to change any of its fields, or delete it:

- **Station**, **Lines**, **Platform**, **Gradient**, **Name** — same as in Create Preset
- **Test data** (optional) — point at a JSON file in `Munich Commute/TestData/` to preview the widget with fixed fixture departures instead of live API data (see [Test data preview](#-test-data-preview) below)
- **🗑️ Delete Preset** — a destructive action in the same menu; confirms before permanently removing the preset file

Saving shows a live large-size preview of the updated preset.

#### 👀 View Preset
Select a preset to preview it as a widget. By default this opens at large size, but if the preset (or the widget parameter you're previewing) includes a `size:` / `widget:` / `widgetsize:` override, that size is used instead — handy for checking how a preset looks as a medium or small widget without changing your home screen.

#### 🔎 Find Nearest Station
Shows live departures for a nearby station without saving anything:

1. Your location is used to find stations within range
   - If a **Station Types** default is configured in Settings (⚙️ Settings → Station Defaults → 🚉 Station Types), the list is restricted to those types (e.g. S-Bahn only). Leave it unset to search any nearby station.
2. Select a station from the list
3. The widget preview opens immediately with live departures (using any saved Line/Platform defaults from Settings)
4. Once you close the preview, a filter/action menu appears:
   - **🛤 Platform** is listed first — not every station numbers its platforms the same way, so pinning down the right platform/direction first is usually the fastest way to get to the trains you actually want
   - **🚆 Line**, **💾 Save as Preset**, and **▶️ Show** (re-preview after changing filters) follow
   - If defaults are configured in Settings, a **Show without filters** option also appears

Tapping a live-location widget (see below) on your Home Screen follows the same pattern: the preview opens first, and the same filter/action menu (Platform first) appears once you close it.

Running either flow once also grants location permission and primes the cache used by the live-location widget parameter (see below).

#### 📍 Nearest station widget (live location)
Instead of a fixed station, you can set the widget **Parameter** to a live-location token so the widget always shows the closest station to wherever you are:

| Parameter | Behaviour |
|-----------|-----------|
| `nearest` | Closest station of any type |
| `nearest-sbahn` | Closest station served by the **S-Bahn** |

How it works:
- On each refresh the widget requests your current location and queries the MVG *nearby stations* endpoint, then picks the closest match (`nearest` respects the **Station Types** default from Settings if configured, otherwise any station; `nearest-sbahn` always restricts to stations whose transport types include `SBAHN`, regardless of that setting).
- In this mode the header shows a 📍 location icon and the title reads **Nearest: [station]** so it's clear the station is chosen automatically.
- The resolved station is cached. iOS heavily restricts GPS access while a widget refreshes in the background, so if a live fix isn't available the widget falls back to the **last known** nearest station instead of showing an error.
- Run **🔎 Find Nearest Station** from the app once to grant location permission and seed that cache.
- The **Station Defaults** (Station Types / Line / Platform) configured in **⚙️ Settings** are automatically applied, so you can e.g. only search S-Bahn stops and only show `S3, S4`. Pass an explicit `lines:`/`platform:` in the parameter to override the line/platform default.
- You can combine the token with a gradient in a preset file, e.g. `nearest-sbahn; gradient: blue`.

#### ⚙️ Settings
Accessible from the main menu. Changes save immediately — no Save button needed.

- **Station Defaults** — Defaults applied when using **🔎 Find Nearest Station**:
  - **Station Types** — Restrict the nearby-station search itself to S-Bahn / U-Bahn / Bus / Regional Bus / Tram / Train. Leave everything unchecked to search any nearby station.
  - **Lines** / **Platform** — Pre-filled line and platform filters once a station is picked
- **Subtract Minutes** — Subtract N minutes from all departure times (useful for walk time)
- **Show Subtracted Minutes** — Show the "-N" offset indicator in the widget header

### Adding the Widget to Home Screen

1. Go to your Home Screen
2. Long-press anywhere → tap "+"
3. Search "Scriptable" → Add widget (any size)
4. Long-press the widget → "Edit Widget"
5. Set Script to "Munich Commute Widget"
6. Set When Interacting to "Run Script"
7. Paste your preset name (e.g., "Home") as the Parameter

### Configuration Parameters

Configure the widget by adding parameters in the widget settings. Use semicolons (`;`) to separate multiple parameters.

#### Station Configuration
```
Marienplatz
```
Set the station name you want to monitor. You can still use `station:Marienplatz` if you prefer.

#### Platform Filtering
```
platform:1
```
Show only departures from a specific platform (or a comma-separated list, e.g. `platform:1,2`).

Each departure row also shows a small rounded platform badge at the right edge. It's shown by default — the only time it's hidden is when your platform filter narrows things down to exactly **one** platform, since at that point every visible departure already uses that platform and repeating it would be redundant.

#### Line Filtering
```
lines:S1,S2,U3
```
Show only specific lines (comma-separated).

#### Test data preview
```
test:on-time-mix.json
```
Instead of fetching live departures, load fixture data from a JSON file so you can preview the widget's look (delays, cancellations, layouts) without depending on the real API or your live location. The file is looked up in:
- `Munich Commute/TestData/<file>.json`
- `TestData/<file>.json` (fallback)

Expected format:
```json
{
  "departures": [
    { "line": "S3", "destination": "Mammendorf", "minutesFromNow": 5, "transportType": "SBAHN", "platform": 1 },
    { "line": "S4", "destination": "Geltendorf", "minutesFromNow": 10, "delayMinutes": 4, "cancelled": true, "platform": 2 }
  ]
}
```
- `minutesFromNow` — minutes from "now" until the planned departure
- `delayMinutes` (optional) — adds a delay on top of the planned time
- `cancelled` (optional) — marks the departure as cancelled
- `transportType` (optional, defaults to `SBAHN`) — used for line badge coloring

Test data can be combined with `nearest` / `nearest-sbahn` — the live-location header ("Nearest: ...") still renders, but GPS and network calls are skipped entirely in favor of the fixture departures.

#### Preview widget size
```
size:medium
```
Forces a specific size (`small`/`s`, `medium`/`m`, `large`/`l`) when previewing from **👀 View Preset**. This does not affect the actual home-screen widget size (that's controlled by iOS), it only affects the in-app preview.

#### Visual Themes
```
gradient:blue
```
Choose from available gradients:
- `black` (default)
- `red`
- `blue`
- `green`
- `purple`
- `teal`

Or match a single S-Bahn line's own color, e.g. `gradient: s3`. These are generated from each line's badge color using the same lightness/saturation recipe as the gradients above, so they fit the same visual style. When a preset's line filter narrows down to exactly one S-Bahn line, the color picker suggests this automatically — but you can also set it manually, or combine it with a different line filter.

| Line | Gradient key |
|------|--------------|
| S1 | `s1` |
| S2 | `s2` |
| S3 | `s3` |
| S4 | `s4` |
| S5 | `s5` |
| S6 | `s6` |
| S7 | `s7` |
| S8 | `s8` |
| S20 | `s20` |

#### Presets
You can provide a **preset name** as the widget parameter (without `:`). The script will then load the preset.

Example widget parameter:
```
Home
```

All widget data is stored in a single folder inside the Scriptable iCloud folder:

```
iCloud Drive/Scriptable/Munich Commute/
├── Home.txt                      ← preset
├── Work.txt                      ← preset
├── Settings.json                 ← transport types, subtract minutes, Find Nearest defaults
├── NearestCache.json             ← last known nearest station (fallback for `nearest`/`nearest-sbahn`)
└── TestData/
    └── on-time-mix.json          ← fixture departures used by the `test:` parameter
```

Preset file locations (searched in order):
- `Munich Commute/Home.txt`
- `Home.txt` (fallback for older setups)

Example file content:
```
station: München-Langwied; platform: 1; gradient: purple
```

Note: `background` is still supported as an alias for `gradient`.

### Example Configurations

#### Simple station widget
```
Hauptbahnhof
```

#### Specific platform and lines
```
Ostbahnhof;platform:2;lines:S1,S2;gradient:green
```

#### Station with gradient
```
Sendlinger Tor;gradient:purple
```

#### Preview with fixture data, at medium size
```
station:Marienplatz;test:on-time-mix.json;size:medium
```

## Widget Sizes

### Small Widget
- Shows 2 upcoming departures
- Compact layout with essential information
- Perfect for quick glances

### Medium Widget
- Shows 4 departures in a 2-column grid (2 per column)
- Better readability for longer station names

### Large Widget
- Shows up to 6 upcoming departures
- Full station information
- Ideal for monitoring multiple connections

## Customization

The script includes several customization options in the `CONFIG` object:

- **Departure limit**: Maximum number of departures to fetch (default: 80)
- **Time offset**: Only show connections X minutes in the future (default: 0)
- **Transport types**: All types enabled by default (S-Bahn, U-Bahn, Bus, Tram, Regional trains)
- **Visual themes**: Customize gradient colors

## Troubleshooting

### Widget shows "No departures"
- Check if the station name is spelled correctly
- Verify the station exists in Munich's transport network
- Try removing platform/line filters if they're too restrictive

### Widget not updating
- Ensure you have internet connectivity
- Check if Scriptable has permission to access the internet
- Try refreshing the widget manually

### Station not found
- Use the exact station name as it appears in MVG/MVV systems
- Common stations: "Marienplatz", "Hauptbahnhof", "Ostbahnhof", "Sendlinger Tor"

## API Information

This widget uses Munich's public transport API to fetch real-time departure data. The data includes:
- Departure times with delay information
- Cancellation status
- Destination information
- Line/route details
- Transport type information

## Requirements

- iOS device with Scriptable app
- Internet connection for real-time data
- iOS 14+ for widget support

## Contributing

Feel free to submit issues or suggestions for improvements to make this widget even more useful for Munich commuters!

## License

This project is open source and available under standard usage terms.

## Limitations

- **iOS Widget Update Frequency:**
  - iOS controls when widgets are refreshed, and updates may not always happen as frequently as you expect.
  - If you want to see the latest data immediately, tap the widget. This will open a large version of the widget in Scriptable with fresh, up-to-date information, bypassing the iOS update schedule. 

## Acknowledgments

- Original MVG widget concept by [eckertj](https://github.com/eckertj/MVG-Abfahrtsmonitor) and contributors.
- Thanks to the Munich public transport API (mvg.de) for providing real-time data.

## Related Projects

This widget is inspired by and builds upon the work of other Munich public transport widgets for Scriptable:

- [MVG-Abfahrtsmonitor by eckertj](https://github.com/eckertj/MVG-Abfahrtsmonitor):
  - Displays current departures for bus, train, and tram at a defined Munich station using data from mvg.de.
  - Supports iOS 14 and macOS 11 Big Sur widgets in small, medium, and large sizes.
  - Allows configuration of the station name via widget parameters.
  - Multiple widgets can be added to the home screen and individually configured.

- [MVG-Abfahrtsmonitor by Nisbo](https://github.com/Nisbo/MVG-Abfahrtsmonitor):
  - A maintained fork of the original project, ensuring continued compatibility and updates.
  - Retains the same core features and setup process as the original.
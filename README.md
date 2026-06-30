# Munich Commute iOS Widget

A widget for iOS that displays real-time Munich public transport departures.
Works based on Scriptable app.

## Features

- **Filtering** by transport types or platform
- **All transport types** supported (S-Bahn, U-Bahn, Bus, Tram, Regional trains)
- **Real-time departures** using official MVV API
- **Cancelled departures** remain visible but appear dimmed, with a gray line badge
- **Customizable colors**

Color options:
- grey
- red
- blue
- green
- purple
- teal

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
| ➕ Create Preset | Save a station configuration to a file for use as a widget |
| 🔎 Find Nearest Station | Show departures for the nearest station using GPS |
| 👀 View Preset | Preview a preset as a widget |
| ✏️ Edit Preset | Edit a preset's configuration |
| 🗑️ Delete Preset | Delete a preset file |
| ℹ️ How to Add Widget | Step-by-step widget setup instructions |
| ⚙️ Settings | Configure transport types, timing, and defaults |

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

#### 🔎 Find Nearest Station
Shows live departures for a nearby station without saving anything:

1. Your location is used to find stations within range
2. Select a station from the list
3. A filter menu appears — set Line and/or Platform filters, or tap **Show** immediately
   - If defaults are configured in Settings, a **Show without filters** option also appears
4. The widget preview opens with live departures

#### ⚙️ Settings
Accessible from the main menu. Changes save immediately — no Save button needed.

- **Transport Types** — Toggle S-Bahn, U-Bahn, Bus, Regional Bus, Tram, Train on/off
- **Station Defaults** — Pre-filled Line and Platform filters for Find Nearest Station
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
Show only departures from a specific platform.

#### Line Filtering
```
lines:S1,S2,U3
```
Show only specific lines (comma-separated).



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
├── Settings.json                 ← transport types, subtract minutes
└── Find Nearest Defaults.txt     ← pre-filled line/platform filters
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

## Widget Sizes

### Small Widget
- Shows 2 upcoming departures
- Compact layout with essential information
- Perfect for quick glances

### Medium Widget
- Shows 2 departures with more destination details
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
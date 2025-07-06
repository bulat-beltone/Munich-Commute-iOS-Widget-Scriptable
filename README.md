# Munich Commute iOS Widget

A widget for iOS that displays real-time Munich public transport departures.
Works based on Scriptable app.

## Features

- **Filtering** by transport types or platform
- **All transport types** supported (S-Bahn, U-Bahn, Bus, Tram, Regional trains)
- **Real-time departures** using official MVV API
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
2. Copy the contents of `Munich-Commute-iOS-Widget-Scriptable.js` to a new script in Scriptable
3. Add the script as a widget to your home screen

## Usage

### Basic Setup
1. Add a Scriptable widget to your home screen
2. Long press the widget and select "Edit Widget"
3. Choose your script from the list
4. Optionally add parameters (see Configuration section)

### Configuration Parameters

Configure the widget by adding parameters in the widget settings. Use semicolons (`;`) to separate multiple parameters.

#### Station Configuration
```
station:Marienplatz
```
Set the station name you want to monitor.

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

#### Transport Type Filtering
```
types:sbahn,ubahn,tram
```
Show only specific transport types. Available types:
- `sbahn` - S-Bahn
- `ubahn` - U-Bahn  
- `bus` - City buses
- `regional_bus` - Regional buses
- `tram` - Trams
- `bahn` - Regional trains

#### Visual Themes
```
gradient:blue
```
Choose from available gradients:
- `grey` (default)
- `red`
- `blue`
- `green`
- `purple`
- `teal`

### Example Configurations

#### Simple station widget
```
station:Hauptbahnhof
```

#### S-Bahn only with blue theme
```
station:Marienplatz;types:sbahn;gradient:blue
```

#### Specific platform and lines
```
station:Ostbahnhof;platform:2;lines:S1,S2;gradient:green
```

#### Multiple transport types with custom theme
```
station:Sendlinger Tor;types:sbahn,ubahn,tram;gradient:purple
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
- **Transport types**: Enable/disable specific transport types
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
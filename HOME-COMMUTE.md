# Home and work trips

`Munich Commute Home.js` is a separate Scriptable script. It does not use the widget, its presets, or its settings.

## Shortcut parameter

Both automations use **Run Script → Munich Commute Home**. Set its **Parameter** field to plain text:

| Automation | Parameter |
| --- | --- |
| Leaving home (trip to work) | `home` |
| Leaving work (trip home) | `work` |

Case and surrounding spaces do not matter (`Home`, ` work ` work too). The older values still work: `Home Work` = `home`, `Work Home` = `work`. An empty parameter also runs the trip home from work. Any other text produces a notification listing the valid values.

No extra notification action is needed. A dictionary or JSON also works: `{"mode":"home","notify":false}` returns text without sending a notification.

## Home → Work (`home`)

All reachable **S3 from Langwied**, **S4 from Leienfelsstraße** and **157 from Staufener Straße towards Am Harras** are compared together. Walking time plus buffer removes services you cannot reach. The earliest departure wins, even if it is a bus. With the exact same departure time, prefer S-Bahn; between two trains at the same time, prefer the shorter walk. This compares departure times, not arrival times at the office.

If nothing leaves in 30 minutes, still show the earliest later service. There is no separate rejection threshold for a bus. `HOME_WORK_SEARCH_MINUTES = 180` controls the requested look-ahead; the API scan is still bounded to four pages per station. The result is the earliest service in the data actually returned. Missing or partial route data adds a short warning. If no suitable service is returned, say so and suggest checking MVV/MVG.

Cancelled, reverse and unreachable departures are excluded. Buses that end at Pasing do not reach Laim and are excluded. The second departure is also selected from all three routes, so it can be a different line or a bus. A single run does not monitor later cancellations; run again to get a fresh comparison. These rules replace the earlier fixed S3 → S4 → 157 priority.

Edit these constants at the top of the script:

```js
const WALK_FROM_HOME = {
  s3: 11,
  s4: 13,
  bus157: 6,
};
```

These are initial [FOSSGIS/OSM walking route](https://routing.openstreetmap.de/about.html) estimates: Langwied about **816 m / 10.5 min**, Leienfelsstraße **952 m / 12.5 min**, Staufener Straße **411 m / 5.5 min**. Routes use OpenStreetMap data; [map corrections](https://www.openstreetmap.org/fixthemap). Times reach the mapped station point, not necessarily your platform, and do not measure your personal pace. Values are rounded up; `bufferMinutes` adds one extra minute. Correct them after your first real walk. The home address is not stored in the script.

Verified via MVG on 30 Oct 2026: Langwied `de:09162:1800`, Leienfelsstraße `de:09162:1700`, Staufener Straße `de:09162:1743`. The home-to-work 157 uses boarding point `de:09162:1743:1:1`, line direction `swm:03157:G:H:016`. The old vault note incorrectly called `de:09162:10` Langwied; that ID belongs to Pasing.

## What it does

1. Fetch fresh MVG departures for Laim and Pronnerplatz.
2. Look for a westbound S3 or S4 within 30 minutes, including known delays.
3. If no suitable train is found, show bus 157 from Pronnerplatz towards Pasing, with a destination such as Germering, Neue Gautinger Str.
4. Keep the notification short: title `S4 через 12 мин`, body `Следующий: S3 через 20 мин`. No direction, clock time, station or platform is shown. Keep direction filters and walking time checks in the selection logic. If no second departure is returned, say so. Keep short warnings for missing live data, network errors or unknown walking time.
5. Send one notification and return the same text to Shortcuts. No menu or preview opens.

Cancelled services, replacement buses, and eastbound services are excluded. Network errors are reported as errors. No cached departures are used. If real-time data is unavailable, the message says the time is from the timetable. Minutes are relative to the current time.

## Set up on iPhone

1. Open Scriptable and run **Munich Commute Home** once. Allow notifications if iOS asks.
2. In the existing Shortcuts automations, add **Scriptable → Run Script** after the time tracking action: in the leaving-home one with Parameter `home`, in the leaving-work one with Parameter `work`.
3. Select **Munich Commute Home**. If the action has a **Run in App** option, turn it off. Select **Run Immediately** for the automation if that option is available.
4. Run the shortcut manually first, then test leaving the location with the phone locked.

The script sends its own notification. Do not add another Show Notification action unless you pass `notify: false`.

## Walking time and lines

The default lines are S3 towards Mammendorf/Maisach/Olching and S4 towards Geltendorf/Buchenau and other western endpoints. Confirm which lines reach your home stop. A train that ends at Pasing is excluded.

Walking time to Laim is **6 minutes**, preserving Bulat's edit in the iCloud script. With the default one-minute buffer, trains leaving in less than 7 minutes are excluded. Walking time to Pronnerplatz is still unknown; bus results warn you to check whether you can reach the stop. Change these times in the `HOME` block at the top of the script, or pass a dictionary/JSON in the Run Script action's Parameter field:

```json
{"trainWalkMinutes": 6, "busWalkMinutes": 10, "bufferMinutes": 1, "trainLines": ["S3", "S4"]}
```

The bus walking time above is an example. Replace it with your own time from the location where the automation fires. With walking time set, departures before walking time plus buffer are excluded. The 30-minute window starts when the script runs, not when you reach the platform. The next train can be outside that window if it appears in the returned data.

To let Shortcuts show the result instead:

```json
{"notify": false}
```

Then add **Show Notification**, using the Run Script result as its text.

## Verified route data

- Laim: `de:09162:9`, served by S-Bahn and buses.
- Pronnerplatz: `de:09162:1648`; westbound boarding point `de:09162:1648:2:2`.
- The MVG API returned westbound 157 with line ID `swm:03157:G:R:016` and destination `Germering, Neue Gautinger Str.`. The reverse direction is Am Harras.
- [Official route overview](https://www.mvg.de/dam/jcr%3A6ec4cb8c-46c8-4f87-90ec-b1578c56b0df/mvv-gesamtfahrplan-2026.pdf): 157 runs via Laim, Pasing, Aubing and Freiham to Germering.
- [Scriptable input](https://docs.scriptable.app/args/), [output](https://docs.scriptable.app/script/), [notifications](https://docs.scriptable.app/notification/).

## Checks and limits

Run `node --test tests/home-commute.test.js` for route, time, error and notification checks.

The API can limit each reply to 30 rows. The script reads up to four overlapping windows per station. If the requested window is not covered, it reports a partial result. Requests time out after six seconds each.

The iPhone automation, notification permission, background execution and location trigger need a real-device test. Repeated location triggers can send repeated notifications. The script does not know the exact home stop or calculate the trip after boarding.

// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-green; icon-glyph: bus;
// Independent script: no widget imports, settings, or saved data.

// HOME → WORK: change these walking times to match your pace.
// Initial estimates from OSM walking routes, not measured personal times.
const WALK_FROM_HOME = {
  s3: 11,     // Langwied
  s4: 13,     // Leienfelsstraße
  bus157: 6,  // Staufener Straße, towards Am Harras
};
const HOME_WORK_SEARCH_MINUTES = 180; // Look further ahead when nothing leaves soon.

const HOME = {
  mode: "workHome", // Shortcuts parameter "home" = leaving home, "work" (or empty) = leaving work.
  trainLines: ["S3", "S4"],
  trainWalkMinutes: 6, // User-edited walk to Laim; preserved from iCloud.
  busWalkMinutes: null,   // Set your walk to Pronnerplatz, westbound stop.
  bufferMinutes: 1,
  trainWindowMinutes: 30,
  busWindowMinutes: 90,
  notify: true, // false: return text for Shortcuts → Show Notification instead.
};

const TRAIN_STATION = "de:09162:9"; // Laim
const BUS_STATION = "de:09162:1648"; // Pronnerplatz
const BUS_STOP = "de:09162:1648:2:2";
const WEST_TRAINS = {
  S3: ["Mammendorf", "Maisach", "Olching"],
  S4: ["Geltendorf", "Buchenau", "Grafrath", "Fürstenfeldbruck", "Eichenau", "Puchheim"],
};

// Shortcuts parameter: "home" = leaving home, "work" = leaving work (also "Home Work" / "Work Home").
const MODE_ALIASES = { home: "homeWork", homework: "homeWork", work: "workHome", workhome: "workHome" };
const VALID_MODES = "home (из дома), work (с работы), Home Work, Work Home или пусто";

function modeKey(value) {
  return String(value).toLowerCase().replace(/[\s_-]+/g, "");
}

function settings(input) {
  if (typeof input === "string" && input.trim()) {
    const text = input.trim();
    if (MODE_ALIASES[modeKey(text)]) input = { mode: text };
    else if (text.startsWith("{")) input = JSON.parse(text);
    else throw new Error(`Неизвестный параметр «${text}». Допустимо: ${VALID_MODES}.`);
  }
  if (input == null || input === "") input = {};
  if (typeof input !== "object" || Array.isArray(input)) throw new Error("Параметр должен быть словарём или JSON.");
  const result = { ...HOME };
  for (const key of Object.keys(input)) {
    if (!(key in HOME)) throw new Error(`Неизвестная настройка: ${key}`);
    result[key] = input[key];
  }
  const mode = typeof result.mode === "string" ? MODE_ALIASES[modeKey(result.mode)] : undefined;
  if (!mode) throw new Error(`Режим: ${VALID_MODES}.`);
  result.mode = mode;
  for (const key of ["trainWalkMinutes", "busWalkMinutes", "bufferMinutes", "trainWindowMinutes", "busWindowMinutes"]) {
    if (result[key] === null && key.endsWith("WalkMinutes")) continue;
    if (typeof result[key] !== "number" || !Number.isFinite(result[key]) || result[key] < 0 || result[key] > 180) {
      throw new Error(`Настройка ${key}: нужно число от 0 до 180.`);
    }
  }
  if (!Array.isArray(result.trainLines) || !result.trainLines.length || result.trainLines.some(x => !WEST_TRAINS[x])) {
    throw new Error("trainLines: укажите S3, S4 или обе линии.");
  }
  if (typeof result.notify !== "boolean") throw new Error("notify: нужно true или false.");
  return result;
}

function departureTime(row) {
  if (row.realtime === true && Number.isFinite(row.realtimeDepartureTime)) return row.realtimeDepartureTime;
  if (!Number.isFinite(row.plannedDepartureTime)) return NaN;
  return row.plannedDepartureTime + (row.realtime === true && Number.isFinite(row.delayInMinutes) ? row.delayInMinutes * 60000 : 0);
}

function isTrain(row, options) {
  return row.transportType === "SBAHN" && options.trainLines.includes(row.label) &&
    WEST_TRAINS[row.label].includes(row.destination) && !row.cancelled && !row.sev;
}

function isBus(row) {
  // Match the actual boarding point and westbound line, not just the number.
  return row.transportType === "BUS" && row.label === "157" && !row.cancelled && !row.sev &&
    row.stopPointGlobalId === BUS_STOP && /^swm:03157:G:R:/.test(row.lineId || "") &&
    /^(Germering(?:,|\b)|Freiham(?:\b)|Aubing(?:\b)|Pasing(?:\b))/.test(row.destination || "");
}

function nextDeparture(rows, accepts, walkMinutes, options, now) {
  return eligibleDepartures(rows, accepts, walkMinutes, options, now)[0] || null;
}

function eligibleDepartures(rows, accepts, walkMinutes, options, now) {
  const lead = walkMinutes === null ? 0 : walkMinutes + options.bufferMinutes;
  return rows.filter(row => accepts(row) && departureTime(row) >= now + lead * 60000)
    .sort((a, b) => departureTime(a) - departureTime(b));
}

async function fetchBoard(station, horizon, now) {
  const collected = new Map();
  let offset = 0;
  let coveredUntil = now;
  // MVG currently caps replies at 30 rows even when limit=80 is requested.
  // Read overlapping time windows so busy stops do not hide later services.
  for (let page = 0; page < 4; page++) {
    const url = `https://www.mvg.de/api/bgw-pt/v3/departures?globalId=${encodeURIComponent(station)}&limit=80&offsetInMinutes=${offset}`;
    const request = new Request(url);
    request.timeoutInterval = 6;
    const rows = await request.loadJSON();
    if (request.response && (request.response.statusCode < 200 || request.response.statusCode >= 300)) throw new Error("Ошибка MVG API");
    if (!Array.isArray(rows) || rows.some(row => !row || typeof row.label !== "string" || !Number.isFinite(departureTime(row)))) {
      throw new Error("Неожиданный ответ MVG API");
    }
    for (const row of rows) {
      const key = [row.label, row.destination, row.plannedDepartureTime, row.stopPointGlobalId, row.tripCode].join("|");
      collected.set(key, row);
    }
    const latest = rows.length ? Math.max(...rows.map(departureTime)) : coveredUntil;
    coveredUntil = Math.max(coveredUntil, latest);
    if (rows.length < 30 || coveredUntil >= now + horizon * 60000) {
      return { rows: [...collected.values()], complete: true };
    }
    const nextOffset = Math.max(0, Math.floor((latest - now) / 60000) - 1);
    if (nextOffset <= offset) break;
    offset = nextOffset;
  }
  return { rows: [...collected.values()], complete: false };
}

function departureSummary(row, now) {
  const minutes = Math.max(0, Math.ceil((departureTime(row) - now) / 60000));
  const timing = row.realtime === true ? "" : " (по расписанию)";
  return `${row.label} через ${minutes} мин${timing}`;
}

function followingOption(rows, now) {
  const second = rows[1];
  if (!second) return "Следующий: нет данных.";
  return `Следующий: ${departureSummary(second, now)}`;
}

function recommendation(trainResult, busResult, options, now) {
  const trains = trainResult.error ? [] : eligibleDepartures(trainResult.rows, row => isTrain(row, options), options.trainWalkMinutes, options, now);
  const train = trains[0];
  if (train && departureTime(train) <= now + options.trainWindowMinutes * 60000) {
    return `${departureSummary(train, now)}\n${followingOption(trains, now)}${options.trainWalkMinutes === null ? "\nПодход к станции не учтён." : ""}`;
  }
  const reason = trainResult.error ? "Не удалось проверить S-Bahn." :
    trainResult.complete ? `Подходящего S-Bahn в ближайшие ${options.trainWindowMinutes} мин не найдено.` :
    "В полученных данных подходящий S-Bahn не найден; проверка неполная.";
  const later = train ? `\nПозже: ${departureSummary(train, now)}.` : "";
  if (busResult.error) return `${reason}${later}\nНе удалось проверить автобус 157. Проверьте MVV/MVG.`;
  const buses = eligibleDepartures(busResult.rows, isBus, options.busWalkMinutes, options, now)
    .filter(row => departureTime(row) <= now + options.busWindowMinutes * 60000);
  const bus = buses[0];
  if (bus && departureTime(bus) <= now + options.busWindowMinutes * 60000) {
    const uncertainty = trainResult.error || !trainResult.complete ? `\n${reason}` : "";
    const approach = options.busWalkMinutes === null ? "\nПодход к автобусу не учтён." : "";
    return `${departureSummary(bus, now)}\n${followingOption(buses, now)}${uncertainty}${approach}`;
  }
  return `${reason}${later}\n157 в ближайшие ${options.busWindowMinutes} мин не найден.${busResult.complete ? "" : " Проверка неполная."}\nПроверьте MVV/MVG.`;
}

function isWorkTrain(row, line) {
  return row.transportType === "SBAHN" && row.label === line && !row.cancelled && !row.sev &&
    new RegExp(`^ddb:920${line}:.*:H:`).test(row.lineId || "") &&
    ["Holzkirchen", "Deisenhofen", "Ostbahnhof", "München Ost", "Haar", "Ebersberg", "Trudering", "Grafing Bahnhof", "Zorneding", "Berg am Laim"].includes(row.destination);
}

function isWorkBus(row) {
  return row.transportType === "BUS" && row.label === "157" && !row.cancelled && !row.sev &&
    row.stopPointGlobalId === "de:09162:1743:1:1" && /^swm:03157:G:H:/.test(row.lineId || "") &&
    ["Am Harras", "Laim", "Laim Bf."].includes(row.destination);
}

function workRecommendation(results, options, now) {
  for (const minutes of Object.values(WALK_FROM_HOME)) {
    if (typeof minutes !== "number" || !Number.isFinite(minutes) || minutes < 0 || minutes > 180) {
      throw new Error("Проверьте WALK_FROM_HOME: минуты от 0 до 180.");
    }
  }
  const routes = [
    { key: "s3", label: "S3", walk: WALK_FROM_HOME.s3, accepts: row => isWorkTrain(row, "S3"), rail: true },
    { key: "s4", label: "S4", walk: WALK_FROM_HOME.s4, accepts: row => isWorkTrain(row, "S4"), rail: true },
    { key: "bus", label: "157", walk: WALK_FROM_HOME.bus157, accepts: isWorkBus, rail: false },
  ];
  const warnings = [];
  const candidates = [];
  for (const route of routes) {
    const result = results[route.key];
    if (result.error) { warnings.push(`${route.label}: нет данных.`); continue; }
    const rows = eligibleDepartures(result.rows, route.accepts, route.walk, options, now);
    candidates.push(...rows.map(row => ({ row, rail: route.rail, walk: route.walk })));
    if (!result.complete) warnings.push(`${route.label}: проверка неполная.`);
  }
  candidates.sort((a, b) => departureTime(a.row) - departureTime(b.row) ||
    Number(b.rail) - Number(a.rail) || a.walk - b.walk);
  const rows = candidates.map(candidate => candidate.row);
  if (rows.length) return [departureSummary(rows[0], now), followingOption(rows, now), ...warnings].join("\n");
  return ["Нет подходящих отправлений в полученных данных.", ...warnings, "Проверьте MVV/MVG."].join("\n");
}

async function runHome() {
  let options = { ...HOME };
  let text;
  try {
    options = settings(args.shortcutParameter);
    const now = Date.now();
    const safeBoard = (station, horizon) => fetchBoard(station, horizon, now).catch(() => ({ error: true }));
    if (options.mode === "homeWork") {
      const [s3, s4, bus] = await Promise.all([
        safeBoard("de:09162:1800", HOME_WORK_SEARCH_MINUTES),
        safeBoard("de:09162:1700", HOME_WORK_SEARCH_MINUTES),
        safeBoard("de:09162:1743", HOME_WORK_SEARCH_MINUTES),
      ]);
      text = workRecommendation({ s3, s4, bus }, options, Date.now());
    } else {
      const [train, bus] = await Promise.all([
        safeBoard(TRAIN_STATION, Math.max(options.trainWindowMinutes, options.busWindowMinutes)),
        safeBoard(BUS_STATION, options.busWindowMinutes),
      ]);
      text = recommendation(train, bus, options, Date.now());
    }
  } catch (error) {
    text = `Не удалось проверить дорогу домой: ${error.message || error}`;
  }
  Script.setShortcutOutput(text);
  if (options.notify) {
    const notification = new Notification();
    const [headline, ...details] = text.split("\n");
    notification.title = headline;
    notification.body = details.join("\n");
    await notification.schedule();
  }
  Script.complete();
}

await runHome();

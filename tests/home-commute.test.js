const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'Munich Commute Home.js'), 'utf8');
const now = Date.UTC(2026, 9, 27, 17, 0);
function load(extra = {}) {
  class DateFormatter {
    string(date) { return new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit', hour12: false }).format(date); }
  }
  const context = vm.createContext({ DateFormatter, console, ...extra });
  vm.runInContext(source.replace('await runHome();', '') + '\nthis.api = { settings, departureTime, isTrain, isBus, nextDeparture, recommendation, fetchBoard, runHome, workRecommendation, isWorkTrain, isWorkBus };', context);
  return context.api;
}
function row(minutes, changes = {}) {
  return { plannedDepartureTime: now + minutes * 60000, realtimeDepartureTime: now + minutes * 60000,
    realtime: true, transportType: 'SBAHN', label: 'S3', destination: 'Mammendorf', cancelled: false, platform: 1, ...changes };
}
function bus(minutes, changes = {}) {
  return row(minutes, { transportType: 'BUS', label: '157', destination: 'Germering, Neue Gautinger Str.',
    platform: undefined, stopPointGlobalId: 'de:09162:1648:2:2', lineId: 'swm:03157:G:R:016', ...changes });
}
test('westbound trains, cancellations, replacement buses, and raw real-time data', () => {
  const a = load(), o = a.settings({ trainWalkMinutes: 7 });
  const rows = [row(2), row(9, { destination: 'Holzkirchen' }), row(10, { cancelled: true }),
    row(11, { sev: true }), row(12, { label: 'S4', destination: 'Buchenau', platform: 2 })];
  assert.equal(a.nextDeparture(rows, x => a.isTrain(x, o), o.trainWalkMinutes, o, now).label, 'S4');
  assert.equal(a.departureTime(row(5, { realtimeDepartureTime: now + 15 * 60000 })), now + 15 * 60000);
  assert.equal(a.departureTime(row(5, { realtime: false, realtimeDepartureTime: now + 15 * 60000 })), now + 5 * 60000);
});
test('30-minute boundary includes the train; 31 minutes falls back to westbound 157', () => {
  const a = load(), o = a.settings({});
  const b = { rows: [bus(8, { destination: 'Am Harras', lineId: 'swm:03157:G:H:016' }), bus(12)], complete: true };
  assert.match(a.recommendation({ rows: [row(30)], complete: true }, b, o, now), /^S3/);
  const text = a.recommendation({ rows: [row(31)], complete: true }, b, o, now);
  assert.match(text, /^157 через 12 мин/);
  assert.doesNotMatch(text, /Am Harras/);
  assert.match(text, /Подход к автобусу не учтён/);
});
test('bus boarding point, direction and walking time must all match', () => {
  const a = load(), o = a.settings({ busWalkMinutes: 8 });
  const chosen = a.nextDeparture([bus(3), bus(10, { stopPointGlobalId: 'de:09162:1648:1:1' }), bus(11)], a.isBus, 8, o, now);
  assert.equal(a.departureTime(chosen), now + 11 * 60000);
});
test('network and partial results do not claim the railway is cancelled or absent', () => {
  const a = load(), o = a.settings({});
  assert.match(a.recommendation({ error: true }, { rows: [bus(10)] }, o, now), /Не удалось проверить S-Bahn/);
  assert.match(a.recommendation({ rows: [], complete: false }, { error: true }, o, now), /проверка неполная/);
  assert.match(a.recommendation({ rows: [], complete: true }, { error: true }, o, now), /Не удалось проверить автобус/);
});
test('settings reject unsafe values and support a JSON Shortcuts parameter', () => {
  const a = load();
  assert.equal(a.settings('{"notify":false,"trainWalkMinutes":5}').notify, false);
  assert.throws(() => a.settings({ trainWalkMinutes: -1 }));
  assert.throws(() => a.settings({ trainLines: ['S8'] }));
  assert.throws(() => a.settings({ notify: 'false' }));
  assert.throws(() => a.settings({ typo: 10 }));
});
test('a full API page is followed by an overlapping time window', async () => {
  const offsets = [];
  class Request {
    constructor(url) { this.offset = Number(new URL(url).searchParams.get('offsetInMinutes')); offsets.push(this.offset); }
    async loadJSON() { return this.offset === 0 ? Array.from({ length: 30 }, (_, i) => row(1 + i / 3)) : [row(35)]; }
  }
  const a = load({ Request });
  const result = await a.fetchBoard('test', 30, now);
  assert.equal(result.complete, true);
  assert.equal(offsets.length, 2);
  assert.ok(offsets[1] > 0 && offsets[1] < 11);
});
test('malformed API responses and HTTP failures are errors', async () => {
  class Request { async loadJSON() { return { error: 'unavailable' }; } }
  await assert.rejects(load({ Request }).fetchBoard('test', 30, now));
  class FailedRequest {
    constructor() { this.response = { statusCode: 503 }; }
    async loadJSON() { return []; }
  }
  await assert.rejects(load({ Request: FailedRequest }).fetchBoard('test', 30, now));
});
test('script returns text, schedules one notification, and completes; notify=false avoids duplicates', async () => {
  for (const notify of [true, false]) {
    const notices = [], output = [];
    const titles = [];
    let completed = 0;
    class Request { async loadJSON() { return []; } }
    class Notification { async schedule() { titles.push(this.title); notices.push([this.title, this.body].filter(Boolean).join('\n')); } }
    const a = load({ Request, Notification, args: { shortcutParameter: { notify } },
      Script: { setShortcutOutput: x => output.push(x), complete: () => completed++ } });
    await a.runHome();
    assert.equal(output.length, 1);
    assert.equal(notices.length, notify ? 1 : 0);
    if (notify) {
      assert.equal(notices[0], output[0]);
      assert.equal(titles[0], output[0].split('\n')[0]);
    }
    assert.equal(completed, 1);
  }
});

test('user-edited six-minute office walk is preserved with one-minute buffer', () => {
  const a = load(), o = a.settings({});
  assert.equal(o.trainWalkMinutes, 6);
  const text = a.recommendation({ rows: [row(6), row(7, { label: 'S4', destination: 'Geltendorf' }), row(16)], complete: true }, { rows: [], complete: true }, o, now);
  assert.equal(text, 'S4 через 7 мин\nСледующий: S3 через 16 мин');
});

function east(minutes, line = 'S3', changes = {}) {
  return row(minutes, { label: line, destination: line === 'S3' ? 'Holzkirchen' : 'Haar', lineId: `ddb:920${line}:A:H:j26`, ...changes });
}
function workBus(minutes, changes = {}) {
  return bus(minutes, { destination: 'Am Harras', stopPointGlobalId: 'de:09162:1743:1:1', lineId: 'swm:03157:G:H:016', ...changes });
}
const board = rows => ({ rows, complete: true });

test('Home Work text and dictionary select the mode; empty input preserves office mode', () => {
  const a = load();
  assert.equal(a.settings('Home Work').mode, 'homeWork');
  assert.equal(a.settings({ mode: 'Home Work', notify: false }).mode, 'homeWork');
  assert.equal(a.settings('').mode, 'workHome');
  assert.equal(a.settings('Work Home').mode, 'workHome');
  assert.throws(() => a.settings({ mode: 'wrong' }));
});

test('short Shortcuts parameters: home = leaving home, work = leaving work', () => {
  const a = load();
  assert.equal(a.settings('home').mode, 'homeWork');
  assert.equal(a.settings('Home').mode, 'homeWork');
  assert.equal(a.settings(' work ').mode, 'workHome');
  assert.equal(a.settings('WORK').mode, 'workHome');
  assert.equal(a.settings({ mode: 'home', notify: false }).mode, 'homeWork');
  assert.equal(a.settings('Home Work').mode, 'homeWork');
  assert.equal(a.settings('Work Home').mode, 'workHome');
  assert.equal(a.settings('').mode, 'workHome');
});
test('unknown plain-text parameter explains the valid values instead of a JSON error', () => {
  const a = load();
  assert.throws(() => a.settings('office'), error => {
    assert.match(error.message, /office/);
    assert.match(error.message, /home/);
    assert.match(error.message, /work/);
    assert.doesNotMatch(error.message, /JSON Parse|Unexpected token/);
    return true;
  });
});
test('the earliest reachable service wins across all routes; impossible and cancelled trains are excluded', () => {
  const a = load(), o = a.settings('Home Work');
  const s3 = board([east(4), east(15, 'S3', { cancelled: true }), row(16), east(25), east(45)]);
  const text = a.workRecommendation({ s3, s4: board([east(16, 'S4')]), bus: board([workBus(10)]) }, o, now);
  assert.equal(text, '157 через 10 мин\nСледующий: S4 через 16 мин');
});
test('unreachable S3 and S3 outside 30 minutes fall back to reachable S4', () => {
  const a = load(), o = a.settings('Home Work');
  const text = a.workRecommendation({ s3: board([east(10), east(31)]), s4: board([east(12, 'S4'), east(14, 'S4'), east(34, 'S4')]), bus: board([]) }, o, now);
  assert.equal(text, 'S4 через 14 мин\nСледующий: S3 через 31 мин');
});
test('S3/S4 absence falls back to eastbound direct 157, not the reverse or Pasing-only bus', () => {
  const a = load(), o = a.settings('Home Work');
  const text = a.workRecommendation({ s3: board([]), s4: board([]), bus: board([workBus(2), bus(8), workBus(9, { destination: 'Pasing Bf.' }), workBus(11), workBus(31)]) }, o, now);
  assert.equal(text, '157 через 11 мин\nСледующий: 157 через 31 мин');
});
test('unknown S3 availability warns when showing S4 instead', () => {
  const a = load(), o = a.settings('Home Work');
  const text = a.workRecommendation({ s3: { error: true }, s4: board([east(20, 'S4')]), bus: board([]) }, o, now);
  assert.match(text, /^S4 через 20 мин/);
  assert.match(text, /S3: нет данных/);
});
test('earlier S4 wins over S3, rather than waiting for the preferred home station', () => {
  const a = load(), o = a.settings('Home Work');
  const text = a.workRecommendation({ s3: board([east(25)]), s4: board([east(16, 'S4')]), bus: board([workBus(28)]) }, o, now);
  assert.equal(text, 'S4 через 16 мин\nСледующий: S3 через 25 мин');
});
test('a train wins an exact tie with a bus; S3 wins a tie with S4 due to shorter walk', () => {
  const a = load(), o = a.settings('Home Work');
  const text = a.workRecommendation({ s3: board([east(20)]), s4: board([east(20, 'S4')]), bus: board([workBus(20)]) }, o, now);
  assert.equal(text, 'S3 через 20 мин\nСледующий: S4 через 20 мин');
});
test('no service in 30 minutes still returns the earliest later service across train and bus', () => {
  const a = load(), o = a.settings('Home Work');
  const text = a.workRecommendation({ s3: board([east(42)]), s4: board([east(36, 'S4')]), bus: board([workBus(50)]) }, o, now);
  assert.equal(text, 'S4 через 36 мин\nСледующий: S3 через 42 мин');
});
test('no separate bus cutoff: a later bus is still returned if it is the only known service', () => {
  const a = load(), o = a.settings('Home Work');
  const text = a.workRecommendation({ s3: board([]), s4: board([]), bus: board([workBus(100)]) }, o, now);
  assert.equal(text, '157 через 100 мин\nСледующий: нет данных.');
});
test('partial data warnings are kept even when another service is available', () => {
  const a = load(), o = a.settings('Home Work');
  const text = a.workRecommendation({ s3: { rows: [east(20)], complete: false }, s4: board([]), bus: board([]) }, o, now);
  assert.match(text, /^S3 через 20 мин/);
  assert.match(text, /S3: проверка неполная/);
});
test('Home Work run fetches the three verified stations and returns one notification', async () => {
  const ids = [], notices = [], outputs = [];
  class Request {
    constructor(url) { this.id = new URL(url).searchParams.get('globalId'); ids.push(this.id); }
    async loadJSON() { return []; }
  }
  class Notification { async schedule() { notices.push(this.title); } }
  const a = load({ Request, Notification, args: { shortcutParameter: 'Home Work' }, Script: { setShortcutOutput: x => outputs.push(x), complete() {} } });
  await a.runHome();
  assert.deepEqual(ids.sort(), ['de:09162:1700', 'de:09162:1743', 'de:09162:1800']);
  assert.equal(notices.length, 1);
  assert.equal(outputs.length, 1);
});

test('bus fallback leads with the bus and offers the next westbound bus', () => {
  const a = load(), o = a.settings({});
  const text = a.recommendation({ rows: [], complete: true }, { rows: [bus(12), bus(22)], complete: true }, o, now);
  assert.equal(text, '157 через 12 мин\nСледующий: 157 через 22 мин\nПодход к автобусу не учтён.');
});

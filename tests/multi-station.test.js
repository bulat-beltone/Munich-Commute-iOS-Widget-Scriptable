const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const widgetSource = fs.readFileSync(path.join(root, "Munich Commute Widget.js"), "utf8")
    .replace(/\nawait main\(\);\nScript\.complete\(\);\s*$/, "");
const homePreset = fs.readFileSync(path.join(root, "presets", "Home.txt"), "utf8").trim();
const workPreset = fs.readFileSync(path.join(root, "presets", "Work.txt"), "utf8").trim();

function load({ departures = {}, fileManager = {}, alerts = [] } = {}) {
    class Alert {
        constructor() { this.actions = []; }
        addAction(title) { this.actions.push(title); }
        addDestructiveAction(title) { this.actions.push(title); }
        addCancelAction() {}
        addTextField() {}
        async presentAlert() { alerts.push({ title: this.title, message: this.message }); return 0; }
        async presentSheet() { return 0; }
        textFieldValue() { return ""; }
    }
    const requests = [];
    class Request {
        constructor(url) { this.url = url; requests.push(url); }
        async loadJSON() { return departures[new URL(this.url).searchParams.get("globalId")] || []; }
    }
    const manager = {
        documentsDirectory: () => "/tmp", joinPath: (...p) => p.join("/"), fileExists: () => false,
        isFileDownloaded: () => true, downloadFileFromiCloud: async () => {}, listContents: () => [],
        readString: () => "", writeString: () => {}, createDirectory: () => {}, remove: () => {}, ...fileManager
    };
    const context = vm.createContext({
        Alert, Request, console,
        Color: class { static white() { return new this(); } },
        Device: { screenResolution: () => ({ width: 1290, height: 2796 }), model: () => "test" },
        FileManager: { iCloud: () => manager },
        Font: { boldSystemFont: s => s, systemFont: s => s, caption1: () => 1, caption2: () => 2, semiboldSystemFont: s => s },
        LinearGradient: class {}, ListWidget: class {}, Location: {}, Pasteboard: { copy() {} }, Point: class {},
        SFSymbol: { named: () => ({ applyFont() {}, image: {} }) }, Script: { complete() {}, setWidget() {} },
        Size: class { constructor(w, h) { this.width = w; this.height = h; } },
        args: { widgetParameter: "" }, config: { runsInWidget: true, widgetFamily: "large" }
    });
    vm.runInContext(`${widgetSource}
globalThis.api = { parseWidgetParameters, parseSources, loadSourcesDepartures, editSavedStation,
  applyParsedWidgetParameters, setSubtract: v => { SUBTRACT_MINUTES = v; } };`, context);
    return { ...context.api, requests, alerts };
}

const clean = value => JSON.parse(JSON.stringify(value));
const now = Date.UTC(2026, 10, 10, 17, 0);
const dep = (label, destination, minutes, changes = {}) => ({
    label, destination, plannedDepartureTime: now + minutes * 60000, realtimeDepartureTime: now + minutes * 60000,
    realtime: true, delayInMinutes: 0, cancelled: false, transportType: label.startsWith("S") ? "SBAHN" : "BUS", ...changes
});
const encode = sources => encodeURIComponent(JSON.stringify(sources));

test("Home preset parses into three stations with walking times and route filters", () => {
    const api = load();
    const parsed = api.parseWidgetParameters(homePreset);
    assert.equal(parsed.title, "Дом → Работа");
    assert.equal(parsed.gradient, "purple");
    assert.deepEqual(clean(parsed.sources.map(s => [s.id, s.name, s.walk])), [
        ["de:09162:1800", "Langwied", 5],
        ["de:09162:1700", "Leienfelsstraße", 7],
        ["de:09162:1743", "Staufener Straße", 5]
    ]);
    assert.deepEqual(clean(parsed.sources.map(s => [...new Set(s.routes.map(r => r.line))])), [["S3"], ["S4"], ["157"]]);
    assert.ok(parsed.sources[2].routes.some(r => r.destination === "Am Harras"));
});

test("Work preset parses into Laim (S3/S4 westbound) and Pronnerplatz (157 westbound)", () => {
    const api = load();
    const parsed = api.parseWidgetParameters(workPreset);
    assert.equal(parsed.title, "Работа → Дом");
    assert.deepEqual(clean(parsed.sources.map(s => [s.id, s.name, s.walk])), [
        ["de:09162:9", "Laim", 6],
        ["de:09162:1648", "Pronnerplatz", 7]
    ]);
    assert.deepEqual(clean([...new Set(parsed.sources[0].routes.map(r => r.line))]), ["S3", "S4"]);
    assert.deepEqual(clean([...new Set(parsed.sources[1].routes.map(r => r.line))]), ["157"]);
    assert.ok(parsed.sources[1].routes.some(r => r.destination === "Germering"));
    assert.ok(!parsed.sources[1].routes.some(r => r.destination === "Am Harras"));
});

test("a preset without sources keeps the single-station behaviour", () => {
    const api = load();
    const parsed = api.parseWidgetParameters("station: Laim; lines: S3; gradient: green");
    assert.equal(parsed.sources, null);
    assert.equal(parsed.title, null);
    assert.equal(parsed.station, "Laim");
});

test("invalid sources are rejected with a clear error", () => {
    const api = load();
    for (const bad of [[], [{}], [{ id: "" }], [{ id: "x", walk: -1 }], [{ id: "x", walk: "5" }], [{ id: "x", routes: "S3" }], {}]) {
        assert.throws(() => api.parseSources(encode(bad)), /Invalid sources/, JSON.stringify(bad));
    }
    const ok = api.parseSources(encode([{ id: " de:1 " }]));
    assert.deepEqual(clean(ok), [{ id: "de:1", name: "de:1", walk: 0, routes: null }]);
});

test("stations are merged by departure time and filtered per station", async () => {
    const api = load({ departures: {
        A: [dep("S3", "Holzkirchen", 12), dep("S3", "Mammendorf", 8), dep("S4", "Trudering", 9)],
        B: [dep("S4", "Trudering", 14), dep("S3", "Holzkirchen", 7)],
        C: [dep("157", "Am Harras", 10), dep("157", "Neue Gautinger Str.", 11)]
    } });
    const sources = api.parseSources(encode([
        { id: "A", routes: [{ line: "S3", destination: "Holzkirchen" }] },
        { id: "B", routes: [{ line: "S4", destination: null }] },
        { id: "C", routes: [{ line: "157", destination: "Am Harras" }] }
    ]));
    const result = await api.loadSourcesDepartures(sources, now);
    assert.deepEqual(clean(result.map(d => `${d.label} ${d.destination}`)), ["157 Am Harras", "S3 Holzkirchen", "S4 Trudering"]);
    assert.equal(api.requests.length, 3);
});

test("departures you cannot walk to are hidden; one exactly at the walking time stays", async () => {
    const api = load({ departures: { A: [dep("S3", "Holzkirchen", 4), dep("S3", "Holzkirchen", 5), dep("S3", "Holzkirchen", 6)] } });
    api.setSubtract(0);
    const [five] = await api.loadSourcesDepartures(api.parseSources(encode([{ id: "A", walk: 5 }])), now);
    assert.equal(five.plannedDepartureTime, now + 5 * 60000);
    const all = await api.loadSourcesDepartures(api.parseSources(encode([{ id: "A", walk: 5 }])), now);
    assert.equal(all.length, 2);
});

test("walking is checked against the real departure, not the displayed time minus Subtract Minutes", async () => {
    const api = load({ departures: { A: [dep("S3", "Holzkirchen", 5)] } });
    api.setSubtract(1);
    const result = await api.loadSourcesDepartures(api.parseSources(encode([{ id: "A", walk: 5 }])), now);
    assert.equal(result.length, 1);
});

test("delays move a departure past the walking limit and keep it sorted", async () => {
    const api = load({ departures: {
        A: [dep("S3", "Holzkirchen", 3, { realtimeDepartureTime: now + 9 * 60000, delayInMinutes: 6 })],
        B: [dep("S4", "Trudering", 8)]
    } });
    api.setSubtract(0);
    const result = await api.loadSourcesDepartures(api.parseSources(encode([{ id: "A", walk: 5 }, { id: "B", walk: 5 }])), now);
    assert.deepEqual(clean(result.map(d => d.label)), ["S4", "S3"]);
});

test("a failing or empty station does not hide the others", async () => {
    const api = load({ departures: { B: [dep("S4", "Trudering", 10)] } });
    const result = await api.loadSourcesDepartures(api.parseSources(encode([{ id: "A" }, { id: "B" }])), now);
    assert.equal(result.length, 1);
});

test("editing a multi-station preset is refused so the stations are never erased", async () => {
    const writes = [], alerts = [];
    const api = load({ alerts, fileManager: {
        fileExists: () => true, listContents: () => ["Home.txt"], readString: () => homePreset,
        writeString: (...args) => writes.push(args), remove: (...args) => writes.push(args)
    } });
    assert.equal(await api.editSavedStation(), null);
    assert.equal(writes.length, 0);
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].title, "Multi-station preset");
    assert.match(alerts[0].message, /Home\.txt/);
});

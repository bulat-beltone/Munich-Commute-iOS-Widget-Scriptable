const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const { buildBundle, OUTPUT_FILE } = require("../build.js");

test("Munich Commute Widget.js matches a fresh build from src/", () => {
    const committedBundle = fs.readFileSync(OUTPUT_FILE, "utf8");
    const freshBundle = buildBundle();

    assert.equal(
        freshBundle,
        committedBundle,
        `"${path.basename(OUTPUT_FILE)}" is out of date with src/. Run 'node build.js' (or 'npm run build') and commit the result.`
    );
});

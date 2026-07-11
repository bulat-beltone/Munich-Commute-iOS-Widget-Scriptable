#!/usr/bin/env node
"use strict";

/**
 * Bundles the modular sources in `src/` into the single
 * `Munich Commute Widget.js` file that Scriptable actually runs.
 *
 * Scriptable (and widget parameter file sharing in general) needs one
 * self-contained script, so this concatenates the files below — in the
 * exact order listed — into flat top-level code, the same way you'd bundle
 * several source files into one `code.js` for a Figma plugin.
 *
 * Run with: `node build.js` (or `npm run build`).
 */

const fs = require("fs");
const path = require("path");

const SRC_DIR = path.join(__dirname, "src");
const OUTPUT_FILE = path.join(__dirname, "Munich Commute Widget.js");

// Explicit build order — top-level statements in these files run in this
// exact sequence, so order matters (e.g. config must exist before code that
// reads it runs). This list is the single source of truth for module order;
// it does not just rely on filename sorting.
const MODULES = [
    "01-config-user.js",
    "02-config-advanced.js",
    "03-config-widget-size.js",
    "04-colors-lines.js",
    "05-colors-gradients.js",
    "06-params-parsing.js",
    "07-utils.js",
    "08-ui-helpers.js",
    "09-api-mvg.js",
    "10-nearest-station.js",
    "11-widget-render.js",
    "12-wizard-flows.js",
    "13-main.js"
];

function buildBundle(srcDir = SRC_DIR, modules = MODULES) {
    const missing = modules.filter(name => !fs.existsSync(path.join(srcDir, name)));
    if (missing.length > 0) {
        throw new Error(`[build] Missing source module(s): ${missing.join(", ")}`);
    }

    // Each module file already ends with the newline (and, where present,
    // the blank separator line) it had in the original single-file script,
    // so a plain concatenation reproduces that layout exactly.
    const chunks = modules.map(name => fs.readFileSync(path.join(srcDir, name), "utf8"));
    return chunks.join("");
}

function build() {
    const bundle = buildBundle();
    fs.writeFileSync(OUTPUT_FILE, bundle, "utf8");
    console.log(`[build] Wrote ${OUTPUT_FILE} from ${MODULES.length} module(s) in src/.`);
}

module.exports = { buildBundle, MODULES, SRC_DIR, OUTPUT_FILE };

if (require.main === module) {
    build();
}

// ============================================================================
// LINE-MATCHED GRADIENTS
// ============================================================================
// Generates a background gradient for each line using the exact same
// lightness/saturation "recipe" as the hand-picked accent gradients above
// (red, blue, green, purple, teal): a top tone at 39% saturation / 20%
// lightness and a darker, richer bottom tone at 46% saturation / 8%
// lightness — only the hue changes, taken straight from the line's own
// badge color. That's what lets a "Match S3" suggestion look and feel like
// it belongs in the same palette as the manually curated gradients.
//
function hexToRgbChannels(hex) {
    const clean = hex.replace("#", "");
    return [
        parseInt(clean.substring(0, 2), 16),
        parseInt(clean.substring(2, 4), 16),
        parseInt(clean.substring(4, 6), 16)
    ];
}

function rgbToHueDegrees(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    if (delta === 0) return 0;

    let hue;
    if (max === r) hue = ((g - b) / delta) % 6;
    else if (max === g) hue = (b - r) / delta + 2;
    else hue = (r - g) / delta + 4;

    hue *= 60;
    return hue < 0 ? hue + 360 : hue;
}

function hslToHex(hue, saturationPercent, lightnessPercent) {
    const s = saturationPercent / 100;
    const l = lightnessPercent / 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
    const m = l - c / 2;

    let r, g, b;
    if (hue < 60) [r, g, b] = [c, x, 0];
    else if (hue < 120) [r, g, b] = [x, c, 0];
    else if (hue < 180) [r, g, b] = [0, c, x];
    else if (hue < 240) [r, g, b] = [0, x, c];
    else if (hue < 300) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];

    const toHex = channel => Math.round((channel + m) * 255).toString(16).padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

const LINE_GRADIENT_RECIPE = {
    topSaturation: 39,
    topLightness: 20,
    bottomSaturation: 46,
    bottomLightness: 8
};

function buildLineGradient(hexColor) {
    const [r, g, b] = hexToRgbChannels(hexColor);
    const hue = rgbToHueDegrees(r, g, b);
    return {
        top: hslToHex(hue, LINE_GRADIENT_RECIPE.topSaturation, LINE_GRADIENT_RECIPE.topLightness),
        bottom: hslToHex(hue, LINE_GRADIENT_RECIPE.bottomSaturation, LINE_GRADIENT_RECIPE.bottomLightness)
    };
}

// The gradient config key used for a given line, e.g. "S3" -> "s3".
function lineGradientName(line) {
    return line.toLowerCase();
}

// S8's own badge "color" is a translucent white overlay, not a real hue —
// its line-matched gradient is generated from its yellow accent text color
// instead, since that's the color that actually reads as "S8" to a rider.
const SBAHN_GRADIENT_SOURCE_COLORS = {
    S1: LINE_COLORS.SBAHN.S1,
    S2: LINE_COLORS.SBAHN.S2,
    S3: LINE_COLORS.SBAHN.S3,
    S4: LINE_COLORS.SBAHN.S4,
    S5: LINE_COLORS.SBAHN.S5,
    S6: LINE_COLORS.SBAHN.S6,
    S7: LINE_COLORS.SBAHN.S7,
    S8: LINE_COLORS.SBAHN.S8_fg,
    S20: LINE_COLORS.SBAHN.S20
};

// U7 and U8 render with a two-color gradient badge already (see
// LINE_COLORS.UBAHN above) instead of a single brand color, so there's no
// single hue to derive a line-matched gradient from — they're intentionally
// left out here.
const UBAHN_GRADIENT_SOURCE_COLORS = {
    U1: LINE_COLORS.UBAHN.U1,
    U2: LINE_COLORS.UBAHN.U2,
    U3: LINE_COLORS.UBAHN.U3,
    U4: LINE_COLORS.UBAHN.U4,
    U5: LINE_COLORS.UBAHN.U5,
    U6: LINE_COLORS.UBAHN.U6
};

for (const [line, hexColor] of Object.entries({ ...SBAHN_GRADIENT_SOURCE_COLORS, ...UBAHN_GRADIENT_SOURCE_COLORS })) {
    CONFIG.gradients[lineGradientName(line)] = buildLineGradient(hexColor);
}

// Bus, Regional Bus, and Tram badges all use a single flat brand color for
// every route (unlike S-Bahn/U-Bahn, this app doesn't assign individual
// colors per route number for surface transport), so there's one
// line-matched gradient per mode rather than one per specific line.
const SURFACE_TRANSPORT_GRADIENTS = [
    { name: "bus", label: "Match Bus", emoji: "🚌", color: LINE_COLORS.BUS },
    { name: "regionalbus", label: "Match Regional Bus", emoji: "🚍", color: LINE_COLORS.REGIONAL_BUS },
    { name: "tram", label: "Match Tram", emoji: "🚊", color: LINE_COLORS.TRAM }
];

for (const surfaceTransport of SURFACE_TRANSPORT_GRADIENTS) {
    CONFIG.gradients[surfaceTransport.name] = buildLineGradient(surfaceTransport.color);
}

// When a preset's line filter narrows down to exactly one line, this
// returns the gradient suggestion(s) that match that line's own color:
//  - a single suggestion when it's a known S-Bahn or U-Bahn line with a
//    generated gradient (U7/U8 are excluded — see above)
//  - none when it's a known rail line without a generated gradient (U7/U8)
//  - all three surface-transport suggestions when the line isn't a
//    recognized S-Bahn/U-Bahn label — Bus/Regional Bus/Tram routes aren't
//    individually distinguishable by color in this app, so we can't tell
//    which of the three a given line number belongs to and offer all of
//    them as candidates instead
//  - none when the filter covers zero or multiple lines
function getLineGradientSuggestions(linesFilterText) {
    const parsedLines = parseLineFilter(linesFilterText);
    if (!parsedLines || parsedLines.length !== 1) return [];

    const [line] = parsedLines;
    // U7/U8 don't have a plain LINE_COLORS.UBAHN[line] entry (only their
    // "_gradient_top"/"_gradient_bottom" pair), so they need an explicit
    // check to still be recognized as rail lines here.
    const isRailLine = Boolean(
        LINE_COLORS.SBAHN[line] || LINE_COLORS.UBAHN[line] || LINE_COLORS.UBAHN[`${line}_gradient_top`]
    );

    if (isRailLine) {
        const gradientName = lineGradientName(line);
        if (!CONFIG.gradients[gradientName]) return []; // U7 / U8 — no single hue
        return [{ name: gradientName, label: `Match ${line}`, emoji: "🎨", lineLabel: line }];
    }

    return SURFACE_TRANSPORT_GRADIENTS.map(surfaceTransport => ({
        name: surfaceTransport.name,
        label: surfaceTransport.label,
        emoji: surfaceTransport.emoji,
        lineLabel: line
    }));
}


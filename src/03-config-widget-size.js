// ============================================================================
// WIDGET SIZE CONFIGURATION
// ============================================================================

const WIDGET_CONFIG = {
    primaryDepartureFontSize: 24,
    secondaryDepartureFontSize: 18,
    lineBadgeSize: new Size(24, 15),
    lineBadgeFont: Font.boldSystemFont(11),
    platformBadgeSize: new Size(13, 13),
    platformBadgeFont: Font.boldSystemFont(10),
    destinationFont: Font.caption2(),
    textWithOpacity: 0.5,
    delayFont: Font.boldSystemFont(12),

    small: {
        itemsCount: 2,
        stationNameFont: Font.semiboldSystemFont(13),
        iconSize: new Size(16, 16)
    },
    medium: {
        itemsCount: 4,
        columns: 2,
        stationNameFont: Font.semiboldSystemFont(13),
        iconSize: new Size(16, 16)
    },
    large: {
        itemsCount: 6,
        stationNameFont: Font.semiboldSystemFont(16),
        iconSize: new Size(16, 16)
    }
};

const WIDGET_SIZES = ["small", "medium", "large"];

function getWidgetConfig(widgetSize) {
    const sizeConfig = WIDGET_CONFIG[widgetSize] || WIDGET_CONFIG.large;
    const shared = {};
    for (const key of Object.keys(WIDGET_CONFIG)) {
        if (!WIDGET_SIZES.includes(key)) shared[key] = WIDGET_CONFIG[key];
    }
    return { ...shared, ...sizeConfig };
}


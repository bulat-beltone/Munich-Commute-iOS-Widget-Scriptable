// ============================================================================
// MAIN EXECUTION
// ============================================================================

// Maps each main-menu action id to the handler that runs it (including any
// follow-up logging/instructions). Unmapped ids (e.g. cancel) fall through.
const MAIN_MENU_HANDLERS = {
    [MAIN_MENU_ACTION.CREATE_SAVED_STATION]: async () => {
        const savedProfile = await createSavedStation();
        if (savedProfile) {
            console.log(`[INFO]   - Created saved station profile: '${savedProfile}'`);
            await showPostCreateInstructions(savedProfile);
        }
    },
    [MAIN_MENU_ACTION.EDIT_SAVED_STATION]: async () => {
        const editedProfile = await editSavedStation();
        if (editedProfile) console.log(`[INFO]   - Edited saved station profile: '${editedProfile}'`);
    },
    [MAIN_MENU_ACTION.VIEW_SAVED_STATION]: async () => {
        const viewedProfile = await viewSavedStation();
        if (viewedProfile) console.log('[INFO]   - Viewed saved station profile.');
    },
    // Find Nearest handles its own preview loop and optional save, so there is
    // nothing to render afterwards.
    [MAIN_MENU_ACTION.FIND_NEAREST_STATION]: () => findNearestStation(),
    [MAIN_MENU_ACTION.SETTINGS]: () => showSettings(),
    [MAIN_MENU_ACTION.HOW_TO_ADD_WIDGET]: () => showHowToAddWidgetInstructions()
};

async function main() {
    console.log('[INFO] Munich Commute Widget script started');
    loadSettings();
    console.log('[INFO] Step 1: Parsing parameters...');
    console.log(`[INFO]   - Station: '${userStation}'`);
    console.log(`[INFO]   - Platforms: '${userPlatforms}'`);
    console.log(`[INFO]   - Lines: '${userLines}'`);
    console.log(`[INFO]   - Gradient: '${userGradient}'`);
    console.log(`[INFO]   - Transport Types: using default configuration`);

    // Check if launched from widget tap (not running inside widget, but has widget parameter or launched from home screen)
    const launchedFromWidgetTap = !config.runsInWidget && (config.runsFromHomeScreen || args.widgetParameter);

    if (!config.runsInWidget && !launchedFromWidgetTap) {
        const menuChoice = await showMainMenu();
        const menuAction = getMainMenuActionForIndex(menuChoice);
        const handler = MAIN_MENU_HANDLERS[menuAction];

        if (handler) {
            await handler();
        } else {
            console.log('[INFO]   - User cancelled main menu.');
        }
        return;
    } else if (launchedFromWidgetTap) {
        console.log('[INFO]   - Launched from widget tap, skipping menu and showing widget directly.');
    }

    const widget = await createWidget();
    console.log('[INFO] Step 7: Widget construction complete.');

    if (!config.runsInWidget) {
        const widgetSize = config.widgetFamily || 'large';
        console.log(`[INFO] Step 8: Presenting ${widgetSize} widget preview.`);
        await presentWidgetPreview(widget, widgetSize);

        // Tapping a "nearest" widget resolves a station dynamically, just
        // like a preset — so once this preview is closed, offer the same
        // filter/action menu as Find Nearest Station (Platform first).
        if (nearestMode && resolvedGlobalId) {
            await runNearestStationMenu({
                stationName: userStation,
                initialLines: userLines ? userLines.join(", ") : "",
                initialPlatform: userPlatforms ? userPlatforms.join(", ") : ""
            });
        }
    }

    Script.setWidget(widget);
    console.log('[INFO] Step 9: Script finished.');
}

await main();
Script.complete();

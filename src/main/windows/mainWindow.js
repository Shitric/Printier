const { BrowserWindow, app } = require('electron');
const path = require('path');
const { getAssetsPath, getHtmlPath } = require('../../shared/helpers');
const globals = require('../../shared/globals');
const logger = require('../../utils/logger');

const createMainWindow = (show = true) => {
    logger.info(null, 'Creating main application window');
    const mainWindow = new BrowserWindow({
        width: 1100,
        height: 700,
        minWidth: 1100,
        minHeight: 700,
        show: show,
        skipTaskbar: true,
        maximizable: true,
        autoHideMenuBar: true,
        icon: getAssetsPath(globals.appIcon),
        title: "Printier",
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            preload: app.isPackaged 
                ? path.join(process.resourcesPath, "public", "scripts", "preload.js")
                : path.join(__dirname, "../../../public/scripts/preload.js")
        },
    });

    globals.setMainWindow(mainWindow);
    mainWindow.loadFile(getHtmlPath('index.html'));
    mainWindow.setTitle('Printier');
    logger.info(null, 'Main window configuration and content loaded successfully');

    mainWindow.on("close", (event) => {
        if (!globals.isQuitting()) {
            event.preventDefault();
            mainWindow.hide();
            logger.info(mainWindow, 'Main window minimized to system tray, application running in background');
            return false;
        }
        logger.info(mainWindow, 'Main window closing, application shutdown sequence initiated');
        return true;
    });

    mainWindow.webContents.on('did-finish-load', () => {
        logger.success(null, 'Main window interface loaded and ready');
    });

    return mainWindow;
};

module.exports = createMainWindow; 
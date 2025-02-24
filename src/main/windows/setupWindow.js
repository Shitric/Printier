const { BrowserWindow, app } = require('electron');
const path = require('path');
const { getAssetsPath, getHtmlPath, getPublicPath } = require('../../shared/helpers');
const globals = require('../../shared/globals');
const logger = require('../../utils/logger');

const createSetupWindow = () => {
    globals.setupWindow = new BrowserWindow({
        width: 800,
        height: 800,
        maximizable: false,
        autoHideMenuBar: true,
        resizable: true,
        show: true,
        icon: getAssetsPath(globals.appIcon),
        title: 'Printier Setup',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            preload: app.isPackaged 
                ? path.join(process.resourcesPath, "public", "scripts", "preload.js")
                : path.join(__dirname, "../../../public/scripts/preload.js")
        }
    });

    globals.setupWindow.loadFile(getHtmlPath('setup.html'));
    globals.setupWindow.setTitle('Printier Setup');
    logger.info(globals.mainWindow, 'Setup window initialized');
};

module.exports = createSetupWindow; 
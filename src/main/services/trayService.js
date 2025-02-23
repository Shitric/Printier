const { Tray, Menu, nativeImage, dialog, app } = require('electron');
const { getAssetsPath, getPath } = require('../../shared/helpers');
const config = require('../../utils/config');
const globals = require('../../shared/globals');
const logger = require('../../utils/logger');

let tray = null;

const createTray = () => {
    logger.info(globals.mainWindow, 'Initializing system tray icon');
    const icon = getAssetsPath(globals.trayIcon);
    tray = new Tray(nativeImage.createFromPath(icon));
    
    const contextMenu = Menu.buildFromTemplate([
        { label: 'Server: Running on ' + config.getConfig('appPort'), type: 'normal', enabled: false },
        { label: '', type: 'separator'},
        { 
            label: 'Open Server', 
            type: 'normal', 
            click: () => {
                const mainWindow = globals.getMainWindow();
                if (mainWindow) {
                    mainWindow.show();
                    logger.info(mainWindow, 'Application window restored from system tray');
                }
            }
        },
        {
            label: 'Reinstall Server',
            type: 'normal',
            click: () => {
                const mainWindow = globals.getMainWindow();
                logger.warning(mainWindow, 'Server reinstallation requested by user');
                dialog.showMessageBoxSync(mainWindow, {
                    type: 'warning',
                    title: 'Warning',
                    message: 'Reinstalling Printier',
                    detail: 'This will remove all your current settings and start over. Printier will now restart and reinstall.'
                });

                config.destroyConfig();
                globals.setQuitting(true);
                logger.info(mainWindow, 'Configuration reset, initiating application reinstall');
                app.relaunch();
                app.quit();
            }
        },
        {
            label: 'About',
            type: 'normal',
            click: () => {
                const mainWindow = globals.getMainWindow();
                logger.info(mainWindow, 'Opening about dialog');
                dialog.showMessageBox({
                    type: 'info',
                    icon: getAssetsPath(globals.appIcon),
                    title: 'About',
                    message: 'Printier v1.0.0',
                    detail: 'A simple cross-platform WebSocket server that allows you to print to a network printer.\n\nAuthor: github.com/shitric'
                });
            }
        },
        {
            label: 'Quit',
            type: 'normal',
            click: () => {
                const mainWindow = globals.getMainWindow();
                logger.info(mainWindow, 'Application shutdown initiated from system tray');
                globals.setQuitting(true);
                app.quit();
            }
        }
    ]);

    tray.setToolTip('Printier');
    tray.setContextMenu(contextMenu);

    if (process.platform === 'win32') {
        tray.on('click', () => {
            const mainWindow = globals.getMainWindow();
            if (mainWindow) {
                mainWindow.show();
                logger.info(mainWindow, 'Application window restored from system tray (Windows)');
            }
        });
    }

    const mainWindow = globals.getMainWindow();
    logger.success(mainWindow, 'System tray icon and context menu initialized successfully');
};

module.exports = createTray; 
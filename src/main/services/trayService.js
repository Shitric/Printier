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
                
                const choice = dialog.showMessageBoxSync(mainWindow, {
                    type: 'warning',
                    buttons: ['Yes', 'No'],
                    defaultId: 1,
                    cancelId: 1,
                    title: 'Confirm Reinstallation',
                    message: 'Are you sure you want to reinstall Printier?',
                    detail: 'This will remove all your current settings, logs, and start over. The application will restart after reinstallation.'
                });

                if (choice === 0) {
                    try {
                        // Clear all logs
                        logger.clearLogs();
                        logger.info(mainWindow, 'All logs cleared successfully');
                        
                        // Delete old log files
                        logger.deleteOldLogs();
                        logger.info(mainWindow, 'Old log files deleted successfully');
                        
                        // Reset configuration
                        config.destroyConfig();
                        logger.info(mainWindow, 'Configuration reset successfully');
                        
                        // Set quitting flag and restart
                        globals.setQuitting(true);
                        logger.info(mainWindow, 'Configuration reset, initiating application reinstall');
                        app.relaunch();
                        app.quit();
                    } catch (error) {
                        logger.error(mainWindow, `Error during reinstallation: ${error.message}`);
                        dialog.showMessageBoxSync(mainWindow, {
                            type: 'error',
                            title: 'Reinstallation Error',
                            message: 'Failed to complete reinstallation',
                            detail: `Error: ${error.message}`
                        });
                    }
                } else {
                    logger.info(mainWindow, 'Server reinstallation cancelled by user');
                }
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
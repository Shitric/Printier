const { ipcMain, dialog, app } = require('electron');
const config = require('../../utils/config');
const logger = require('../../utils/logger');
const globals = require('../../shared/globals');
const { getAssetsPath } = require('../../shared/helpers');

const registerConfigHandlers = () => {
    const currentPort = config.getConfig('appPort');
    const currentAddress = config.getConfig('appServer');

    logger.info(globals.mainWindow, 'Registering configuration event handlers');

    ipcMain.handle('get-config', () => {
        logger.info(globals.mainWindow, 'Loading application configuration settings');
        const settings = {
            appServer: config.getConfig('appServer'),
            appPort: config.getConfig('appPort'),
            installed: config.getConfig('installed'),
            autoStart: config.getConfig('autoStart'),
            apiKey: config.getConfig('apiKey')
        };
        logger.success(globals.mainWindow, 'Configuration settings loaded successfully');
        return settings;
    });

    ipcMain.handle('save-config', async (event, settings) => {
        try {
            logger.info(globals.mainWindow, 'Processing configuration update request');
            const newPort = settings.appPort;
            const newAddress = settings.appServer;
            const needsRestart = (newPort !== currentPort || newAddress !== currentAddress);

            Object.entries(settings).forEach(([key, value]) => {
                config.setConfig(key, value);
                logger.info(globals.mainWindow, `Updated configuration: ${key} = ${value}`);
            });

            if (needsRestart) {
                logger.warning(globals.mainWindow, 'Server configuration changed, application restart required');
                dialog.showMessageBox(globals.mainWindow, {
                    type: 'warning',
                    icon: getAssetsPath(globals.appIcon),
                    title: 'Restart Required',
                    message: 'Server address or port has been changed.',
                    detail: 'Application will restart to apply changes.',
                    buttons: ['OK']
                }).then(() => {
                    logger.info(globals.mainWindow, 'Initiating application restart to apply new configuration');
                    app.relaunch();
                    app.exit();
                });
                return { success: true, restarted: true };
            }

            logger.success(globals.mainWindow, 'Configuration updated successfully');
            return { success: true, restarted: false };
        } catch (error) {
            logger.error(globals.mainWindow, `Configuration update failed: ${error.message}`);
            return { success: false, error: error.message };
        }
    });

    logger.success(globals.mainWindow, 'Configuration handlers registered successfully');
};

module.exports = registerConfigHandlers; 
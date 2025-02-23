const { app } = require('electron');
const path = require('path');

const state = {
    isQuitting: false,
    windows: {
        main: null,
        setup: null
    },
    server: {
        instance: null,
        status: {
            isRunning: false,
            port: null,
            address: null
        }
    },
    tray: null
};

const constants = {
    paths: {
        assets: {
            appIcon: path.join('images', 'app', 'icon.png'),
            trayIcon: path.join('images', 'tray', 'icon.png')
        }
    },
    settings: {
        autoLaunch: app.getLoginItemSettings()
    }
};

module.exports = {
    state,
    constants,
    setMainWindow: (window) => state.windows.main = window,
    setSetupWindow: (window) => state.windows.setup = window,
    setTray: (tray) => state.tray = tray,
    setServer: (server) => state.server.instance = server,
    setServerStatus: (status) => Object.assign(state.server.status, status),
    setQuitting: (value) => state.isQuitting = value,
    getMainWindow: () => state.windows.main,
    getSetupWindow: () => state.windows.setup,
    getTray: () => state.tray,
    getServer: () => state.server.instance,
    getServerStatus: () => state.server.status,
    isQuitting: () => state.isQuitting,
    appIcon: constants.paths.assets.appIcon,
    trayIcon: constants.paths.assets.trayIcon,
    loginItemSettings: constants.settings.autoLaunch
};
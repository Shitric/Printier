const { app } = require('electron');

module.exports = {
    appIcon: "images/app/icon.png",
    trayIcon: "images/tray/icon.png",
    loginItemSettings: app.getLoginItemSettings(),
    mainWindow: null,
    setupWindow: null,
    tray: null,
    isQuitting: false
}
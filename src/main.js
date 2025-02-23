const {app, BrowserWindow, Tray, Menu, nativeImage, dialog} = require('electron')
const { getAssetsPath, getPublicPath, getPath } = require('./helpers.js')
const { getConfig, destroyConfig } = require('./config.js')
const path = require('path')
const globals = require('./globals.js')
const https = require('https')
const fs = require('fs')
const { Server } = require('socket.io')
const {mainWindow} = require("./globals");
const {getUserDataPath} = require("./helpers");
const logger = require('./utils/logger');

const createMainWindow = (show = true) => {
    globals.mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 1200,
        minHeight: 800,
        show: show,
        skipTaskbar: true,
        maximizable: true,
        autoHideMenuBar: true,
        icon: getAssetsPath(globals.appIcon),
        title: 'Printier | Print Server',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            preload: getPath('preload.js')
        }
    })

    globals.mainWindow.loadFile(path.join(getPublicPath(), 'index.html'))

    globals.mainWindow.on("close", (event) => {
        if (!globals.isQuitting) {
            event.preventDefault();
            globals.mainWindow.hide();
            logger.info(globals.mainWindow, 'Application minimized to system tray');
        }
    });

    logger.info(globals.mainWindow, 'Initializing Printier Server...');
}

const createSetupWindow = () => {
    globals.setupWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        maximizable: false,
        autoHideMenuBar: true,
        resizable: true,
        show: true,
        icon: getAssetsPath(globals.appIcon),
        title: 'Printier | Setup',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            preload: getPath('preload.js')
        }
    })

    globals.setupWindow.loadFile(path.join(getPublicPath(), 'setup.html'))
    globals.setupWindow.webContents.openDevTools()
    logger.info(globals.mainWindow, 'Setup window initialized');
}

app.setAppUserModelId('com.shitric.printier')

app.whenReady().then(() => {
    if (getConfig('installed') === false) {
        logger.info(globals.mainWindow, 'First-time setup detected, launching installer...');
        require('./setup/installer')
        createSetupWindow()
        return;
    }

    app.dock.hide()
    logger.info(globals.mainWindow, 'Application dock hidden');

    if (globals.loginItemSettings.wasOpenedAtLogin) {
        logger.info(globals.mainWindow, 'Application started at login, running in background');
        createMainWindow(false)
    } else {
        logger.info(globals.mainWindow, 'Application started manually');
        createMainWindow(true)
    }

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            logger.info(globals.mainWindow, 'Restoring application window');
            createMainWindow(false)
        }
    })

    globals.tray = new Tray(nativeImage.createFromPath(getAssetsPath(globals.trayIcon)))
    let contextMenu = Menu.buildFromTemplate([
        { label: 'Server: Running on ' + getConfig('appPort'), type: 'normal', enabled: false },
        { label: '', type: 'separator'},
        { label: 'Open Server', type: 'normal', enabled: true, click: () => {
            logger.info(globals.mainWindow, 'Server window opened from tray');
            globals.mainWindow.show();
        }},
        {
            label: 'Reinstall Server',
            type: 'normal',
            enabled: true,
            click: () => {
                logger.warning(globals.mainWindow, 'Server reinstallation initiated');
                dialog.showMessageBoxSync(mainWindow,{
                    type: 'warning',
                    title: 'Warning',
                    message: 'Reinstalling Printier will remove all your current settings and start over.',
                    detail: 'Printier will now restart and reinstall.'
                })

                destroyConfig()
                globals.isQuitting = true;
                logger.info(globals.mainWindow, 'Configuration destroyed, restarting application');
                app.relaunch()
                app.quit()
            }
        },
        {
            label: 'About',
            type: 'normal',
            enabled: true,
            click: () => {
                logger.info(globals.mainWindow, 'About dialog opened');
                dialog.showMessageBox({
                    type: 'info',
                    icon: getAssetsPath(globals.appIcon),
                    title: 'About',
                    message: 'Printier v1.0.0',
                    detail: 'A simple cross-platform WebSocket server that allows you to print to a network printer.\n\nAuthor: github.com/shitric'
                })
            }
        },
        {
            label: 'Quit',
            type: 'normal',
            click: () => {
                logger.info(globals.mainWindow, 'Application shutdown initiated');
                globals.isQuitting = true;
                app.quit()
            }
        }
    ])
    globals.tray.setToolTip('Printier')
    globals.tray.setContextMenu(contextMenu)
    logger.info(globals.mainWindow, 'System tray icon and menu initialized');

    if (globals.loginItemSettings.openAtLogin === false) {
        app.setLoginItemSettings({
            openAtLogin: true,
            openAsHidden: true
        })
        logger.info(globals.mainWindow, 'Auto-start at login enabled');

        dialog.showMessageBoxSync(mainWindow,{
            type: 'info',
            icon: getPath(globals.appIcon),
            title: 'Printier',
            message: 'Printier will now start on login',
            detail: "If you don't want to start on login, go to System Preferences or Task Manager and disable the Printier entry."
        })
    }

    const server = https.createServer({
        key: fs.readFileSync(path.join(getUserDataPath(), "certs", "printier.software-key.pem"), "utf8"),
        cert: fs.readFileSync(path.join(getUserDataPath(), "certs", "printier.software.pem"), "utf8")
    },function (req, res) {
        logger.info(globals.mainWindow, `Incoming HTTPS request from ${req.socket.remoteAddress}`);
        res.writeHead(200, { 'Content-Type': 'text/plain' })
        res.end('Printier Server Running\n')
    })
    const io = new Server(server, {
        cors: { origin: "*" }
    })
    logger.info(globals.mainWindow, 'HTTPS server and Socket.IO initialized');

    io.on('connection', (socket) => {
        const clientInfo = `Client ${socket.id} (${socket.handshake.address})`;
        logger.success(globals.mainWindow, `New client connected: ${clientInfo}`);
        logger.sendStatus(globals.mainWindow, true);

        socket.on("print", (data) => {
            logger.info(globals.mainWindow, `Print request received from ${clientInfo}:`);
            logger.info(globals.mainWindow, `Print data: ${JSON.stringify(data, null, 2)}`);
            
            const printerAvailable = true;
            
            if (printerAvailable) {
                socket.emit("print_status", { status: "success" });
                logger.success(globals.mainWindow, `Print job completed successfully for ${clientInfo}`);
            } else {
                socket.emit("print_status", { status: "error", message: "Printer not available" });
                logger.error(globals.mainWindow, `Print job failed: Printer not available for ${clientInfo}`);
            }
        });

        socket.on("disconnect", (reason) => {
            logger.info(globals.mainWindow, `Client disconnected: ${clientInfo} (Reason: ${reason})`);
            logger.sendStatus(globals.mainWindow, io.sockets.sockets.size > 0);
        });

        socket.on("error", (error) => {
            logger.error(globals.mainWindow, `Socket error for ${clientInfo}: ${error.message}`);
            logger.sendStatus(globals.mainWindow, io.sockets.sockets.size > 0);
        });
    })

    server.listen(getConfig('appPort'), '0.0.0.0', () => {
        logger.success(globals.mainWindow, `Server started successfully on port ${getConfig('appPort')}`);
        logger.info(globals.mainWindow, `Server is ready to accept connections`);
    })

    server.on('error', (error) => {
        logger.error(globals.mainWindow, `Server error: ${error.message}`);
        if (error.code === 'EADDRINUSE') {
            logger.error(globals.mainWindow, `Port ${getConfig('appPort')} is already in use`);
        }
    });
})

app.on('window-all-closed', (event) => {
    if (!globals.isQuitting && getConfig('installed') === true) {
        logger.info(globals.mainWindow, 'All windows closed, keeping application running in background');
        event.preventDefault();
        return;
    }

    if (process.platform !== 'darwin') {
        logger.info(globals.mainWindow, 'Application shutdown complete');
        app.quit()
    }
})
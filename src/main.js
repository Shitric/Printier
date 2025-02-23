const {app, BrowserWindow, Tray, Menu, nativeImage, dialog} = require('electron')
const { getAssetsPath, getPublicPath, getPath, isPortAvailable } = require('./helpers.js')
const { getConfig, destroyConfig } = require('./config.js')
const path = require('path')
const globals = require('./globals.js')
const https = require('https')
const fs = require('fs')
const { Server } = require('socket.io')
const {mainWindow} = require("./globals");
const {getUserDataPath} = require("./helpers");

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
            preload: getPath('preload.js')
        }
    })

    globals.mainWindow.loadFile(path.join(getPublicPath(), 'index.html'))

    globals.mainWindow.on("close", (event) => {
        if (!globals.isQuitting) {
            event.preventDefault();
            globals.mainWindow.hide();
        }
    });
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
}

app.setAppUserModelId('com.shitric.printier')

app.whenReady().then(() => {
    if (getConfig('installed') === false) {
        require('./setup/installer')
        createSetupWindow()
        return;
    }

    app.dock.hide()

    if (globals.loginItemSettings.wasOpenedAtLogin) {
        createMainWindow(false)
    } else {
        createMainWindow(true)
    }

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createMainWindow(false)
    })

    globals.tray = new Tray(nativeImage.createFromPath(getAssetsPath(globals.trayIcon)))
    let contextMenu = Menu.buildFromTemplate([
        { label: 'Server: Running on ' + getConfig('appPort'), type: 'normal', enabled: false },
        { label: '', type: 'separator'},
        { label: 'Open Server', type: 'normal', enabled: true, click: () => globals.mainWindow.show()},
        {
            label: 'Reinstall Server',
            type: 'normal',
            enabled: true,
            click: () => {
                dialog.showMessageBoxSync(mainWindow,{
                    type: 'warning',
                    title: 'Warning',
                    message: 'Reinstalling Printier will remove all your current settings and start over.',
                    detail: 'Printier will now restart and reinstall.'
                })

                destroyConfig()
                globals.isQuitting = true;
                app.relaunch()
                app.quit()
            }
        },
        {
            label: 'About',
            type: 'normal',
            enabled: true,
            click: () => (
                dialog.showMessageBox({
                    type: 'info',
                    icon: getAssetsPath(globals.appIcon),
                    title: 'About',
                    message: 'Printier v1.0.0',
                    detail: 'A simple cross-platform WebSocket server that allows you to print to a network printer.\n\nAuthor: github.com/shitric'
                })
            )
        },
        {
            label: 'Quit',
            type: 'normal',
            click: () => {
                globals.isQuitting = true;
                app.quit()
            }
        }
    ])
    globals.tray.setToolTip('Printier')
    globals.tray.setContextMenu(contextMenu)

    if (globals.loginItemSettings.openAtLogin === false) {
        app.setLoginItemSettings({
            openAtLogin: true,
            openAsHidden: true
        })

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
        res.writeHead(200, { 'Content-Type': 'text/plain' })
        res.end('Printier Server Running\n')
    })
    const io = new Server(server, {
        cors: { origin: "*" }
    })

    io.on('connection', (socket) => {
        console.log('Client connected')

        socket.on("print", (data) => {
            console.log("Print Request:", data);
            socket.emit("print_status", { status: "success" });
        });

        socket.on("disconnect", () => {
            console.log("Client disconnected");
        });
    })

    server.listen(getConfig('appPort'), '0.0.0.0',() => {
        console.log('Server running on port' + getConfig('appPort'))
    })
})

app.on('window-all-closed', (event) => {
    if (!globals.isQuitting && getConfig('installed') === true) {
        event.preventDefault();
        return;
    }

    if (process.platform !== 'darwin') {
        app.quit()
    }
})
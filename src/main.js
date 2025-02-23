const {app, BrowserWindow, Tray, Menu, nativeImage, dialog} = require('electron')
const { getAssetsPath, getPublicPath, getPath } = require('./helpers.js')
const { getConfig } = require('./config.js')
const path = require('path')
const globals = require('./globals.js')
const http = require('http')
const { Server } = require('socket.io')

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
        width: 600,
        height: 400,
        show: true,
        icon: getAssetsPath(globals.appIcon),
        title: 'Printier | Setup',
        webPreferences: {
            nodeIntegration: true,
            preload: getPath('preload.js')
        }
    })

    globals.setupWindow.loadFile(path.join(getPublicPath(), 'setup.html'))
}

app.setAppUserModelId('com.shitric.printier')

app.whenReady().then(() => {
    if (globals.loginItemSettings.wasOpenedAtLogin) {
        createMainWindow(false)
        app.dock.hide()
    } else {
        createMainWindow(true)
    }

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createMainWindow(false)
    })

    console.log(getAssetsPath(globals.trayIcon))

    globals.tray = new Tray(nativeImage.createFromPath(getAssetsPath(globals.trayIcon)))
    let contextMenu = Menu.buildFromTemplate([
        { label: 'Server: Running on ' + getConfig('appPort'), type: 'normal', enabled: false },
        { label: '', type: 'separator'},
        { label: 'Open Server', type: 'normal', enabled: true, click: () => globals.mainWindow.show()},
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

    const server = http.createServer({

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

    server.listen(getConfig('appPort'),'0.0.0.0',() => {
        console.log('Server running on port' + getConfig('appPort'))
    })

})

app.on('window-all-closed', (event) => {
    if (!globals.isQuitting) {
        event.preventDefault();
        return;
    }

    if (process.platform !== 'darwin') {
        app.quit()
    }
})
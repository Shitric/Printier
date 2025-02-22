const {app, BrowserWindow, Tray, Menu, nativeImage, dialog} = require('electron')
const path = require('node:path')
const http = require('http')
const { Server } = require('socket.io')

let mainWindow = null;
let tray = null;
let appPort = 4000;
let isQuitting = false;
let trayIcon = 'resources/icons/tray/icon.png';
let appIcon = 'resources/icons/app/icon.png';
let loginItemSettings = app.getLoginItemSettings();

const server = http.createServer()
const io = new Server(server, {
    cors: { origin: "*" }
})

const getPath = (...paths) => {
    return app.isPackaged
        ? path.join(process.resourcesPath, ...paths)
        : path.join(__dirname, ...paths);
};

const createMainWindow = (show = true) => {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 1200,
        minHeight: 800,
        show: show,
        skipTaskbar: true,
        maximizable: true,
        autoHideMenuBar: true,
        icon: getPath(trayIcon),
        title: 'Printier | Print Server',
        webPreferences: {
            nodeIntegration: true,
            preload: getPath('preload.js')
        }
    })

    mainWindow.loadFile(getPath('resources/html/index.html'))

    mainWindow.on("close", (event) => {
        if (!isQuitting) {
            event.preventDefault();
            mainWindow.hide();
        }
    });
}

app.setAppUserModelId('com.shitric.printier')

if (process.platform === 'darwin') {
    app.dock.hide()
}

app.whenReady().then(() => {
    if (loginItemSettings.wasOpenedAtLogin) {
        createMainWindow(false)
    } else {
        createMainWindow(true)
    }

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createMainWindow(false)
    })

    tray = new Tray(nativeImage.createFromPath(getPath(trayIcon)))
    let contextMenu = Menu.buildFromTemplate([
        { label: 'Server: Running on ', type: 'normal', enabled: false },
        { label: '', type: 'separator'},
        { label: 'Open Server', type: 'normal', enabled: true, click: () => mainWindow.show()},
        {
            label: 'About',
            type: 'normal',
            enabled: true,
            click: () => (
                dialog.showMessageBox({
                    type: 'info',
                    icon: getPath(appIcon),
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
                isQuitting = true;
                app.quit()
            }
        }
    ])
    tray.setToolTip('Printier')
    tray.setContextMenu(contextMenu)

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

    server.listen(appPort,() => {
        console.log('Server running on port ' + appPort)
    })

    if (loginItemSettings.openAtLogin === false) {
        app.setLoginItemSettings({
            openAtLogin: true,
            openAsHidden: true
        })

        dialog.showMessageBoxSync(mainWindow,{
            type: 'info',
            icon: getPath(appIcon),
            title: 'Printier',
            message: 'Printier will now start on login',
            detail: "If you don't want to start on login, go to System Preferences or Task Manager and disable the Printier entry."
        })
    }
})

app.on('window-all-closed', (event) => {
    if (!isQuitting) {
        event.preventDefault();
        return;
    }

    if (process.platform !== 'darwin') {
        app.quit()
    }
})
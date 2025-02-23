const { app, BrowserWindow } = require('electron');
const config = require('./src/utils/config');
const globals = require('./src/shared/globals');
const logger = require('./src/utils/logger');

const createMainWindow = require('./src/main/windows/mainWindow');
const createSetupWindow = require('./src/main/windows/setupWindow');
const createTray = require('./src/main/services/trayService');
const startServer = require('./src/main/services/serverService');
const registerConfigHandlers = require('./src/main/handlers/configHandler');
const registerLogHandlers = require('./src/main/handlers/logHandler');

if (!app.isPackaged) {
	logger.info(null, 'Running in development mode with hot reload enabled');
	require("electron-reload")(__dirname, {
		electron: require(`${__dirname}/node_modules/electron`),
	});
}

if (process.platform === 'win32') {
	app.setAppUserModelId('com.shitric.printier');
}

app.whenReady().then(async () => {
	logger.info(null, 'Application startup initiated');
	registerConfigHandlers();
	registerLogHandlers();

	if (config.getConfig('installed') === false) {
		logger.info(null, 'First-time setup detected, launching installer wizard');
		require('./src/setup/installer');
		createSetupWindow();
		return;
	}

	// Hide dock on macOS
	if (process.platform === 'darwin') {
		logger.info(null, 'Running on macOS, hiding dock icon');
		app.dock.hide();
	}

	// Create window
	if (globals.loginItemSettings.wasOpenedAtLogin) {
		logger.info(null, 'Application started at system startup, running in background');
		createMainWindow(false);
	} else {
		logger.info(null, 'Application started manually by user');
		createMainWindow(true);
	}

	// Create system tray icon
	createTray();

	// Start WebSocket server
	try {
		const server = await startServer();
		globals.setServer(server);
		globals.setServerStatus({
			isRunning: true,
			port: config.getConfig('appPort'),
			address: config.getConfig('appServer')
		});
	} catch (error) {
		logger.error(globals.getMainWindow(), `Failed to start server: ${error.message}`);
	}

	// Window management for macOS
	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createMainWindow(true);
			if (process.platform === 'darwin') {
				logger.info(null, 'Showing dock icon and restoring window on macOS');
				app.dock.show();
			}
		}
	});

	// Auto-start settings
	if (globals.loginItemSettings.openAtLogin === false) {
		app.setLoginItemSettings({
			openAtLogin: true,
			openAsHidden: true
		});
		logger.info(null, 'Auto-start at system login enabled');
	}
});

// When all windows are closed
app.on('window-all-closed', (event) => {
	event.preventDefault();
	if (process.platform === 'darwin') {
		logger.info(null, 'All windows closed on macOS, hiding dock icon');
		app.dock.hide();
	}
	logger.info(null, 'All windows closed, application continues running in background');
});

// Quit app
app.on('before-quit', () => {
	globals.setQuitting(true);
	const server = globals.getServer();
	if (server) {
		server.close(() => {
			logger.info(null, 'WebSocket server shutdown completed');
			globals.setServerStatus({ isRunning: false });
		});
	}
});
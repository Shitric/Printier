const { ipcMain } = require('electron');
const fs = require('fs');
const logger = require('../../utils/logger');
const globals = require('../../shared/globals');

const registerLogHandlers = () => {
    ipcMain.handle('get-log-content', () => {
        try {
            const logFile = logger.getLogFile();
            if (fs.existsSync(logFile)) {
                return fs.readFileSync(logFile, 'utf8');
            }
            return 'Log file not found.';
        } catch (error) {
            logger.error(globals.mainWindow, `Failed to read log file: ${error.message}`);
            return 'Failed to read log file.';
        }
    });

    ipcMain.handle('clear-logs', () => {
        try {
            logger.clearLogs();
            logger.info(globals.mainWindow, 'Logs cleared');
            return true;
        } catch (error) {
            logger.error(globals.mainWindow, `Failed to clear logs: ${error.message}`);
            return false;
        }
    });
};

module.exports = registerLogHandlers; 
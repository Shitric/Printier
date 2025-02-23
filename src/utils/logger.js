const fs = require('fs');
const path = require('path');
const { getUserDataPath } = require('../shared/helpers');
const globals = require('../shared/globals');

const LOG_TYPES = {
    INFO: 'INFO',
    ERROR: 'ERROR',
    WARNING: 'WARNING',
    SUCCESS: 'SUCCESS'
};

const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARNING: 2,
    ERROR: 3,
    SUCCESS: 4
};

class Logger {
    constructor() {
        this.logs = [];
        this.maxLogs = 1000; // Keep last 1000 logs in memory
        this.logLevel = LOG_LEVELS.INFO; // Default log level
        this.maxFileSize = 5 * 1024 * 1024; // 5MB
        this.maxFiles = 5; // Keep 5 rotated files
        this.logDir = path.join(getUserDataPath(), 'logs');
        this.logFile = path.join(this.logDir, 'printier.log');

        // Create logs directory if it doesn't exist
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    setLogLevel(level) {
        if (LOG_LEVELS[level] !== undefined) {
            this.logLevel = LOG_LEVELS[level];
        }
    }

    shouldLog(type) {
        const typeLevel = LOG_LEVELS[type] || LOG_LEVELS.INFO;
        return typeLevel >= this.logLevel;
    }

    rotateLogFile() {
        if (!fs.existsSync(this.logFile)) {
            return;
        }

        const stats = fs.statSync(this.logFile);
        if (stats.size >= this.maxFileSize) {
            // Rotate existing log files
            for (let i = this.maxFiles - 1; i > 0; i--) {
                const oldFile = `${this.logFile}.${i}`;
                const newFile = `${this.logFile}.${i + 1}`;
                if (fs.existsSync(oldFile)) {
                    if (i === this.maxFiles - 1) {
                        fs.unlinkSync(oldFile); // Delete oldest log file
                    } else {
                        fs.renameSync(oldFile, newFile);
                    }
                }
            }
            // Rename current log file
            fs.renameSync(this.logFile, `${this.logFile}.1`);
        }
    }

    formatLogEntry(type, message) {
        const now = new Date();
        const timestamp = now.toISOString();
        return `[${timestamp}] [${type}] ${message}\n`;
    }

    writeToFile(type, message) {
        try {
            this.rotateLogFile();
            const logEntry = this.formatLogEntry(type, message);
            fs.appendFileSync(this.logFile, logEntry);
        } catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }

    sendLog(window, type, message) {
        if (!LOG_TYPES[type]) {
            type = LOG_TYPES.INFO;
        }

        if (!this.shouldLog(type)) {
            return;
        }

        const logEntry = {
            timestamp: new Date(),
            type,
            message
        };

        // Add to memory logs
        this.logs.push(logEntry);
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }

        // Write to file
        this.writeToFile(type, message);

        // Send to renderer if window exists
        const mainWindow = window || globals.getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('server-log', { type, message });
        }
    }

    sendStatus(window, isConnected) {
        const mainWindow = window || globals.getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('server-status', isConnected);
        }
    }

    info(window, message) {
        this.sendLog(window, LOG_TYPES.INFO, message);
    }

    error(window, message) {
        this.sendLog(window, LOG_TYPES.ERROR, message);
    }

    warning(window, message) {
        this.sendLog(window, LOG_TYPES.WARNING, message);
    }

    success(window, message) {
        this.sendLog(window, LOG_TYPES.SUCCESS, message);
    }

    debug(window, message) {
        this.sendLog(window, 'DEBUG', message);
    }

    getLogs() {
        return this.logs;
    }

    getLogFile() {
        return this.logFile;
    }

    getLogFiles() {
        const files = [];
        files.push(this.logFile);
        for (let i = 1; i <= this.maxFiles; i++) {
            const rotatedFile = `${this.logFile}.${i}`;
            if (fs.existsSync(rotatedFile)) {
                files.push(rotatedFile);
            }
        }
        return files;
    }

    clearLogs() {
        this.logs = [];
        try {
            fs.writeFileSync(this.logFile, ''); // Clear current log file
        } catch (error) {
            console.error('Failed to clear log file:', error);
        }
    }

    deleteOldLogs() {
        try {
            const files = this.getLogFiles();
            files.forEach(file => {
                if (fs.existsSync(file)) {
                    const stats = fs.statSync(file);
                    const daysOld = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);
                    if (daysOld > 30) { // Delete logs older than 30 days
                        fs.unlinkSync(file);
                    }
                }
            });
        } catch (error) {
            console.error('Failed to delete old logs:', error);
        }
    }
}

// Singleton instance
const logger = new Logger();

// Clean up old logs on startup
logger.deleteOldLogs();

module.exports = logger; 
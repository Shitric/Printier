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
        this.maxFiles = 30; // Keep 30 days of logs
        this.logDir = path.join(getUserDataPath(), 'logs');
        this.currentDate = new Date().toISOString().split('T')[0];
        this.logFile = this.getLogFilePath();

        // Create logs directory if it doesn't exist
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    getLogFilePath() {
        const date = new Date().toISOString().split('T')[0];
        return path.join(this.logDir, `printier-${date}.log`);
    }

    checkAndRotateLogFile() {
        const currentDate = new Date().toISOString().split('T')[0];
        
        // If date has changed, update logFile path
        if (currentDate !== this.currentDate) {
            this.currentDate = currentDate;
            this.logFile = this.getLogFilePath();
        }

        // Delete logs older than maxFiles days
        this.deleteOldLogs();
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

    formatLogEntry(type, message) {
        const now = new Date();
        const timestamp = now.toISOString();
        return `[${timestamp}] [${type}] ${message}\n`;
    }

    writeToFile(type, message) {
        try {
            this.checkAndRotateLogFile();
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
        try {
            const files = fs.readdirSync(this.logDir)
                .filter(file => file.startsWith('printier-') && file.endsWith('.log'))
                .map(file => path.join(this.logDir, file));
            return files;
        } catch (error) {
            console.error('Failed to get log files:', error);
            return [];
        }
    }

    clearLogs() {
        this.logs = [];
        try {
            const files = this.getLogFiles();
            files.forEach(file => {
                if (fs.existsSync(file)) {
                    fs.unlinkSync(file);
                }
            });
        } catch (error) {
            console.error('Failed to clear logs:', error);
        }
    }

    deleteOldLogs() {
        try {
            const files = this.getLogFiles();
            const now = new Date();
            
            files.forEach(file => {
                const fileName = path.basename(file);
                const dateMatch = fileName.match(/printier-(\d{4}-\d{2}-\d{2})\.log/);
                
                if (dateMatch) {
                    const logDate = new Date(dateMatch[1]);
                    const daysDiff = (now - logDate) / (1000 * 60 * 60 * 24);
                    
                    if (daysDiff > this.maxFiles) {
                        fs.unlinkSync(file);
                        console.log(`Deleted old log file: ${fileName}`);
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

module.exports = logger; 
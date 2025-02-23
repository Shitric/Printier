const { getUserDataPath } = require("./helpers");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require('uuid')

const configPath = path.join(getUserDataPath(), "config.json");

const defaultConfig = {
    appServer: "http://printier.server",
    appPort: 4000,
    apiKey: uuidv4(),
    autoStart: true,
    installed: false
};

function loadConfig() {
    if (!fs.existsSync(configPath)) {
        saveConfig(defaultConfig);
        return defaultConfig;
    }
    try {
        return JSON.parse(fs.readFileSync(configPath, "utf8"));
    } catch (error) {
        console.error("Config read error:", error);
        return defaultConfig;
    }
}

function saveConfig(config) {
    try {
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
    } catch (error) {
        console.error("Config write error:", error);
    }
}

function setConfig(key, value) {
    const config = loadConfig();
    config[key] = value;
    saveConfig(config);
}

function getConfig(key) {
    const config = loadConfig();
    return key ? config[key] : config;
}

module.exports = { getConfig, setConfig };
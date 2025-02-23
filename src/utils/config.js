const { getUserDataPath } = require("../shared/helpers");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require('uuid');

class Config {
    constructor() {
        this.configPath = path.join(getUserDataPath(), "config.json");
        this.defaultConfig = {
            appServer: "",
            appPort: 4000,
            apiKey: uuidv4(),
            autoStart: true,
            installed: false
        };

        if (!fs.existsSync(this.configPath)) {
            console.log("Config file not found, creating with default values...");
            this.saveConfig(this.defaultConfig);
        }
    }

    loadConfig() {
        try {
            const savedConfig = JSON.parse(fs.readFileSync(this.configPath, "utf8"));
            const mergedConfig = { ...this.defaultConfig, ...savedConfig };
            
            if (!mergedConfig.apiKey) {
                mergedConfig.apiKey = uuidv4();
                this.saveConfig(mergedConfig);
            }
            
            return mergedConfig;
        } catch (error) {
            console.error("Config read error:", error);
            this.saveConfig(this.defaultConfig);
            return this.defaultConfig;
        }
    }

    saveConfig(config) {
        try {
            fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), "utf8");
        } catch (error) {
            console.error("Config write error:", error);
        }
    }

    setConfig(key, value) {
        const config = this.loadConfig();
        config[key] = value;
        this.saveConfig(config);
    }

    getConfig(key) {
        const config = this.loadConfig();
        return key ? config[key] : config;
    }

    destroyConfig() {
        if (fs.existsSync(this.configPath)) {
            fs.unlinkSync(this.configPath);
        }
        this.saveConfig(this.defaultConfig);
        return true;
    }
}

// Singleton instance
const config = new Config();

module.exports = config;
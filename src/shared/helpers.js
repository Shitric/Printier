const { app } = require("electron");
const path = require("path");
const fs = require("fs");

function getUserDataPath() {
    return app.getPath("userData");
}

function getPath(filename) {
    return app.isPackaged
        ? path.join(process.resourcesPath, filename)
        : path.join(__dirname, filename);
}

function getPublicPath() {
    return app.isPackaged
        ? path.join(process.resourcesPath, "public")
        : path.join(__dirname, "../../public");
}

function getHtmlPath(filename) {
    const htmlPath = app.isPackaged
        ? path.join(process.resourcesPath, "public", filename)
        : path.join(__dirname, "../../public", filename);

    if (!fs.existsSync(htmlPath)) {
        console.error(`HTML file not found: ${htmlPath}`);
        throw new Error(`HTML file not found: ${filename}`);
    }

    return htmlPath;
}

function getAssetsPath(filename) {
    const assetsPath = path.join(getPublicPath(), "assets", filename);
    
    if (!fs.existsSync(assetsPath)) {
        console.error(`Asset file not found: ${assetsPath}`);
        throw new Error(`Asset file not found: ${filename}`);
    }

    return assetsPath;
}

function fileExists(filepath) {
    return fs.existsSync(filepath);
}

module.exports = {
    getUserDataPath,
    getPublicPath,
    getAssetsPath,
    getHtmlPath,
    getPath,
    fileExists,
};
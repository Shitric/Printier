const { app } = require("electron");
const path = require("path");
const fs = require("fs");

function getUserDataPath() {
    return app.getPath("userData");
}

function getPath(filename) {
    return app.isPackaged
        ? path.join(app.getPath(), filename)
        : path.join(__dirname, filename);
}

function getPublicPath() {
    return app.isPackaged
        ? path.join(process.resourcesPath, "public")
        : path.join(__dirname, "../../public");
}

function getAssetsPath(filename) {
    return path.join(getPublicPath(), "assets", filename);
}

function fileExists(filepath) {
    return fs.existsSync(filepath);
}

module.exports = {
    getUserDataPath,
    getPublicPath,
    getAssetsPath,
    getPath,
    fileExists,
};
const { app } = require("electron");
const path = require("path");
const fs = require("fs");
const net = require("net");

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
        ? path.join(process.resourcesPath)
        : path.join(__dirname, "..", "public");
}

function getAssetsPath(filename) {
    return path.join(getPublicPath(), "assets", filename);
}

function fileExists(filepath) {
    return fs.existsSync(filepath);
}

function isPortAvailable(port) {
    return new Promise((resolve) => {
        const server = net.createServer();

        server.once("error", (err) => {
            if (err.code === "EADDRINUSE") {
                resolve(false);
            } else {
                resolve(true);
            }
        });

        server.once("listening", () => {
            server.close();
            resolve(true);
        });

        server.listen(port);
        server.close()
    });
}


module.exports = {
    getUserDataPath,
    getPublicPath,
    getAssetsPath,
    getPath,
    fileExists
};
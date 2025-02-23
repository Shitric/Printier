const { app, ipcMain } = require("electron");
const { execSync, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const setConfig = require("../config").setConfig;
const { networkInterfaces } = require("os");

function getLocalIpAddress() {
    const nets = networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === "IPv4" && !net.internal) {
                return net.address;
            }
        }
    }
    return "127.0.0.1";
}

// Add handler for getting local IP
ipcMain.handle('get-local-ip', () => {
    return getLocalIpAddress();
});

ipcMain.handle("install-mkcert", async () => {
    const installMkcertCommand = {
        win32: "choco install mkcert -y",
        darwin: "brew install mkcert",
        linux: "sudo apt install mkcert -y || sudo yum install mkcert -y"
    }[process.platform];

    try {
        execSync("mkcert -version", { stdio: "ignore" });
        return "✅ Mkcert is already installed.";
    } catch (error) {
        if (!installMkcertCommand) {
            return "⚠️ Mkcert installation is not supported on this OS.";
        }

        try {
            execSync(installMkcertCommand, { stdio: "inherit" });
            return "✅ Mkcert has been installed.";
        } catch (installError) {
            return "❌ Failed to install Mkcert. Please install it manually.";
        }
    }
});

ipcMain.handle("generate-cert", async (_, { serverAddress, serverPort }) => {
    if (!serverAddress || !serverPort) {
        return "❌ Please provide a valid server address and port.";
    }

    const certDir = path.join(app.getPath("userData"), "certs");
    const certFile = path.join(certDir, "printier.software.pem");
    const keyFile = path.join(certDir, "printier.software-key.pem");

    if (!fs.existsSync(certDir)) fs.mkdirSync(certDir, { recursive: true });

    execSync(`mkcert -cert-file "${certFile}" -key-file "${keyFile}" printier.software ${serverAddress} localhost 127.0.0.1`, { stdio: "inherit" });
    execSync(`mkcert -install`, { stdio: "inherit" });

    return `✅ Certificates have been generated for ${serverAddress}:${serverPort}`;
});

ipcMain.handle("update-hosts", async (_, { serverAddress }) => {
    if (!serverAddress) {
        return "❌ No server address provided.";
    }

    const hostsPath = process.platform === "win32"
        ? "C:\\Windows\\System32\\drivers\\etc\\hosts"
        : "/etc/hosts";
    const hostEntry = `${serverAddress} printier.software\n`;

    try {
        const hostsFile = fs.readFileSync(hostsPath, "utf8");

        if (!hostsFile.includes(hostEntry)) {
            if (process.platform === "win32") {
                spawnSync("cmd", ["/c", `echo ${hostEntry} >> ${hostsPath}`], { shell: true, stdio: "inherit" });
            } else {
                spawnSync("sh", ["-c", `echo '${hostEntry}' | sudo tee -a ${hostsPath}`], { stdio: "inherit" });
            }
            return `✅ Hosts file has been updated. Your server is accessible at: http://${serverAddress}`;
        }
        return `✅ Hosts file is already up to date. Your server is at: http://${serverAddress}`;
    } catch (error) {
        return "⚠️ Failed to update the hosts file! Administrator privileges may be required.";
    }
});

ipcMain.handle("complete-setup", async (_, { serverAddress, serverPort }) => {
    setConfig("installed", true);
    setConfig("appServer", serverAddress);
    setConfig("appPort", serverPort);

    setTimeout(() => {
        app.relaunch();
        app.exit();
    }, 5000);
});
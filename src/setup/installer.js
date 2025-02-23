const { app, ipcMain } = require("electron");
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const configPath = path.join(app.getPath("userData"), "config.json");

ipcMain.handle("install-mkcert", async () => {
    try {
        execSync("mkcert -version", { stdio: "ignore" });
        return "✅ Mkcert zaten yüklü.";
    } catch (error) {
        execSync("brew install mkcert", { stdio: "inherit" });
        return "✅ Mkcert yüklendi.";
    }
});

ipcMain.handle("generate-cert", async () => {
    const certDir = path.join(app.getPath("userData"), "certs");
    const certFile = path.join(certDir, "printier.server.pem");
    const keyFile = path.join(certDir, "printier.server-key.pem");

    if (!fs.existsSync(certDir)) fs.mkdirSync(certDir);

    execSync(`mkcert -cert-file ${certFile} -key-file ${keyFile} printier.server localhost 127.0.0.1 192.168.1.101`, { stdio: "inherit" });

    return "✅ Sertifikalar oluşturuldu.";
});

ipcMain.handle("update-hosts", async () => {
    const hostsPath = process.platform === "win32" ? "C:\\Windows\\System32\\drivers\\etc\\hosts" : "/etc/hosts";
    const hostEntry = "192.168.1.101 printier.server\n";

    try {
        const hostsFile = fs.readFileSync(hostsPath, "utf8");
        if (!hostsFile.includes(hostEntry)) {
            fs.appendFileSync(hostsPath, hostEntry);
            return "✅ Hosts dosyası güncellendi.";
        } else {
            return "✅ Hosts dosyası zaten güncel.";
        }
    } catch (error) {
        return "⚠️ Hosts dosyası güncellenemedi! Yönetici izni gerekebilir.";
    }
});

ipcMain.handle("complete-setup", async () => {
    fs.writeFileSync(configPath, JSON.stringify({ installed: true }), "utf8");
    app.relaunch();
    app.quit();
});
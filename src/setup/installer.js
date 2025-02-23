const { app, ipcMain } = require("electron");
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const setConfig = require("../config").setConfig;
const { networkInterfaces } = require("os");
const sudo = require('@vscode/sudo-prompt');

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

function getMkcertPath() {
    try {
        if (process.platform === 'darwin') {
            const paths = [
                '/opt/homebrew/bin',
                '/usr/local/bin',
                '/usr/bin',
                '/bin',
                '/usr/sbin',
                '/sbin'
            ];
            return execSync('which mkcert', { env: { PATH: paths.join(':') } }).toString().trim();
        } else if (process.platform === 'win32') {
            return execSync('where mkcert', { env: { PATH: process.env.PATH } }).toString().trim();
        } else {
            return execSync('which mkcert', { env: { PATH: '/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin' } }).toString().trim();
        }
    } catch (error) {
        return null;
    }
}

async function installHomebrew() {
    try {
        // Homebrew should not be installed as root
        const command = '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"';
        // Execute without sudo
        execSync(command, { stdio: 'inherit' });
        return { success: true, message: "✅ Homebrew installation successful." };
    } catch (error) {
        return { success: false, message: `❌ Homebrew installation failed: ${error.message}` };
    }
}

async function installChocolatey() {
    try {
        const command = `powershell -Command "Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))"`;
        await execSudoCommand(command);
        return { success: true, message: "✅ Chocolatey installation successful." };
    } catch (error) {
        return { success: false, message: `❌ Chocolatey installation failed: ${error.message}` };
    }
}

function execSudoCommand(command) {
    return new Promise((resolve, reject) => {
        const options = {
            name: 'Printier'
        };

        sudo.exec(command, options, (error, stdout) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(stdout);
        });
    });
}

async function getWindowsPath() {
    try {
        const command = 'powershell -Command "[System.Environment]::GetEnvironmentVariable(\'Path\', \'Machine\') + \';\' + [System.Environment]::GetEnvironmentVariable(\'Path\', \'User\')"';
        return execSync(command).toString().trim();
    } catch (error) {
        console.error('Failed to get Windows PATH:', error);
        return process.env.PATH;
    }
}

async function refreshWindowsPath() {
    if (process.platform === 'win32') {
        process.env.PATH = await getWindowsPath();
        return true;
    }
    return false;
}

// Add handler for getting local IP
ipcMain.handle('get-local-ip', () => {
    return getLocalIpAddress();
});

ipcMain.handle("install-mkcert", async () => {
    try {
        const command = 'which mkcert';
        const mkcertPath = getMkcertPath();
        if (fs.existsSync(mkcertPath)) {
            return { success: true, message: "✅ Mkcert is already installed." };
        }

        if (process.platform === 'darwin') {
            try {
                execSync(command, { stdio: 'ignore' });
            } catch (error) {
                console.log("Homebrew not found, starting installation...");
                const brewResult = await installHomebrew();
                if (!brewResult.success) {
                    return brewResult;
                }
            }
            
            // Install mkcert without sudo for Homebrew
            const brewPath = execSync('which brew').toString().trim();
            execSync(`${brewPath} install mkcert`, { stdio: 'inherit' });
            execSync(`${brewPath} install nss`, { stdio: 'inherit' });
            
            // Only use sudo for mkcert initialization
            await execSudoCommand(`${getMkcertPath()} -install`);
        } else if (process.platform === 'win32') {
            try {
                execSync('choco -v', { stdio: 'ignore' });
            } catch (error) {
                console.log("Chocolatey not found, starting installation...");
                const chocoResult = await installChocolatey();
                if (!chocoResult.success) {
                    return chocoResult;
                }
                // Refresh PATH after Chocolatey installation
                await refreshWindowsPath();
            }
            
            await execSudoCommand('choco install mkcert -y');
            // Refresh PATH after mkcert installation
            await refreshWindowsPath();
            
            // Verify mkcert installation with new PATH
            const newMkcertPath = getMkcertPath();
            if (!newMkcertPath) {
                return {
                    success: false,
                    message: "❌ Mkcert installation succeeded but command not found. Please restart the application."
                };
            }
        } else {
            // Linux için paket yöneticisi kontrolü
            let packageManager = null;
            try {
                execSync('apt-get -v', { stdio: 'ignore' });
                packageManager = 'apt-get';
            } catch (error) {
                try {
                    execSync('yum --version', { stdio: 'ignore' });
                    packageManager = 'yum';
                } catch (error) {
                    return {
                        success: false,
                        message: "❌ No supported package manager (apt-get or yum) found on your system."
                    };
                }
            }
            await execSudoCommand(`${packageManager} install mkcert -y`);
        }

        return { success: true, message: "✅ Mkcert has been installed successfully." };
    } catch (error) {
        return { 
            success: false, 
            message: `❌ Failed to install Mkcert: ${error.message}. Please install it manually.` 
        };
    }
});

ipcMain.handle("generate-cert", async (_, { serverAddress, serverPort }) => {
    if (!serverAddress || !serverPort) {
        return { 
            success: false, 
            message: "❌ Please provide a valid server address and port." 
        };
    }

    try {
        const mkcertPath = getMkcertPath();
        if (!fs.existsSync(mkcertPath)) {
            return { 
                success: false, 
                message: "❌ Mkcert is not installed or not found in PATH." 
            };
        }

        const certDir = path.join(app.getPath("userData"), "certs");
        const certFile = path.join(certDir, "printier.software.pem");
        const keyFile = path.join(certDir, "printier.software-key.pem");

        if (process.platform !== 'win32') {
            const uid = process.getuid();
            const gid = process.getgid();
            
            // Combine all commands into a single bash script
            const commands = [
                `mkdir -p "${certDir}"`,
                `chmod 755 "${certDir}"`,
                `rm -f "${certFile}" "${keyFile}"`,
                `"${mkcertPath}" -install`,
                `"${mkcertPath}" -cert-file "${certFile}" -key-file "${keyFile}" printier.software ${serverAddress} localhost 127.0.0.1`,
                `chmod 644 "${certFile}" "${keyFile}"`,
                `chown ${uid}:${gid} "${certDir}" "${certFile}" "${keyFile}"`
            ].join(' && ');

            await execSudoCommand(`/bin/bash -c '${commands}'`);
        } else {
            // Windows commands combined into a PowerShell script
            const commands = [
                `if (-not (Test-Path "${certDir}")) { New-Item -ItemType Directory -Force -Path "${certDir}" }`,
                `if (Test-Path "${certFile}") { Remove-Item "${certFile}" -Force }`,
                `if (Test-Path "${keyFile}") { Remove-Item "${keyFile}" -Force }`,
                `& "${mkcertPath}" -install`,
                `& "${mkcertPath}" -cert-file "${certFile}" -key-file "${keyFile}" printier.software ${serverAddress} localhost 127.0.0.1`
            ].join('; ');

            await execSudoCommand(`powershell -Command "${commands}"`);
        }

        return { 
            success: true, 
            message: `✅ Certificates have been generated for ${serverAddress}:${serverPort}` 
        };
    } catch (error) {
        return { 
            success: false, 
            message: `❌ Failed to generate certificates: ${error.message}` 
        };
    }
});

ipcMain.handle("update-hosts", async (_, { serverAddress }) => {
    if (!serverAddress) {
        return { 
            success: false, 
            message: "❌ No server address provided." 
        };
    }

    const hostsPath = process.platform === "win32"
        ? "C:\\Windows\\System32\\drivers\\etc\\hosts"
        : "/etc/hosts";
    const hostEntry = `${serverAddress} printier.software`;

    try {
        const hostsFile = fs.readFileSync(hostsPath, "utf8");

        if (!hostsFile.includes(hostEntry)) {
            if (process.platform === "win32") {
                await execSudoCommand(`echo ${hostEntry} >> "${hostsPath}"`);
            } else {
                await execSudoCommand(`echo '${hostEntry}' | tee -a "${hostsPath}"`);
            }
            return { success: true, message: "✅ Hosts file has been updated." };
        }
        return { success: true, message: "✅ Hosts file is already up to date." };
    } catch (error) {
        return {
            success: false,
            message: `❌ Failed to update the hosts file: ${error.message}`
        };
    }
});

ipcMain.handle("complete-setup", async (_, { serverAddress, serverPort }) => {
    try {
        setConfig("installed", true);
        setConfig("appServer", serverAddress);
        setConfig("appPort", serverPort);

        setTimeout(() => {
            app.relaunch();
            app.exit();
        }, 5000);

        return { success: true, message: "✅ Setup completed successfully!" };
    } catch (error) {
        return { 
            success: false, 
            message: `❌ Failed to complete setup: ${error.message}` 
        };
    }
});
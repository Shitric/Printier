document.addEventListener("DOMContentLoaded", () => {
    const status = document.getElementById("setupStatus");
    const startButton = document.getElementById("startSetup");
    const serverAddressInput = document.getElementById("serverAddress");
    const serverPortInput = document.getElementById("serverPort");

    const updateStatus = (message, isError = false) => {
        status.style.display = "block";
        status.textContent = message;
        status.style.color = isError ? "red" : "black";
    };

    startButton.addEventListener("click", async () => {
        const serverAddress = serverAddressInput.value.trim();
        const serverPort = serverPortInput.value.trim();

        if (!serverAddress || !serverPort) {
            updateStatus("❌ Please enter a valid server address and port.", true);
            return;
        }

        startButton.disabled = true;

        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        try {
            updateStatus("🔄 Installing dependencies...");
            await window.electron.ipcRenderer.invoke("install-mkcert");
            await delay(100);

            updateStatus("🔄 Generating certificates...");
            await window.electron.ipcRenderer.invoke("generate-cert", { serverAddress, serverPort });
            await delay(100);

            updateStatus("🔄 Linking Printier domain to your local IP...");
            await window.electron.ipcRenderer.invoke("update-hosts", { serverAddress });
            await delay(100);

            updateStatus("✅ Setup completed! Restarting...");
            await window.electron.ipcRenderer.invoke("complete-setup", { serverAddress, serverPort });
        } catch (error) {
            updateStatus(`❌ Setup failed: ${error.message}`, true);
        } finally {
            startButton.disabled = false;
        }
    });
});
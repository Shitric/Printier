const { ipcRenderer } = require("electron");

document.getElementById("startSetup").addEventListener("click", async () => {
    const status = document.getElementById("status");

    status.innerText = "🔄 Mkcert kuruluyor...";
    await ipcRenderer.invoke("install-mkcert");

    status.innerText = "🔄 Sertifikalar oluşturuluyor...";
    await ipcRenderer.invoke("generate-cert");

    status.innerText = "🔄 Hosts dosyası güncelleniyor...";
    await ipcRenderer.invoke("update-hosts");

    status.innerText = "✅ Kurulum tamamlandı! Yeniden başlatılıyor...";
    await ipcRenderer.invoke("complete-setup");
});
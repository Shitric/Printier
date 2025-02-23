const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
    ipcRenderer: {
        invoke: (channel, data) => ipcRenderer.invoke(channel, data),
        send: (channel, data) => ipcRenderer.send(channel, data),
        on: (channel, listener) => ipcRenderer.on(channel, (event, ...args) => listener(...args))
    }
});

window.addEventListener('DOMContentLoaded', () => {
    const replaceText = (selector, text) => {
        const element = document.getElementById(selector)
        if (element) element.innerText = text
    }

    for (const type of ['chrome', 'node', 'electron']) {
        replaceText(`${type}-version`, process.versions[type])
    }
})
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("windpulse", {
  // ADB
  adbStartServer: () => ipcRenderer.invoke("adb:start-server"),
  adbDevices: () => ipcRenderer.invoke("adb:devices"),
  adbConnect: (ip) => ipcRenderer.invoke("adb:connect", ip),
  adbTcpip: (serial) => ipcRenderer.invoke("adb:tcpip", serial),
  adbDisconnect: (serial) => ipcRenderer.invoke("adb:disconnect", serial),
  adbGetDeviceName: (serial) => ipcRenderer.invoke("adb:device-name", serial),
  adbPair: (address, code) => ipcRenderer.invoke("adb:pair", address, code),

  // scrcpy
  scrcpyStart: (args) => ipcRenderer.invoke("scrcpy:start", args),
  scrcpyStop: (id) => ipcRenderer.invoke("scrcpy:stop", id),
  scrcpyStopAll: () => ipcRenderer.invoke("scrcpy:stop-all"),
  scrcpyActiveCount: () => ipcRenderer.invoke("scrcpy:active-count"),

  // scrcpy events (clean per-subscriber cleanup)
  onScrcpyStdout: (cb) => {
    const handler = (_e, d) => cb(d);
    ipcRenderer.on("scrcpy:stdout", handler);
    return () => ipcRenderer.removeListener("scrcpy:stdout", handler);
  },
  onScrcpyStderr: (cb) => {
    const handler = (_e, d) => cb(d);
    ipcRenderer.on("scrcpy:stderr", handler);
    return () => ipcRenderer.removeListener("scrcpy:stderr", handler);
  },
  onScrcpyClosed: (cb) => {
    const handler = (_e, d) => cb(d);
    ipcRenderer.on("scrcpy:closed", handler);
    return () => ipcRenderer.removeListener("scrcpy:closed", handler);
  },
  onScrcpyError: (cb) => {
    const handler = (_e, d) => cb(d);
    ipcRenderer.on("scrcpy:error", handler);
    return () => ipcRenderer.removeListener("scrcpy:error", handler);
  },

  // Binaries
  checkBinaries: () => ipcRenderer.invoke("check-binaries"),

  // Window controls
  windowMinimize: () => ipcRenderer.invoke("window:minimize"),
  windowMaximize: () => ipcRenderer.invoke("window:maximize"),
  windowClose: () => ipcRenderer.invoke("window:close"),
  windowPin: (pin) => ipcRenderer.invoke("window:pin", pin),
});

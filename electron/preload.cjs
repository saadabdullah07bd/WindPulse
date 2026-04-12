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

  // scrcpy events
  onScrcpyStdout: (cb) => { ipcRenderer.on("scrcpy:stdout", (_e, d) => cb(d)); return () => ipcRenderer.removeAllListeners("scrcpy:stdout"); },
  onScrcpyStderr: (cb) => { ipcRenderer.on("scrcpy:stderr", (_e, d) => cb(d)); return () => ipcRenderer.removeAllListeners("scrcpy:stderr"); },
  onScrcpyClosed: (cb) => { ipcRenderer.on("scrcpy:closed", (_e, d) => cb(d)); return () => ipcRenderer.removeAllListeners("scrcpy:closed"); },
  onScrcpyError: (cb) => { ipcRenderer.on("scrcpy:error", (_e, d) => cb(d)); return () => ipcRenderer.removeAllListeners("scrcpy:error"); },

  // Binaries
  checkBinaries: () => ipcRenderer.invoke("check-binaries"),

  // Window controls
  windowMinimize: () => ipcRenderer.invoke("window:minimize"),
  windowMaximize: () => ipcRenderer.invoke("window:maximize"),
  windowClose: () => ipcRenderer.invoke("window:close"),
  windowPin: (pin) => ipcRenderer.invoke("window:pin", pin),
});

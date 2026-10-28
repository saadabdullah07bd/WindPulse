const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { spawn, execFile, execSync } = require("child_process");
const fs = require("fs");

// Resolve local bin directory (supports dev mode and packaged resources)
const localBin = app.isPackaged
  ? path.join(process.resourcesPath, "bin")
  : path.join(__dirname, "..", "bin");

/**
 * Locate executable: checks bundled bin/ first, then falls back to system PATH.
 */
function findBinary(name) {
  const exeName = process.platform === "win32" ? `${name}.exe` : name;
  const bundledPath = path.join(localBin, exeName);

  if (fs.existsSync(bundledPath)) {
    return { path: bundledPath, cwd: localBin };
  }

  // System PATH fallback
  try {
    const cmd = process.platform === "win32" ? `where.exe ${exeName}` : `which ${name}`;
    const output = execSync(cmd, { encoding: "utf8", windowsHide: true }).trim();
    const firstMatch = output.split(/\r?\n/)[0]?.trim();
    if (firstMatch && fs.existsSync(firstMatch)) {
      return { path: firstMatch, cwd: path.dirname(firstMatch) };
    }
  } catch (e) {
    // Binary not in PATH
  }

  return { path: bundledPath, cwd: localBin };
}

function getAdb() {
  return findBinary("adb");
}

function getScrcpy() {
  return findBinary("scrcpy");
}

let mainWindow;
const scrcpyProcesses = new Map();
let nextId = 1;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1120,
    height: 700,
    minWidth: 800,
    minHeight: 500,
    frame: false,
    transparent: false,
    backgroundColor: "#ffffff",
    icon: path.join(__dirname, "..", "public", "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }
}

function killAllScrcpy() {
  for (const [id, proc] of scrcpyProcesses) {
    try {
      proc.kill();
    } catch (e) {
      // Ignore cleanup error
    }
  }
  scrcpyProcesses.clear();
}

app.whenReady().then(createWindow);
app.on("before-quit", killAllScrcpy);
app.on("window-all-closed", () => {
  killAllScrcpy();
  if (process.platform !== "darwin") app.quit();
});

// ─── Window controls ───
ipcMain.handle("window:minimize", () => mainWindow?.minimize());
ipcMain.handle("window:maximize", () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.handle("window:close", () => mainWindow?.close());
ipcMain.handle("window:pin", (_e, pin) => mainWindow?.setAlwaysOnTop(pin));

// ─── Binary check ───
ipcMain.handle("check-binaries", () => {
  const scrcpy = getScrcpy();
  const adb = getAdb();
  return {
    scrcpyExists: fs.existsSync(scrcpy.path),
    adbExists: fs.existsSync(adb.path),
  };
});

// ─── ADB helpers ───
function runAdb(args) {
  return new Promise((resolve) => {
    const adb = getAdb();
    execFile(adb.path, args, { timeout: 15000, windowsHide: true }, (err, stdout, stderr) => {
      if (err) resolve({ success: false, error: err.message });
      else resolve({ success: true, stdout: (stdout || "").trim(), stderr: (stderr || "").trim() });
    });
  });
}

ipcMain.handle("adb:start-server", () => runAdb(["start-server"]));

ipcMain.handle("adb:devices", async () => {
  const res = await runAdb(["devices", "-l"]);
  if (!res.success) return res;
  const devices = [];
  for (const line of res.stdout.split("\n").slice(1)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const match = trimmed.match(/^(\S+)\s+(device|unauthorized|offline)\s*(.*)/);
    if (match) {
      const serial = match[1];
      const state = match[2];
      const info = match[3] || "";
      const model = (info.match(/model:(\S+)/) || [])[1] || serial;
      const name = (info.match(/device:(\S+)/) || [])[1] || model;
      devices.push({ serial, state, model, name });
    }
  }
  return { success: true, devices };
});

ipcMain.handle("adb:device-name", async (_e, serial) => {
  const res = await runAdb(["-s", serial, "shell", "settings", "get", "global", "device_name"]);
  if (res.success && res.stdout && res.stdout !== "null" && !res.stdout.includes("error")) {
    return { success: true, name: res.stdout.trim() };
  }
  const res2 = await runAdb(["-s", serial, "shell", "settings", "get", "secure", "bluetooth_name"]);
  if (res2.success && res2.stdout && res2.stdout !== "null") {
    return { success: true, name: res2.stdout.trim() };
  }
  const res3 = await runAdb(["-s", serial, "shell", "getprop", "ro.product.model"]);
  if (res3.success && res3.stdout) {
    return { success: true, name: res3.stdout.trim() };
  }
  return { success: false, name: serial };
});

ipcMain.handle("adb:connect", async (_e, ip) => {
  const res = await runAdb(["connect", ip]);
  return { success: res.success && !res.stdout?.includes("failed"), message: res.stdout, error: res.error || res.stdout };
});

ipcMain.handle("adb:tcpip", (_e, serial) => runAdb(["-s", serial, "tcpip", "5555"]));
ipcMain.handle("adb:disconnect", (_e, serial) => runAdb(["disconnect", serial]));

ipcMain.handle("adb:pair", async (_e, address, code) => {
  // Try passing code as argument first (supported in newer ADB versions)
  const res = await runAdb(["pair", address, code]);
  if (res.success && res.stdout && res.stdout.toLowerCase().includes("successfully")) {
    return { success: true, message: res.stdout.trim() };
  }

  // Fallback: use stdin-based pairing
  return new Promise((resolve) => {
    const adb = getAdb();
    const proc = spawn(adb.path, ["pair", address], { windowsHide: true });
    let output = "";
    let finished = false;

    const timer = setTimeout(() => {
      if (!finished) {
        finished = true;
        try { proc.kill(); } catch (e) {}
        resolve({ success: false, error: "Pairing timed out" });
      }
    }, 25000);

    proc.stdout.on("data", (d) => { output += d.toString(); });
    proc.stderr.on("data", (d) => { output += d.toString(); });

    // Wait briefly for prompt, then write code
    setTimeout(() => {
      try {
        proc.stdin.write(code + "\n");
        proc.stdin.end();
      } catch (e) {}
    }, 500);

    proc.on("close", (exitCode) => {
      if (!finished) {
        finished = true;
        clearTimeout(timer);
        if (exitCode === 0 && output.toLowerCase().includes("successfully")) {
          resolve({ success: true, message: output.trim() });
        } else {
          resolve({ success: false, error: output.trim() || "Pairing failed" });
        }
      }
    });

    proc.on("error", (err) => {
      if (!finished) {
        finished = true;
        clearTimeout(timer);
        resolve({ success: false, error: err.message });
      }
    });
  });
});

// ─── scrcpy ───
ipcMain.handle("scrcpy:start", (_e, args) => {
  try {
    const scrcpy = getScrcpy();
    const id = nextId++;
    const proc = spawn(scrcpy.path, args, { cwd: scrcpy.cwd, windowsHide: false });
    scrcpyProcesses.set(id, proc);
    proc.stdout.on("data", (d) => mainWindow?.webContents.send("scrcpy:stdout", { id, data: d.toString() }));
    proc.stderr.on("data", (d) => mainWindow?.webContents.send("scrcpy:stderr", { id, data: d.toString() }));
    proc.on("close", (code) => {
      scrcpyProcesses.delete(id);
      mainWindow?.webContents.send("scrcpy:closed", { id, code });
    });
    proc.on("error", (err) => {
      scrcpyProcesses.delete(id);
      mainWindow?.webContents.send("scrcpy:error", { id, error: err.message });
    });
    return { success: true, id };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle("scrcpy:stop", (_e, id) => {
  const proc = scrcpyProcesses.get(id);
  if (proc) {
    try { proc.kill(); } catch (e) {}
    scrcpyProcesses.delete(id);
  }
  return { success: true };
});

ipcMain.handle("scrcpy:stop-all", () => {
  killAllScrcpy();
  return { success: true };
});

ipcMain.handle("scrcpy:active-count", () => ({ count: scrcpyProcesses.size }));

import { useCallback, useEffect, useRef, useState } from "react";
import type { DeviceInfo, ScrcpyEvent } from "@/types/windpulse";

export type ConnectionStatus = "initializing" | "ready" | "active" | "disconnected";

export type { LogEntry } from "@/types/log";
import type { LogEntry } from "@/types/log";

let logIdCounter = 0;

function getApi() {
  return window.windpulse;
}

function isElectron() {
  return !!window.windpulse;
}

export function useWindPulse() {
  const [status, setStatus] = useState<ConnectionStatus>("initializing");
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [sessions, setSessions] = useState<number[]>([]);
  const [binariesOk, setBinariesOk] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval>>();
  const selectedDeviceRef = useRef(selectedDevice);

  // Keep ref in sync to avoid stale closures in polling
  useEffect(() => {
    selectedDeviceRef.current = selectedDevice;
  }, [selectedDevice]);

  const addLog = useCallback((message: string, type: LogEntry["type"] = "info") => {
    const time = new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setLogs(prev => [...prev.slice(-200), { id: ++logIdCounter, time, message, type }]);
  }, []);

  const refreshDevices = useCallback(async () => {
    if (!isElectron()) return;
    const api = getApi()!;
    const res = await api.adbDevices();
    if (!res.success) return;

    // Fetch friendly names for each device
    const devicesWithNames = await Promise.all(
      res.devices.map(async (d) => {
        try {
          const nameRes = await api.adbGetDeviceName(d.serial);
          if (nameRes.success && nameRes.name) return { ...d, name: nameRes.name };
        } catch { /* use default */ }
        return d;
      })
    );

    setDevices(devicesWithNames);
    if (devicesWithNames.length > 0 && !devicesWithNames.find(d => d.serial === selectedDeviceRef.current)) {
      setSelectedDevice(devicesWithNames[0].serial);
    }
  }, []);

  // Boot
  useEffect(() => {
    if (!isElectron()) {
      addLog("Running in web preview mode", "warning");
      addLog("Electron IPC not available — using simulated data", "info");
      const timer = setTimeout(() => {
        setStatus("ready");
        setDevices([{ serial: "demo", model: "Demo Device", name: "Demo Device (preview)" }]);
        setSelectedDevice("demo");
        addLog("Demo device loaded", "success");
      }, 1200);
      return () => clearTimeout(timer);
    }

    const api = getApi()!;
    (async () => {
      const bins = await api.checkBinaries();
      if (!bins.scrcpyExists) { addLog("CRITICAL: scrcpy not found in bin/", "error"); setBinariesOk(false); }
      if (!bins.adbExists) { addLog("CRITICAL: adb not found in bin/", "error"); setBinariesOk(false); }

      addLog("Starting ADB server...", "info");
      const res = await api.adbStartServer();
      if (res.success) addLog("ADB server started", "success");
      else addLog(`ADB start failed: ${res.error}`, "error");

      await refreshDevices();
    })();

    const unsub1 = api.onScrcpyStdout(({ data }) => { if (data?.trim()) addLog(data.trim(), "info"); });
    const unsub2 = api.onScrcpyStderr(({ data }) => { if (data?.trim()) addLog(data.trim(), "warning"); });
    const unsub3 = api.onScrcpyClosed(({ id, code }) => {
      addLog(`Session ${id} ended (code ${code})`, "info");
      setSessions(prev => prev.filter(s => s !== id));
    });
    const unsub4 = api.onScrcpyError(({ id, error }) => {
      addLog(`Session ${id} error: ${error}`, "error");
      setSessions(prev => prev.filter(s => s !== id));
    });

    pollRef.current = setInterval(refreshDevices, 3000);

    return () => {
      unsub1(); unsub2(); unsub3(); unsub4();
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [addLog, refreshDevices]);

  // Update status based on sessions/devices
  useEffect(() => {
    if (sessions.length > 0) setStatus("active");
    else if (devices.length > 0) setStatus("ready");
    else if (status !== "initializing") setStatus("disconnected");
  }, [sessions, devices, status]);

  const connectIp = useCallback(async (ip: string) => {
    if (!isElectron()) {
      addLog(`Simulated connect to ${ip}`, "success");
      const { saveDevice } = await import("@/lib/savedDevices");
      saveDevice(ip);
      return;
    }
    addLog(`Connecting to ${ip}...`, "info");
    const res = await getApi()!.adbConnect(ip);
    if (res.success) {
      addLog(res.message || "Connected", "success");
      const { saveDevice } = await import("@/lib/savedDevices");
      saveDevice(ip);
      setTimeout(refreshDevices, 2000);
    } else {
      addLog(`Connection failed: ${res.error}`, "error");
    }
  }, [addLog, refreshDevices]);

  const activateWireless = useCallback(async (serial?: string) => {
    const target = serial || selectedDevice;
    if (!target || !isElectron()) {
      addLog("Select a USB device first", "warning");
      return;
    }
    addLog(`Activating wireless mode on ${target}...`, "info");
    const res = await getApi()!.adbTcpip(target);
    if (res.success) {
      addLog("TCP/IP mode activated on port 5555. You can now unplug USB and connect via IP.", "success");
      setTimeout(refreshDevices, 3000);
    } else {
      addLog(`Wireless activation failed: ${res.error}`, "error");
    }
  }, [selectedDevice, addLog, refreshDevices]);

  const startMirror = useCallback(async (config: {
    audioOnly?: boolean;
    enableMirror?: boolean;
    enableCamera?: boolean;
    tabletMode?: boolean;
    encoder?: string;
    bitrate?: number;
    camSource?: string;
    camRes?: string;
    camFps?: string;
    camOrientation?: string;
    noCamAudio?: boolean;
    disableAudio?: boolean;
    recordSession?: boolean;
    keepAwake?: boolean;
    screenOff?: boolean;
    hidKeyboard?: boolean;
    hidMouse?: boolean;
    tabletRes?: string;
    tabletDpi?: string;
  }) => {
    if (!selectedDevice) { addLog("No device selected", "error"); return; }

    const args: string[] = ["--serial", selectedDevice];

    if (config.audioOnly) {
      args.push("--no-video", "--no-control");
      addLog("Starting audio-only stream...", "info");
    } else {
      if (config.hidKeyboard) args.push("-K");
      if (config.hidMouse) args.push("-M");

      const enc = config.encoder || "H.264 (AVC)";
      if (enc.includes("H.265")) args.push("--video-codec=h265");
      else if (enc.includes("AV1")) args.push("--video-codec=av1");

      if (config.enableCamera) {
        args.push("--video-source=camera", "--camera-facing", config.camSource || "back");
        args.push("--camera-fps", config.camFps || "30");
        args.push("--camera-size", config.camRes || "1920x1080");
        const orient = config.camOrientation || "Normal";
        if (orient !== "Normal") {
          const orientMap: Record<string, string> = { "90° CW": "90", "180°": "180", "270° CW": "270", "Flip": "flip0" };
          if (orientMap[orient]) args.push(`--capture-orientation=${orientMap[orient]}`);
        }
        if (config.noCamAudio) args.push("--no-audio");
      } else if (config.tabletMode) {
        const res = config.tabletRes || "1920x1080";
        const dpi = (config.tabletDpi || "240 DPI").split(" ")[0];
        args.push(`--new-display=${res}/${dpi}`);
      } else {
        if (config.disableAudio) args.push("--no-audio");
      }

      if (config.recordSession) {
        const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
        const file = `record_${ts}.mp4`;
        args.push("--record", file);
        addLog(`Recording to ${file}`, "info");
      }

      args.push("--video-bit-rate", `${config.bitrate || 12}M`);
      if (config.keepAwake) args.push("--stay-awake");
      if (config.screenOff) args.push("--turn-screen-off");

      const device = devices.find(d => d.serial === selectedDevice);
      const displayName = device?.name || device?.model || selectedDevice;
      args.push("--window-title", displayName);
    }

    if (!isElectron()) {
      addLog(`[Preview] Would run: scrcpy ${args.join(" ")}`, "info");
      addLog("Mirror stream active (simulated)", "success");
      setSessions(prev => [...prev, ++logIdCounter]);
      return;
    }

    addLog("Launching scrcpy...", "info");
    const res = await getApi()!.scrcpyStart(args);
    if (res.success && res.id) {
      setSessions(prev => [...prev, res.id!]);
      addLog(`Session ${res.id} started`, "success");
    } else {
      addLog(`Failed to start: ${res.error}`, "error");
    }
  }, [selectedDevice, devices, addLog]);

  const stopAll = useCallback(async () => {
    addLog("Stopping all sessions...", "warning");
    if (isElectron()) {
      await getApi()!.scrcpyStopAll();
    }
    setSessions([]);
    addLog("All sessions stopped", "info");
  }, [addLog]);

  const getConnectionType = useCallback((serial: string) => {
    if (!serial) return "Unknown";
    if (serial.includes(":") || serial.includes(".") || serial.startsWith("adb-")) return "Wireless";
    return "USB";
  }, []);

  return {
    status,
    devices,
    selectedDevice,
    setSelectedDevice,
    logs,
    sessions,
    binariesOk,
    addLog,
    connectIp,
    activateWireless,
    startMirror,
    stopAll,
    refreshDevices,
    getConnectionType,
    isElectron: isElectron(),
  };
}

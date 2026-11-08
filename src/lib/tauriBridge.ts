import type { ScrcpyEvent, WindPulseAPI } from "@/types/windpulse";

declare global {
  interface Window {
    __TAURI__?: {
      invoke: <T = unknown>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
      event: {
        listen: <T = unknown>(event: string, handler: (e: { payload: T }) => void) => Promise<() => void>;
      };
      window: {
        appWindow: {
          minimize: () => Promise<void>;
          toggleMaximize: () => Promise<void>;
          close: () => Promise<void>;
          setAlwaysOnTop: (alwaysOnTop: boolean) => Promise<void>;
          startDragging: () => Promise<void>;
        };
      };
    };
  }
}

export function isTauri(): boolean {
  return typeof window !== "undefined" && !!window.__TAURI__;
}

export function initTauriBridge(): boolean {
  if (typeof window === "undefined") return false;
  const tauri = window.__TAURI__;
  if (!tauri) return false;

  const tauriApi: WindPulseAPI = {
    adbStartServer: () => tauri.invoke("adb_start_server"),
    adbDevices: () => tauri.invoke("adb_devices"),
    adbConnect: (ip: string) => tauri.invoke("adb_connect", { ip }),
    adbTcpip: (serial: string) => tauri.invoke("adb_tcpip", { serial }),
    adbDisconnect: (serial: string) => tauri.invoke("adb_disconnect", { serial }),
    adbGetDeviceName: (serial: string) => tauri.invoke("adb_device_name", { serial }),
    adbPair: (address: string, code: string) => tauri.invoke("adb_pair", { address, code }),
    adbMdndServices: () => tauri.invoke("adb_mdns_services"),

    scrcpyStart: (args: string[]) => tauri.invoke("scrcpy_start", { args }),
    scrcpyStop: (id: number) =>
      tauri.invoke<boolean>("scrcpy_stop", { id }).then((res) => ({ success: res })),
    scrcpyStopAll: () =>
      tauri.invoke<boolean>("scrcpy_stop_all").then((res) => ({ success: res })),
    scrcpyActiveCount: () =>
      tauri.invoke<number>("scrcpy_active_count").then((count) => ({ count })),

    onScrcpyStdout: (cb: (data: ScrcpyEvent) => void) => {
      let unlisten: (() => void) | undefined;
      let active = true;
      tauri.event.listen<ScrcpyEvent>("scrcpy:stdout", (e) => {
        if (active) cb(e.payload);
      }).then((u) => {
        unlisten = u;
        if (!active && unlisten) unlisten();
      });
      return () => {
        active = false;
        if (unlisten) unlisten();
      };
    },
    onScrcpyStderr: (cb: (data: ScrcpyEvent) => void) => {
      let unlisten: (() => void) | undefined;
      let active = true;
      tauri.event.listen<ScrcpyEvent>("scrcpy:stderr", (e) => {
        if (active) cb(e.payload);
      }).then((u) => {
        unlisten = u;
        if (!active && unlisten) unlisten();
      });
      return () => {
        active = false;
        if (unlisten) unlisten();
      };
    },
    onScrcpyClosed: (cb: (data: ScrcpyEvent) => void) => {
      let unlisten: (() => void) | undefined;
      let active = true;
      tauri.event.listen<ScrcpyEvent>("scrcpy:closed", (e) => {
        if (active) cb(e.payload);
      }).then((u) => {
        unlisten = u;
        if (!active && unlisten) unlisten();
      });
      return () => {
        active = false;
        if (unlisten) unlisten();
      };
    },
    onScrcpyError: (cb: (data: ScrcpyEvent) => void) => {
      let unlisten: (() => void) | undefined;
      let active = true;
      tauri.event.listen<ScrcpyEvent>("scrcpy:error", (e) => {
        if (active) cb(e.payload);
      }).then((u) => {
        unlisten = u;
        if (!active && unlisten) unlisten();
      });
      return () => {
        active = false;
        if (unlisten) unlisten();
      };
    },

    checkBinaries: () => tauri.invoke("check_binaries"),

    windowMinimize: () => tauri.window.appWindow.minimize(),
    windowMaximize: () => tauri.window.appWindow.toggleMaximize(),
    windowClose: () => tauri.window.appWindow.close(),
    windowPin: (pin: boolean) => tauri.window.appWindow.setAlwaysOnTop(pin),
    windowStartDragging: () => tauri.window.appWindow.startDragging(),
  };

  window.windpulse = tauriApi;
  return true;
}

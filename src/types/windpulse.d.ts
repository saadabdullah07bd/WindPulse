// Type definitions for the windpulse IPC bridge exposed via preload
export interface ScrcpyEvent {
  id: number;
  data?: string;
  code?: number;
  error?: string;
}

export interface DeviceInfo {
  serial: string;
  model: string;
  name: string;
}

export interface WindPulseAPI {
  adbStartServer: () => Promise<{ success: boolean; error?: string }>;
  adbDevices: () => Promise<{ success: boolean; devices: DeviceInfo[]; error?: string }>;
  adbConnect: (ip: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  adbTcpip: (serial: string) => Promise<{ success: boolean; error?: string }>;
  adbDisconnect: (serial: string) => Promise<{ success: boolean; error?: string }>;
  adbGetDeviceName: (serial: string) => Promise<{ success: boolean; name: string }>;
  adbPair: (address: string, code: string) => Promise<{ success: boolean; error?: string }>;

  scrcpyStart: (args: string[]) => Promise<{ success: boolean; id?: number; error?: string }>;
  scrcpyStop: (id: number) => Promise<{ success: boolean; error?: string }>;
  scrcpyStopAll: () => Promise<{ success: boolean }>;
  scrcpyActiveCount: () => Promise<{ count: number }>;

  onScrcpyStdout: (cb: (data: ScrcpyEvent) => void) => () => void;
  onScrcpyStderr: (cb: (data: ScrcpyEvent) => void) => () => void;
  onScrcpyClosed: (cb: (data: ScrcpyEvent) => void) => () => void;
  onScrcpyError: (cb: (data: ScrcpyEvent) => void) => () => void;

  checkBinaries: () => Promise<{ scrcpyExists: boolean; adbExists: boolean }>;

  windowMinimize: () => Promise<void>;
  windowMaximize: () => Promise<void>;
  windowClose: () => Promise<void>;
  windowPin: (pin: boolean) => Promise<void>;
}

declare global {
  interface Window {
    windpulse?: WindPulseAPI;
  }
}

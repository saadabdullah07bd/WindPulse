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
  state?: "device" | "unauthorized" | "offline";
}

export interface MdnsService {
  name: string;
  type: string;
  address: string;
}

export interface UpdateInfo {
  available: boolean;
  current_version: string;
  latest_version: string;
  release_notes?: string;
  download_url?: string;
  file_name?: string;
  file_size?: number;
}

export interface DownloadProgress {
  downloaded_bytes: number;
  total_bytes: number;
  percentage: number;
}

export interface UpdaterStatus {
  current_version: string;
  is_downloading: boolean;
  is_ready: boolean;
  latest_version?: string;
  download_percent: number;
}

export interface WindPulseAPI {
  adbStartServer: () => Promise<{ success: boolean; error?: string }>;
  adbDevices: () => Promise<{ success: boolean; devices: DeviceInfo[]; error?: string }>;
  adbConnect: (ip: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  adbTcpip: (serial: string) => Promise<{ success: boolean; error?: string }>;
  adbDisconnect: (serial: string) => Promise<{ success: boolean; error?: string }>;
  adbGetDeviceName: (serial: string) => Promise<{ success: boolean; name: string }>;
  adbPair: (address: string, code: string) => Promise<{ success: boolean; error?: string }>;
  adbMdndServices: () => Promise<{ success: boolean; services?: MdnsService[]; error?: string }>;

  scrcpyStart: (args: string[]) => Promise<{ success: boolean; id?: number; error?: string }>;
  scrcpyStop: (id: number) => Promise<{ success: boolean; error?: string }>;
  scrcpyStopAll: () => Promise<{ success: boolean }>;
  scrcpyActiveCount: () => Promise<{ count: number }>;

  onScrcpyStdout: (cb: (data: ScrcpyEvent) => void) => () => void;
  onScrcpyStderr: (cb: (data: ScrcpyEvent) => void) => () => void;
  onScrcpyClosed: (cb: (data: ScrcpyEvent) => void) => () => void;
  onScrcpyError: (cb: (data: ScrcpyEvent) => void) => () => void;

  checkBinaries: () => Promise<{ scrcpyExists: boolean; adbExists: boolean }>;

  updaterCheck?: () => Promise<UpdateInfo>;
  updaterStatus?: () => Promise<UpdaterStatus>;
  updaterDownload?: (downloadUrl: string, fileName: string) => Promise<string>;
  updaterApplyAndRestart?: () => Promise<void>;

  onUpdaterAvailable?: (cb: (info: UpdateInfo) => void) => () => void;
  onUpdaterProgress?: (cb: (progress: DownloadProgress) => void) => () => void;
  onUpdaterReady?: (cb: (data: { version?: string; installer_path?: string }) => void) => () => void;

  windowMinimize: () => Promise<void>;
  windowMaximize: () => Promise<void>;
  windowClose: () => Promise<void>;
  windowPin: (pin: boolean) => Promise<void>;
  windowStartDragging?: () => Promise<void>;
}

declare global {
  interface Window {
    windpulse?: WindPulseAPI;
  }
}

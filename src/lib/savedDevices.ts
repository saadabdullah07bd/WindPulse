const STORAGE_KEY = "windpulse-saved-devices";

export interface SavedDevice {
  ip: string;
  name: string;
  lastConnected: string;
}

export function getSavedDevices(): SavedDevice[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveDevice(ip: string, name?: string) {
  const devices = getSavedDevices();
  const normalized = ip.includes(":") ? ip : `${ip}:5555`;
  const existing = devices.findIndex(d => d.ip === normalized);
  const entry: SavedDevice = {
    ip: normalized,
    name: name || normalized,
    lastConnected: new Date().toISOString(),
  };
  if (existing >= 0) devices[existing] = entry;
  else devices.push(entry);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(devices));
}

export function removeSavedDevice(ip: string) {
  const devices = getSavedDevices().filter(d => d.ip !== ip);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(devices));
}

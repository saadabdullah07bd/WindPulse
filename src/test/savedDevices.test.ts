import { describe, it, expect, beforeEach } from "vitest";
import { getSavedDevices, saveDevice, removeSavedDevice } from "@/lib/savedDevices";

describe("savedDevices library", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns an empty array when no devices are saved", () => {
    expect(getSavedDevices()).toEqual([]);
  });

  it("saves a device and normalizes the port to 5555 when omitted", () => {
    saveDevice("192.168.1.100", "Pixel 7");
    const devices = getSavedDevices();
    expect(devices).toHaveLength(1);
    expect(devices[0].ip).toBe("192.168.1.100:5555");
    expect(devices[0].name).toBe("Pixel 7");
  });

  it("preserves explicit custom port when provided", () => {
    saveDevice("192.168.1.100:39845", "Pixel 7 Wireless");
    const devices = getSavedDevices();
    expect(devices).toHaveLength(1);
    expect(devices[0].ip).toBe("192.168.1.100:39845");
  });

  it("updates existing device when saving same IP", () => {
    saveDevice("192.168.1.50:5555", "Old Name");
    saveDevice("192.168.1.50:5555", "New Name");
    const devices = getSavedDevices();
    expect(devices).toHaveLength(1);
    expect(devices[0].name).toBe("New Name");
  });

  it("removes a saved device correctly", () => {
    saveDevice("192.168.1.10:5555", "Device A");
    saveDevice("192.168.1.20:5555", "Device B");
    removeSavedDevice("192.168.1.10:5555");
    const devices = getSavedDevices();
    expect(devices).toHaveLength(1);
    expect(devices[0].ip).toBe("192.168.1.20:5555");
  });
});

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Play, Square, Monitor, Camera, Tablet,
  Volume2, Smartphone, Wifi, Menu, X, Trash2,
  Settings, Palette, Check, Plus, ArrowRightLeft
} from "lucide-react";
import LoadingScreen from "@/components/LoadingScreen";
import CustomSelect from "@/components/CustomSelect";
import StatusBadge from "@/components/StatusBadge";
import SettingsCard from "@/components/SettingsCard";
import ConsoleLog from "@/components/ConsoleLog";
import ShortcutsModal from "@/components/ShortcutsModal";
import { useWindPulse } from "@/hooks/useWindPulse";
import { useTheme, THEMES, type ThemeName } from "@/hooks/useTheme";
import { getSavedDevices, removeSavedDevice, type SavedDevice } from "@/lib/savedDevices";

/* ─── Minimal Toggle ─── */
const Toggle = ({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) => (
  <label className="flex items-center justify-between cursor-pointer group py-1">
    <span className="text-[12px] text-muted-foreground group-hover:text-foreground transition-colors">{label}</span>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${checked ? "bg-primary" : "bg-border"}`}
    >
      <motion.div
        className="absolute top-[2px] w-4 h-4 rounded-full bg-card shadow-sm"
        animate={{ x: checked ? 18 : 2 }}
        transition={{ type: "spring", stiffness: 500, damping: 35 }}
      />
    </button>
  </label>
);

/* ─── Active Tab type ─── */
type ActiveTab = "mirror" | "settings";

const slideVariants = {
  enterFromRight: { x: 60, opacity: 0 },
  enterFromLeft: { x: -60, opacity: 0 },
  center: { x: 0, opacity: 1 },
  exitToLeft: { x: -60, opacity: 0 },
  exitToRight: { x: 60, opacity: 0 },
};

const Index = () => {
  const [loading, setLoading] = useState(true);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [savedDevices, setSavedDevices] = useState<SavedDevice[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>("mirror");
  const prevTab = useRef<ActiveTab>("mirror");
  const [pairingOpen, setPairingOpen] = useState(false);
  const themeCtx = useTheme();

  // Wireless debugging pairing
  const [pairingCode, setPairingCode] = useState("");
  const [pairingAddress, setPairingAddress] = useState("");

  // Settings state
  const [audioOnly, setAudioOnly] = useState(false);
  const [enableMirror, setEnableMirror] = useState(true);
  const [disableAudio, setDisableAudio] = useState(false);
  const [recordSession, setRecordSession] = useState(false);
  const [encoder, setEncoder] = useState("H.264 (AVC)");
  const [bitrate, setBitrate] = useState(12);
  const [enableCamera, setEnableCamera] = useState(false);
  const [camSource, setCamSource] = useState("back");
  const [camRes, setCamRes] = useState("1920x1080");
  const [camFps, setCamFps] = useState("30");
  const [noCamAudio, setNoCamAudio] = useState(false);
  const [camOrientation, setCamOrientation] = useState("Normal");
  const [keepAwake, setKeepAwake] = useState(false);
  const [screenOff, setScreenOff] = useState(false);
  const [hidKeyboard, setHidKeyboard] = useState(false);
  const [hidMouse, setHidMouse] = useState(false);
  const [tabletMode, setTabletMode] = useState(false);
  const [tabletRes, setTabletRes] = useState("1920x1080");
  const [tabletDpi, setTabletDpi] = useState("240 DPI");

  const wp = useWindPulse();

  useEffect(() => {
    setSavedDevices(getSavedDevices());
  }, []);

  const handleConnectIp = useCallback((ip: string) => {
    wp.connectIp(ip);
    setTimeout(() => setSavedDevices(getSavedDevices()), 500);
  }, [wp]);

  const handleRemoveSaved = useCallback((ip: string) => {
    removeSavedDevice(ip);
    setSavedDevices(getSavedDevices());
  }, []);

  const handleLoadComplete = useCallback(() => {
    setTimeout(() => setLoading(false), 300);
  }, []);

  const handleStart = useCallback(() => {
    wp.startMirror({
      audioOnly, enableMirror, enableCamera, tabletMode,
      encoder, bitrate, camSource, camRes, camFps, camOrientation,
      noCamAudio, disableAudio, recordSession, keepAwake, screenOff,
      hidKeyboard, hidMouse, tabletRes, tabletDpi,
    });
  }, [wp, audioOnly, enableMirror, enableCamera, tabletMode, encoder, bitrate, camSource, camRes, camFps, camOrientation, noCamAudio, disableAudio, recordSession, keepAwake, screenOff, hidKeyboard, hidMouse, tabletRes, tabletDpi]);

  const handleModeSwitch = useCallback((mode: string) => {
    if (mode === "audioOnly") { setAudioOnly(true); setEnableMirror(false); setEnableCamera(false); setTabletMode(false); }
    else if (mode === "mirror") { setEnableMirror(true); setAudioOnly(false); setEnableCamera(false); setTabletMode(false); }
    else if (mode === "camera") { setEnableCamera(true); setEnableMirror(false); setAudioOnly(false); setTabletMode(false); }
    else if (mode === "tablet") { setTabletMode(true); setEnableMirror(false); setEnableCamera(false); setAudioOnly(false); }
  }, []);

  const handlePair = useCallback(async () => {
    if (!pairingAddress || !pairingCode) {
      wp.addLog("Enter pairing address and code from your phone", "warning");
      return;
    }
    wp.addLog(`Pairing with ${pairingAddress}...`, "info");
    if (wp.isElectron && window.windpulse?.adbPair) {
      const res = await window.windpulse.adbPair(pairingAddress, pairingCode);
      if (res.success) {
        wp.addLog("Pairing successful! Now connect using the wireless port.", "success");
        setPairingOpen(false);
        setPairingAddress("");
        setPairingCode("");
      } else {
        wp.addLog(`Pairing failed: ${res.error}`, "error");
      }
    } else {
      wp.addLog("[Preview] Would pair with " + pairingAddress, "info");
    }
  }, [pairingAddress, pairingCode, wp]);

  const handleTabSwitch = useCallback((tab: ActiveTab) => {
    prevTab.current = activeTab;
    setActiveTab(tab);
  }, [activeTab]);

  const handleSwitchToWireless = useCallback((serial: string) => {
    wp.activateWireless(serial);
  }, [wp]);

  const slideDirection = activeTab === "settings" ? "right" : "left";
  const connectionType = wp.getConnectionType(wp.selectedDevice);

  // Memoize device options to avoid re-creating every render
  const deviceOptions = useMemo(() => {
    return wp.devices.length === 0 ? ["Searching..."] : wp.devices.map(d => d.name);
  }, [wp.devices]);

  /* ─── Sidebar Content ─── */
  const sidebarContent = (
    <div className="flex flex-col h-full gap-3">
      {/* Title + status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-base font-bold text-foreground tracking-tight">WindPulse</h1>
          <StatusBadge status={wp.status} count={wp.sessions.length} />
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex bg-secondary/60 rounded-lg p-0.5 gap-0.5 relative">
        <motion.div
          className="absolute top-0.5 bottom-0.5 rounded-md bg-card shadow-sm"
          animate={{ x: activeTab === "mirror" ? 0 : "100%" }}
          style={{ width: "calc(50% - 2px)" }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
        <button
          onClick={() => handleTabSwitch("mirror")}
          className={`flex-1 py-1.5 rounded-md text-[11px] font-semibold transition-colors relative z-10 ${activeTab === "mirror" ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          Mirror
        </button>
        <button
          onClick={() => handleTabSwitch("settings")}
          className={`flex-1 py-1.5 rounded-md text-[11px] font-semibold transition-colors flex items-center justify-center gap-1 relative z-10 ${activeTab === "settings" ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Settings size={11} /> Settings
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0 overflow-hidden relative">
        <AnimatePresence mode="wait" initial={false}>
          {activeTab === "mirror" ? (
            <motion.div
              key="mirror-tab"
              className="flex flex-col h-full gap-3"
              initial={slideDirection === "left" ? "enterFromLeft" : "enterFromRight"}
              animate="center"
              exit={slideDirection === "left" ? "exitToRight" : "exitToLeft"}
              variants={slideVariants}
              transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              {/* Device selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-muted-foreground">Device</label>
                <CustomSelect
                  value={wp.devices.find(d => d.serial === wp.selectedDevice)?.name || ""}
                  onChange={(name) => {
                    const device = wp.devices.find(d => d.name === name);
                    if (device) wp.setSelectedDevice(device.serial);
                  }}
                  options={deviceOptions}
                  placeholder="Searching..."
                />
                <p className="text-[9px] text-muted-foreground/60 text-center font-medium">
                  {wp.selectedDevice ? `${connectionType} connection` : "Scanning..."}
                </p>

                {/* USB → Wireless switch button */}
                {connectionType === "USB" && wp.selectedDevice && (
                  <motion.button
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    onClick={() => handleSwitchToWireless(wp.selectedDevice)}
                    className="w-full flex items-center justify-center gap-2 py-1.5 rounded-lg text-[10px] font-medium text-primary border border-primary/20 hover:bg-primary/5 transition-colors"
                  >
                    <ArrowRightLeft size={12} />
                    Switch to Wireless (TCP/IP)
                  </motion.button>
                )}
              </div>

              {/* Wireless Pairing */}
              <div className="space-y-1.5">
                <button
                  onClick={() => setPairingOpen(!pairingOpen)}
                  className="flex items-center justify-between w-full group"
                >
                  <span className="text-[10px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">Wireless Pairing</span>
                  <motion.div
                    animate={{ rotate: pairingOpen ? 45 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="w-5 h-5 rounded-md flex items-center justify-center bg-secondary/80 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors"
                  >
                    <Plus size={12} />
                  </motion.div>
                </button>

                <AnimatePresence>
                  {pairingOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-1.5 pt-1">
                        <p className="text-[9px] text-muted-foreground/50">Settings → Developer Options → Wireless debugging → Pair device</p>
                        <input
                          type="text"
                          value={pairingCode}
                          onChange={e => setPairingCode(e.target.value)}
                          placeholder="Pairing code (e.g. 482956)"
                          className="input-minimal font-mono text-[11px]"
                        />
                        <input
                          type="text"
                          value={pairingAddress}
                          onChange={e => setPairingAddress(e.target.value)}
                          placeholder="IP:Port (e.g. 192.168.1.5:37123)"
                          className="input-minimal font-mono text-[11px]"
                        />
                        <motion.button
                          onClick={handlePair}
                          className="w-full py-1.5 rounded-lg text-[10px] font-medium text-primary border border-primary/20 hover:bg-primary/5 transition-colors"
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          Pair Device
                        </motion.button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Saved Wireless Devices */}
              {savedDevices.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-medium text-muted-foreground">Saved Devices</label>
                  <div className="space-y-1">
                    {savedDevices.map(d => (
                      <div
                        key={d.ip}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors group"
                      >
                        <Wifi size={11} className="text-primary shrink-0" />
                        <button
                          onClick={() => handleConnectIp(d.ip)}
                          className="flex-1 text-left text-[11px] text-foreground truncate"
                        >
                          <span className="font-medium">{d.name !== d.ip ? d.name : ""}</span>
                          <span className="font-mono text-muted-foreground ml-1">{d.ip}</span>
                        </button>
                        <button
                          onClick={() => handleRemoveSaved(d.ip)}
                          className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-opacity"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Activity Log + Start Button */}
              <div className="mt-auto space-y-1.5">
                <label className="text-[10px] font-medium text-muted-foreground">Activity Log</label>
                <ConsoleLog logs={wp.logs} />
                {wp.sessions.length === 0 ? (
                  <button
                    onClick={handleStart}
                    className="btn-primary flex items-center justify-center gap-2 py-2.5 text-[12px] w-full"
                  >
                    <Play size={14} /> Start Mirror
                  </button>
                ) : (
                  <button
                    onClick={wp.stopAll}
                    className="btn-outline flex items-center justify-center gap-2 border-destructive/30 text-destructive hover:bg-destructive/5 py-2.5 text-[12px] w-full"
                  >
                    <Square size={13} /> Stop Sessions ({wp.sessions.length})
                  </button>
                )}
              </div>
            </motion.div>
          ) : (
            /* Settings Tab */
            <motion.div
              key="settings-tab"
              className="h-full overflow-y-auto scrollbar-minimal space-y-3"
              initial={slideDirection === "right" ? "enterFromRight" : "enterFromLeft"}
              animate="center"
              exit={slideDirection === "right" ? "exitToLeft" : "exitToRight"}
              variants={slideVariants}
              transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              {/* Theme Section */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Palette size={13} className="text-primary" />
                  <span className="text-[11px] font-semibold text-foreground">Theme</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {THEMES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => themeCtx.setTheme(t.id)}
                      className={`relative flex flex-col items-center gap-1 p-1.5 rounded-lg border transition-colors ${
                        themeCtx.theme === t.id
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-transparent hover:bg-secondary"
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full ${t.preview} border border-border`}>
                        {themeCtx.theme === t.id && (
                          <motion.div
                            className="w-full h-full flex items-center justify-center"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 500, damping: 25 }}
                          >
                            <Check size={10} className="text-primary" />
                          </motion.div>
                        )}
                      </div>
                      <span className="text-[8px] font-medium text-muted-foreground">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* About */}
              <div className="space-y-1.5 pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">Version</span>
                  <span className="text-[10px] font-semibold text-foreground">WindPulse v2</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">Platform</span>
                  <span className="text-[10px] font-medium text-foreground">{wp.isElectron ? "Windows (Version V2.0)" : "Web Preview"}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );

  return (
    <>
      <AnimatePresence>{loading && <LoadingScreen onComplete={handleLoadComplete} />}</AnimatePresence>
      <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

      {/* Mobile Header */}
      <div className="lg:hidden sticky top-0 z-30 bg-card/90 backdrop-blur-md border-b border-border px-3 py-2 flex items-center justify-between">
        <h1 className="text-sm font-bold text-foreground">WindPulse</h1>
        <div className="flex items-center gap-2">
          <StatusBadge status={wp.status} count={wp.sessions.length} />
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
            <Menu size={16} className="text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            className="fixed inset-0 z-40 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-foreground/10 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
            <motion.div
              className="absolute right-0 top-0 bottom-0 w-[85%] max-w-sm bg-card p-4 overflow-y-auto scrollbar-minimal"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              style={{ boxShadow: "-4px 0 30px -8px rgb(0 0 0 / 0.1)" }}
            >
              <button onClick={() => setSidebarOpen(false)} className="absolute top-3 right-3 p-1 rounded-lg hover:bg-secondary transition-colors">
                <X size={14} className="text-muted-foreground" />
              </button>
              {sidebarContent}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="h-full flex flex-col lg:flex-row overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex w-72 shrink-0 bg-card p-4 flex-col border-r border-border h-full sticky top-0 overflow-y-auto scrollbar-minimal">
          {sidebarContent}
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto scrollbar-minimal">
          <motion.div
            className="max-w-2xl mx-auto px-4 pb-4 space-y-2.5 pt-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <div className="mb-1">
              <h2 className="text-base font-bold text-foreground">Mirror Settings</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">Configure your mirror session</p>
            </div>

            <SettingsCard title="Audio Only" icon={Volume2} delay={0}>
              <Toggle checked={audioOnly} onChange={() => handleModeSwitch(audioOnly ? "mirror" : "audioOnly")} label="Audio stream only" />
              <p className="text-[10px] text-muted-foreground/60">Disables all visual interaction</p>
            </SettingsCard>

            <SettingsCard title="Video" icon={Monitor} delay={0}>
              <Toggle checked={enableMirror} onChange={() => handleModeSwitch(enableMirror ? "" : "mirror")} label="Screen mirroring" />
              <Toggle checked={disableAudio} onChange={setDisableAudio} label="Mute device audio" />
              <CustomSelect value={encoder} onChange={setEncoder} options={["H.264 (AVC)", "H.265 (HEVC)", "AV1"]} label="Encoder" />
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-medium text-muted-foreground">Bitrate</span>
                  <span className="text-[11px] font-semibold text-foreground tabular-nums">{bitrate} Mbps</span>
                </div>
                <input
                  type="range" min={2} max={60} value={bitrate} onChange={e => setBitrate(+e.target.value)}
                  className="w-full h-1 bg-border rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110"
                />
              </div>
            </SettingsCard>

            <SettingsCard title="Camera" icon={Camera} delay={0}>
              <Toggle checked={enableCamera} onChange={() => handleModeSwitch(enableCamera ? "mirror" : "camera")} label="Camera mirroring" />
              <Toggle checked={noCamAudio} onChange={setNoCamAudio} label="Mute camera mic" />
              <div className="grid grid-cols-3 gap-2">
                <CustomSelect value={camSource} onChange={setCamSource} options={["back", "front", "external"]} label="Source" />
                <CustomSelect value={camRes} onChange={setCamRes} options={["1920x1080", "1280x720", "3840x2160", "2560x1440"]} label="Resolution" />
                <CustomSelect value={camFps} onChange={setCamFps} options={["30", "60", "90", "120"]} label="FPS" />
              </div>
              <CustomSelect value={camOrientation} onChange={setCamOrientation} options={["Normal", "90° CW", "180°", "270° CW", "Flip"]} label="Orientation" />
            </SettingsCard>

            <SettingsCard title="Device Control" icon={Smartphone} delay={0}>
              <Toggle checked={keepAwake} onChange={(v) => { setKeepAwake(v); if (v) setScreenOff(false); }} label="Prevent sleep" />
              <Toggle checked={screenOff} onChange={(v) => { setScreenOff(v); if (v) setKeepAwake(false); }} label="Screen off while mirroring" />
              <div className="grid grid-cols-2 gap-2">
                <Toggle checked={hidKeyboard} onChange={setHidKeyboard} label="HID Keyboard" />
                <Toggle checked={hidMouse} onChange={setHidMouse} label="HID Mouse" />
              </div>
            </SettingsCard>

            <SettingsCard title="Tablet Mode" icon={Tablet} delay={0}>
              <Toggle checked={tabletMode} onChange={() => handleModeSwitch(tabletMode ? "mirror" : "tablet")} label="Virtual display" />
              <div className="grid grid-cols-2 gap-2">
                <CustomSelect value={tabletRes} onChange={setTabletRes} options={["1920x1080", "2560x1440", "3840x2160"]} label="Resolution" />
                <CustomSelect value={tabletDpi} onChange={setTabletDpi} options={["140 DPI", "240 DPI", "360 DPI", "480 DPI"]} label="Density" />
              </div>
            </SettingsCard>
          </motion.div>
        </main>
      </div>
    </>
  );
};

export default Index;

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Play, Square, Monitor, Camera, Tablet,
  Volume2, Smartphone, Wifi, Menu, X, Trash2,
  Settings, Palette, Check, Plus, ArrowRightLeft, HelpCircle, Keyboard, QrCode,
  Loader2, RefreshCw, ArrowUpCircle, Gamepad2, Zap
} from "lucide-react";
import HowToUseModal from "@/components/HowToUseModal";
import LoadingScreen from "@/components/LoadingScreen";
import CustomSelect from "@/components/CustomSelect";
import StatusBadge from "@/components/StatusBadge";
import SettingsCard from "@/components/SettingsCard";
import ConsoleLog from "@/components/ConsoleLog";
import ShortcutsModal from "@/components/ShortcutsModal";
import QRCodeModal from "@/components/QRCodeModal";
import { useWindPulse } from "@/hooks/useWindPulse";
import { useAutoUpdater } from "@/hooks/useAutoUpdater";
import { useTheme, THEMES } from "@/hooks/useTheme";
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

type PresetKey = "balanced" | "gaming" | "low_wifi" | "webcam" | "tablet" | "custom";

interface PresetItem {
  id: PresetKey;
  label: string;
  icon: typeof Monitor;
  desc: string;
}

const PRESETS: PresetItem[] = [
  { id: "balanced", label: "Balanced", icon: Monitor, desc: "1080p • 12M • Auto HW" },
  { id: "gaming", label: "Pro Gaming", icon: Gamepad2, desc: "H.265 • 24M • D3D11 • HID" },
  { id: "low_wifi", label: "Wi-Fi Saver", icon: Wifi, desc: "720p • 6M • Smooth Buffer" },
  { id: "webcam", label: "Webcam HD", icon: Camera, desc: "1080p 60FPS • Torch • Mute" },
  { id: "tablet", label: "Virtual Tab", icon: Tablet, desc: "Secondary Desktop Screen" },
];

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
  const [howToUseOpen, setHowToUseOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [savedDevices, setSavedDevices] = useState<SavedDevice[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>("mirror");
  const prevTab = useRef<ActiveTab>("mirror");
  const [pairingOpen, setPairingOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [updateBannerDismissed, setUpdateBannerDismissed] = useState(false);
  const themeCtx = useTheme();

  const {
    updateInfo,
    isDownloading,
    isReady,
    progress: updateProgress,
    isChecking: isCheckingUpdates,
    checkForUpdates,
    applyUpdateAndRestart,
  } = useAutoUpdater();

  // Wireless debugging pairing
  const [pairingCode, setPairingCode] = useState("");
  const [pairingAddress, setPairingAddress] = useState("");

  // Mode & configuration state
  const [audioOnly, setAudioOnly] = useState(false);
  const [enableMirror, setEnableMirror] = useState(true);
  const [disableAudio, setDisableAudio] = useState(false);
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
  const [hidGamepad, setHidGamepad] = useState(false);
  const [hwdec, setHwdec] = useState("Auto (Hardware)");
  const [alwaysOnTop, setAlwaysOnTop] = useState(false);
  const [borderless, setBorderless] = useState(false);
  const [audioBuffer, setAudioBuffer] = useState(50);
  const [camTorch, setCamTorch] = useState(false);
  const [camZoom, setCamZoom] = useState(1);
  const [camHighSpeed, setCamHighSpeed] = useState(false);
  const [tabletMode, setTabletMode] = useState(false);
  const [tabletRes, setTabletRes] = useState("1920x1080");
  const [tabletDpi, setTabletDpi] = useState("240 DPI");
  const [tabletApp, setTabletApp] = useState("");
  const [activePreset, setActivePreset] = useState<PresetKey>("balanced");

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
    setLoading(false);
  }, []);

  const handleModeSwitch = useCallback((mode: "mirror" | "audioOnly" | "camera" | "tablet" | "none") => {
    setEnableMirror(mode === "mirror");
    setAudioOnly(mode === "audioOnly");
    setEnableCamera(mode === "camera");
    setTabletMode(mode === "tablet");
  }, []);

  const applyPreset = useCallback((preset: PresetKey) => {
    setActivePreset(preset);
    if (preset === "balanced") {
      handleModeSwitch("mirror");
      setEncoder("H.264 (AVC)");
      setBitrate(12);
      setHwdec("Auto (Hardware)");
      setAlwaysOnTop(false);
      setBorderless(false);
      setAudioBuffer(50);
      setDisableAudio(false);
      setHidGamepad(false);
    } else if (preset === "gaming") {
      handleModeSwitch("mirror");
      setEncoder("H.265 (HEVC)");
      setBitrate(24);
      setHwdec("D3D11VA (Direct3D 11)");
      setHidKeyboard(true);
      setHidMouse(true);
      setHidGamepad(true);
      setAudioBuffer(25);
      setAlwaysOnTop(true);
      setBorderless(false);
    } else if (preset === "low_wifi") {
      handleModeSwitch("mirror");
      setEncoder("H.264 (AVC)");
      setBitrate(6);
      setHwdec("Auto (Hardware)");
      setAudioBuffer(80);
      setAlwaysOnTop(false);
      setBorderless(false);
    } else if (preset === "webcam") {
      handleModeSwitch("camera");
      setCamRes("1920x1080");
      setCamFps("60");
      setCamSource("back");
      setNoCamAudio(true);
      setCamTorch(false);
      setCamZoom(1);
    } else if (preset === "tablet") {
      handleModeSwitch("tablet");
      setTabletRes("1920x1080");
      setTabletDpi("240 DPI");
    }
  }, [handleModeSwitch]);

  const handleStart = useCallback(() => {
    wp.startMirror({
      audioOnly, enableMirror, enableCamera, tabletMode,
      encoder, bitrate, camSource, camRes, camFps, camOrientation,
      noCamAudio, disableAudio, keepAwake, screenOff,
      hidKeyboard, hidMouse, tabletRes, tabletDpi,
      hidGamepad, hwdec, alwaysOnTop, borderless, audioBuffer,
      camTorch, camZoom, camHighSpeed, tabletApp,
    });
  }, [
    wp, audioOnly, enableMirror, enableCamera, tabletMode, encoder, bitrate,
    camSource, camRes, camFps, camOrientation, noCamAudio, disableAudio,
    keepAwake, screenOff, hidKeyboard, hidMouse, tabletRes, tabletDpi,
    hidGamepad, hwdec, alwaysOnTop, borderless, audioBuffer,
    camTorch, camZoom, camHighSpeed, tabletApp
  ]);

  // Keyboard shortcuts listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle shortcuts modal: Ctrl + / or Cmd + /
      if ((e.ctrlKey || e.metaKey) && e.key === "/") {
        e.preventDefault();
        setShortcutsOpen((prev) => !prev);
      }
      // Start mirror: Ctrl + Shift + S
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "S" || e.key === "s")) {
        e.preventDefault();
        if (wp.sessions.length === 0) {
          handleStart();
        }
      }
      // Stop all sessions: Ctrl + Shift + X
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "X" || e.key === "x")) {
        e.preventDefault();
        wp.stopAll();
      }
      // Refresh devices: Ctrl + Shift + R
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "R" || e.key === "r")) {
        e.preventDefault();
        wp.refreshDevices();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleStart, wp]);

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
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShortcutsOpen(true)}
            className="p-1 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-primary"
            title="Keyboard Shortcuts (Ctrl + /)"
          >
            <Keyboard size={15} />
          </button>
          <button
            onClick={() => setHowToUseOpen(true)}
            className="p-1 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-primary"
            title="How to use"
          >
            <HelpCircle size={15} />
          </button>
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
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-medium text-muted-foreground">Device</label>
                  <button
                    type="button"
                    onClick={() => wp.refreshDevices()}
                    className="text-[10px] text-primary hover:text-primary/80 flex items-center gap-1 transition-colors font-medium px-1.5 py-0.5 rounded hover:bg-primary/5"
                    title="Scan for connected devices (USB & Wireless)"
                  >
                    <RefreshCw size={10} /> Scan
                  </button>
                </div>
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
                  {wp.selectedDevice ? `${connectionType} connection` : "Scanning (USB & Wi-Fi)..."}
                </p>

                {wp.devices.length === 0 && (
                  <div className="p-2 rounded-lg bg-secondary/30 border border-border/60 text-center space-y-1">
                    <p className="text-[10px] text-muted-foreground">
                      No device detected
                    </p>
                    <div className="flex items-center justify-center gap-2 pt-0.5">
                      <button
                        type="button"
                        onClick={() => setHowToUseOpen(true)}
                        className="text-[9px] text-primary hover:underline font-medium"
                      >
                        USB Guide
                      </button>
                      <span className="text-[8px] text-muted-foreground/40">•</span>
                      <button
                        type="button"
                        onClick={() => setQrModalOpen(true)}
                        className="text-[9px] text-primary hover:underline font-medium"
                      >
                        Pair with QR
                      </button>
                    </div>
                  </div>
                )}

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
                      <div className="space-y-2 pt-1.5">
                        <motion.button
                          onClick={() => setQrModalOpen(true)}
                          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-medium text-foreground bg-secondary/80 hover:bg-secondary border border-border/40 transition-colors"
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <QrCode size={13} className="text-primary" />
                          <span>Pair with QR Code</span>
                        </motion.button>

                        <div className="space-y-1.5 pt-0.5">
                          <p className="text-[9px] text-muted-foreground/50">Or enter pairing details manually:</p>
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

              {/* Updates Section */}
              <div className="space-y-2 pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <RefreshCw size={12} className="text-primary" />
                    <span className="text-[11px] font-semibold text-foreground">Updates</span>
                  </div>
                  {isReady ? (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-semibold border border-emerald-500/30">
                      Ready to install
                    </span>
                  ) : isDownloading ? (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                      Downloading {updateProgress?.percentage ? `${updateProgress.percentage}%` : "..."}
                    </span>
                  ) : (
                    <span className="text-[9px] text-muted-foreground">Automatic</span>
                  )}
                </div>

                {isReady ? (
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 space-y-2">
                    <div className="flex items-start gap-2">
                      <Check size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <p className="text-[11px] font-semibold text-foreground">
                          {updateInfo?.latest_version ? `${updateInfo.latest_version} ` : ""}Update Downloaded!
                        </p>
                        <p className="text-[10px] text-muted-foreground leading-relaxed">
                          Restarting will silently install the update and reopen WindPulse automatically.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => applyUpdateAndRestart()}
                      className="w-full py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                    >
                      <RefreshCw size={12} /> Restart & Install Update
                    </button>
                  </div>
                ) : isDownloading ? (
                  <div className="p-2 rounded-lg bg-secondary/50 border border-border space-y-1.5">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-muted-foreground">Downloading update in background...</span>
                      <span className="font-semibold text-primary tabular-nums">
                        {updateProgress?.percentage || 0}%
                      </span>
                    </div>
                    <div className="w-full h-1 bg-border rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${updateProgress?.percentage || 0}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-secondary/30 border border-border">
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-medium text-foreground">
                        {updateInfo && !updateInfo.available ? "You're on the latest version" : "Auto-update enabled"}
                      </p>
                      <p className="text-[9px] text-muted-foreground">
                        Updates download automatically in the background
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isCheckingUpdates}
                      onClick={() => checkForUpdates()}
                      className="px-2.5 py-1 rounded bg-secondary hover:bg-secondary/80 text-foreground text-[10px] font-medium transition-colors flex items-center gap-1 border border-border disabled:opacity-50"
                    >
                      {isCheckingUpdates ? (
                        <>
                          <Loader2 size={10} className="animate-spin" /> Checking...
                        </>
                      ) : (
                        "Check Now"
                      )}
                    </button>
                  </div>
                )}
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
                <div className="pt-2 border-t border-border space-y-0.5">
                  <p className="text-[9px] text-muted-foreground">Developed by Muhammad Saad Abdullah</p>
                  <p className="text-[9px] text-muted-foreground">saadabdullah07bd@gmail.com</p>
                  <p className="text-[9px] text-muted-foreground/60 mt-1">© 2026 WindPulse. All rights reserved.</p>
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
      <HowToUseModal open={howToUseOpen} onClose={() => setHowToUseOpen(false)} />
      <QRCodeModal
        open={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        onDeviceConnected={handleConnectIp}
        isElectron={wp.isElectron}
        addLog={wp.addLog}
        refreshDevices={wp.refreshDevices}
      />

      {/* Mobile Header */}
      <div className="lg:hidden sticky top-0 z-30 bg-card/90 backdrop-blur-md border-b border-border px-3 py-2 flex items-center justify-between">
        <h1 className="text-sm font-bold text-foreground">WindPulse</h1>
        <div className="flex items-center gap-2">
          <StatusBadge status={wp.status} count={wp.sessions.length} />
          <button
            onClick={() => setShortcutsOpen(true)}
            className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
            title="Keyboard Shortcuts"
          >
            <Keyboard size={15} className="text-muted-foreground" />
          </button>
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

            {/* Quick Presets Bar */}
            <div className="p-2.5 rounded-xl bg-card border border-border space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                  <Zap size={12} className="text-primary" /> Quick Presets
                </span>
                <span className="text-[9px] text-muted-foreground">scrcpy v5.0.1 Optimized</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                {PRESETS.map((p) => {
                  const Icon = p.icon;
                  const isActive = activePreset === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => applyPreset(p.id)}
                      className={`flex flex-col items-start p-2 rounded-lg border text-left transition-all ${
                        isActive
                          ? "bg-primary/10 border-primary text-foreground shadow-sm"
                          : "bg-secondary/40 border-transparent hover:bg-secondary text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <Icon size={12} className={isActive ? "text-primary" : "text-muted-foreground"} />
                        <span className="text-[10px] font-bold truncate">{p.label}</span>
                      </div>
                      <span className="text-[8px] leading-tight text-muted-foreground line-clamp-1">{p.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <SettingsCard title="Audio Only" icon={Volume2} delay={0}>
              <Toggle
                checked={audioOnly}
                onChange={(checked) => handleModeSwitch(checked ? "audioOnly" : "mirror")}
                label="Audio stream only"
              />
              <p className="text-[10px] text-muted-foreground/60">Disables all visual interaction</p>
            </SettingsCard>

            <SettingsCard title="Video" icon={Monitor} delay={0}>
              <Toggle
                checked={enableMirror}
                onChange={(checked) => handleModeSwitch(checked ? "mirror" : "none")}
                label="Screen mirroring"
              />
              <Toggle checked={disableAudio} onChange={setDisableAudio} label="Mute device audio" />
              <div className="grid grid-cols-2 gap-2">
                <CustomSelect value={encoder} onChange={setEncoder} options={["H.264 (AVC)", "H.265 (HEVC)", "AV1"]} label="Encoder" />
                <CustomSelect value={hwdec} onChange={setHwdec} options={["Auto (Hardware)", "D3D11VA (Direct3D 11)", "Software (CPU)"]} label="Hardware Dec (GPU)" />
              </div>
              <div className="grid grid-cols-2 gap-2 pt-0.5">
                <Toggle checked={alwaysOnTop} onChange={setAlwaysOnTop} label="Always on top" />
                <Toggle checked={borderless} onChange={setBorderless} label="Borderless window" />
              </div>
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
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-medium text-muted-foreground">Audio Buffer (Low Latency)</span>
                  <span className="text-[11px] font-semibold text-foreground tabular-nums">{audioBuffer} ms</span>
                </div>
                <input
                  type="range" min={20} max={150} step={5} value={audioBuffer} onChange={e => setAudioBuffer(+e.target.value)}
                  className="w-full h-1 bg-border rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110"
                />
              </div>
            </SettingsCard>

            <SettingsCard title="Camera" icon={Camera} delay={0}>
              <Toggle
                checked={enableCamera}
                onChange={(checked) => handleModeSwitch(checked ? "camera" : "mirror")}
                label="Camera mirroring"
              />
              <Toggle checked={noCamAudio} onChange={setNoCamAudio} label="Mute camera mic" />
              <div className="grid grid-cols-2 gap-2">
                <Toggle checked={camTorch} onChange={setCamTorch} label="Flashlight / Torch" />
                <Toggle checked={camHighSpeed} onChange={setCamHighSpeed} label="High-speed (60fps+)" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <CustomSelect value={camSource} onChange={setCamSource} options={["back", "front", "external"]} label="Source" />
                <CustomSelect value={camRes} onChange={setCamRes} options={["1920x1080", "1280x720", "3840x2160", "2560x1440"]} label="Resolution" />
                <CustomSelect value={camFps} onChange={setCamFps} options={["30", "60", "90", "120"]} label="FPS" />
              </div>
              <CustomSelect value={camOrientation} onChange={setCamOrientation} options={["Normal", "90° CW", "180°", "270° CW", "Flip"]} label="Orientation" />
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-medium text-muted-foreground">Camera Zoom</span>
                  <span className="text-[11px] font-semibold text-foreground tabular-nums">{camZoom}x</span>
                </div>
                <input
                  type="range" min={1} max={8} step={0.5} value={camZoom} onChange={e => setCamZoom(+e.target.value)}
                  className="w-full h-1 bg-border rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110"
                />
              </div>
            </SettingsCard>

            <SettingsCard title="Device Control" icon={Smartphone} delay={0}>
              <Toggle checked={keepAwake} onChange={(v) => { setKeepAwake(v); if (v) setScreenOff(false); }} label="Prevent sleep" />
              <Toggle checked={screenOff} onChange={(v) => { setScreenOff(v); if (v) setKeepAwake(false); }} label="Screen off while mirroring" />
              <div className="grid grid-cols-3 gap-2">
                <Toggle checked={hidKeyboard} onChange={setHidKeyboard} label="HID Keyboard" />
                <Toggle checked={hidMouse} onChange={setHidMouse} label="HID Mouse" />
                <Toggle checked={hidGamepad} onChange={setHidGamepad} label="HID Gamepad" />
              </div>
            </SettingsCard>

            <SettingsCard title="Tablet Mode" icon={Tablet} delay={0}>
              <Toggle
                checked={tabletMode}
                onChange={(checked) => handleModeSwitch(checked ? "tablet" : "mirror")}
                label="Virtual display"
              />
              <div className="grid grid-cols-2 gap-2">
                <CustomSelect value={tabletRes} onChange={setTabletRes} options={["1920x1080", "2560x1440", "3840x2160"]} label="Resolution" />
                <CustomSelect value={tabletDpi} onChange={setTabletDpi} options={["140 DPI", "240 DPI", "360 DPI", "480 DPI"]} label="Density" />
              </div>
              <div className="space-y-1 pt-1">
                <span className="text-[10px] font-medium text-muted-foreground">Auto-Launch App (Optional)</span>
                <input
                  type="text"
                  value={tabletApp}
                  onChange={e => setTabletApp(e.target.value)}
                  placeholder="e.g. +org.mozilla.firefox"
                  className="w-full h-7 px-2.5 rounded-lg bg-secondary/50 border border-border text-[11px] placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary transition-colors font-mono"
                />
              </div>
            </SettingsCard>
          </motion.div>
        </main>
      </div>

      {/* Floating Update Ready Banner */}
      <AnimatePresence>
        {isReady && !updateBannerDismissed && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-4 right-4 z-50 max-w-sm p-3 rounded-xl bg-card border border-emerald-500/30 shadow-xl shadow-emerald-500/5 flex items-start gap-2.5"
          >
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
              <RefreshCw size={14} className="animate-spin" style={{ animationDuration: "3s" }} />
            </div>
            <div className="flex-1 min-w-0 pr-1">
              <p className="text-[11px] font-semibold text-foreground">
                Update Ready to Install
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                {updateInfo?.latest_version ? `${updateInfo.latest_version} ` : "A new version "}
                has been downloaded in the background.
              </p>
              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => applyUpdateAndRestart()}
                  className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-semibold flex items-center gap-1 shadow-sm transition-colors"
                >
                  <RefreshCw size={10} /> Restart Now
                </button>
                <button
                  type="button"
                  onClick={() => setUpdateBannerDismissed(true)}
                  className="px-2 py-1 rounded-md text-muted-foreground hover:text-foreground text-[10px] transition-colors"
                >
                  Later
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setUpdateBannerDismissed(true)}
              className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors"
            >
              <X size={12} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Index;

import { AnimatePresence, motion } from "framer-motion";
import {
  X, Usb, Wifi, Monitor, Camera, Volume2, Tablet,
  Smartphone, Settings, ArrowRightLeft, Play, Square
} from "lucide-react";
import windpulseIcon from "@/assets/windpulse-icon.png";

interface HowToUseModalProps {
  open: boolean;
  onClose: () => void;
}

const steps = [
  {
    icon: Usb,
    title: "Connect Your Device",
    items: [
      "Plug your Android phone via USB cable",
      "Enable USB Debugging in Developer Options on your phone",
      "Your device will appear in the device selector dropdown",
    ],
  },
  {
    icon: ArrowRightLeft,
    title: "Switch to Wireless (Optional)",
    items: [
      "Once connected via USB, click \"Switch to Wireless (TCP/IP)\"",
      "This enables ADB over Wi-Fi on port 5555",
      "You can then unplug the USB cable and connect wirelessly",
    ],
  },
  {
    icon: Wifi,
    title: "Wireless Pairing (No USB needed)",
    items: [
      "On your phone: Settings → Developer Options → Wireless Debugging",
      "Tap \"Pair device with pairing code\"",
      "Enter the Pairing Code and the IP:Port shown on your phone",
      "Click \"Pair Device\", then connect using the wireless port",
    ],
  },
  {
    icon: Monitor,
    title: "Screen Mirroring",
    items: [
      "Select your device from the dropdown",
      "Configure encoder (H.264 / H.265 / AV1) and bitrate",
      "Click \"Start Mirror\" — a new window opens with your phone screen",
      "Use HID Keyboard / Mouse for direct input from your PC",
    ],
  },
  {
    icon: Camera,
    title: "Camera Mode",
    items: [
      "Toggle Camera mirroring ON in Mirror Settings",
      "Choose front, back, or external camera source",
      "Set resolution (up to 4K) and FPS (30–120)",
      "Adjust orientation if needed (90° CW, 180°, Flip)",
    ],
  },
  {
    icon: Volume2,
    title: "Audio Only",
    items: [
      "Toggle Audio Only to stream sound without video",
      "Useful for music playback or voice calls from your PC",
      "All visual interaction is disabled in this mode",
    ],
  },
  {
    icon: Tablet,
    title: "Tablet Mode",
    items: [
      "Creates a virtual display on your phone",
      "Choose resolution and DPI density",
      "Great for running apps in a larger display layout",
    ],
  },
  {
    icon: Smartphone,
    title: "Device Controls",
    items: [
      "Keep Awake — prevents the phone from sleeping during mirror",
      "Screen Off — turns off the phone screen while mirroring",
      "Record Session — saves mirroring to an MP4 file",
    ],
  },
  {
    icon: Settings,
    title: "Themes & Settings",
    items: [
      "Switch between themes in the Settings tab",
      "All preferences are saved automatically",
      "Saved wireless devices appear for quick reconnect",
    ],
  },
];

const HowToUseModal = ({ open, onClose }: HowToUseModalProps) => {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            className="relative bg-card border border-border rounded-2xl shadow-2xl w-[90%] max-w-lg max-h-[80vh] flex flex-col overflow-hidden"
            initial={{ scale: 0.92, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <div className="flex items-center gap-3">
                <img src={windpulseIcon} alt="WindPulse" width={28} height={28} />
                <div>
                  <h2 className="text-sm font-bold text-foreground">How to Use WindPulse</h2>
                  <p className="text-[10px] text-muted-foreground">Complete guide to mirror your Android device</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto scrollbar-minimal px-5 py-4 space-y-4">
              {/* Quick Start */}
              <div className="bg-primary/5 border border-primary/10 rounded-xl p-3">
                <p className="text-[11px] font-semibold text-primary mb-1">⚡ Quick Start</p>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Plug in your Android via USB → Enable USB Debugging → Select your device → Click Start Mirror. That's it!
                </p>
              </div>

              {/* Steps */}
              {steps.map((step, i) => (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="space-y-1.5"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                      <step.icon size={13} className="text-primary" />
                    </div>
                    <span className="text-[11px] font-semibold text-foreground">{step.title}</span>
                  </div>
                  <ul className="ml-8 space-y-0.5">
                    {step.items.map((item, j) => (
                      <li key={j} className="text-[10px] text-muted-foreground leading-relaxed flex items-start gap-1.5">
                        <span className="text-primary mt-0.5 shrink-0">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}

              {/* Prerequisites */}
              <div className="bg-secondary/50 rounded-xl p-3 space-y-1.5">
                <p className="text-[11px] font-semibold text-foreground">📋 Prerequisites</p>
                <ul className="space-y-0.5">
                  {[
                    "Android device with USB Debugging enabled",
                    "USB cable (for initial connection) or Wi-Fi (for wireless)",
                    "ADB and scrcpy binaries in the bin/ folder",
                    "Windows / macOS / Linux supported",
                  ].map((item, i) => (
                    <li key={i} className="text-[10px] text-muted-foreground flex items-start gap-1.5">
                      <span className="text-primary mt-0.5 shrink-0">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Keyboard Shortcuts */}
              <div className="bg-secondary/50 rounded-xl p-3 space-y-1.5">
                <p className="text-[11px] font-semibold text-foreground">⌨️ Keyboard Shortcuts</p>
                <div className="grid grid-cols-2 gap-1">
                  {[
                    ["Ctrl + Shift + S", "Start mirror"],
                    ["Ctrl + Shift + X", "Stop all"],
                    ["Ctrl + Shift + R", "Refresh devices"],
                    ["Ctrl + /", "Show shortcuts"],
                  ].map(([key, desc]) => (
                    <div key={key} className="flex items-center gap-1.5 text-[10px]">
                      <kbd className="px-1.5 py-0.5 bg-card border border-border rounded text-[9px] font-mono text-foreground">{key}</kbd>
                      <span className="text-muted-foreground">{desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-border shrink-0 flex items-center justify-between">
              <span className="text-[9px] text-muted-foreground">WindPulse v2.0</span>
              <button
                onClick={onClose}
                className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-[11px] font-medium hover:opacity-90 transition-opacity"
              >
                Got it
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default HowToUseModal;

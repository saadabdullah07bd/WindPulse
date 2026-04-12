import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

const shortcuts = [
  ["Fullscreen", "Alt + F"],
  ["Rotate Left/Right", "Alt + ← / →"],
  ["Home", "Alt + H"],
  ["Back", "Alt + B"],
  ["App Switcher", "Alt + S"],
  ["Power Button", "Alt + P"],
  ["Volume Up/Down", "Alt + ↑ / ↓"],
  ["Screen Off", "Alt + O"],
  ["Screen On", "Alt + Shift + O"],
  ["Notifications", "Alt + N"],
  ["Copy to Device", "Alt + C"],
  ["Paste to Device", "Alt + V"],
  ["FPS Counter", "Alt + I"],
  ["Pinch-to-zoom", "Ctrl + Drag"],
  ["Install APK", "Drag & Drop"],
];

const ShortcutsModal = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="absolute inset-0 bg-foreground/10 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            className="relative card-elevated w-full max-w-md max-h-[85vh] overflow-hidden mx-0 sm:mx-4 rounded-t-2xl sm:rounded-2xl"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            style={{ boxShadow: "0 -4px 40px -8px rgb(0 0 0 / 0.1)" }}
          >
            {/* Drag handle for mobile */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>

            <div className="px-5 pt-3 pb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Keyboard Shortcuts</h2>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground">
                <X size={16} />
              </button>
            </div>

            <div className="px-5 pb-5 overflow-y-auto max-h-[70vh] scrollbar-minimal">
              <div className="divide-y divide-border/60">
                {shortcuts.map(([action, key], i) => (
                  <motion.div
                    key={action}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="flex items-center justify-between py-2.5"
                  >
                    <span className="text-sm text-muted-foreground">{action}</span>
                    <kbd className="text-[11px] font-mono text-foreground/70 bg-secondary px-2 py-0.5 rounded-md">
                      {key}
                    </kbd>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ShortcutsModal;

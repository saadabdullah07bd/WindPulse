import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, RefreshCw, QrCode, Smartphone, Wifi, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import QRCode from "qrcode";

interface QRCodeModalProps {
  open: boolean;
  onClose: () => void;
  onDeviceConnected?: (serial: string) => void;
  isElectron: boolean;
  addLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
  refreshDevices: () => Promise<void>;
}

export type PairingStage = "ready" | "pairing" | "connecting" | "success" | "error";

export const QRCodeModal = ({
  open,
  onClose,
  onDeviceConnected,
  isElectron,
  addLog,
  refreshDevices,
}: QRCodeModalProps) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [serviceName, setServiceName] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [pairingStage, setPairingStage] = useState<PairingStage>("ready");
  const [statusMessage, setStatusMessage] = useState<string>("Ready to scan");
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isCancelledRef = useRef<boolean>(false);

  // Generate pairing credentials and QR payload
  const generateNewQR = useCallback(async () => {
    // Android 11+ AOSP Wireless Debugging QR Schema:
    // WIFI:T:ADB;S:<SERVICE_NAME>;P:<PASSWORD>;;
    const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
    const svcName = `windpulse-${randomHex}`;
    const pwd = Math.floor(100000 + Math.random() * 900000).toString();
    const payload = `WIFI:T:ADB;S:${svcName};P:${pwd};;`;

    setServiceName(svcName);
    setPassword(pwd);
    setPairingStage("ready");
    setStatusMessage("Scan this QR code with your phone");

    try {
      const url = await QRCode.toDataURL(payload, {
        errorCorrectionLevel: "M",
        margin: 2,
        width: 280,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      });
      setQrDataUrl(url);
    } catch (err) {
      console.error("QR Code generation error:", err);
    }
  }, []);

  // Initialize or re-generate when modal opens
  useEffect(() => {
    if (open) {
      isCancelledRef.current = false;
      generateNewQR();
    } else {
      isCancelledRef.current = true;
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    }
  }, [open, generateNewQR]);

  // Active mDNS pairing watcher when modal is open in Electron
  useEffect(() => {
    if (!open || !isElectron || !password) return;

    let inFlight = false;
    const checkMdnsAndPair = async () => {
      if (inFlight || isCancelledRef.current || !window.windpulse?.adbMdndServices) return;
      inFlight = true;

      try {
        const mdnsRes = await window.windpulse.adbMdndServices();
        if (isCancelledRef.current) return;

        if (mdnsRes.success && mdnsRes.services && mdnsRes.services.length > 0) {
          // Look for an adb-tls-pairing service advertised on the network
          const pairingService = mdnsRes.services.find(s => s.type.includes("pairing"));
          if (pairingService && pairingStage === "ready") {
            setPairingStage("pairing");
            setStatusMessage(`Device detected at ${pairingService.address}. Pairing...`);
            addLog(`QR pairing match detected at ${pairingService.address}`, "info");

            // Execute adb pair with the generated password
            const pairRes = await window.windpulse.adbPair(pairingService.address, password);
            if (isCancelledRef.current) return;

            if (pairRes.success) {
              setPairingStage("connecting");
              setStatusMessage("Paired successfully! Searching connection port...");
              addLog(`Paired with ${pairingService.address}`, "success");

              // Now wait briefly for adb-tls-connect to appear or connect to same IP
              const [ip] = pairingService.address.split(":");
              let connected = false;

              // Give device up to 6 seconds to advertise connection service
              for (let i = 0; i < 6; i++) {
                if (isCancelledRef.current) return;
                await new Promise(r => setTimeout(r, 1000));
                const nextMdns = await window.windpulse.adbMdndServices();
                const connectService = nextMdns.services?.find(
                  s => s.type.includes("connect") && s.address.startsWith(ip)
                );

                if (connectService) {
                  const connRes = await window.windpulse.adbConnect(connectService.address);
                  if (connRes.success) {
                    connected = true;
                    setPairingStage("success");
                    setStatusMessage(`Connected to ${connectService.address}!`);
                    addLog(`Connected to ${connectService.address}`, "success");
                    if (onDeviceConnected) onDeviceConnected(connectService.address);
                    await refreshDevices();
                    setTimeout(() => {
                      if (!isCancelledRef.current) onClose();
                    }, 1800);
                    break;
                  }
                }
              }

              if (!connected && !isCancelledRef.current) {
                setPairingStage("success");
                setStatusMessage("Paired! Check your device list.");
                await refreshDevices();
                setTimeout(() => {
                  if (!isCancelledRef.current) onClose();
                }, 2000);
              }
            } else {
              setPairingStage("error");
              setStatusMessage(`Pairing failed: ${pairRes.error || "Unknown error"}`);
              addLog(`QR Pairing failed: ${pairRes.error}`, "error");
            }
          }
        }
      } catch (err) {
        console.error("mDNS pairing error:", err);
      } finally {
        inFlight = false;
      }
    };

    pollTimerRef.current = setInterval(checkMdnsAndPair, 2000);

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [open, isElectron, password, pairingStage, addLog, refreshDevices, onDeviceConnected, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />

          {/* Modal Container */}
          <motion.div
            className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden z-10 flex flex-col"
            initial={{ scale: 0.92, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 16 }}
            transition={{ type: "spring", stiffness: 450, damping: 32 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-secondary/30">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <QrCode size={16} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-foreground">Pair with QR Code</h2>
                  <p className="text-[10px] text-muted-foreground">Android 11+ Wireless Debugging</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 flex flex-col items-center gap-4 text-center">
              {/* Instructions Banner */}
              <div className="w-full bg-secondary/40 border border-border/80 rounded-xl p-3 text-left space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
                  <Smartphone size={13} className="text-primary" />
                  <span>On your Android phone:</span>
                </div>
                <ol className="text-[10px] text-muted-foreground space-y-0.5 list-decimal list-inside pl-1">
                  <li>Open <strong>Settings → Developer options</strong></li>
                  <li>Turn on <strong>Wireless debugging</strong></li>
                  <li>Tap <strong>"Pair device with QR code"</strong></li>
                  <li>Point your phone's camera at the QR code below</li>
                </ol>
              </div>

              {/* QR Code Graphic Box */}
              <div className="relative p-3 bg-white rounded-2xl border-2 border-border shadow-md">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="Wireless Debugging QR Code"
                    className="w-56 h-56 rounded-lg select-none"
                  />
                ) : (
                  <div className="w-56 h-56 flex items-center justify-center">
                    <Loader2 size={24} className="animate-spin text-muted-foreground" />
                  </div>
                )}

                {/* Overlay Animation for Pairing Stages */}
                <AnimatePresence>
                  {pairingStage === "pairing" && (
                    <motion.div
                      className="absolute inset-0 bg-primary/10 backdrop-blur-[2px] rounded-2xl flex flex-col items-center justify-center gap-2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <Loader2 size={32} className="animate-spin text-primary" />
                      <span className="text-xs font-semibold text-primary bg-card/90 px-3 py-1 rounded-full shadow-sm">
                        Pairing device...
                      </span>
                    </motion.div>
                  )}
                  {pairingStage === "success" && (
                    <motion.div
                      className="absolute inset-0 bg-emerald-500/10 backdrop-blur-[2px] rounded-2xl flex flex-col items-center justify-center gap-2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <CheckCircle2 size={36} className="text-emerald-500" />
                      <span className="text-xs font-semibold text-emerald-600 bg-card/90 px-3 py-1 rounded-full shadow-sm">
                        Paired & Connected!
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Status Message */}
              <div className="flex items-center gap-2 text-[11px] font-medium">
                {pairingStage === "ready" && (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                  </span>
                )}
                {pairingStage === "pairing" && <Loader2 size={12} className="animate-spin text-primary" />}
                {pairingStage === "success" && <CheckCircle2 size={13} className="text-emerald-500" />}
                {pairingStage === "error" && <AlertCircle size={13} className="text-destructive" />}

                <span
                  className={
                    pairingStage === "error"
                      ? "text-destructive"
                      : pairingStage === "success"
                      ? "text-emerald-500"
                      : "text-muted-foreground"
                  }
                >
                  {statusMessage}
                </span>
              </div>

              {/* Payload details badge */}
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground bg-secondary/50 px-3 py-1 rounded-lg font-mono">
                <span>Service: <strong className="text-foreground">{serviceName}</strong></span>
                <span>•</span>
                <span>Code: <strong className="text-foreground">{password}</strong></span>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="px-5 py-3 border-t border-border bg-secondary/20 flex items-center justify-between">
              <button
                onClick={generateNewQR}
                className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors font-medium"
              >
                <RefreshCw size={12} />
                <span>New QR Code</span>
              </button>

              <button
                onClick={onClose}
                className="px-4 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-[11px] font-semibold text-foreground transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default QRCodeModal;

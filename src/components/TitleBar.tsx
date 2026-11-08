import { ArrowUpCircle, Loader2, Minus, RefreshCw, Square, X } from "lucide-react";
import { useAutoUpdater } from "@/hooks/useAutoUpdater";

const TitleBar = () => {
  const isElectron = !!window.windpulse;
  const { isDownloading, isReady, progress, updateInfo, applyUpdateAndRestart } = useAutoUpdater();

  if (!isElectron) return null;

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag with left mouse button
    if (e.button === 0) {
      if (e.detail === 2) {
        // Double-click to toggle maximize/unmaximize
        window.windpulse?.windowMaximize();
      } else {
        // Start dragging window
        window.windpulse?.windowStartDragging?.();
      }
    }
  };

  return (
    <div
      data-tauri-drag-region
      onMouseDown={handleMouseDown}
      className="h-8 bg-card border-b border-border flex items-center justify-between select-none shrink-0 transition-colors duration-300 cursor-default"
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
    >
      <div
        data-tauri-drag-region
        className="flex items-center gap-2 px-3 flex-1 h-full pointer-events-none"
      >
        <span
          data-tauri-drag-region
          className="text-[11px] font-medium text-muted-foreground transition-colors duration-300 select-none pointer-events-none"
        >
          WindPulse
        </span>

        {/* Update status badge in title bar */}
        {isReady ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              applyUpdateAndRestart();
            }}
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
            className="pointer-events-auto ml-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 text-[10px] font-semibold transition-all hover:scale-105"
            title="Update is ready! Click to restart and install"
          >
            <RefreshCw size={10} className="animate-spin" style={{ animationDuration: "3s" }} />
            <span>Restart to Update</span>
          </button>
        ) : isDownloading ? (
          <div
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
            className="pointer-events-auto ml-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-[10px] font-medium"
            title="Downloading update in background..."
          >
            <Loader2 size={10} className="animate-spin" />
            <span>
              Updating {progress?.percentage ? `${progress.percentage}%` : "..."}
            </span>
          </div>
        ) : null}
      </div>
      <div
        className="flex items-center h-full"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => window.windpulse?.windowMinimize()}
          className="h-full px-3 hover:bg-secondary transition-all duration-200 text-muted-foreground hover:text-foreground"
          title="Minimize"
        >
          <Minus size={14} />
        </button>
        <button
          onClick={() => window.windpulse?.windowMaximize()}
          className="h-full px-3 hover:bg-secondary transition-all duration-200 text-muted-foreground hover:text-foreground"
          title="Maximize"
        >
          <Square size={11} />
        </button>
        <button
          onClick={() => window.windpulse?.windowClose()}
          className="h-full px-3 hover:bg-destructive hover:text-destructive-foreground transition-all duration-200 text-muted-foreground"
          title="Close"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

export default TitleBar;

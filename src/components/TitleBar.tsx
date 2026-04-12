import { Minus, Square, X } from "lucide-react";

const TitleBar = () => {
  const isElectron = !!window.windpulse;

  if (!isElectron) return null;

  return (
    <div
      className="h-8 bg-card border-b border-border flex items-center justify-between select-none shrink-0 transition-colors duration-300"
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
    >
      <div className="flex items-center gap-2 px-3">
        <span className="text-[11px] font-medium text-muted-foreground transition-colors duration-300">WindPulse</span>
      </div>
      <div
        className="flex items-center h-full"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
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

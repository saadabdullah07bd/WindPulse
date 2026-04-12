import { motion } from "framer-motion";

type Status = "initializing" | "ready" | "active" | "disconnected";

const statusConfig: Record<Status, { label: string; dotClass: string; bgClass: string }> = {
  initializing: { label: "Initializing", dotClass: "bg-warning", bgClass: "bg-warning/8 text-warning" },
  ready: { label: "Ready", dotClass: "bg-success", bgClass: "bg-success/8 text-success" },
  active: { label: "Active", dotClass: "bg-success", bgClass: "bg-success/8 text-success" },
  disconnected: { label: "Disconnected", dotClass: "bg-destructive", bgClass: "bg-destructive/8 text-destructive" },
};

const StatusBadge = ({ status, count }: { status: Status; count?: number }) => {
  const cfg = statusConfig[status];
  const showPulse = status === "active" || status === "initializing";

  return (
    <motion.div
      layout
      className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold ${cfg.bgClass}`}
    >
      <span className="relative flex h-2 w-2">
        {showPulse && (
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-40 ${cfg.dotClass}`} />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${cfg.dotClass}`} />
      </span>
      {cfg.label}{count && count > 0 ? ` · ${count}` : ""}
    </motion.div>
  );
};

export default StatusBadge;
export type { Status };

import { forwardRef, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { LogEntry } from "@/hooks/useWindPulse";

const dotColors: Record<string, string> = {
  info: "bg-muted-foreground/40",
  success: "bg-success",
  error: "bg-destructive",
  warning: "bg-warning",
};

const ConsoleLog = forwardRef<HTMLDivElement, { logs: LogEntry[] }>(({ logs }, _ref) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [logs]);

  return (
    <div
      ref={scrollRef}
      className="h-40 overflow-y-auto rounded-xl bg-secondary/50 p-3 font-mono text-[11px] leading-6 scrollbar-minimal"
    >
      <AnimatePresence initial={false}>
        {logs.map((log) => (
          <motion.div
            key={log.id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ duration: 0.12 }}
            className="flex items-start gap-2"
          >
            <span className={`mt-2 shrink-0 w-1.5 h-1.5 rounded-full ${dotColors[log.type]}`} />
            <span className="text-muted-foreground/50 shrink-0">{log.time}</span>
            <span className="text-muted-foreground">{log.message}</span>
          </motion.div>
        ))}
      </AnimatePresence>
      {logs.length === 0 && (
        <span className="text-muted-foreground/30">Waiting for events...</span>
      )}
    </div>
  );
});

ConsoleLog.displayName = "ConsoleLog";

export default ConsoleLog;

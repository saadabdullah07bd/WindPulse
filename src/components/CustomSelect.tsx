import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check } from "lucide-react";

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  label?: string;
  placeholder?: string;
}

const CustomSelect = ({ value, onChange, options, label, placeholder }: CustomSelectProps) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="space-y-1.5" ref={ref}>
      {label && <label className="text-[11px] font-medium text-muted-foreground">{label}</label>}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className={`
            w-full flex items-center justify-between gap-2 rounded-xl 
            bg-secondary/60 border px-3.5 py-2.5 text-sm text-foreground 
            transition-all duration-200 cursor-pointer text-left
            ${open 
              ? "border-primary/30 bg-card ring-2 ring-primary/10" 
              : "border-transparent hover:bg-secondary"
            }
          `}
        >
          <span className={value ? "" : "text-muted-foreground/60"}>
            {value || placeholder || "Select..."}
          </span>
          <motion.div
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            <ChevronDown size={14} className="text-muted-foreground shrink-0" />
          </motion.div>
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="absolute z-50 mt-1.5 w-full rounded-xl bg-card border border-border overflow-hidden"
              style={{ 
                boxShadow: "0 8px 30px -4px rgb(0 0 0 / 0.12), 0 2px 8px -2px rgb(0 0 0 / 0.08)",
              }}
            >
              <div className="py-1 max-h-52 overflow-y-auto scrollbar-minimal">
                {options.map((opt, i) => (
                  <motion.button
                    key={opt}
                    type="button"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    onClick={() => { onChange(opt); setOpen(false); }}
                    className={`
                      w-full flex items-center justify-between px-3.5 py-2 text-sm transition-colors
                      ${opt === value 
                        ? "text-primary bg-primary/5 font-medium" 
                        : "text-foreground hover:bg-secondary/80"
                      }
                    `}
                  >
                    <span>{opt}</span>
                    {opt === value && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      >
                        <Check size={14} className="text-primary" />
                      </motion.div>
                    )}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CustomSelect;

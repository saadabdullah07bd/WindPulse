import { motion } from "framer-motion";
import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

interface SettingsCardProps {
  title: string;
  icon?: LucideIcon;
  children: ReactNode;
  delay?: number;
}

const SettingsCard = ({ title, icon: Icon, children, delay = 0 }: SettingsCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="card-elevated-hover p-5"
    >
      <div className="flex items-center gap-2.5 mb-4">
        {Icon && (
          <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center">
            <Icon size={16} className="text-primary" />
          </div>
        )}
        <h3 className="text-[13px] font-semibold text-foreground tracking-tight">
          {title}
        </h3>
      </div>
      <div className="space-y-3">{children}</div>
    </motion.div>
  );
};

export default SettingsCard;

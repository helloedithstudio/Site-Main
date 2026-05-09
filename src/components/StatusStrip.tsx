import { motion } from "framer-motion";

export function StatusStrip() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.9 }}
      className="border-t border-foreground/[0.07] px-5 py-5 sm:px-8"
    >
      <div className="mx-auto flex max-w-[1400px] flex-col items-center gap-4 sm:flex-row sm:justify-between sm:gap-0">
        <span className="text-[11px] uppercase tracking-[0.22em] text-foreground/30">
          Current status
        </span>
        <span className="flex items-center gap-2 text-[12px] text-foreground/45">
          <span className="h-1.5 w-1.5 rounded-full bg-foreground/35 animate-pulse" />
          Available · Responding within 24h
        </span>
        <span className="hidden text-[11px] uppercase tracking-[0.22em] text-foreground/30 sm:block">
          Q3 2026
        </span>
      </div>
    </motion.div>
  );
}

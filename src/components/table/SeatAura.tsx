"use client";
import { motion, AnimatePresence } from "framer-motion";

export function SeatAura({ accent, active }: { accent: string; active: boolean }) {
  return (
    <AnimatePresence>
      {active && (
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute -inset-2.5 rounded-full"
          style={{ boxShadow: `0 0 0 2px ${accent}55, 0 0 30px 6px ${accent}40` }}
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: [0.42, 0.95, 0.42], scale: [0.97, 1.05, 0.97] }}
          exit={{ opacity: 0, scale: 0.94 }}
          transition={{
            opacity: { duration: 2.2, repeat: Infinity, ease: "easeInOut" },
            scale: { duration: 2.2, repeat: Infinity, ease: "easeInOut" },
            exit: { duration: 0.22 },
          }}
        />
      )}
    </AnimatePresence>
  );
}

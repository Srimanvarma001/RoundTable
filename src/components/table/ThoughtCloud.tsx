"use client";
import { motion } from "framer-motion";

export function ThoughtCloud({ accent }: { accent: string }) {
  return (
    <motion.div
      className="absolute -top-11 left-1/2 flex -translate-x-1/2 items-center gap-[5px] rounded-full border px-2.5 py-2"
      style={{ borderColor: "var(--line)", background: "var(--bg-elev-2)" }}
      initial={{ opacity: 0, y: 6, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 4, scale: 0.92 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      aria-label="thinking"
    >
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="block h-1.5 w-1.5 rounded-full"
          style={{ background: accent }}
          animate={{ opacity: [0.25, 1, 0.25], y: [0, -3, 0], scale: [0.85, 1.1, 0.85] }}
          transition={{ duration: 1.15, repeat: Infinity, ease: "easeInOut", delay: i * 0.16 }}
        />
      ))}
      <span className="absolute -bottom-[5px] left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 border-b border-r"
        style={{ borderColor: "var(--line)", background: "var(--bg-elev-2)" }} />
    </motion.div>
  );
}

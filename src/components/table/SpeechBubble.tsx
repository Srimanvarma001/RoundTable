"use client";
import { motion } from "framer-motion";

export function SpeechBubble({ take, accent }: { take: string; accent: string }) {
  if (!take) return null;
  return (
    <motion.div layout
      initial={{ opacity: 0, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.97 }}
      transition={{ type: "spring", stiffness: 320, damping: 26, mass: 0.7 }}
      className="absolute left-1/2 top-[calc(100%+10px)] w-44 -translate-x-1/2 rounded-xl border px-3 py-2 text-[12.5px] leading-snug"
      style={{ borderColor: `${accent}44`, background: "var(--bg-elev-2)", color: "var(--text-dim)" }}>
      <p className="line-clamp-2">{take}</p>
    </motion.div>
  );
}

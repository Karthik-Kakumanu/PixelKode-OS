"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

interface HolographicCardProps {
  title: string;
  children: React.ReactNode;
  delay?: number;
  glowColor?: "cyan" | "fuchsia" | "emerald" | "amber";
}

export function HolographicCard({ title, children, delay = 0, glowColor = "cyan" }: HolographicCardProps) {
  const glowMap = {
    cyan: "from-cyan-500/20 to-transparent shadow-[inset_0_0_20px_rgba(34,211,238,0.15)]",
    fuchsia: "from-fuchsia-500/20 to-transparent shadow-[inset_0_0_20px_rgba(192,38,211,0.15)]",
    emerald: "from-emerald-500/20 to-transparent shadow-[inset_0_0_20px_rgba(16,185,129,0.15)]",
    amber: "from-amber-500/20 to-transparent shadow-[inset_0_0_20px_rgba(245,158,11,0.15)]",
  };

  const textMap = {
    cyan: "text-cyan-400",
    fuchsia: "text-fuchsia-400",
    emerald: "text-emerald-400",
    amber: "text-amber-400",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`glass-panel relative overflow-hidden rounded-[24px] p-6 group`}
    >
      {/* Animated Glowing Background */}
      <div className={`absolute top-0 right-0 w-full h-full bg-gradient-to-bl ${glowMap[glowColor]} opacity-40 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none`} />
      
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className={`h-4 w-4 ${textMap[glowColor]} animate-pulse`} />
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-zinc-400">
            {title}
          </h3>
        </div>
        {children}
      </div>
    </motion.div>
  );
}
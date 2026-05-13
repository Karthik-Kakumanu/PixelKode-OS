"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, X, Sparkles, Loader2 } from "lucide-react";

export function VoiceOrb() {
  const [isActive, setIsActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const toggleOrb = () => {
    setIsActive(!isActive);
    if (!isActive) {
      // Simulate listening -> processing state
      setTimeout(() => setIsProcessing(true), 2000);
      setTimeout(() => {
        setIsProcessing(false);
        setIsActive(false);
      }, 5000);
    } else {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[90] flex items-end justify-end">
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="absolute bottom-20 right-0 w-[320px] rounded-[32px] border border-white/60 dark:border-white/10 bg-white/80 dark:bg-zinc-950/80 p-6 shadow-2xl backdrop-blur-2xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <Sparkles className="h-5 w-5 text-fuchsia-500" />
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Neural Assistant</p>
            </div>
            
            <div className="flex items-center justify-center py-6">
              {isProcessing ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
                  <p className="text-sm text-slate-500 dark:text-zinc-400">Executing sequence...</p>
                </div>
              ) : (
                <div className="flex gap-1">
                  {/* Voice waveform simulation */}
                  {[1, 2, 3, 4, 5].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ height: ["10px", "40px", "10px"] }}
                      transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.1 }}
                      className="w-1.5 rounded-full bg-cyan-500"
                    />
                  ))}
                </div>
              )}
            </div>
            <p className="text-center text-xs text-slate-400 dark:text-zinc-500">I am listening. Issue a command.</p>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={toggleOrb}
        className={`relative flex h-16 w-16 items-center justify-center rounded-full border shadow-2xl backdrop-blur-xl transition-all ${
          isActive 
            ? "border-rose-500/50 bg-rose-500/10 text-rose-500" 
            : "border-white/60 dark:border-white/10 bg-white/60 dark:bg-zinc-900/80 text-cyan-600 dark:text-cyan-400 hover:shadow-[0_0_30px_rgba(34,211,238,0.3)]"
        }`}
      >
        {/* Glow behind orb */}
        <div className="absolute inset-0 -z-10 rounded-full bg-gradient-to-tr from-cyan-400/20 to-fuchsia-400/20 blur-xl" />
        
        {isActive ? <X className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
      </motion.button>
    </div>
  );
}
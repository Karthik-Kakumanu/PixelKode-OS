"use client";

import type { ComponentType } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  Calendar,
  LineChart,
  Mic,
  Plus,
  Search,
  Sparkles
} from "lucide-react";

import { primaryRoutes } from "@/lib/navigation";

type PaletteCommand = {
  category: string;
  icon: ComponentType<{ className?: string }>;
  keywords: string[];
  text: string;
  run: () => void;
};

export function CommandPalette() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");

  const commands = useMemo<PaletteCommand[]>(
    () => [
      {
        category: "Assistant",
        icon: Sparkles,
        keywords: ["dashboard analytics revenue profit summary"],
        text: "Analyze my dashboard and business health",
        run: () => {
          window.dispatchEvent(
            new CustomEvent("ops-assistant:prompt", {
              detail: { prompt: "Give me a business summary from my real data.", run: true }
            })
          );
        }
      },
      {
        category: "Assistant",
        icon: Mic,
        keywords: ["voice mic speech"],
        text: "Open voice assistant and start listening",
        run: () => {
          window.dispatchEvent(new Event("ops-assistant:voice"));
        }
      },
      {
        category: "Workflow",
        icon: Plus,
        keywords: ["lead fresh saturday"],
        text: "Add a fresh lead",
        run: () => {
          window.dispatchEvent(
            new CustomEvent("ops-assistant:prompt", {
              detail: { prompt: "Add lead", run: false }
            })
          );
        }
      },
      {
        category: "Workflow",
        icon: Calendar,
        keywords: ["meet google meeting session"],
        text: "Create a Google Meet session",
        run: () => router.push("/meet-session")
      },
      {
        category: "Analytics",
        icon: LineChart,
        keywords: ["cash flow pending received revenue"],
        text: "Show cash-flow blockers",
        run: () => {
          window.dispatchEvent(
            new CustomEvent("ops-assistant:prompt", {
              detail: { prompt: "Which projects are blocking cash flow?", run: true }
            })
          );
        }
      },
      ...primaryRoutes.map((route) => ({
        category: "Navigate",
        icon: route.icon,
        keywords: [route.label.toLowerCase(), route.description.toLowerCase(), route.href.replace("/", "")],
        text: `Go to ${route.label}`,
        run: () => router.push(route.href)
      }))
    ],
    [router]
  );

  const filteredCommands = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return commands;
    return commands.filter((command) =>
      [command.text, command.category, ...command.keywords].some((value) => value.toLowerCase().includes(normalizedQuery))
    );
  }, [commands, query]);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setIsOpen((open) => !open);
      }

      if (event.key === "Escape") {
        setIsOpen(false);
      }

      if (event.key === "Enter" && isOpen && filteredCommands.length > 0) {
        event.preventDefault();
        filteredCommands[0].run();
        setIsOpen(false);
        setQuery("");
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [filteredCommands, isOpen]);

  const runCommand = (command: PaletteCommand) => {
    command.run();
    setIsOpen(false);
    setQuery("");
  };

  return (
    <AnimatePresence>
      {isOpen ? (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 bg-slate-900/20 dark:bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-3xl overflow-hidden rounded-[24px] border border-white/60 bg-white/85 shadow-[0_40px_100px_rgba(15,23,42,0.15)] backdrop-blur-2xl dark:border-white/10 dark:bg-zinc-950/85 dark:shadow-[0_40px_100px_rgba(0,0,0,0.8)]"
          >
            <div className="flex items-center border-b border-slate-200 px-4 dark:border-white/10">
              <Search className="h-5 w-5 text-slate-400 dark:text-zinc-500" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search pages, run assistant actions, or jump into workflows..."
                className="flex-1 bg-transparent px-4 py-5 text-lg text-slate-900 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-zinc-600"
              />
              <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-500 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-400">
                ENTER runs
              </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-2">
              <div className="px-3 py-2 text-xs font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-zinc-500">
                Results
              </div>
              <div className="space-y-1">
                {filteredCommands.map((command) => {
                  const Icon = command.icon;
                  return (
                    <button
                      key={`${command.category}-${command.text}`}
                      type="button"
                      onClick={() => runCommand(command)}
                      className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-white hover:shadow-sm dark:hover:bg-zinc-900"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-cyan-600 group-hover:bg-cyan-50 dark:bg-zinc-800 dark:text-cyan-400 dark:group-hover:bg-cyan-500/20">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 dark:text-zinc-200 dark:group-hover:text-white">
                          {command.text}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 dark:text-zinc-600">{command.category}</span>
                    </button>
                  );
                })}

                {filteredCommands.length === 0 ? (
                  <div className="px-3 py-6 text-sm text-slate-500 dark:text-zinc-400">
                    No matching actions yet. Try "dashboard", "lead", "meet", or "cash flow".
                  </div>
                ) : null}
              </div>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

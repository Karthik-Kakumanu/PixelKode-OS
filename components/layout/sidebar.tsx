"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import { motion } from "framer-motion";
import { ChevronLeft, Cpu, Grid2x2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { routesByGroup } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export function Sidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const [expanded, setExpanded] = React.useState(true);

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-md transition-opacity md:hidden dark:bg-black/65",
          mobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
      />

      <aside
        className={cn(
          "glass-panel fixed inset-y-3 left-3 z-50 flex w-[240px] flex-col rounded-[28px] p-3 transition-transform duration-300 md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-[120%]"
        )}
      >
        <SidebarHeader expanded onToggle={onClose} mobile />
        <div className="mt-5 flex-1 overflow-y-auto pr-1">
          <SidebarGroups pathname={pathname} expanded onNavigate={onClose} layoutIdPrefix="mobile" />
        </div>
      </aside>

      <aside
        className={cn(
          "glass-panel relative z-40 hidden shrink-0 flex-col rounded-[32px] border-white/50 md:flex",
          expanded ? "w-[240px] p-3" : "w-[84px] p-3"
        )}
      >
        <SidebarHeader expanded={expanded} onToggle={() => setExpanded((value) => !value)} />
        <div className="mt-5 flex-1 overflow-y-auto pr-1">
          <SidebarGroups pathname={pathname} expanded={expanded} layoutIdPrefix="desktop" />
        </div>
        <SidebarFooter expanded={expanded} />
      </aside>
    </>
  );
}

function SidebarHeader({
  expanded,
  onToggle,
  mobile = false
}: {
  expanded: boolean;
  onToggle: () => void;
  mobile?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-[24px] border border-white/50 bg-white/45 p-3 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/5",
        !expanded && !mobile ? "px-2.5" : ""
      )}
    >
      <div className={cn("flex items-center gap-3", !expanded && !mobile ? "justify-center" : "")}>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-[0_16px_30px_rgba(15,23,42,0.16)] dark:bg-white dark:text-slate-950">
          <Grid2x2 className="h-4.5 w-4.5" />
        </div>

        {(expanded || mobile) && (
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-cyan-600 dark:text-cyan-300">Operations Workspace</p>
                <p className="mt-1 truncate text-sm font-semibold text-slate-950 dark:text-white">Business command center</p>
                <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500 dark:text-zinc-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.7)]" />
                  Live workspace
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggle}
                className="h-8 w-8 shrink-0 rounded-xl text-slate-500 hover:bg-white/50 dark:text-zinc-400 dark:hover:bg-white/10"
                aria-label={mobile ? "Close navigation" : "Collapse navigation"}
              >
                <ChevronLeft className={cn("h-4 w-4 transition-transform", !mobile && !expanded ? "rotate-180" : "")} />
              </Button>
            </div>
          </div>
        )}
      </div>

      {!expanded && !mobile && (
        <div className="mt-4 flex justify-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="h-8 w-8 rounded-xl text-slate-500 hover:bg-white/50 dark:text-zinc-400 dark:hover:bg-white/10"
            aria-label="Expand navigation"
          >
            <ChevronLeft className="h-4 w-4 rotate-180" />
          </Button>
        </div>
      )}
    </div>
  );
}

function SidebarGroups({
  pathname,
  expanded,
  onNavigate,
  layoutIdPrefix
}: {
  pathname: string;
  expanded: boolean;
  onNavigate?: () => void;
  layoutIdPrefix: string;
}) {
  return (
    <div className="space-y-5">
      {Object.entries(routesByGroup).map(([groupTitle, items]) => (
        <div key={groupTitle}>
          {expanded ? (
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400 dark:text-zinc-500">
              {groupTitle}
            </p>
          ) : null}
          <nav className="space-y-1.5">
            {items.map((item) => {
              const active = item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={`${groupTitle}-${item.label}`}
                  href={item.href}
                  prefetch
                  onClick={onNavigate}
                  className={cn(
                    "group relative flex rounded-2xl transition-all duration-200",
                    expanded ? "items-center gap-3 px-3 py-3" : "justify-center px-2 py-3",
                    active ? "text-slate-950 dark:text-white" : "text-slate-600 hover:bg-white/55 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white"
                  )}
                >
                  {active ? (
                    <motion.div
                      layoutId={`${layoutIdPrefix}-nav-active`}
                      className="absolute inset-0 rounded-2xl border border-white/60 bg-white/70 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/8"
                      transition={{ type: "spring", stiffness: 360, damping: 30 }}
                    />
                  ) : null}

                  <span className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-950/5 dark:bg-white/5">
                    <Icon
                      className={cn(
                        "h-[18px] w-[18px] transition-colors",
                        active ? "text-cyan-600 dark:text-cyan-300" : "text-slate-500 group-hover:text-slate-800 dark:text-zinc-500 dark:group-hover:text-zinc-200"
                      )}
                    />
                  </span>

                  {expanded ? (
                    <>
                      <span className="relative z-10 flex-1 text-sm font-medium tracking-wide">{item.label}</span>
                      {item.href === "/dashboard" ? (
                        <span className="relative z-10 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">
                          Live
                        </span>
                      ) : null}
                    </>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </div>
      ))}
    </div>
  );
}

function SidebarFooter({ expanded }: { expanded: boolean }) {
  return (
    <div className="mt-5 rounded-[24px] border border-white/50 bg-gradient-to-b from-white/40 to-white/10 p-3 backdrop-blur-xl dark:border-white/10 dark:from-white/6 dark:to-transparent">
      <div className={cn("flex items-center gap-3", !expanded ? "justify-center" : "")}>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-700 dark:text-cyan-300">
          <Cpu className="h-4.5 w-4.5" />
        </div>
        {expanded ? (
          <div>
            <p className="text-xs font-semibold text-slate-900 dark:text-white">AI engine online</p>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400">Realtime reasoning, alerts, and automation mesh connected.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

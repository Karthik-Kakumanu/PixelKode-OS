"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import { BriefcaseBusiness, ChartColumnBig, CircleDollarSign, FileText, LayoutDashboard, PanelLeftClose, Sparkles, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: BriefcaseBusiness },
  { href: "/leads", label: "Leads", icon: Sparkles },
  { href: "/revenue", label: "Revenue", icon: CircleDollarSign },
  { href: "/team", label: "Team", icon: Users },
  { href: "/content", label: "Content", icon: FileText },
  { href: "/services", label: "Services", icon: ChartColumnBig }
];

export function Sidebar({
  mobileOpen,
  onClose
}: {
  mobileOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const [expanded, setExpanded] = React.useState(true);

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-slate-900/25 backdrop-blur-sm transition-opacity md:hidden",
          mobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
      />

      <aside
        className={cn(
          "glass-panel fixed inset-y-3 left-3 z-50 flex w-[272px] flex-col rounded-[32px] p-4 transition-transform duration-300 md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-[120%]"
        )}
      >
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-gradient text-lg font-semibold text-white">
              P
            </div>
            <div>
              <p className="text-xs text-slate-500">Private business OS</p>
              <h2 className="text-lg font-semibold">Pixelkode</h2>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close menu">
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>
        <SidebarLinks pathname={pathname} expanded onNavigate={onClose} />
      </aside>

      <aside
        className={cn(
          "glass-panel hidden shrink-0 flex-col rounded-[28px] border-white/80 transition-all duration-300 md:flex",
          expanded ? "w-[214px] p-3" : "w-[76px] p-2.5"
        )}
      >
        <div className="flex h-full flex-col">
          <div
            className={cn(
              "rounded-[22px] border border-white/80 bg-white/60",
              expanded ? "mb-4 p-3" : "mb-4 p-2.5"
            )}
          >
            <div className={cn("flex items-center gap-3", expanded ? "" : "justify-center")}>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 via-violet-500 to-sky-500 text-base font-semibold text-white shadow-[0_10px_24px_rgba(124,108,255,0.22)]">
                P
              </div>
              {expanded ? (
                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-slate-400">Ops</p>
                  <h2 className="premium-heading truncate text-2xl font-semibold leading-none">Pixelkode</h2>
                </div>
              ) : null}
            </div>
          </div>

          <div className={cn("mb-3 flex items-center", expanded ? "justify-end px-1" : "justify-center")}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-2xl border border-white/70 bg-white/60"
              onClick={() => setExpanded((value) => !value)}
              aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
            >
              <PanelLeftClose className={cn("h-4 w-4 text-slate-600 transition-transform", expanded ? "rotate-180" : "rotate-0")} />
            </Button>
          </div>

          {expanded ? (
            <div className="mb-3 px-1">
              <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-slate-400">Navigation</p>
            </div>
          ) : null}

          <div className="flex-1">
            <SidebarLinks pathname={pathname} expanded={expanded} />
          </div>

        </div>
      </aside>
    </>
  );
}

function SidebarLinks({
  pathname,
  onNavigate,
  expanded
}: {
  pathname: string;
  onNavigate?: () => void;
  expanded: boolean;
}) {
  return (
    <nav className="space-y-1">
      {items.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            suppressHydrationWarning
            className={cn(
              "group flex items-center rounded-[18px] transition-all duration-200",
              expanded ? "gap-3 px-2.5 py-2.5 text-[15px]" : "justify-center px-0 py-2.5",
              active
                ? "bg-gradient-to-r from-white via-fuchsia-50/90 to-sky-50/90 text-slate-900 shadow-[0_14px_30px_rgba(158,138,255,0.2)]"
                : "text-slate-600 hover:bg-white/65 hover:text-slate-900"
            )}
            title={item.label}
          >
            <span
              className={cn(
                "flex shrink-0 items-center justify-center rounded-xl",
                expanded ? "h-8 w-8" : "h-9 w-9",
                active ? "bg-white shadow-sm" : "bg-transparent"
              )}
            >
              <Icon className={cn("h-[18px] w-[18px] shrink-0", active ? "text-fuchsia-600" : "text-slate-500")} />
            </span>
            {expanded ? <span className="font-medium">{item.label}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}

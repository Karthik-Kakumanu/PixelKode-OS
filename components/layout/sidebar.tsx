"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import {
  BriefcaseBusiness,
  ChartColumnBig,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  Database,
  FileText,
  LayoutDashboard,
  PanelLeftClose,
  Server,
  Sparkles,
  Video,
  Users
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: BriefcaseBusiness },
  { href: "/leads", label: "Leads", icon: Sparkles },
  { href: "/revenue", label: "Revenue", icon: CircleDollarSign },
  { href: "/team", label: "Team", icon: Users },
  { href: "/content", label: "Content", icon: FileText },
  { href: "/services", label: "Services", icon: ChartColumnBig },
  { href: "/meet-session", label: "Meet Session", icon: Video },
  { href: "/shopping", label: "Shopping List", icon: ClipboardList },
  { href: "/timetable", label: "Timetable", icon: Clock3 },
  { href: "/servers", label: "Servers", icon: Server },
  { href: "/databases", label: "Databases", icon: Database }
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
          "glass-panel fixed inset-y-3 left-3 z-50 flex w-[272px] flex-col rounded-[28px] p-4 transition-transform duration-300 md:hidden",
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
          "glass-panel hidden shrink-0 flex-col rounded-[28px] border-white/70 bg-[radial-gradient(circle_at_top,_rgba(236,72,153,0.12),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(56,189,248,0.12),_transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.92),rgba(248,250,252,0.96))] transition-all duration-300 md:flex",
          expanded ? "w-[248px] p-4" : "w-[92px] p-3"
        )}
      >
        <div className="flex h-full flex-col">
          <div
            className={cn(
              "rounded-[24px] border border-white/80 bg-gradient-to-br from-white via-rose-50/75 to-sky-50/85 shadow-[0_20px_45px_rgba(15,23,42,0.08)]",
              expanded ? "mb-5 p-4" : "mb-5 p-3"
            )}
          >
            <div className={cn("flex items-start gap-3", expanded ? "" : "justify-center")}>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 via-rose-400 to-sky-400 text-base font-semibold text-white shadow-[0_18px_35px_rgba(217,70,239,0.22)]">
                P
              </div>
              {expanded ? (
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-[1.12rem] font-semibold leading-none tracking-[-0.03em] text-slate-900">
                        Pixelkode
                      </h2>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0 rounded-2xl border border-white/90 bg-white/90 shadow-sm shadow-fuchsia-100/70"
                      onClick={() => setExpanded((value) => !value)}
                      aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
                    >
                      <PanelLeftClose className="h-4 w-4 rotate-180 text-slate-600 transition-transform" />
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>

            {!expanded ? (
              <div className="mt-3 flex justify-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-2xl border border-white/90 bg-white/90 shadow-sm shadow-fuchsia-100/70"
                  onClick={() => setExpanded((value) => !value)}
                  aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
                >
                  <PanelLeftClose className="h-4 w-4 text-slate-600 transition-transform" />
                </Button>
              </div>
            ) : null}
          </div>
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
                "group flex items-center rounded-[18px] border transition-all duration-200",
                expanded ? "gap-3 px-3.5 py-3 text-[15px]" : "justify-center px-0 py-3",
                active
                  ? "border-white/90 bg-gradient-to-r from-fuchsia-50 via-white to-sky-50 text-slate-950 shadow-[0_14px_30px_rgba(15,23,42,0.08)]"
                  : "border-transparent text-slate-600 hover:border-white/90 hover:bg-white/80 hover:text-slate-900"
              )}
              title={item.label}
            >
              <span
                className={cn(
                  "flex shrink-0 items-center justify-center rounded-xl",
                  expanded ? "h-8 w-8" : "h-9 w-9",
                  active ? "bg-gradient-to-br from-fuchsia-100 to-sky-100 shadow-sm" : "bg-transparent"
                )}
              >
                <Icon className={cn("h-[18px] w-[18px] shrink-0", active ? "text-fuchsia-700" : "text-slate-500 group-hover:text-sky-700")} />
              </span>
              {expanded ? <span className="font-medium">{item.label}</span> : null}
            </Link>
        );
      })}
    </nav>
  );
}

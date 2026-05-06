"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import {
  BriefcaseBusiness,
  ChartColumnBig,
  CircleDollarSign,
  FileText,
  LayoutDashboard,
  PanelLeftClose,
  Sparkles,
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
          "glass-panel hidden shrink-0 flex-col rounded-[32px] transition-all duration-300 md:flex",
          expanded ? "w-[264px] p-5" : "w-[86px] p-3"
        )}
      >
        <div className="flex h-full flex-col">
          <div className={cn("flex items-center gap-3", expanded ? "mb-8" : "mb-6 justify-center")}>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-gradient text-lg font-semibold text-white">
              P
            </div>
            {expanded ? (
              <div>
                <p className="text-sm text-slate-500">Private business monitor</p>
                <h2 className="text-xl font-semibold">Pixelkode OS</h2>
              </div>
            ) : null}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className={cn("mb-5", expanded ? "self-end" : "mx-auto")}
            onClick={() => setExpanded((value) => !value)}
            aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
          >
            <PanelLeftClose className={cn("h-5 w-5 transition-transform", expanded ? "rotate-180" : "rotate-0")} />
          </Button>

          <SidebarLinks pathname={pathname} expanded={expanded} />

          {expanded ? (
            <div className="mt-auto rounded-[24px] border border-violet-100 bg-gradient-to-br from-rose-100/90 via-violet-100/90 to-sky-100/90 p-4">
              <div className="flex items-center gap-3">
                <ChartColumnBig className="h-5 w-5 text-violet-700" />
                <p className="text-sm font-medium text-slate-900">Growth board</p>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Keep projects, money, leads, services, and delivery in one place.
              </p>
            </div>
          ) : null}
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
    <nav className="space-y-2">
      {items.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "group flex items-center rounded-2xl transition-all",
              expanded ? "gap-3 px-4 py-3 text-sm" : "justify-center px-0 py-3",
              active
                ? "bg-white/80 text-slate-900 shadow-lg shadow-violet-100/60"
                : "text-slate-600 hover:bg-white/55 hover:text-slate-900"
            )}
            title={item.label}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {expanded ? <span>{item.label}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}

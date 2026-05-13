"use client";

import { Bell, CheckCircle2, ChevronDown, Command, LoaderCircle, LogOut, Menu, Mic, Moon, Plus, Search, Sun, WifiOff } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { logoutAction } from "@/app/(app)/actions";
import { Button } from "@/components/ui/button";
import { getRouteMeta, primaryRoutes } from "@/lib/navigation";
import { useBusinessStore } from "@/lib/store";

const quickActions: ReadonlyArray<{ label: string; href: string; prompt?: string }> = [
  { label: "New lead", href: "/leads" },
  { label: "New project", href: "/projects" },
  { label: "New invoice", href: "/revenue", prompt: "Add revenue entry" }
];

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const currentRoute = getRouteMeta(pathname);
  const alerts = useBusinessStore((state) => state.alerts);
  const readAlertIds = useBusinessStore((state) => state.readAlertIds);
  const markAlertRead = useBusinessStore((state) => state.markAlertRead);
  const markAllAlertsRead = useBusinessStore((state) => state.markAllAlertsRead);
  const theme = useBusinessStore((state) => state.theme);
  const setTheme = useBusinessStore((state) => state.setTheme);
  const isSaving = useBusinessStore((state) => state.isSaving);
  const isLoaded = useBusinessStore((state) => state.isLoaded);
  const error = useBusinessStore((state) => state.error);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [pageMenuOpen, setPageMenuOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const pageMenuRef = useRef<HTMLDivElement | null>(null);
  const notificationsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setIsMounted(true);
    if (typeof navigator !== "undefined") {
      setIsOnline(navigator.onLine);
    }
  }, []);

  useEffect(() => {
    const syncOnlineStatus = () => setIsOnline(typeof navigator === "undefined" ? true : navigator.onLine);
    window.addEventListener("online", syncOnlineStatus);
    window.addEventListener("offline", syncOnlineStatus);
    return () => {
      window.removeEventListener("online", syncOnlineStatus);
      window.removeEventListener("offline", syncOnlineStatus);
    };
  }, []);

  useEffect(() => {
    setPageMenuOpen(false);
    setNotificationsOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;

      if (pageMenuRef.current && !pageMenuRef.current.contains(target)) {
        setPageMenuOpen(false);
      }

      if (notificationsRef.current && !notificationsRef.current.contains(target)) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const unreadAlerts = useMemo(
    () => alerts.filter((alert) => !readAlertIds.includes(alert.id)),
    [alerts, readAlertIds]
  );

  const syncState = useMemo(() => {
    if (!isOnline || error.toLowerCase().includes("offline")) {
      return {
        label: "Offline pending sync",
        tone: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200",
        icon: WifiOff
      };
    }

    if (isSaving) {
      return {
        label: "Saving...",
        tone: "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-500/20 dark:bg-cyan-500/10 dark:text-cyan-200",
        icon: LoaderCircle
      };
    }

    if (isLoaded) {
      return {
        label: "Saved",
        tone: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200",
        icon: CheckCircle2
      };
    }

    return {
      label: "Syncing state",
      tone: "border-slate-200 bg-white text-slate-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-300",
      icon: LoaderCircle
    };
  }, [error, isLoaded, isOnline, isSaving]);

  const SyncIcon = syncState.icon;

  const openPalette = () => {
    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "k",
        code: "KeyK",
        ctrlKey: true,
        bubbles: true
      })
    );
  };

  const openAssistant = (prompt?: string, run = false) => {
    window.dispatchEvent(
      new CustomEvent("ops-assistant:prompt", {
        detail: { prompt: prompt ?? "", run }
      })
    );
  };

  return (
    <div className="glass-panel sticky top-3 z-30 rounded-[28px] border-white/60 px-4 py-3 shadow-[0_18px_48px_rgba(15,23,42,0.08)] lg:px-5 dark:border-white/10">
      <div className="flex flex-wrap items-center gap-3 xl:flex-nowrap">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="h-10 w-10 rounded-2xl text-slate-700 hover:bg-white/50 md:hidden dark:text-white dark:hover:bg-white/10"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div ref={pageMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setPageMenuOpen((value) => !value)}
              className="flex items-center gap-3 rounded-2xl border border-white/60 bg-white/60 px-3 py-2 shadow-sm backdrop-blur-md transition hover:bg-white/80 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
            >
              <div className="text-left">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400 dark:text-zinc-500">Current Page</p>
                <p className="text-sm font-semibold text-slate-950 dark:text-white">{currentRoute.label}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </button>

            {pageMenuOpen ? (
              <div className="absolute left-0 top-14 z-40 max-h-[70vh] w-72 overflow-y-auto rounded-[24px] border border-white/80 bg-white/95 p-2 shadow-[0_22px_70px_rgba(15,23,42,0.14)] backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/95">
                {primaryRoutes.map((route) => (
                  <button
                    key={route.href}
                    type="button"
                    onClick={() => {
                      router.push(route.href);
                      setPageMenuOpen(false);
                    }}
                    className="flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-slate-100 dark:hover:bg-white/5"
                  >
                    <route.icon className="mt-0.5 h-4 w-4 text-cyan-600 dark:text-cyan-300" />
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{route.label}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">{route.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-3">
          <button
            type="button"
            onClick={openPalette}
            className="flex min-h-[52px] min-w-0 flex-1 items-center justify-between rounded-2xl border border-white/60 bg-white/65 px-4 shadow-sm backdrop-blur-md transition hover:bg-white/80 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
            aria-label="Open AI global search"
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-700 dark:text-cyan-300">
                <Search className="h-4 w-4" />
              </span>
              <span className="min-w-0 text-left">
                <span className="block truncate text-sm font-semibold text-slate-950 dark:text-white">Search data, ask AI, run commands</span>
                <span className="block truncate text-xs text-slate-500 dark:text-zinc-400">{currentRoute.description}</span>
              </span>
            </span>
            <span className="hidden items-center gap-1 rounded-xl border border-white/70 bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-slate-500 lg:flex dark:border-white/10 dark:bg-white/5 dark:text-zinc-400">
              <Command className="h-3 w-3" /> K
            </span>
          </button>

          <div className={`hidden items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-semibold xl:flex ${syncState.tone}`}>
            <SyncIcon className={`h-3.5 w-3.5 ${syncState.label === "Saving..." ? "animate-spin" : ""}`} />
            {syncState.label}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 xl:flex">
            {quickActions.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={() => {
                  router.push(action.href);
                  setPageMenuOpen(false);
                  setNotificationsOpen(false);
                  if (action.prompt) {
                    openAssistant(action.prompt, false);
                  }
                }}
                className="rounded-2xl border border-white/60 bg-white/60 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur-md transition hover:bg-white/80 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200 dark:hover:bg-white/10"
              >
                {action.label}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="icon"
            className="h-11 w-11 rounded-2xl border-white/60 bg-white/60 shadow-sm backdrop-blur-md hover:bg-white/80 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
            onClick={openPalette}
            aria-label="Open command center"
          >
            <Plus className="h-4 w-4 text-slate-700 dark:text-zinc-200" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="h-11 w-11 rounded-2xl border-white/60 bg-white/60 shadow-sm backdrop-blur-md hover:bg-white/80 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
            onClick={() => window.dispatchEvent(new Event("ops-assistant:voice"))}
            aria-label="Open voice assistant"
          >
            <Mic className="h-4 w-4 text-slate-700 dark:text-zinc-200" />
          </Button>

          <div ref={notificationsRef} className="relative">
            <Button
              variant="outline"
              size="icon"
              className="relative h-11 w-11 rounded-2xl border-white/60 bg-white/60 shadow-sm backdrop-blur-md hover:bg-white/80 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
              onClick={() => setNotificationsOpen((value) => !value)}
              aria-label="Open notifications"
            >
              <Bell className="h-4 w-4 text-slate-700 dark:text-zinc-200" />
              {unreadAlerts.length > 0 ? (
                <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white shadow-[0_0_10px_rgba(244,63,94,0.5)]">
                  {Math.min(unreadAlerts.length, 9)}+
                </span>
              ) : null}
            </Button>

            {notificationsOpen ? (
              <div className="absolute right-0 top-14 z-40 w-[360px] rounded-[28px] glass-panel border border-white/80 p-4 shadow-[0_22px_70px_rgba(15,23,42,0.14)] dark:border-white/10 dark:shadow-[0_22px_70px_rgba(0,0,0,0.7)]">
                <div className="mb-3 flex items-center justify-between gap-3 px-1">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">Notifications</p>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">{unreadAlerts.length} unread updates</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 rounded-xl px-2.5 text-xs text-slate-600 hover:bg-white/50 dark:text-zinc-300 dark:hover:bg-white/10"
                    onClick={() => markAllAlertsRead()}
                  >
                    Mark all read
                  </Button>
                </div>

                <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
                  {alerts.length > 0 ? (
                    alerts.slice(0, 8).map((alert) => {
                      const isUnread = !readAlertIds.includes(alert.id);
                      const tone =
                        alert.severity === "high"
                          ? "border-rose-200 bg-rose-50/80 dark:border-rose-500/20 dark:bg-rose-500/10"
                          : alert.severity === "medium"
                            ? "border-amber-200 bg-amber-50/80 dark:border-amber-500/20 dark:bg-amber-500/10"
                            : "border-white/60 bg-white/60 dark:border-white/10 dark:bg-zinc-800/50";

                      return (
                        <button
                          key={alert.id}
                          type="button"
                          onClick={() => markAlertRead(alert.id)}
                          className={`block w-full rounded-[20px] border px-4 py-4 text-left backdrop-blur-md transition ${tone} ${isUnread ? "opacity-100 shadow-sm" : "opacity-60"}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">{alert.title}</p>
                              <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-zinc-400">{alert.message}</p>
                            </div>
                            {isUnread ? <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]" /> : null}
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="rounded-[20px] border border-white/60 bg-white/60 px-4 py-5 text-center text-sm text-slate-500 backdrop-blur-md dark:border-white/10 dark:bg-zinc-800/50 dark:text-zinc-400">
                      No operational alerts right now.
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <Button
            variant="outline"
            size="icon"
            className="h-11 w-11 rounded-2xl border-white/60 bg-white/60 shadow-sm backdrop-blur-md hover:bg-white/80 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={isMounted && theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isMounted && theme === "dark" ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4 text-slate-700 dark:text-zinc-200" />}
          </Button>

          <form action={logoutAction}>
            <button
              type="submit"
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/60 bg-white/60 shadow-sm backdrop-blur-md transition hover:bg-white/80 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4 text-slate-700 dark:text-zinc-200" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

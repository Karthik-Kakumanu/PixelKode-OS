"use client";

import { Bell, Menu, Moon, Sun } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { logoutAction } from "@/app/(app)/actions";
import { Button } from "@/components/ui/button";
import { useBusinessStore } from "@/lib/store";

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();
  const section = pathname.split("/")[1] || "dashboard";
  const alerts = useBusinessStore((state) => state.alerts);
  const readAlertIds = useBusinessStore((state) => state.readAlertIds);
  const markAlertRead = useBusinessStore((state) => state.markAlertRead);
  const markAllAlertsRead = useBusinessStore((state) => state.markAllAlertsRead);
  const theme = useBusinessStore((state) => state.theme);
  const setTheme = useBusinessStore((state) => state.setTheme);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const themeLabel = isMounted
    ? theme === "dark"
      ? "Switch to bright mode"
      : "Switch to dark mode"
    : "Toggle theme";

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const unreadAlerts = useMemo(
    () => alerts.filter((alert) => !readAlertIds.includes(alert.id)),
    [alerts, readAlertIds]
  );

  return (
    <div className="glass-panel sticky top-4 z-30 flex items-center justify-between rounded-[24px] px-5 py-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onMenuClick} className="md:hidden" aria-label="Open menu">
          <Menu className="h-4 w-4" />
        </Button>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Workspace</p>
          <p className="text-xl font-semibold capitalize text-slate-950">{section}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="relative h-10 w-10 rounded-full border-slate-200 bg-white shadow-sm"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={themeLabel}
          >
            {isMounted ? (
              theme === "dark" ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4 text-slate-700" />
            ) : (
              <span className="block h-4 w-4 rounded-full bg-slate-200/70" />
            )}
          </Button>

          <div className="relative">
            <Button
              variant="outline"
              size="icon"
              className="relative h-10 w-10 rounded-full border-slate-200 bg-white shadow-sm"
              onClick={() => setNotificationsOpen((value) => !value)}
              aria-label="Open notifications"
            >
              <Bell className="h-4 w-4 text-slate-700" />
              {unreadAlerts.length > 0 ? (
                <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                  {Math.min(unreadAlerts.length, 9)}+
                </span>
              ) : null}
            </Button>
          {notificationsOpen ? (
            <div className="absolute right-0 top-12 z-40 w-[360px] rounded-[24px] border border-slate-200 bg-white p-3 shadow-[0_22px_70px_rgba(15,23,42,0.16)]">
              <div className="flex items-center justify-between gap-3 px-2 py-2">
                <div>
                  <p className="text-sm font-semibold text-slate-950">Notifications</p>
                  <p className="text-xs text-slate-500">{unreadAlerts.length} unread operational alerts</p>
                </div>
                <Button variant="ghost" size="sm" className="h-8 rounded-xl px-2.5 text-xs" onClick={() => markAllAlertsRead()}>
                  Mark all read
                </Button>
              </div>

              <div className="mt-2 max-h-[360px] space-y-2 overflow-y-auto pr-1">
                {alerts.length > 0 ? (
                  alerts.slice(0, 8).map((alert) => {
                    const isUnread = !readAlertIds.includes(alert.id);
                    const tone =
                      alert.severity === "high"
                        ? "border-rose-200 bg-rose-50"
                        : alert.severity === "medium"
                          ? "border-amber-200 bg-amber-50"
                          : "border-slate-200 bg-slate-50";

                    return (
                      <button
                        key={alert.id}
                        type="button"
                        onClick={() => markAlertRead(alert.id)}
                        className={`block w-full rounded-2xl border px-3 py-3 text-left transition ${tone} ${isUnread ? "opacity-100" : "opacity-70"}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{alert.title}</p>
                            <p className="mt-1 text-xs leading-5 text-slate-600">{alert.message}</p>
                          </div>
                          {isUnread ? <span className="mt-1 h-2.5 w-2.5 rounded-full bg-slate-900" /> : null}
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                    No operational alerts right now.
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>

        <form action={logoutAction}>
          <Button variant="outline" size="sm" className="rounded-full border-slate-200 bg-white px-5 text-slate-700 shadow-sm">
            Logout
          </Button>
        </form>
      </div>
    </div>
  );
}

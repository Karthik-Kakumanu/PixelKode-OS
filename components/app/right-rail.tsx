"use client";

import { AlertTriangle, ArrowUpRight, BellRing, CalendarClock } from "lucide-react";

import { Card } from "@/components/ui/card";
import { useBusinessStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";

function getSeverityTone(severity: "high" | "medium" | "low") {
  if (severity === "high") return "border-rose-200 bg-rose-50";
  if (severity === "medium") return "border-amber-200 bg-amber-50";
  return "border-slate-200 bg-slate-50";
}

export function RightRail() {
  const alerts = useBusinessStore((state) => state.alerts);
  const readAlertIds = useBusinessStore((state) => state.readAlertIds);
  const markAlertRead = useBusinessStore((state) => state.markAlertRead);
  const sheets = useBusinessStore((state) => state.sheets);

  const unreadAlerts = alerts.filter((alert) => !readAlertIds.includes(alert.id));
  const projectRows = sheets.projects.rows;
  const leadRows = sheets.leads.rows;
  const contentRows = sheets.content.rows;

  const pendingCollections = projectRows.reduce((sum, row) => sum + Number(row.pendingAmount ?? 0), 0);
  const dueTodayLeads = leadRows.filter((row) => String(row.followUpDate ?? "") === new Date().toISOString().slice(0, 10)).length;
  const scheduledContent = contentRows.filter((row) => String(row.stage ?? "") === "Scheduled").length;

  return (
    <div className="flex min-h-full flex-col gap-4">
      <Card className="p-0">
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
          <div className="flex items-center gap-2">
            <BellRing className="h-4 w-4 text-slate-700" />
            <h3 className="text-base font-semibold text-slate-950">Operations Pulse</h3>
          </div>
        </div>
        <div className="grid gap-3 p-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Unread alerts</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">{unreadAlerts.length}</p>
            <p className="mt-1 text-sm text-slate-500">System-generated actions waiting for attention.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Pending collections</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{formatCurrency(pendingCollections)}</p>
            <p className="mt-1 text-sm text-slate-500">Outstanding money across active projects.</p>
          </div>
        </div>
      </Card>

      <Card className="p-0">
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-500" />
            <h3 className="text-base font-semibold text-slate-950">Priority alerts</h3>
          </div>
        </div>
        <div className="space-y-3 p-4">
          {alerts.slice(0, 5).map((alert) => (
            <button
              key={alert.id}
              type="button"
              onClick={() => markAlertRead(alert.id)}
              className={`block w-full rounded-2xl border p-4 text-left transition ${getSeverityTone(alert.severity)}`}
            >
              <p className="text-sm font-semibold text-slate-900">{alert.title}</p>
              <p className="mt-1 text-xs leading-5 text-slate-600">{alert.message}</p>
              {alert.actionLabel ? <p className="mt-3 text-xs font-medium text-slate-700">{alert.actionLabel}</p> : null}
            </button>
          ))}
          {alerts.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              No alerts right now. The system is quiet.
            </div>
          ) : null}
        </div>
      </Card>

      <Card className="p-0">
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-slate-700" />
            <h3 className="text-base font-semibold text-slate-950">Today at a glance</h3>
          </div>
        </div>
        <div className="space-y-3 p-4">
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <span className="text-sm text-slate-600">Lead follow-ups due today</span>
            <span className="text-base font-semibold text-slate-950">{dueTodayLeads}</span>
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <span className="text-sm text-slate-600">Scheduled content items</span>
            <span className="text-base font-semibold text-slate-950">{scheduledContent}</span>
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <span className="text-sm text-slate-600">Active projects</span>
            <span className="text-base font-semibold text-slate-950">
              {projectRows.filter((row) => String(row.projectStatus ?? "") !== "Completed").length}
            </span>
          </div>
        </div>
      </Card>

      <Card className="flex-1 p-0">
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
          <div className="flex items-center gap-2">
            <ArrowUpRight className="h-4 w-4 text-slate-700" />
            <h3 className="text-base font-semibold text-slate-950">Suggested next moves</h3>
          </div>
        </div>
        <div className="flex h-full flex-col gap-3 p-4 text-sm text-slate-600">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            Review overdue projects before adding new work.
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            Close pending collections to improve cash flow visibility.
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            Push today&apos;s follow-ups first so leads do not go cold.
          </div>
          <div className="flex-1 rounded-2xl border border-dashed border-slate-300 bg-gradient-to-br from-white via-slate-50 to-sky-50 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Panel notes</p>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Keep this rail open when you want a live operating sidebar. Close it any time to let the dashboard fill the full width.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

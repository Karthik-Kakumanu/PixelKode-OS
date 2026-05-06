"use client";

import { useBusinessStore } from "@/lib/store";

import { Card } from "@/components/ui/card";

export function RightRail() {
  const sheets = useBusinessStore((state) => state.sheets);
  const leadRows = sheets.leads.rows;
  const projectRows = sheets.projects.rows;
  const revenueRows = sheets.revenue.rows;
  const followUps = leadRows.filter((row) => row.leadStatus === "Follow-up").slice(0, 4);
  const activeProjects = projectRows.filter((row) => row.projectStatus === "In Progress").slice(0, 4);
  const latestRevenue = revenueRows.slice(-3).reverse();

  return (
    <div className="space-y-4">
      <Card>
        <h3 className="text-lg font-semibold">This Week</h3>
        <div className="mt-4 space-y-3">
          <div className="rounded-2xl border border-violet-100 bg-white/50 p-3 text-sm text-slate-600">
            Projects in sheet: {projectRows.length}
          </div>
          <div className="rounded-2xl border border-violet-100 bg-white/50 p-3 text-sm text-slate-600">
            Leads to follow up: {followUps.length}
          </div>
          <div className="rounded-2xl border border-violet-100 bg-white/50 p-3 text-sm text-slate-600">
            Revenue entries: {revenueRows.length}
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold">Lead Follow-ups</h3>
        <div className="mt-4 space-y-3">
          {followUps.map((item) => (
            <div key={String(item.id)} className="rounded-2xl border border-violet-100 bg-white/50 p-3 text-sm text-slate-600">
              <p className="font-medium text-slate-900">{String(item.businessName)}</p>
              <p className="mt-1 text-slate-500">{String(item.followUpDate || "No date")}</p>
            </div>
          ))}
          {followUps.length === 0 ? (
            <div className="rounded-2xl border border-violet-100 bg-white/50 p-3 text-sm text-slate-500">No pending follow-ups in the sheet.</div>
          ) : null}
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold">Active Projects</h3>
        <div className="mt-4 space-y-3">
          {activeProjects.map((item) => (
            <div key={String(item.id)} className="rounded-2xl border border-violet-100 bg-white/50 p-3">
              <p className="font-medium text-slate-900">{String(item.projectName)}</p>
              <p className="mt-1 text-sm text-slate-500">{String(item.clientName)}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold">Recent Money Flow</h3>
        <div className="mt-4 space-y-3">
          {latestRevenue.map((item) => (
            <div key={String(item.id)} className="rounded-2xl border border-violet-100 bg-white/50 p-3">
              <p className="font-medium text-slate-900">{String(item.sourceName)}</p>
              <p className="mt-1 text-sm text-slate-500">
                {String(item.entryType)} | {String(item.amount)}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { ArchiveRestore, Download, FileDown, RefreshCw, Search, WalletCards } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  buildCashFlowForecast,
  buildClientPaymentHistory,
  buildOperationsReportPdf,
  buildSheetCsv,
  buildWorkbookHtml,
  buildRecurringReminders,
  readDocumentPresets,
  searchWorkspace
} from "@/lib/operations-hub";
import { useBusinessStore } from "@/lib/store";
import type { SheetKey } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

const sheetKeys: SheetKey[] = ["projects", "leads", "revenue", "team", "content", "services", "shopping", "timetable", "servers", "databases"];
const sheetLabels: Record<SheetKey, string> = {
  projects: "Projects",
  leads: "Leads",
  revenue: "Revenue",
  team: "Team",
  content: "Content",
  services: "Services",
  shopping: "Shopping",
  timetable: "Timetable",
  servers: "Servers",
  databases: "Databases"
};

function downloadBlob(filename: string, blob: Blob) {
  const href = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(href);
}

function relativeTime(timestamp: string) {
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.max(Math.round(diff / 60000), 0);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function OperationsHub() {
  const sheets = useBusinessStore((state) => state.sheets);
  const backups = useBusinessStore((state) => state.backups);
  const createRestorePoint = useBusinessStore((state) => state.createRestorePoint);
  const restoreBackup = useBusinessStore((state) => state.restoreBackup);
  const refreshBackups = useBusinessStore((state) => state.refreshBackups);
  const isSaving = useBusinessStore((state) => state.isSaving);
  const [backupLabel, setBackupLabel] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [clientQuery, setClientQuery] = useState("");
  const [selectedSheet, setSelectedSheet] = useState<SheetKey>("projects");
  const [documentPresets, setDocumentPresets] = useState<ReturnType<typeof readDocumentPresets>>([]);

  useEffect(() => {
    refreshBackups();
    setDocumentPresets(readDocumentPresets());
  }, [refreshBackups]);

  const forecast = useMemo(() => buildCashFlowForecast(sheets), [sheets]);
  const reminders = useMemo(() => buildRecurringReminders(sheets), [sheets]);
  const searchResults = useMemo(() => searchWorkspace(sheets, searchQuery, documentPresets), [documentPresets, searchQuery, sheets]);
  const clientPaymentHistory = useMemo(() => buildClientPaymentHistory(sheets, clientQuery), [clientQuery, sheets]);

  const exportSheetCsv = () => {
    const sheet = sheets[selectedSheet];
    const csv = buildSheetCsv(selectedSheet, sheet);
    downloadBlob(`pixelkode-${selectedSheet}.csv`, new Blob([csv], { type: "text/csv;charset=utf-8" }));
  };

  const exportWorkbook = () => {
    const workbook = buildWorkbookHtml(sheets);
    downloadBlob("pixelkode-live-workspace.xls", new Blob([workbook], { type: "application/vnd.ms-excel" }));
  };

  const exportReportPdf = () => {
    downloadBlob("pixelkode-operations-report.pdf", buildOperationsReportPdf(sheets));
  };

  const exportClientHistoryCsv = () => {
    const header = "Project,Client,Project Value,Received,Pending,Revenue Date,Revenue Amount\n";
    const projectRows = clientPaymentHistory.matchingProjects.map((row) =>
      [
        String(row.projectName ?? ""),
        String(row.clientName ?? ""),
        Number(row.projectValue ?? 0),
        Number(row.amountReceived ?? 0),
        Number(row.pendingAmount ?? 0),
        "",
        ""
      ].join(",")
    );
    const revenueRows = clientPaymentHistory.revenueEntries.map((row) =>
      ["", String(row.sourceName ?? ""), "", "", "", String(row.entryDate ?? ""), Number(row.amount ?? 0)].join(",")
    );
    downloadBlob(
      `pixelkode-client-history-${clientQuery.trim().replace(/\s+/g, "-") || "client"}.csv`,
      new Blob([[header, ...projectRows, ...revenueRows].join("\n")], { type: "text/csv;charset=utf-8" })
    );
  };

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden rounded-[32px] border border-slate-200/80 bg-white/90 p-0 shadow-[0_24px_80px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-slate-950/72">
        <div className="border-b border-slate-200/80 bg-white/75 px-5 py-5 dark:border-white/10 dark:bg-white/[0.03]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fuchsia-600 dark:text-cyan-300">Live Operations Hub</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">Search, forecast, restore, and export from the current live workspace</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-zinc-400">
            Everything here reads the same real-time workspace data the rest of the app uses, so search, reminders, forecasts, exports, and restore points stay aligned.
          </p>
        </div>

        <div className="grid gap-6 p-5 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <Card className="rounded-[28px] border border-slate-200/80 bg-white/80 p-5 dark:border-white/10 dark:bg-white/[0.03]">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-fuchsia-500 dark:text-cyan-300" />
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Search across leads, projects, invoices, documents, collections, and notes</p>
              </div>
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search a client, project, note, invoice, collection, or document preset..."
                className="mt-4"
              />
              <div className="mt-4 grid max-h-[420px] gap-3 overflow-y-auto pr-1">
                {searchQuery.trim() ? (
                  searchResults.length > 0 ? (
                    searchResults.map((result) => (
                      <div key={result.id} className="rounded-[22px] border border-slate-200 bg-slate-50/80 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">{result.title}</p>
                            <p className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-zinc-500">{result.subtitle}</p>
                            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-zinc-300">{result.detail}</p>
                          </div>
                          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:border-white/10 dark:bg-white/[0.05] dark:text-zinc-400">
                            {result.kind}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50/70 px-4 py-8 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400">
                      No live matches found for this search yet.
                    </div>
                  )
                ) : (
                  <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50/70 px-4 py-8 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400">
                    Start typing to search every live sheet plus saved document presets.
                  </div>
                )}
              </div>
            </Card>

            <div className="grid gap-4 md:grid-cols-3">
              {[
                { label: "Expected this week", value: formatCurrency(forecast.expectedCollectionsThisWeek), helper: "Pending collections due in the next 7 days" },
                { label: "Expected this month", value: formatCurrency(forecast.expectedCollectionsThisMonth), helper: "Pending collections likely closing before month end" },
                { label: "Pending risk amount", value: formatCurrency(forecast.pendingRiskAmount), helper: "Overdue or unanchored pending cash that needs attention" }
              ].map((item) => (
                <Card key={item.label} className="rounded-[26px] border border-slate-200/80 bg-white/88 p-5 dark:border-white/10 dark:bg-white/[0.03]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-zinc-500">{item.label}</p>
                  <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">{item.value}</p>
                  <p className="mt-2 text-sm text-slate-500 dark:text-zinc-400">{item.helper}</p>
                </Card>
              ))}
            </div>

            <Card className="rounded-[28px] border border-slate-200/80 bg-white/80 p-5 dark:border-white/10 dark:bg-white/[0.03]">
              <div className="flex items-center gap-2">
                <WalletCards className="h-4 w-4 text-fuchsia-500 dark:text-cyan-300" />
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Cash-flow forecast and recurring reminders</p>
              </div>
              <div className="mt-4 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="grid gap-3">
                  {forecast.upcoming.length > 0 ? (
                    forecast.upcoming.slice(0, 8).map((item) => (
                      <div key={item.id} className="rounded-[22px] border border-slate-200 bg-slate-50/80 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">{item.projectName}</p>
                            <p className="mt-1 text-sm text-slate-600 dark:text-zinc-300">{item.clientName}</p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">Due {item.dueDate}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-base font-semibold text-slate-950 dark:text-white">{formatCurrency(item.amount)}</p>
                            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-zinc-500">{item.status.replace("-", " ")}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50/70 px-4 py-8 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400">
                      No upcoming collection signals yet. Add project values, pending amounts, and dates to unlock the forecast.
                    </div>
                  )}
                </div>
                <div className="grid gap-3">
                  {reminders.map((reminder) => (
                    <div key={reminder.id} className="rounded-[22px] border border-slate-200 bg-white/85 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{reminder.title}</p>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-zinc-500">{reminder.frequency} • due {reminder.dueDate}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-zinc-300">{reminder.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="rounded-[28px] border border-slate-200/80 bg-white/80 p-5 dark:border-white/10 dark:bg-white/[0.03]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Auto backups and restore points</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">Hourly restore points plus manual snapshots before risky edits.</p>
                </div>
                <Button type="button" variant="outline" size="sm" className="rounded-2xl" onClick={() => refreshBackups()}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
              </div>
              <div className="mt-4 flex gap-3">
                <Input value={backupLabel} onChange={(event) => setBackupLabel(event.target.value)} placeholder="Manual restore point name" />
                <Button
                  type="button"
                  className="rounded-2xl"
                  onClick={() => {
                    createRestorePoint(backupLabel);
                    setBackupLabel("");
                  }}
                >
                  Save point
                </Button>
              </div>
              <div className="mt-4 grid max-h-[360px] gap-3 overflow-y-auto pr-1">
                {backups.length > 0 ? (
                  backups.map((backup) => (
                    <div key={backup.id} className="rounded-[22px] border border-slate-200 bg-slate-50/80 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">{backup.label}</p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                            {backup.trigger === "auto" ? "Automatic" : "Manual"} • {relativeTime(backup.createdAt)} • {new Date(backup.createdAt).toLocaleString("en-IN")}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-2xl"
                          onClick={() => {
                            if (window.confirm(`Restore "${backup.label}"? Current live data will be replaced, and a safety snapshot will be saved first.`)) {
                              restoreBackup(backup.id);
                            }
                          }}
                        >
                          <ArchiveRestore className="mr-2 h-4 w-4" />
                          Restore
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50/70 px-4 py-8 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400">
                    Restore points will appear here as the live workspace changes.
                  </div>
                )}
              </div>
            </Card>

            <Card className="rounded-[28px] border border-slate-200/80 bg-white/80 p-5 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Realtime export center</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">Each export is generated from the current in-memory workspace state, not stale snapshots.</p>

              <div className="mt-4 grid gap-3">
                <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                  <select
                    value={selectedSheet}
                    onChange={(event) => setSelectedSheet(event.target.value as SheetKey)}
                    className="h-11 rounded-2xl border border-slate-200 bg-white/90 px-4 text-sm text-slate-800 outline-none dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-100 dark:[color-scheme:dark]"
                  >
                    {sheetKeys.map((sheetKey) => (
                      <option key={sheetKey} value={sheetKey}>
                        {sheetLabels[sheetKey]}
                      </option>
                    ))}
                  </select>
                  <Button type="button" variant="outline" className="rounded-2xl" onClick={exportSheetCsv}>
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                </div>

                <Button type="button" variant="outline" className="justify-start rounded-2xl" onClick={exportWorkbook}>
                  <FileDown className="mr-2 h-4 w-4" />
                  Export full workspace as Excel workbook
                </Button>

                <Button type="button" variant="outline" className="justify-start rounded-2xl" onClick={exportReportPdf}>
                  <FileDown className="mr-2 h-4 w-4" />
                  Export operations PDF report
                </Button>

                <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Client payment history</p>
                  <Input value={clientQuery} onChange={(event) => setClientQuery(event.target.value)} placeholder="Type a client name or project name" className="mt-3" />
                  <div className="mt-3 grid gap-2 text-sm text-slate-600 dark:text-zinc-300">
                    <p>{clientPaymentHistory.matchingProjects.length} matching project row(s)</p>
                    <p>{clientPaymentHistory.revenueEntries.length} matching income entry(ies)</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-4 w-full rounded-2xl"
                    onClick={exportClientHistoryCsv}
                    disabled={!clientQuery.trim()}
                  >
                    Export client payment history CSV
                  </Button>
                </div>
              </div>

              <div className="mt-4 rounded-[22px] border border-cyan-200 bg-cyan-50/70 px-4 py-4 text-sm text-cyan-800 dark:border-cyan-500/20 dark:bg-cyan-500/10 dark:text-cyan-100">
                {isSaving ? "Live workspace is currently saving. Exports still use the latest local state instantly." : "Workspace is synced. Exports and forecasts are reading the latest live state right now."}
              </div>
            </Card>
          </div>
        </div>
      </Card>
    </div>
  );
}

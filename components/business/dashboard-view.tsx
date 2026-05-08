"use client";

import {
  ArrowUpRight,
  CalendarClock,
  CircleDollarSign,
  ClipboardList,
  Database,
  Download,
  FolderKanban,
  Megaphone,
  Server,
  ShoppingBag,
  Sparkles,
  TimerReset,
  Video
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  ContentLeadsChart,
  ConversionFunnelChart,
  OpsPulseChart,
  ProjectProgressChart,
  RevenueLineChart,
  SectorRevenueChart,
  ServiceBarChart,
  ServiceDemandMixChart,
  ServiceDeliveryChart,
  StatusPieChart,
  TeamCapacityChart
} from "@/components/app/charts";
import { Card } from "@/components/ui/card";
import {
  buildBusinessSummary,
  buildContentPerformanceData,
  buildDashboardMetrics,
  buildInfrastructureEngineData,
  buildInfrastructureStatusData,
  buildLeadStatusData,
  buildMonthlyRevenue,
  buildProjectStatusData,
  buildRevenueByCategory,
  buildRevenueBySector,
  buildRevenueTypeData,
  buildServiceDeliveryData,
  buildServiceDemandData,
  buildShoppingSplitData,
  buildShoppingStatusData,
  buildTeamCapacityData,
  buildTimetableCoverageData
} from "@/lib/analytics";
import { type MeetSessionRecord, readMeetHistory } from "@/lib/meet-session-store";
import { getStatusClasses } from "@/lib/sheet-ui";
import { useBusinessStore } from "@/lib/store";
import { cn, formatCompactNumber, formatCurrency } from "@/lib/utils";
import { utils, writeFile } from "xlsx";

const progressColors = ["#ff5fa2", "#7c6cff", "#1cc8c0", "#ff9b54", "#3b82f6"];
const heroIcons = [FolderKanban, CircleDollarSign, ArrowUpRight, Megaphone];
const heroAccents = [
  "bg-rose-50 text-rose-700",
  "bg-emerald-50 text-emerald-700",
  "bg-amber-50 text-amber-700",
  "bg-sky-50 text-sky-700"
];
export function DashboardView() {
  const [hasMounted, setHasMounted] = useState(false);
  const [meetHistory, setMeetHistory] = useState<MeetSessionRecord[]>([]);
  const [now, setNow] = useState<Date | null>(null);
  const sheets = useBusinessStore((state) => state.sheets);
  const addRow = useBusinessStore((state) => state.addRow);
  const router = useRouter();
  const alerts = useBusinessStore((state) => state.alerts);
  const isLoaded = useBusinessStore((state) => state.isLoaded);
  const error = useBusinessStore((state) => state.error);

  useEffect(() => {
    setHasMounted(true);
    setNow(new Date());
  }, []);

  useEffect(() => {
    if (!hasMounted) return;

    const syncHistory = () => setMeetHistory(readMeetHistory());
    syncHistory();

    const timer = window.setInterval(() => {
      setNow(new Date());
      syncHistory();
    }, 30_000);

    const handleFocus = () => syncHistory();
    window.addEventListener("focus", handleFocus);
    window.addEventListener("storage", handleFocus);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("storage", handleFocus);
    };
  }, [hasMounted]);

  const projects = sheets.projects?.rows ?? [];
  const leads = sheets.leads?.rows ?? [];
  const services = sheets.services?.rows ?? [];
  const content = sheets.content?.rows ?? [];
  const shopping = sheets.shopping?.rows ?? [];
  const timetable = sheets.timetable?.rows ?? [];
  const servers = sheets.servers?.rows ?? [];
  const databases = sheets.databases?.rows ?? [];

  const metrics = buildDashboardMetrics(sheets);
  const monthlyRevenue = buildMonthlyRevenue(sheets);
  const revenueByCategory = buildRevenueByCategory(sheets);
  const revenueBySector = buildRevenueBySector(sheets);
  const projectStatus = buildProjectStatusData(sheets);
  const leadStatus = buildLeadStatusData(sheets);
  const revenueTypes = buildRevenueTypeData(sheets);
  const serviceDemand = buildServiceDemandData(sheets);
  const serviceDelivery = buildServiceDeliveryData(sheets);
  const teamCapacity = buildTeamCapacityData(sheets);
  const contentPerformance = buildContentPerformanceData(sheets);
  const shoppingStatus = buildShoppingStatusData(sheets);
  const shoppingSplit = buildShoppingSplitData(sheets);
  const infrastructureStatus = buildInfrastructureStatusData(sheets);
  const infrastructureEngines = buildInfrastructureEngineData(sheets);
  const summary = buildBusinessSummary(sheets);
  const referenceNow = now ?? new Date();
  const featuredServiceDemand = serviceDemand
    .slice()
    .sort((left, right) => right.leads + right.projects - (left.leads + left.projects))
    .slice(0, 8);

  const heroMetrics = metrics.filter((metric) =>
    ["Project Value", "Received", "Pending", "Lead Conversion"].includes(metric.label)
  );

  const monitoringMetrics = metrics.filter((metric) =>
    ["Shopping Queue", "Infra Coverage", "Timetable Slots", "Live Services"].includes(metric.label)
  );
  function downloadDashboardWorkbook() {
    const workbook = utils.book_new();
    const workbookSheets = [
      { name: "Projects", data: projects },
      { name: "Leads", data: leads },
      { name: "Revenue", data: sheets.revenue?.rows ?? [] },
      { name: "Team", data: sheets.team?.rows ?? [] },
      { name: "Content", data: content },
      { name: "Services", data: services },
      { name: "Shopping", data: shopping },
      { name: "Timetable", data: timetable },
      { name: "Servers", data: servers },
      { name: "Databases", data: databases },
      { name: "Meet Sessions", data: meetHistory }
    ];

    workbookSheets.forEach((sheet) => {
      const worksheet = utils.json_to_sheet(sheet.data);
      utils.book_append_sheet(workbook, worksheet, sheet.name);
    });

    writeFile(workbook, "PixelKode-business-data.xlsx");
  }
  const activeProjects = projects
    .filter((row) => String(row.projectStatus ?? "") !== "Completed")
    .slice(0, 6);
  const topService = services
    .slice()
    .sort((left, right) => Number(right.projectsDone ?? 0) - Number(left.projectsDone ?? 0))[0];
  const topContent = content
    .slice()
    .sort((left, right) => Number(right.leadsGenerated ?? 0) - Number(left.leadsGenerated ?? 0))[0];
  // Accurate Today's Follow-Ups
  function isToday(dateString: string | number | boolean | null | undefined) {
    if (!dateString || typeof dateString === 'boolean') return false;
    const today = new Date();
    const date = new Date(dateString);
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  }

  const todaysFollowUps = leads.filter((row) => isToday(row.followUpDate)).slice(0, 10);
  const followUpLeads = leads
    .filter((row) => {
      const leadStatusValue = String(row.leadStatus ?? "");
      const callStatusValue = String(row.callStatus ?? "");
      return ["Follow-up", "Proposal Sent"].includes(leadStatusValue) || ["Interested", "Connected"].includes(callStatusValue);
    })
    .slice(0, 5);

  const avgProjectValue = projects.length
    ? formatCurrency(Math.round(projects.reduce((sum, row) => sum + Number(row.projectValue ?? 0), 0) / projects.length))
    : formatCurrency(0);
  const pipelineValue = formatCurrency(projects.reduce((sum, row) => sum + Number(row.pendingAmount ?? 0), 0));

  const projectProgressData = projects.map((project) => ({
    name: String(project.projectName ?? "Project"),
    progress: Number(project.completionPercent ?? 0),
    pending: Math.round(Number(project.pendingAmount ?? 0) / 1000)
  }));
  const opsPulseData = [
    { name: "Active Projects", value: summary.activeProjects },
    { name: "Follow Ups", value: summary.followUps },
    { name: "Delivered", value: summary.servicesDelivered },
    { name: "Scheduled", value: summary.scheduledContent },
    { name: "Converted", value: summary.converted }
  ];
  const liveOpsBoard = [
    { name: "Shopping Pending", value: summary.shoppingPending },
    { name: "Healthy Servers", value: summary.healthyServers },
    { name: "DB Assets", value: summary.databasesTracked },
    { name: "Planned Slots", value: summary.timetablePlannedCells },
    { name: "Meet Sessions", value: meetHistory.length }
  ];
  const meetingsToday = meetHistory.filter((item) => {
    if (!item.createdAt) return false;
    const created = new Date(item.createdAt);
    return (
      created.getFullYear() === referenceNow.getFullYear() &&
      created.getMonth() === referenceNow.getMonth() &&
      created.getDate() === referenceNow.getDate()
    );
  }).length;
  const scheduledMeetings = meetHistory.filter((item) => item.mode === "scheduled").length;
  const instantMeetings = meetHistory.filter((item) => item.mode === "instant").length;
  const recentMeetSessions = meetHistory.slice(0, 4);
  const nextScheduledMeetings = meetHistory
    .filter((item) => item.mode === "scheduled")
    .sort((left, right) => String(right.createdAt ?? "").localeCompare(String(left.createdAt ?? "")))
    .slice(0, 3);
  const meetModeMix = [
    { name: "Instant", value: instantMeetings },
    { name: "Scheduled", value: scheduledMeetings }
  ].filter((item) => item.value > 0);
  const infraIssues = infrastructureStatus.find((item) => item.name === "Server Alerts")?.value ?? 0;
  const companyShoppingPending = shopping.filter(
    (row) => String(row.listType ?? "") === "Company" && ["To Buy", "Ordered"].includes(String(row.purchaseStatus ?? ""))
  ).length;

  if (!hasMounted) {
    return (
      <div className="space-y-4 py-10 px-4 text-center text-sm text-slate-500">
        Loading dashboard preview...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <div className="flex flex-wrap items-center gap-3 rounded-[22px] border border-white/80 bg-white/85 px-4 py-3 shadow-[0_20px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <div className="text-sm font-semibold text-slate-600">Quick Actions</div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={downloadDashboardWorkbook}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-[1px] hover:shadow-md"
              title="Download dashboard data"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
            <button onClick={() => { addRow("servers"); router.push("/servers"); }} className="rounded-full border border-slate-200 bg-white p-2 shadow-sm transition hover:-translate-y-[1px] hover:shadow-md" title="Add server">
              <Server className="h-4 w-4 text-slate-700" />
            </button>
            <button onClick={() => { addRow("databases"); router.push("/databases"); }} className="rounded-full border border-slate-200 bg-white p-2 shadow-sm transition hover:-translate-y-[1px] hover:shadow-md" title="Add database">
              <Database className="h-4 w-4 text-slate-700" />
            </button>
            <button onClick={() => { addRow("shopping"); router.push("/shopping"); }} className="rounded-full border border-slate-200 bg-white p-2 shadow-sm transition hover:-translate-y-[1px] hover:shadow-md" title="Add shopping item">
              <ShoppingBag className="h-4 w-4 text-slate-700" />
            </button>
            <button onClick={() => router.push("/meet-session")} className="rounded-full border border-slate-200 bg-white p-2 shadow-sm transition hover:-translate-y-[1px] hover:shadow-md" title="Open meet session">
              <Video className="h-4 w-4 text-slate-700" />
            </button>
            <button onClick={() => router.push("/timetable")} className="rounded-full border border-slate-200 bg-white p-2 shadow-sm transition hover:-translate-y-[1px] hover:shadow-md" title="Open timetable">
              <CalendarClock className="h-4 w-4 text-slate-700" />
            </button>
          </div>
        </div>
      </div>
      {!isLoaded ? <p className="text-sm text-slate-400">Loading Railway data...</p> : null}
      {error ? <p className="text-sm text-amber-300">{error}</p> : null}

      {/* Combined Premium Action Center */}
      {(todaysFollowUps.length > 0 || alerts.length > 0) && (
        <Card className="overflow-hidden rounded-[32px] border border-fuchsia-200/80 bg-gradient-to-br from-white via-fuchsia-50 to-emerald-50 p-0 shadow-[0_30px_90px_rgba(15,23,42,0.14)]">
          <div className="border-b border-fuchsia-200/80 bg-gradient-to-r from-fuchsia-100 via-emerald-50 to-white px-7 py-6 flex items-center gap-4">
            <Sparkles className="h-6 w-6 text-fuchsia-500" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-fuchsia-700">Action Center</p>
              <h3 className="mt-1 text-[30px] font-semibold tracking-tight text-slate-900">Today's Urgent Actions</h3>
            </div>
          </div>
          <div className="grid gap-5 p-7 lg:grid-cols-2">
            {/* Today's Follow-Ups */}
            {todaysFollowUps.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CircleDollarSign className="h-5 w-5 text-emerald-500" />
                  <span className="text-sm font-semibold text-emerald-900">Leads to Follow Up Today</span>
                </div>
                <div className="space-y-3">
                  {todaysFollowUps.map((lead, idx) => (
                    <div key={typeof lead.id === 'string' || typeof lead.id === 'number' ? lead.id : idx} className="rounded-[18px] border border-emerald-200 bg-white p-4 shadow-sm">
                      <p className="text-base font-bold text-slate-900">{lead.businessName || lead.contactName || 'Lead'}</p>
                      <p className="mt-1 text-xs text-slate-600">Follow-up Date: <span className="font-semibold">{lead.followUpDate}</span></p>
                      <p className="mt-1 text-xs text-slate-600">Status: <span className="font-semibold">{lead.leadStatus || 'N/A'}</span></p>
                      <p className="mt-1 text-xs text-slate-600">Notes: {lead.notes || '-'}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Operational Alerts */}
            {alerts.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <ArrowUpRight className="h-5 w-5 text-rose-500" />
                  <span className="text-sm font-semibold text-rose-900">Operational Alerts</span>
                </div>
                <div className="space-y-3">
                  {alerts.slice(0, 3).map((alert) => (
                    <div
                      key={alert.id}
                      className={cn(
                        "rounded-[18px] border p-4 shadow-sm",
                        alert.severity === "high"
                          ? "border-rose-200 bg-rose-50"
                          : alert.severity === "medium"
                          ? "border-amber-200 bg-amber-50"
                          : "border-slate-200 bg-slate-50"
                      )}
                    >
                      <p className="text-base font-bold text-slate-900">{alert.title}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{alert.message}</p>
                      {alert.actionLabel ? <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-fuchsia-700">{alert.actionLabel}</p> : null}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      <Card className="overflow-hidden rounded-[36px] border-white/80 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.18),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.16),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] p-0 shadow-[0_36px_100px_rgba(15,23,42,0.16)]">
        <div className="px-7 py-8 lg:px-9 lg:py-9">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(560px,0.95fr)] lg:items-start">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500 shadow-sm">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                Executive Overview
              </div>
              <div className="max-w-2xl">
                <h1 className="text-4xl font-semibold tracking-tight text-slate-950 md:text-[52px]">Business Dashboard</h1>
                <p className="mt-4 max-w-xl text-[15px] leading-8 text-slate-600 md:text-[17px]">
                  Collections, delivery pace, project movement, and demand signals in one clean operating view.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                <span className="rounded-full bg-white px-3 py-1 shadow-sm">Live now</span>
                <span>{now ? now.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "Syncing..."}</span>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {heroMetrics.map((metric, index) => {
                const Icon = heroIcons[index];

                return (
                  <div key={metric.label} className="rounded-[24px] border border-white/80 bg-white/78 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur-sm">
                    <div className="flex flex-col gap-7">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{metric.label}</p>
                        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl", heroAccents[index])}>
                          <Icon className="h-4 w-4" />
                        </div>
                      </div>
                      <div className="min-w-0">
                        <h3 className="whitespace-nowrap text-[clamp(1.65rem,2.2vw,2.45rem)] font-semibold leading-none tracking-[-0.04em] text-slate-950">
                          {metric.value}
                        </h3>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {monitoringMetrics.map((metric) => (
          <Card key={metric.label} className="rounded-[26px] border-white/90 bg-gradient-to-br from-white via-sky-50/90 to-fuchsia-50/80 p-6 shadow-[0_24px_70px_rgba(56,189,248,0.10)]">
            <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">{metric.label}</p>
            <p className="mt-4 text-[34px] font-semibold tracking-tight text-slate-950">{metric.value}</p>
            <p className="mt-3 text-sm leading-6 text-slate-600">{metric.helper}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_1.15fr]">
        <Card className="overflow-hidden rounded-[28px] border-white/80 bg-white/95 p-0 shadow-[0_28px_80px_rgba(15,23,42,0.12)]">
          <div className="border-b border-slate-200/80 bg-gradient-to-r from-sky-50 via-white to-fuchsia-50 px-6 py-5">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-slate-500">Meet Mission Control</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-950">Live meeting board</h3>
          </div>
          <div className="grid gap-5 p-5">
            <div className="grid gap-3 md:grid-cols-3">
              <SnapshotTile label="Created today" value={`${meetingsToday}`} helper="Meet links created in your current timezone" />
              <SnapshotTile label="Instant links" value={`${instantMeetings}`} helper="Fast launch calls ready to share" />
              <SnapshotTile label="Scheduled links" value={`${scheduledMeetings}`} helper="Planned sessions still tracked here" />
            </div>
            <div className="grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
              <StatusPieChart data={meetModeMix.length > 0 ? meetModeMix : [{ name: "No Meets", value: 1 }]} />
              <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">Recent links</p>
                    <p className="mt-1 text-sm text-slate-600">Your latest generated meeting links across the workspace.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push("/meet-session")}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm"
                  >
                    Open Meet Desk
                  </button>
                </div>
                <div className="mt-4 space-y-3">
                  {recentMeetSessions.length > 0 ? (
                    recentMeetSessions.map((meeting, index) => (
                      <div key={`${meeting.meetLink}-${index}`} className="rounded-2xl border border-white/90 bg-white px-4 py-3 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">{meeting.title || "Meet Session"}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {meeting.mode === "instant" ? "Instant" : "Scheduled"} | {meeting.attendeeEmail || "No attendee email"}
                            </p>
                          </div>
                          <a
                            href={meeting.meetLink}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700"
                          >
                            Open
                          </a>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-6 text-center text-sm text-slate-500">
                      Create the first Meet link and this board will start tracking it live.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>


        <Card className="overflow-hidden rounded-[28px] border-white/80 bg-white/95 p-0 shadow-[0_28px_80px_rgba(15,23,42,0.12)]">
          <div className="border-b border-slate-200/80 bg-gradient-to-r from-rose-50 via-white to-sky-50 px-6 py-5">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-slate-500">Control Actions</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-950">Fast operating moves</h3>
          </div>
          <div className="space-y-4 p-5">
            <ActionStep title="Launch Meet workflow" helper="Open the Meet Session desk and generate a fresh link." />
            <ActionStep title="Tighten tomorrow's timetable" helper="Jump into the timetable and pre-fill the next work block." />
            <ActionStep title="Resolve infra warnings" helper={`${infraIssues} infrastructure alerts are still open right now.`} />
            <ActionStep title="Close company buying" helper={`${companyShoppingPending} company shopping items are still in queue.`} />
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">Next scheduled</p>
              <div className="mt-3 space-y-2">
                {nextScheduledMeetings.length > 0 ? (
                  nextScheduledMeetings.map((meeting, index) => (
                    <div key={`${meeting.meetLink}-${index}`} className="rounded-xl bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
                      {meeting.title || "Scheduled Meet"}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">No scheduled Meet links have been created yet.</p>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <RevenueLineChart data={monthlyRevenue.length > 0 ? monthlyRevenue : [{ month: "No Data", revenue: 0, target: 0 }]} />
        <MoneySplitCard items={revenueTypes} eyebrow="Finance Balance" title="Revenue Mix" subtitle="Income and spend breakdown" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ServiceBarChart
          data={revenueByCategory.length > 0 ? revenueByCategory : [{ name: "No Data", value: 0 }]}
          title="Category Revenue"
          subtitle="Charged value split by project category"
          compactLabels
        />
        <StatusPieChart
          data={projectStatus.length > 0 ? projectStatus : [{ name: "No Data", value: 1 }]}
          title="Project Status Mix"
          subtitle="Completion state across all active and completed projects"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <LeadPipelineBoard items={leadStatus} leads={followUpLeads} />
        <ServiceDemandMixChart
          data={featuredServiceDemand.length > 0 ? featuredServiceDemand : [{ name: "No Service", leads: 0, projects: 0 }]}
          title="Service Demand Board"
          subtitle="Highest-demand services shown with compact labels so the board stays clean"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="grid gap-4">
          <ProjectProgressChart
            data={
              projectProgressData.length > 0
                ? projectProgressData
                : [{ name: "No Project", progress: 0, pending: 0 }]
            }
          />
          <ActionCenterBoard
            activeProjects={activeProjects}
            topService={topService}
            topContent={topContent}
            pipelineValue={pipelineValue}
            followUpCount={summary.followUps}
          />
        </div>

        <div className="grid gap-4">
          <OpsPulseChart data={opsPulseData} />
          <ServiceBarChart
            data={infrastructureStatus.length > 0 ? infrastructureStatus : [{ name: "No Infra", value: 0 }]}
            title="Infrastructure Status"
            subtitle="Healthy, warning, and production asset counts"
            valueFormatter={(value) => `${value}`}
            compactLabels
          />
          <MoneySplitCard
            items={shoppingStatus.length > 0 ? shoppingStatus : [{ name: "No Status", value: 0 }]}
            eyebrow="Buying Flow"
            title="Purchase Status"
            subtitle="Open vs completed shopping workflow"
          />
        </div>
      </div>
    </div>
  );
}

function ActionCenterBoard({
  activeProjects,
  topService,
  topContent,
  pipelineValue,
  followUpCount
}: {
  activeProjects: Record<string, unknown>[];
  topService?: Record<string, unknown>;
  topContent?: Record<string, unknown>;
  pipelineValue: string;
  followUpCount: number;
}) {
  const queueCount = activeProjects.length;

  return (
    <Card className="overflow-hidden rounded-[28px] border-white/80 bg-white/95 p-0 shadow-[0_28px_80px_rgba(15,23,42,0.12)]">
      <div className="border-b border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.92))] px-6 py-5">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-slate-500">Action Center</p>
        <h3 className="mt-2 text-xl font-semibold text-slate-950">What matters right now</h3>
      </div>
      <div className="space-y-5 p-5">
        <div className="grid gap-3 md:grid-cols-4">
          <SnapshotTile label="Active queue" value={`${queueCount}`} helper="Projects currently in motion" />
          <SnapshotTile label="Lead follow-ups" value={`${followUpCount}`} helper="Live follow-ups to close this week" />
          <SnapshotTile label="Pipeline value" value={pipelineValue} helper="Receivable amount still open" />
          <SnapshotTile
            label="Top service"
            value={String(topService?.serviceName ?? "No service data")}
            helper={
              topService
                ? `${Number(topService.projectsDone ?? 0)} delivered | ${Number(topService.monthlyLeads ?? 0)} leads`
                : "Add service rows to track demand."
            }
          />
          <SnapshotTile
            label="Top content"
            value={String(topContent?.contentTitle ?? "No content data")}
            helper={
              topContent
                ? `${Number(topContent.leadsGenerated ?? 0)} leads | ${String(topContent.platform ?? "Platform")}`
                : "Add content rows to track lead sources."
            }
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[20px] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-sky-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">Active Queue</p>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
                {queueCount} items
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {activeProjects.length > 0 ? (
                activeProjects.slice(0, 4).map((project, index) => (
                  <div key={`${String(project.id ?? "project")}-${index}`} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{String(project.projectName ?? "Project")}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {String(project.clientName ?? "Unknown client")} | {String(project.projectStatus ?? "In Progress")}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-900">{Number(project.completionPercent ?? 0)}%</p>
                        <p className="mt-1 text-xs text-slate-500">{formatCurrency(Number(project.pendingAmount ?? 0))} pending</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-6 text-center">
                  <p className="text-base font-medium text-slate-900">No active projects right now</p>
                  <p className="mt-2 text-sm text-slate-500">
                    This section will fill automatically when projects move into progress.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[20px] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-fuchsia-50 p-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">Recommended moves</p>
            <div className="mt-4 space-y-3">
              <ActionStep
                title="Collect pending receivables"
                helper={`${pipelineValue} is still open across projects.`}
              />
              <ActionStep
                title="Close lead follow-ups"
                helper={`${followUpCount} active follow-ups are still waiting.`}
              />
              <ActionStep
                title="Push strongest offer"
                helper={topService ? `${String(topService.serviceName ?? "Top service")} is leading demand right now.` : "Add service data to unlock demand signals."}
              />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function ActionStep({ title, helper }: { title: string; helper: string }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white px-4 py-3.5 shadow-sm">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{helper}</p>
    </div>
  );
}

function SnapshotTile({
  label,
  value,
  helper
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-[20px] border border-slate-200/80 bg-slate-50/85 p-5">
      <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-3 line-clamp-2 text-[22px] font-semibold tracking-tight text-slate-900">{value}</p>
      <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{helper}</p>
    </div>
  );
}

function LeadPipelineBoard({
  items,
  leads
}: {
  items: { stage: string; value: number }[];
  leads: Record<string, unknown>[];
}) {
  const total = items.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card className="overflow-hidden rounded-[28px] border-white/80 bg-white/95 p-0 shadow-[0_28px_80px_rgba(15,23,42,0.12)]">
      <div className="border-b border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.92))] px-6 py-5">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-slate-500">Lead Pipeline Funnel</p>
        <h3 className="mt-2 text-xl font-semibold text-slate-950">{total} live leads</h3>
      </div>
      <div className="space-y-5 p-5">
        {items.map((item, index) => {
          const percent = total > 0 ? Math.round((item.value / total) * 100) : 0;

          return (
            <div key={item.stage} className="space-y-2">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-slate-700">{item.stage}</span>
                <span className="text-slate-500">{item.value} leads | {percent}%</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-violet-100">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${percent}%`,
                    backgroundColor: progressColors[index % progressColors.length]
                  }}
                />
              </div>
            </div>
          );
        })}
        <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Immediate follow-ups</p>
          <div className="mt-3 space-y-3">
            {leads.length > 0 ? (
              leads.map((lead, index) => {
                const statusValue = String(lead.leadStatus ?? lead.callStatus ?? "Pending");

                return (
                  <div key={`${String(lead.id ?? "lead")}-${index}`} className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate font-medium text-slate-700">{String(lead.businessName ?? "Unknown business")}</span>
                    <span className={cn("rounded-full border px-3 py-1 text-xs text-slate-600", getStatusClasses(statusValue))}>
                      {statusValue}
                    </span>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-slate-500">No live follow-up leads right now.</p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function MoneySplitCard({
  items,
  eyebrow = "Revenue Mix",
  title = "Revenue Mix",
  subtitle = "Income and spend breakdown"
}: {
  items: { name: string; value: number }[];
  eyebrow?: string;
  title?: string;
  subtitle?: string;
}) {
  const income = items.find((item) => item.name === "Income")?.value ?? 0;
  const expense = items
    .filter((item) => ["Expense", "Payroll", "Personal Use"].includes(item.name))
    .reduce((sum, item) => sum + item.value, 0);
  const usesRevenueModel = items.some((item) => ["Income", "Expense", "Payroll", "Personal Use"].includes(item.name));
  const positiveFlow = items.reduce((sum, item) => sum + item.value, 0);
  const profit = usesRevenueModel ? income - expense : positiveFlow;
  const totalFlow = Math.max(usesRevenueModel ? income + expense : positiveFlow, 1);
  const profitTone =
    profit >= 0
      ? "from-emerald-400 via-lime-300 to-cyan-300 text-emerald-950"
      : "from-rose-400 via-orange-300 to-amber-300 text-rose-950";

  return (
    <Card className="overflow-hidden rounded-[28px] border-white/80 bg-white/95 p-0 shadow-[0_28px_80px_rgba(15,23,42,0.12)]">
      <div className="border-b border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.92))] px-6 py-5">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-slate-500">{eyebrow}</p>
        <h3 className="mt-2 text-xl font-semibold text-slate-950">{title}</h3>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>
      <div className="space-y-4 p-5">
        <div className={`rounded-[24px] bg-gradient-to-br ${profitTone} p-[1px] shadow-[0_20px_50px_rgba(16,24,40,0.12)]`}>
          <div className="rounded-[23px] bg-white px-5 py-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-slate-500">
              {usesRevenueModel ? "Net Profit" : "Total Items"}
            </p>
            <div className="mt-2 flex items-end justify-between gap-3">
              <div>
                <p className="text-4xl font-semibold tracking-tight text-slate-900">
                  {usesRevenueModel ? formatCurrency(profit) : formatCompactNumber(profit)}
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  {usesRevenueModel
                    ? profit >= 0
                      ? "Income is ahead of total spend"
                      : "Spend is higher than income right now"
                    : "Total monitored entries in this board"}
                </p>
              </div>
              <div className="min-w-[108px] rounded-2xl bg-slate-50 px-3 py-2 text-right">
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                  {usesRevenueModel ? "Margin" : "Active"}
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {usesRevenueModel ? (income > 0 ? `${Math.round((profit / income) * 100)}%` : "0%") : `${items.length}`}
                </p>
              </div>
            </div>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-cyan-300 to-sky-400"
                style={{ width: `${Math.max(8, Math.min(100, (income / totalFlow) * 100))}%` }}
              />
            </div>
          </div>
        </div>

        {items.map((item, index) => (
          <div key={item.name} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: progressColors[index % progressColors.length] }}
                />
                <div>
                  <p className="text-sm font-medium text-slate-700">{item.name}</p>
                  <p className="text-[11px] text-slate-500">
                    {Math.round((item.value / totalFlow) * 100)}% of tracked {usesRevenueModel ? "finance flow" : "activity"}
                  </p>
                </div>
              </div>
              <p className="text-lg font-semibold text-slate-900">
                {usesRevenueModel ? formatCurrency(item.value) : formatCompactNumber(item.value)}
              </p>
            </div>
          </div>
        ))}
        {items.length === 0 ? (
          <div className="rounded-2xl border border-violet-100 bg-white/55 p-4 text-sm text-slate-500">
            Add revenue rows to see the split between income, expenses, payroll, and personal use.
          </div>
        ) : null}
      </div>
    </Card>
  );
}

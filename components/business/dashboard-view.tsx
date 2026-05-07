"use client";

import { ArrowUpRight, CircleDollarSign, FolderKanban, Megaphone, Sparkles } from "lucide-react";

import {
  ContentLeadsChart,
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
  buildLeadStatusData,
  buildMonthlyRevenue,
  buildProjectStatusData,
  buildRevenueByCategory,
  buildRevenueBySector,
  buildRevenueTypeData,
  buildServiceDeliveryData,
  buildServiceDemandData,
  buildTeamCapacityData
} from "@/lib/analytics";
import { getStatusClasses } from "@/lib/sheet-ui";
import { useBusinessStore } from "@/lib/store";
import { cn, formatCurrency } from "@/lib/utils";

const progressColors = ["#ff5fa2", "#7c6cff", "#1cc8c0", "#ff9b54", "#3b82f6"];
const heroIcons = [FolderKanban, CircleDollarSign, ArrowUpRight, Megaphone];
const heroAccents = [
  "from-fuchsia-200 via-rose-100 to-white",
  "from-emerald-200 via-lime-100 to-white",
  "from-orange-200 via-amber-100 to-white",
  "from-sky-200 via-cyan-100 to-white"
];

export function DashboardView() {
  const sheets = useBusinessStore((state) => state.sheets);
  const isLoaded = useBusinessStore((state) => state.isLoaded);
  const error = useBusinessStore((state) => state.error);

  const projects = sheets.projects?.rows ?? [];
  const leads = sheets.leads?.rows ?? [];
  const services = sheets.services?.rows ?? [];
  const content = sheets.content?.rows ?? [];

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
  const summary = buildBusinessSummary(sheets);

  const heroMetrics = metrics.filter((metric) =>
    ["Project Value", "Received", "Pending", "Lead Conversion"].includes(metric.label)
  );
  const activeProjects = projects
    .filter((row) => String(row.projectStatus ?? "") !== "Completed")
    .slice(0, 6);
  const topService = services
    .slice()
    .sort((left, right) => Number(right.projectsDone ?? 0) - Number(left.projectsDone ?? 0))[0];
  const topContent = content
    .slice()
    .sort((left, right) => Number(right.leadsGenerated ?? 0) - Number(left.leadsGenerated ?? 0))[0];
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

  return (
    <div className="space-y-4">
      {!isLoaded ? <p className="text-sm text-slate-400">Loading Railway data...</p> : null}
      {error ? <p className="text-sm text-amber-300">{error}</p> : null}

      <Card className="overflow-hidden rounded-[28px] border-white/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(249,250,255,0.92))] p-0 shadow-[0_24px_60px_rgba(90,76,146,0.08)]">
        <div className="relative overflow-hidden px-5 py-4 md:px-6 md:py-5">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(244,114,182,0.12),transparent_32%),radial-gradient(circle_at_top_right,rgba(56,189,248,0.12),transparent_28%),linear-gradient(90deg,rgba(255,255,255,0.86),rgba(255,255,255,0.94))]" />
          <div className="relative grid gap-4 xl:grid-cols-[1.2fr_0.95fr]">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/75 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500 shadow-sm">
                <Sparkles className="h-3.5 w-3.5 text-fuchsia-500" />
                Executive Overview
              </div>
              <div className="max-w-xl">
                <h1 className="premium-heading text-3xl font-semibold tracking-tight text-slate-950 md:text-[38px]">Business Dashboard</h1>
                <p className="mt-2 max-w-lg text-sm leading-7 text-slate-600 md:text-base">
                  Collections, delivery pace, project movement, and demand signals in one clean operating view.
                </p>
              </div>
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
              {heroMetrics.map((metric, index) => {
                const Icon = heroIcons[index];

                return (
                  <div key={metric.label} className="rounded-[18px] border border-white/80 bg-white/74 p-3 shadow-sm backdrop-blur">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1 pr-2">
                        <p className="whitespace-nowrap text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">{metric.label}</p>
                        <h3 className="mt-2 whitespace-nowrap text-[22px] font-semibold leading-none tracking-tight text-slate-950 xl:text-[24px]">
                          {metric.value}
                        </h3>
                      </div>
                      <div className={cn("shrink-0 rounded-2xl p-2", "bg-gradient-to-br " + heroAccents[index])}>
                        <Icon className="h-3.5 w-3.5 text-slate-800" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr_0.85fr]">
        <RevenueLineChart data={monthlyRevenue.length > 0 ? monthlyRevenue : [{ month: "No Data", revenue: 0, target: 0 }]} />
        <StatusPieChart data={projectStatus.length > 0 ? projectStatus : [{ name: "No Data", value: 1 }]} />
        <MoneySplitCard items={revenueTypes} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ServiceBarChart data={revenueByCategory.length > 0 ? revenueByCategory : [{ name: "No Data", value: 0 }]} />
        <LeadPipelineBoard items={leadStatus} leads={followUpLeads} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <TeamCapacityChart data={teamCapacity.length > 0 ? teamCapacity : [{ name: "No Team", capacity: 0, active: 0 }]} />
        <ServiceDeliveryChart data={serviceDelivery.length > 0 ? serviceDelivery : [{ name: "No Service", days: 0, price: 0 }]} />
        <ContentLeadsChart data={contentPerformance.length > 0 ? contentPerformance : [{ name: "No Content", leads: 0 }]} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="grid gap-4">
          <ProjectProgressChart
            data={
              projectProgressData.length > 0
                ? projectProgressData
                : [{ name: "No Project", progress: 0, pending: 0 }]
            }
          />
          <ProjectFocusBoard
            activeProjects={activeProjects}
            topService={topService}
            topContent={topContent}
          />
        </div>

        <div className="grid gap-4">
          <Card className="overflow-hidden rounded-[22px] border-white/80 p-0">
            <div className="border-b border-white/80 bg-white/80 px-5 py-4">
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-slate-500">KPI Snapshot</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-900">Weekly focus</h3>
            </div>
            <div className="grid gap-3 p-4">
              <SnapshotTile label="Avg. project value" value={avgProjectValue} helper="Average project size" />
              <SnapshotTile label="Pipeline value" value={pipelineValue} helper="Remaining receivable amount" />
              <SnapshotTile label="Lead actions" value={`${summary.followUps} follow-ups`} helper={`${summary.proposals} proposals - ${summary.converted} converted`} />
              <SnapshotTile label="Net profit" value={formatCurrency(summary.profit)} helper="Income minus expenses and personal use" />
            </div>
          </Card>

          <SectorRevenueChart
            data={revenueBySector.length > 0 ? revenueBySector : [{ name: "No Sector", value: 0 }]}
          />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <ServiceDemandMixChart
          data={serviceDemand.length > 0 ? serviceDemand : [{ name: "No Service", leads: 0, projects: 0 }]}
        />

        <OpsPulseChart data={opsPulseData} />
      </div>
    </div>
  );
}

function ProjectFocusBoard({
  activeProjects,
  topService,
  topContent
}: {
  activeProjects: Record<string, unknown>[];
  topService?: Record<string, unknown>;
  topContent?: Record<string, unknown>;
}) {
  return (
    <Card className="overflow-hidden rounded-[24px] border-white/80 p-0">
      <div className="border-b border-white/80 bg-gradient-to-r from-white via-fuchsia-50/70 to-sky-50/70 px-5 py-4">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-slate-500">Project Focus</p>
        <h3 className="mt-2 text-xl font-semibold text-slate-900">What needs attention next</h3>
      </div>
      <div className="grid gap-4 p-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[20px] border border-white/80 bg-white/65 p-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">Active Queue</p>
          <div className="mt-4 space-y-3">
            {activeProjects.length > 0 ? (
              activeProjects.map((project, index) => (
                <div key={`${String(project.id ?? "project")}-${index}`} className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{String(project.projectName ?? "Project")}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {String(project.clientName ?? "Unknown client")} • {String(project.projectStatus ?? "In Progress")}
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
              <p className="text-sm text-slate-500">No active projects right now.</p>
            )}
          </div>
        </div>
        <div className="grid gap-4">
          <div className="rounded-[20px] border border-white/80 bg-white/65 p-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">Top Service</p>
            <p className="mt-3 text-xl font-semibold text-slate-900">{String(topService?.serviceName ?? "No service data")}</p>
            <p className="mt-2 text-sm text-slate-500">
              {topService ? `${Number(topService.projectsDone ?? 0)} projects delivered • ${Number(topService.monthlyLeads ?? 0)} monthly leads` : "Add service rows to track demand and delivery."}
            </p>
          </div>
          <div className="rounded-[20px] border border-white/80 bg-white/65 p-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">Top Content</p>
            <p className="mt-3 text-xl font-semibold text-slate-900">{String(topContent?.contentTitle ?? "No content data")}</p>
            <p className="mt-2 text-sm text-slate-500">
              {topContent ? `${Number(topContent.leadsGenerated ?? 0)} leads generated • ${String(topContent.platform ?? "Platform")}` : "Add content rows to see which posts are driving leads."}
            </p>
          </div>
        </div>
      </div>
    </Card>
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
    <div className="rounded-[18px] border border-white/80 bg-white/65 p-4">
      <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-2 text-xl font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{helper}</p>
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
    <Card className="overflow-hidden rounded-[22px] border-white/80 p-0">
      <div className="border-b border-white/80 bg-white/80 px-5 py-4">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-slate-500">Lead Pipeline Funnel</p>
        <h3 className="mt-2 text-xl font-semibold text-slate-900">{total} live leads</h3>
      </div>
      <div className="space-y-4 p-4">
        {items.map((item, index) => {
          const percent = total > 0 ? Math.round((item.value / total) * 100) : 0;

          return (
            <div key={item.stage} className="space-y-2">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-slate-700">{item.stage}</span>
                <span className="text-slate-500">{item.value} leads - {percent}%</span>
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
        <div className="rounded-[18px] border border-white/80 bg-white/65 p-4">
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

function MoneySplitCard({ items }: { items: { name: string; value: number }[] }) {
  const income = items.find((item) => item.name === "Income")?.value ?? 0;
  const expense = items
    .filter((item) => ["Expense", "Payroll", "Personal Use"].includes(item.name))
    .reduce((sum, item) => sum + item.value, 0);
  const profit = income - expense;
  const totalFlow = Math.max(income + expense, 1);
  const profitTone =
    profit >= 0
      ? "from-emerald-400 via-lime-300 to-cyan-300 text-emerald-950"
      : "from-rose-400 via-orange-300 to-amber-300 text-rose-950";

  return (
    <Card className="overflow-hidden rounded-[22px] border-white/80 p-0">
      <div className="border-b border-white/80 bg-white/80 px-5 py-4">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-slate-500">Revenue Mix</p>
        <h3 className="mt-2 text-xl font-semibold text-slate-900">Income and spend breakdown</h3>
      </div>
      <div className="space-y-3 p-4">
        <div className={`rounded-[24px] bg-gradient-to-br ${profitTone} p-[1px] shadow-[0_20px_50px_rgba(16,24,40,0.12)]`}>
          <div className="rounded-[23px] bg-white/80 px-5 py-4 backdrop-blur">
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-slate-500">Net Profit</p>
            <div className="mt-2 flex items-end justify-between gap-3">
              <div>
                <p className="text-4xl font-semibold tracking-tight text-slate-900">{formatCurrency(profit)}</p>
                <p className="mt-1 text-xs text-slate-600">
                  {profit >= 0 ? "Income is ahead of total spend" : "Spend is higher than income right now"}
                </p>
              </div>
              <div className="min-w-[108px] rounded-2xl bg-white/70 px-3 py-2 text-right">
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Margin</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {income > 0 ? `${Math.round((profit / income) * 100)}%` : "0%"}
                </p>
              </div>
            </div>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/70">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-cyan-300 to-sky-400"
                style={{ width: `${Math.max(8, Math.min(100, (income / totalFlow) * 100))}%` }}
              />
            </div>
          </div>
        </div>

        {items.map((item, index) => (
          <div key={item.name} className="rounded-2xl border border-white/80 bg-white/65 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: progressColors[index % progressColors.length] }}
                />
                <div>
                  <p className="text-sm font-medium text-slate-700">{item.name}</p>
                  <p className="text-[11px] text-slate-500">
                    {Math.round((item.value / totalFlow) * 100)}% of tracked finance flow
                  </p>
                </div>
              </div>
              <p className="text-lg font-semibold text-slate-900">{formatCurrency(item.value)}</p>
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

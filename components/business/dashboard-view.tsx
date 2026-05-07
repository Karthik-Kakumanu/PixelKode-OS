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
  "bg-rose-50 text-rose-700",
  "bg-emerald-50 text-emerald-700",
  "bg-amber-50 text-amber-700",
  "bg-sky-50 text-sky-700"
];

export function DashboardView() {
  const sheets = useBusinessStore((state) => state.sheets);
  const alerts = useBusinessStore((state) => state.alerts);
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

      {alerts.length > 0 ? (
        <Card className="overflow-hidden rounded-[24px] p-0">
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-slate-500">Needs Attention</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-950">Operational alerts surfaced by the system</h3>
          </div>
          <div className="grid gap-3 p-4 lg:grid-cols-3">
            {alerts.slice(0, 3).map((alert) => (
              <div
                key={alert.id}
                className={`rounded-[20px] border p-4 ${
                  alert.severity === "high"
                    ? "border-rose-200 bg-rose-50"
                    : alert.severity === "medium"
                      ? "border-amber-200 bg-amber-50"
                      : "border-slate-200 bg-slate-50"
                }`}
              >
                <p className="text-sm font-semibold text-slate-900">{alert.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{alert.message}</p>
                {alert.actionLabel ? <p className="mt-3 text-xs font-medium uppercase tracking-[0.16em] text-slate-500">{alert.actionLabel}</p> : null}
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <Card className="overflow-hidden rounded-[28px] p-0">
        <div className="px-6 py-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(560px,0.95fr)] lg:items-start">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500 shadow-sm">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                Executive Overview
              </div>
              <div className="max-w-xl">
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-[40px]">Business Dashboard</h1>
                <p className="mt-3 max-w-lg text-sm leading-7 text-slate-600 md:text-base">
                  Collections, delivery pace, project movement, and demand signals in one clean operating view.
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {heroMetrics.map((metric, index) => {
                const Icon = heroIcons[index];

                return (
                  <div key={metric.label} className="rounded-[20px] border border-slate-200 bg-slate-50 p-4 shadow-sm">
                    <div className="flex flex-col gap-6">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{metric.label}</p>
                        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl", heroAccents[index])}>
                          <Icon className="h-4 w-4" />
                        </div>
                      </div>
                      <div className="min-w-0">
                        <h3 className="whitespace-nowrap text-[28px] font-semibold leading-none tracking-tight text-slate-950">
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

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr_0.8fr]">
        <RevenueLineChart data={monthlyRevenue.length > 0 ? monthlyRevenue : [{ month: "No Data", revenue: 0, target: 0 }]} />
        <StatusPieChart data={projectStatus.length > 0 ? projectStatus : [{ name: "No Data", value: 1 }]} />
        <MoneySplitCard items={revenueTypes} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ServiceBarChart data={revenueByCategory.length > 0 ? revenueByCategory : [{ name: "No Data", value: 0 }]} />
        <LeadPipelineBoard items={leadStatus} leads={followUpLeads} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <TeamCapacityChart data={teamCapacity.length > 0 ? teamCapacity : [{ name: "No Team", capacity: 0, active: 0 }]} />
        <ServiceDeliveryChart data={serviceDelivery.length > 0 ? serviceDelivery : [{ name: "No Service", days: 0, price: 0 }]} />
        <ContentLeadsChart data={contentPerformance.length > 0 ? contentPerformance : [{ name: "No Content", leads: 0 }]} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
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
          <Card className="overflow-hidden rounded-[22px] p-0">
            <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-slate-500">KPI Snapshot</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-950">Weekly focus</h3>
            </div>
            <div className="grid gap-3 p-4">
              <SnapshotTile label="Avg. project value" value={avgProjectValue} helper="Average project size" />
              <SnapshotTile label="Pipeline value" value={pipelineValue} helper="Remaining receivable amount" />
              <SnapshotTile label="Lead actions" value={`${summary.followUps} follow-ups`} helper={`${summary.proposals} proposals | ${summary.converted} converted`} />
              <SnapshotTile label="Net profit" value={formatCurrency(summary.profit)} helper="Income minus expenses and personal use" />
            </div>
          </Card>

          <SectorRevenueChart
            data={revenueBySector.length > 0 ? revenueBySector : [{ name: "No Sector", value: 0 }]}
          />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <ServiceDemandMixChart
          data={serviceDemand.length > 0 ? serviceDemand : [{ name: "No Service", leads: 0, projects: 0 }]}
        />

        <OpsPulseChart data={opsPulseData} />
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
    <Card className="overflow-hidden rounded-[24px] p-0">
      <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-slate-500">Action Center</p>
        <h3 className="mt-2 text-xl font-semibold text-slate-950">What matters right now</h3>
      </div>
      <div className="space-y-4 p-4">
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
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
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
    <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-4">
      <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-2 line-clamp-2 text-xl font-semibold text-slate-900">{value}</p>
      <p className="mt-1 line-clamp-2 text-xs text-slate-500">{helper}</p>
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
    <Card className="overflow-hidden rounded-[22px] p-0">
      <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-slate-500">Lead Pipeline Funnel</p>
        <h3 className="mt-2 text-xl font-semibold text-slate-950">{total} live leads</h3>
      </div>
      <div className="space-y-4 p-4">
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
    <Card className="overflow-hidden rounded-[22px] p-0">
      <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-slate-500">Revenue Mix</p>
        <h3 className="mt-2 text-xl font-semibold text-slate-950">Income and spend breakdown</h3>
      </div>
      <div className="space-y-3 p-4">
        <div className={`rounded-[24px] bg-gradient-to-br ${profitTone} p-[1px] shadow-[0_20px_50px_rgba(16,24,40,0.12)]`}>
          <div className="rounded-[23px] bg-white px-5 py-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-slate-500">Net Profit</p>
            <div className="mt-2 flex items-end justify-between gap-3">
              <div>
                <p className="text-4xl font-semibold tracking-tight text-slate-900">{formatCurrency(profit)}</p>
                <p className="mt-1 text-xs text-slate-600">
                  {profit >= 0 ? "Income is ahead of total spend" : "Spend is higher than income right now"}
                </p>
              </div>
              <div className="min-w-[108px] rounded-2xl bg-slate-50 px-3 py-2 text-right">
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Margin</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {income > 0 ? `${Math.round((profit / income) * 100)}%` : "0%"}
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

"use client";

import { ArrowUpRight, CircleDollarSign, FolderKanban, Megaphone, Sparkles } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import {
  ContentLeadsChart,
  RevenueLineChart,
  ServiceBarChart,
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
import { useBusinessStore } from "@/lib/store";
import { cn, formatCurrency } from "@/lib/utils";

const progressColors = ["#D98BB6", "#A59AF7", "#7DCFC0", "#F4B183", "#8CB7FF"];
const heroIcons = [FolderKanban, CircleDollarSign, ArrowUpRight, Megaphone];
const heroAccents = [
  "from-violet-200/95 to-violet-50/80",
  "from-emerald-200/95 to-emerald-50/80",
  "from-rose-200/95 to-rose-50/80",
  "from-sky-200/95 to-sky-50/80"
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

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Dashboard"
        title="Your business at a glance"
        description="This dashboard stays tied to your live Projects, Leads, Revenue, Team, Content, and Services data."
      />

      {!isLoaded ? <p className="text-sm text-slate-400">Loading Railway data...</p> : null}
      {error ? <p className="text-sm text-amber-300">{error}</p> : null}

      <div className="grid gap-4 xl:grid-cols-[1.55fr_0.95fr]">
        <div className="grid gap-4 md:grid-cols-2">
          {heroMetrics.map((metric, index) => {
            const Icon = heroIcons[index];

            return (
              <Card key={metric.label} className="overflow-hidden p-0">
                <div className={cn("h-1.5 bg-gradient-to-r", heroAccents[index])} />
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-500">{metric.label}</p>
                      <h3 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900">{metric.value}</h3>
                      <p className="mt-3 text-sm text-slate-500">{metric.helper}</p>
                    </div>
                    <div className="rounded-2xl border border-violet-100 bg-white/70 p-3">
                      <Icon className="h-5 w-5 text-slate-700" />
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <Card className="overflow-hidden p-0">
          <div className="border-b border-violet-100/80 px-6 py-5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-500" />
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-500">Business Intelligence</p>
            </div>
            <h3 className="mt-3 text-2xl font-semibold text-slate-900">Live ratios and focus areas</h3>
          </div>
          <div className="grid gap-3 p-5 sm:grid-cols-2">
            <InsightTile label="Avg. project value" value={avgProjectValue} helper="Average project size" />
            <InsightTile label="Pipeline value" value={pipelineValue} helper="Remaining receivable amount" />
            <InsightTile
              label="Top service"
              value={String(topService?.serviceName ?? "No live service")}
              helper={`${Number(topService?.projectsDone ?? 0)} delivered`}
            />
            <InsightTile
              label="Best content"
              value={String(topContent?.contentTitle ?? "No content yet")}
              helper={`${Number(topContent?.leadsGenerated ?? 0)} leads generated`}
            />
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <RevenueLineChart data={monthlyRevenue.length > 0 ? monthlyRevenue : [{ month: "No Data", revenue: 0, target: 0 }]} />
        <ServiceBarChart data={revenueByCategory.length > 0 ? revenueByCategory : [{ name: "No Data", value: 0 }]} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr_0.95fr]">
        <StatusPieChart data={projectStatus.length > 0 ? projectStatus : [{ name: "No Data", value: 1 }]} />
        <LeadPipelineBoard items={leadStatus} leads={followUpLeads} />
        <MoneySplitCard items={revenueTypes} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <TeamCapacityChart data={teamCapacity.length > 0 ? teamCapacity : [{ name: "No Team", capacity: 0, active: 0 }]} />
        <ServiceDeliveryChart data={serviceDelivery.length > 0 ? serviceDelivery : [{ name: "No Service", days: 0, price: 0 }]} />
        <ContentLeadsChart data={contentPerformance.length > 0 ? contentPerformance : [{ name: "No Content", leads: 0 }]} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-violet-100/80 px-6 py-5">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-500">Active Projects Tracker</p>
            <h3 className="mt-3 text-2xl font-semibold text-slate-900">Projects that still need movement</h3>
          </div>
          <div className="px-6 pb-4 pt-2">
            <div className="grid grid-cols-[1.4fr_0.8fr_0.7fr_0.8fr] gap-3 border-b border-violet-100/80 py-3 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
              <span>Client</span>
              <span>Status</span>
              <span>Payment</span>
              <span>Progress</span>
            </div>
            <div className="space-y-1">
              {activeProjects.map((project) => (
                <div
                  key={String(project.id)}
                  className="grid grid-cols-[1.4fr_0.8fr_0.7fr_0.8fr] gap-3 border-b border-violet-100/60 py-4 last:border-b-0"
                >
                  <div>
                    <p className="text-base font-semibold text-slate-900">{String(project.projectName ?? "Untitled project")}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {String(project.category ?? "General")} · {String(project.clientName ?? "No client")}
                    </p>
                  </div>
                  <ProjectPill value={String(project.projectStatus ?? "Unknown")} />
                  <ProjectPill value={String(project.paymentStatus ?? "Unknown")} />
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-violet-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-300 via-rose-300 to-sky-300"
                        style={{ width: `${Math.max(0, Math.min(100, Number(project.completionPercent ?? 0)))}%` }}
                      />
                    </div>
                    <span className="min-w-[42px] text-sm font-medium text-slate-600">
                      {Number(project.completionPercent ?? 0)}%
                    </span>
                  </div>
                </div>
              ))}
              {activeProjects.length === 0 ? (
                <div className="py-8 text-sm text-slate-500">All projects are marked completed right now.</div>
              ) : null}
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden p-0">
          <div className="border-b border-violet-100/80 px-6 py-5">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-500">Operational Snapshot</p>
            <h3 className="mt-3 text-2xl font-semibold text-slate-900">What needs your attention this week</h3>
          </div>
          <div className="grid gap-3 p-5">
            <SnapshotTile label="Project pipeline" value={`${summary.activeProjects} active`} helper={`${summary.completedProjects} completed`} />
            <SnapshotTile label="Lead actions" value={`${summary.followUps} follow-ups`} helper={`${summary.proposals} proposals · ${summary.converted} converted`} />
            <SnapshotTile label="Services delivered" value={`${summary.servicesDelivered}`} helper="Lifetime delivery count" />
            <SnapshotTile label="Content motion" value={`${summary.scheduledContent} scheduled`} helper={`${summary.totalContentLeads} leads from content`} />
            <SnapshotTile label="Net profit" value={formatCurrency(summary.profit)} helper="Income minus expenses and personal use" />
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-violet-100/80 px-6 py-5">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-500">Service Demand Board</p>
            <h3 className="mt-3 text-2xl font-semibold text-slate-900">Which offers are pulling the most interest</h3>
          </div>
          <div className="space-y-3 p-5">
            {serviceDemand.map((item) => (
              <div key={item.name} className="rounded-2xl border border-violet-100 bg-white/55 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-slate-900">{item.name}</p>
                    <p className="mt-1 text-sm text-slate-500">{item.leads} monthly leads flowing into this offer</p>
                  </div>
                  <div className="rounded-2xl border border-violet-100 bg-white/70 px-4 py-3 text-right">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Done</p>
                    <p className="text-lg font-semibold text-slate-900">{item.projects}</p>
                  </div>
                </div>
              </div>
            ))}
            {serviceDemand.length === 0 ? (
              <div className="rounded-2xl border border-violet-100 bg-white/55 p-4 text-sm text-slate-500">
                Add services to compare demand and fulfillment.
              </div>
            ) : null}
          </div>
        </Card>

        <Card className="overflow-hidden p-0">
          <div className="border-b border-violet-100/80 px-6 py-5">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-500">Revenue by Sector</p>
            <h3 className="mt-3 text-2xl font-semibold text-slate-900">Where collected money is coming from</h3>
          </div>
          <div className="grid gap-3 p-5 sm:grid-cols-2">
            {revenueBySector.map((item) => (
              <div key={item.name} className="rounded-2xl border border-violet-100 bg-white/50 p-4">
                <p className="text-sm text-slate-400">{item.name}</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{formatCurrency(item.value)}</p>
              </div>
            ))}
            {revenueBySector.length === 0 ? (
              <div className="rounded-2xl border border-violet-100 bg-white/55 p-4 text-sm text-slate-500">
                Add project rows and received amounts to see sector-level analysis.
              </div>
            ) : null}
          </div>
        </Card>
      </div>
    </div>
  );
}

function InsightTile({
  label,
  value,
  helper
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-[24px] border border-violet-100 bg-white/55 p-5">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{helper}</p>
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
    <div className="rounded-[22px] border border-violet-100 bg-white/55 p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{helper}</p>
    </div>
  );
}

function ProjectPill({ value }: { value: string }) {
  return (
    <div className="pt-1">
      <span className="inline-flex rounded-full border border-violet-100 bg-white/80 px-3 py-1.5 text-sm font-medium text-slate-700">
        {value}
      </span>
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
    <Card className="overflow-hidden p-0">
      <div className="border-b border-violet-100/80 px-6 py-5">
        <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-500">Lead Pipeline Funnel</p>
        <h3 className="mt-3 text-2xl font-semibold text-slate-900">{total} live leads</h3>
      </div>
      <div className="space-y-4 p-5">
        {items.map((item, index) => {
          const percent = total > 0 ? Math.round((item.value / total) * 100) : 0;

          return (
            <div key={item.stage} className="space-y-2">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-slate-700">{item.stage}</span>
                <span className="text-slate-500">{item.value} leads · {percent}%</span>
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
        <div className="rounded-[22px] border border-violet-100 bg-white/55 p-4">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Immediate follow-ups</p>
          <div className="mt-3 space-y-3">
            {leads.length > 0 ? (
              leads.map((lead, index) => (
                <div key={`${String(lead.id ?? "lead")}-${index}`} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate font-medium text-slate-700">{String(lead.businessName ?? "Unknown business")}</span>
                  <span className="rounded-full border border-violet-100 bg-white/80 px-3 py-1 text-slate-600">
                    {String(lead.leadStatus ?? lead.callStatus ?? "Pending")}
                  </span>
                </div>
              ))
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
  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-violet-100/80 px-6 py-5">
        <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-500">Payment Status Split</p>
        <h3 className="mt-3 text-2xl font-semibold text-slate-900">Money split from live revenue entries</h3>
      </div>
      <div className="space-y-3 p-5">
        {items.map((item) => (
          <div key={item.name} className="rounded-2xl border border-violet-100 bg-white/55 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-700">{item.name}</p>
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

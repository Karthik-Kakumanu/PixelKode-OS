"use client";

import { PageHeader } from "@/components/app/page-header";
import {
  ContentLeadsChart,
  ConversionFunnelChart,
  RevenueLineChart,
  ServiceDeliveryChart,
  ServiceBarChart,
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
import { formatCurrency } from "@/lib/utils";
import { useBusinessStore } from "@/lib/store";

export function DashboardView() {
  const sheets = useBusinessStore((state) => state.sheets);
  const isLoaded = useBusinessStore((state) => state.isLoaded);
  const error = useBusinessStore((state) => state.error);
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

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Dashboard"
        title="Your business at a glance"
        description="This dashboard updates automatically from the data you enter in Projects, Leads, Revenue, Team, and Content."
      />

      {!isLoaded ? <p className="text-sm text-slate-400">Loading Railway data...</p> : null}
      {error ? <p className="text-sm text-amber-300">{error}</p> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {metrics.map((metric) => (
          <Card key={metric.label}>
            <p className="text-sm text-slate-400">{metric.label}</p>
            <h3 className="mt-3 text-3xl font-semibold text-slate-900">{metric.value}</h3>
            <p className="mt-2 text-xs text-slate-500">{metric.helper}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <RevenueLineChart data={monthlyRevenue.length > 0 ? monthlyRevenue : [{ month: "No Data", revenue: 0, target: 0 }]} />
        <ServiceBarChart data={revenueByCategory.length > 0 ? revenueByCategory : [{ name: "No Data", value: 0 }]} />
        <StatusPieChart data={projectStatus.length > 0 ? projectStatus : [{ name: "No Data", value: 1 }]} />
        <ConversionFunnelChart data={leadStatus.length > 0 ? leadStatus : [{ stage: "No Data", value: 1 }]} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <TeamCapacityChart
          data={teamCapacity.length > 0 ? teamCapacity : [{ name: "No Team", hours: 0, projects: 0 }]}
        />
        <ServiceDeliveryChart
          data={serviceDelivery.length > 0 ? serviceDelivery : [{ name: "No Service", days: 0, price: 0 }]}
        />
        <ContentLeadsChart
          data={contentPerformance.length > 0 ? contentPerformance : [{ name: "No Content", leads: 0 }]}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <h3 className="text-lg font-semibold">Operational snapshot</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-2xl border border-violet-100 bg-white/50 p-4">
              <p className="text-sm text-slate-400">Project pipeline</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.activeProjects} active</p>
              <p className="mt-1 text-sm text-slate-400">{summary.completedProjects} completed</p>
            </div>
            <div className="rounded-2xl border border-violet-100 bg-white/50 p-4">
              <p className="text-sm text-slate-400">Lead actions</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.followUps} follow-ups</p>
              <p className="mt-1 text-sm text-slate-400">{summary.proposals} proposals, {summary.converted} converted</p>
            </div>
            <div className="rounded-2xl border border-violet-100 bg-white/50 p-4">
              <p className="text-sm text-slate-400">Content motion</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.scheduledContent} scheduled or posted</p>
              <p className="mt-1 text-sm text-slate-400">{summary.totalContentLeads} leads from content</p>
            </div>
            <div className="rounded-2xl border border-violet-100 bg-white/50 p-4">
              <p className="text-sm text-slate-400">Team capacity</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.teamHours} hrs/week</p>
              <p className="mt-1 text-sm text-slate-400">Total available owner + partner capacity</p>
            </div>
            <div className="rounded-2xl border border-violet-100 bg-white/50 p-4">
              <p className="text-sm text-slate-400">Services delivered</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.servicesDelivered}</p>
              <p className="mt-1 text-sm text-slate-400">Lifetime delivery count from the services sheet</p>
            </div>
            <div className="rounded-2xl border border-violet-100 bg-white/50 p-4">
              <p className="text-sm text-slate-400">Owner usage</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{formatCurrency(summary.personalUse)}</p>
              <p className="mt-1 text-sm text-slate-400">Personal withdrawals logged in revenue</p>
            </div>
            <div className="rounded-2xl border border-violet-100 bg-white/50 p-4">
              <p className="text-sm text-slate-400">Net profit</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{formatCurrency(summary.profit)}</p>
              <p className="mt-1 text-sm text-slate-400">Income minus expenses, payroll, and personal use</p>
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold">Money split</h3>
          <div className="mt-4 space-y-3">
            {revenueTypes.map((item) => (
              <div key={item.name} className="rounded-2xl border border-violet-100 bg-white/50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-slate-600">{item.name}</p>
                  <p className="text-base font-semibold text-slate-900">{formatCurrency(item.value)}</p>
                </div>
              </div>
            ))}
            {revenueTypes.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-400">
                Add revenue rows to see the split between income, expenses, payroll, and personal use.
              </div>
            ) : null}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <h3 className="text-lg font-semibold">Service demand board</h3>
          <div className="mt-4 space-y-3">
            {serviceDemand.map((item) => (
              <div key={item.name} className="rounded-2xl border border-violet-100 bg-white/55 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-slate-900">{item.name}</p>
                    <p className="text-sm text-slate-500">{item.leads} monthly leads flowing into this offer</p>
                  </div>
                  <p className="text-lg font-semibold text-slate-900">{item.projects} done</p>
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

        <Card>
          <h3 className="text-lg font-semibold">Revenue by sector</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
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

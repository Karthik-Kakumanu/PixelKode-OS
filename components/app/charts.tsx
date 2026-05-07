"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Funnel,
  FunnelChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { Card } from "@/components/ui/card";
import { cn, formatCurrency } from "@/lib/utils";

const pieColors = ["#ff5fa2", "#7c6cff", "#1cc8c0", "#ff9b54", "#3b82f6", "#95d52a"];
const axisStroke = "#6c5d8f";
const gridStroke = "rgba(124, 108, 255, 0.12)";
const tooltipStyle = {
  background: "rgba(255,255,255,0.96)",
  border: "1px solid rgba(172, 155, 205, 0.25)",
  borderRadius: 18,
  color: "#32284A"
};

function compactProjectLabel(value: string, maxLength = 18) {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength - 1).trimEnd()}…`;
}

function ProjectAxisTick({
  x,
  y,
  payload
}: {
  x?: number;
  y?: number;
  payload?: { value?: string };
}) {
  const value = String(payload?.value ?? "");
  const label = compactProjectLabel(value, 18);

  return (
    <g transform={`translate(${x ?? 0},${y ?? 0})`}>
      <title>{value}</title>
      <text x={-10} y={4} textAnchor="end" fill="#6c5d8f" fontSize={11.5} fontWeight={500}>
        {label}
      </text>
    </g>
  );
}

function ChartShell({
  title,
  subtitle,
  children,
  className,
  headerClassName,
  bodyClassName,
  style
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  style?: React.CSSProperties;
}) {
  return (
    <Card className={cn("h-[360px] overflow-hidden p-0", className)} style={style}>
      <div className="flex h-full flex-col">
        <div className={cn("border-b border-white/80 bg-gradient-to-r from-white via-fuchsia-50/70 to-sky-50/70 px-6 py-5", headerClassName)}>
          <h3 className="premium-heading text-xl font-semibold text-slate-900">{title}</h3>
          {subtitle ? <p className="mt-1.5 text-sm leading-6 text-slate-500">{subtitle}</p> : null}
        </div>
        <div className={cn("min-h-0 flex-1 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.72),rgba(255,255,255,0.2))] px-4 pb-4 pt-3", bodyClassName)}>{children}</div>
      </div>
    </Card>
  );
}

export function RevenueLineChart({
  data
}: {
  data: { month: string; revenue: number; target: number }[];
}) {
  return (
    <ChartShell title="Revenue Trend" subtitle="Collected amount vs billed value across your full project timeline">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid stroke={gridStroke} vertical={false} />
          <XAxis dataKey="month" stroke={axisStroke} />
          <YAxis stroke={axisStroke} tickFormatter={(value) => formatCurrency(Number(value)).replace(".00", "")} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend />
          <Line type="monotone" dataKey="revenue" stroke="#ff4f9f" strokeWidth={4} dot={{ r: 3, fill: "#ff4f9f" }} isAnimationActive={false} />
          <Line type="monotone" dataKey="target" stroke="#4f8cff" strokeWidth={3} dot={{ r: 2, fill: "#4f8cff" }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

export function ServiceBarChart({
  data
}: {
  data: { name: string; value: number }[];
}) {
  return (
    <ChartShell title="Service Revenue" subtitle="Charged value split by project category">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid stroke={gridStroke} vertical={false} />
          <XAxis dataKey="name" stroke={axisStroke} />
          <YAxis stroke={axisStroke} tickFormatter={(value) => formatCurrency(Number(value)).replace(".00", "")} />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="value" radius={[16, 16, 0, 0]} isAnimationActive={false}>
            {data.map((item, index) => (
              <Cell key={item.name} fill={pieColors[index % pieColors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

export function StatusPieChart({
  data
}: {
  data: { name: string; value: number }[];
}) {
  return (
    <ChartShell title="Project Status Mix" subtitle="Completion state across all projects">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip contentStyle={tooltipStyle} />
          <Legend />
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={68} outerRadius={108} paddingAngle={5} isAnimationActive={false}>
            {data.map((item, index) => (
              <Cell key={item.name} fill={pieColors[index % pieColors.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

export function ConversionFunnelChart({
  data
}: {
  data: { stage: string; value: number }[];
}) {
  return (
    <ChartShell title="Lead Conversion Funnel" subtitle="Lead statuses based on your live pipeline">
      <ResponsiveContainer width="100%" height="100%">
        <FunnelChart>
          <Tooltip contentStyle={tooltipStyle} />
          <Funnel dataKey="value" data={data} isAnimationActive={false}>
            {data.map((entry, index) => (
              <Cell key={entry.stage} fill={pieColors[index % pieColors.length]} />
            ))}
          </Funnel>
        </FunnelChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

export function ProductivityChart({
  data
}: {
  data: { week: string; design: number; dev: number; content: number }[];
}) {
  return (
    <Card className="h-[340px]">
      <h3 className="mb-4 text-lg font-semibold">Team Productivity</h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid stroke={gridStroke} vertical={false} />
          <XAxis dataKey="week" stroke={axisStroke} />
          <YAxis stroke={axisStroke} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend />
          <Bar dataKey="design" fill="#ff5fa2" radius={[14, 14, 0, 0]} isAnimationActive={false} />
          <Bar dataKey="dev" fill="#7c6cff" radius={[14, 14, 0, 0]} isAnimationActive={false} />
          <Bar dataKey="content" fill="#1cc8c0" radius={[14, 14, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

export function TeamCapacityChart({
  data
}: {
  data: { name: string; capacity: number; active: number }[];
}) {
  return (
    <ChartShell title="Team Availability" subtitle="Live capacity signal from the team sheet">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid stroke={gridStroke} vertical={false} />
          <XAxis dataKey="name" stroke={axisStroke} />
          <YAxis stroke={axisStroke} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend />
          <Bar dataKey="capacity" fill="#7c6cff" radius={[14, 14, 0, 0]} isAnimationActive={false} />
          <Bar dataKey="active" fill="#1cc8c0" radius={[14, 14, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

export function ServiceDeliveryChart({
  data
}: {
  data: { name: string; days: number; price: number }[];
}) {
  return (
    <ChartShell title="Service Delivery" subtitle="Delivery speed vs value for each live service">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid stroke={gridStroke} vertical={false} />
          <XAxis dataKey="name" stroke={axisStroke} />
          <YAxis stroke={axisStroke} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend />
          <Line type="monotone" dataKey="days" stroke="#ff9b54" strokeWidth={4} dot={{ r: 3, fill: "#ff9b54" }} isAnimationActive={false} />
          <Line type="monotone" dataKey="price" stroke="#ff4f9f" strokeWidth={3} dot={{ r: 2, fill: "#ff4f9f" }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

export function ContentLeadsChart({
  data
}: {
  data: { name: string; leads: number }[];
}) {
  return (
    <ChartShell title="Content Lead Yield" subtitle="Lead contribution from published content">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid stroke={gridStroke} vertical={false} />
          <XAxis dataKey="name" stroke={axisStroke} />
          <YAxis stroke={axisStroke} />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="leads" radius={[14, 14, 0, 0]} fill="#3b82f6" isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

export function SectorRevenueChart({
  data
}: {
  data: { name: string; value: number }[];
}) {
  return (
    <ChartShell title="Revenue by Sector" subtitle="Collected money split across sectors">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid stroke={gridStroke} vertical={false} />
          <XAxis dataKey="name" stroke={axisStroke} />
          <YAxis stroke={axisStroke} tickFormatter={(value) => formatCurrency(Number(value)).replace(".00", "")} />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="value" radius={[14, 14, 0, 0]} isAnimationActive={false}>
            {data.map((item, index) => (
              <Cell key={item.name} fill={pieColors[index % pieColors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

export function ServiceDemandMixChart({
  data
}: {
  data: { name: string; leads: number; projects: number }[];
}) {
  return (
    <ChartShell title="Service Demand Board" subtitle="Leads flowing into each offer vs projects delivered">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid stroke={gridStroke} vertical={false} />
          <XAxis dataKey="name" stroke={axisStroke} />
          <YAxis stroke={axisStroke} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend />
          <Bar dataKey="leads" fill="#ff5fa2" radius={[12, 12, 0, 0]} isAnimationActive={false} />
          <Bar dataKey="projects" fill="#1cc8c0" radius={[12, 12, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

export function ProjectProgressChart({
  data
}: {
  data: { name: string; progress: number; pending: number }[];
}) {
  const trackedProjects = data.filter((item) => item.name !== "No Project");
  const averageProgress = trackedProjects.length
    ? Math.round(trackedProjects.reduce((sum, item) => sum + item.progress, 0) / trackedProjects.length)
    : 0;
  const totalPending = trackedProjects.reduce((sum, item) => sum + item.pending, 0);
  const cardHeight = Math.max(560, 300 + trackedProjects.length * 34);
  const leadingProject =
    trackedProjects.length > 0
      ? trackedProjects.reduce((leader, item) => (item.progress > leader.progress ? item : leader), trackedProjects[0])
      : null;

  return (
    <ChartShell
      title="Project Progress"
      subtitle="Completion percentage and pending amount across projects"
      className="h-auto"
      headerClassName="px-6 pb-3 pt-4"
      bodyClassName="px-5 pb-5 pt-4"
      style={{ height: `${cardHeight}px` }}
    >
      <div className="flex h-full flex-col gap-5">
        <div className="min-h-[320px] flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 24, right: 18, top: 4, bottom: 2 }} barCategoryGap={14}>
              <CartesianGrid stroke={gridStroke} horizontal={false} />
              <XAxis type="number" stroke={axisStroke} />
              <YAxis type="category" dataKey="name" stroke={axisStroke} width={150} tickLine={false} axisLine={false} tick={<ProjectAxisTick />} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Bar dataKey="progress" fill="#7c6cff" radius={[0, 12, 12, 0]} barSize={10} isAnimationActive={false} />
              <Bar dataKey="pending" fill="#ff9b54" radius={[0, 12, 12, 0]} barSize={10} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/80 bg-white/70 px-5 py-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">Tracked Projects</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{trackedProjects.length}</p>
            <p className="mt-2 text-sm text-slate-500">Projects included in this progress board</p>
          </div>
          <div className="rounded-2xl border border-white/80 bg-white/70 px-5 py-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">Average Completion</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{averageProgress}%</p>
            <p className="mt-2 text-sm text-slate-500">Across the currently visible projects</p>
          </div>
          <div className="rounded-2xl border border-white/80 bg-white/70 px-5 py-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">Pending Value</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{totalPending}k</p>
            <p className="mt-2 text-sm text-slate-500">
              {leadingProject ? `${leadingProject.name} is leading at ${leadingProject.progress}%` : "Add project rows to see insights"}
            </p>
          </div>
        </div>
      </div>
    </ChartShell>
  );
}

export function OpsPulseChart({
  data
}: {
  data: { name: string; value: number }[];
}) {
  return (
    <ChartShell title="Operating Snapshot" subtitle="Current pulse across projects, leads, services, and content">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid stroke={gridStroke} vertical={false} />
          <XAxis dataKey="name" stroke={axisStroke} />
          <YAxis stroke={axisStroke} />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="value" radius={[14, 14, 0, 0]} isAnimationActive={false}>
            {data.map((item, index) => (
              <Cell key={item.name} fill={pieColors[index % pieColors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

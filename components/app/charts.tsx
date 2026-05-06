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

const pieColors = ["#D98BB6", "#A59AF7", "#7DCFC0", "#F4B183", "#8CB7FF"];
const axisStroke = "#746A8A";
const gridStroke = "rgba(116, 106, 138, 0.12)";
const tooltipStyle = {
  background: "rgba(255,255,255,0.92)",
  border: "1px solid rgba(172, 155, 205, 0.35)",
  borderRadius: 16,
  color: "#32284A"
};

function ChartShell({
  title,
  subtitle,
  children,
  className
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("h-[360px] overflow-hidden p-0", className)}>
      <div className="flex h-full flex-col">
        <div className="border-b border-violet-100/80 px-6 py-5">
          <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
          {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
        </div>
        <div className="min-h-0 flex-1 px-4 pb-4 pt-2">{children}</div>
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
          <Line type="monotone" dataKey="revenue" stroke="#C779A7" strokeWidth={3} dot={false} isAnimationActive={false} />
          <Line type="monotone" dataKey="target" stroke="#8CB7FF" strokeWidth={2} dot={false} isAnimationActive={false} />
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
          <Bar dataKey="value" radius={[12, 12, 0, 0]} isAnimationActive={false}>
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
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={70} outerRadius={105} paddingAngle={4} isAnimationActive={false}>
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
          <Bar dataKey="design" fill="#D98BB6" radius={[12, 12, 0, 0]} isAnimationActive={false} />
          <Bar dataKey="dev" fill="#A59AF7" radius={[12, 12, 0, 0]} isAnimationActive={false} />
          <Bar dataKey="content" fill="#7DCFC0" radius={[12, 12, 0, 0]} isAnimationActive={false} />
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
          <Bar dataKey="capacity" fill="#A59AF7" radius={[12, 12, 0, 0]} isAnimationActive={false} />
          <Bar dataKey="active" fill="#7DCFC0" radius={[12, 12, 0, 0]} isAnimationActive={false} />
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
          <Line type="monotone" dataKey="days" stroke="#F4B183" strokeWidth={3} dot={false} isAnimationActive={false} />
          <Line type="monotone" dataKey="price" stroke="#C779A7" strokeWidth={2} dot={false} isAnimationActive={false} />
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
          <Bar dataKey="leads" radius={[12, 12, 0, 0]} fill="#8CB7FF" isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

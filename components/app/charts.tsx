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

const pieColors = ["#D98BB6", "#A59AF7", "#7DCFC0", "#F4B183", "#8CB7FF"];
const axisStroke = "#746A8A";
const gridStroke = "rgba(116, 106, 138, 0.12)";
const tooltipStyle = {
  background: "rgba(255,255,255,0.92)",
  border: "1px solid rgba(172, 155, 205, 0.35)",
  borderRadius: 16,
  color: "#32284A"
};

export function RevenueLineChart({
  data
}: {
  data: { month: string; revenue: number; target: number }[];
}) {
  return (
    <Card className="h-[340px]">
      <h3 className="mb-4 text-lg font-semibold">Revenue Trend</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid stroke={gridStroke} vertical={false} />
          <XAxis dataKey="month" stroke={axisStroke} />
          <YAxis stroke={axisStroke} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend />
          <Line type="monotone" dataKey="revenue" stroke="#C779A7" strokeWidth={3} dot={false} isAnimationActive={false} />
          <Line type="monotone" dataKey="target" stroke="#8CB7FF" strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}

export function ServiceBarChart({
  data
}: {
  data: { name: string; value: number }[];
}) {
  return (
    <Card className="h-[340px]">
      <h3 className="mb-4 text-lg font-semibold">Service Revenue</h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid stroke={gridStroke} vertical={false} />
          <XAxis dataKey="name" stroke={axisStroke} />
          <YAxis stroke={axisStroke} />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="value" radius={[12, 12, 0, 0]} isAnimationActive={false}>
            {data.map((item, index) => (
              <Cell key={item.name} fill={pieColors[index % pieColors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

export function StatusPieChart({
  data
}: {
  data: { name: string; value: number }[];
}) {
  return (
    <Card className="h-[340px]">
      <h3 className="mb-4 text-lg font-semibold">Project Status Mix</h3>
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
    </Card>
  );
}

export function ConversionFunnelChart({
  data
}: {
  data: { stage: string; value: number }[];
}) {
  return (
    <Card className="h-[340px]">
      <h3 className="mb-4 text-lg font-semibold">Lead Conversion Funnel</h3>
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
    </Card>
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
  data: { name: string; hours: number; projects: number }[];
}) {
  return (
    <Card className="h-[340px]">
      <h3 className="mb-4 text-lg font-semibold">Team Capacity</h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid stroke={gridStroke} vertical={false} />
          <XAxis dataKey="name" stroke={axisStroke} />
          <YAxis stroke={axisStroke} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend />
          <Bar dataKey="hours" fill="#A59AF7" radius={[12, 12, 0, 0]} isAnimationActive={false} />
          <Bar dataKey="projects" fill="#7DCFC0" radius={[12, 12, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

export function ServiceDeliveryChart({
  data
}: {
  data: { name: string; days: number; price: number }[];
}) {
  return (
    <Card className="h-[340px]">
      <h3 className="mb-4 text-lg font-semibold">Service Delivery</h3>
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
    </Card>
  );
}

export function ContentLeadsChart({
  data
}: {
  data: { name: string; leads: number }[];
}) {
  return (
    <Card className="h-[340px]">
      <h3 className="mb-4 text-lg font-semibold">Content Lead Yield</h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid stroke={gridStroke} vertical={false} />
          <XAxis dataKey="name" stroke={axisStroke} />
          <YAxis stroke={axisStroke} />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="leads" radius={[12, 12, 0, 0]} fill="#8CB7FF" isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

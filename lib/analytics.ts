import type { DashboardMetric, SheetData } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim()) return Number(value);
  return 0;
}

function toText(value: unknown) {
  return typeof value === "string" ? value : "";
}

function parseDate(value: unknown) {
  const text = toText(value);
  if (!text) return null;

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, (month || 1) - 1, 1).toLocaleString("en-US", { month: "short", year: "numeric" });
}

export function buildDashboardMetrics(sheets: Record<string, SheetData>): DashboardMetric[] {
  const projects = sheets.projects?.rows ?? [];
  const leads = sheets.leads?.rows ?? [];
  const revenue = sheets.revenue?.rows ?? [];
  const services = sheets.services?.rows ?? [];
  const team = sheets.team?.rows ?? [];
  const shopping = sheets.shopping?.rows ?? [];
  const servers = sheets.servers?.rows ?? [];
  const databases = sheets.databases?.rows ?? [];
  const timetable = sheets.timetable?.rows ?? [];

  const totalProjectValue = projects.reduce((sum, row) => sum + toNumber(row.projectValue), 0);
  const totalReceived = projects.reduce((sum, row) => sum + toNumber(row.amountReceived), 0);
  const totalPending = projects.reduce((sum, row) => sum + toNumber(row.pendingAmount), 0);
  const convertedLeads = leads.filter((row) => toText(row.leadStatus) === "Converted").length;
  const connectedCalls = leads.filter((row) => ["Connected", "Interested"].includes(toText(row.callStatus))).length;
  const totalCalls = leads.reduce((sum, row) => sum + Math.max(1, toNumber(row.callCount)), 0);
  const income = revenue
    .filter((row) => toText(row.entryType) === "Income")
    .reduce((sum, row) => sum + toNumber(row.amount), 0);
  const expenses = revenue
    .filter((row) => ["Expense", "Payroll", "Personal Use"].includes(toText(row.entryType)))
    .reduce((sum, row) => sum + toNumber(row.amount), 0);
  const payroll = revenue
    .filter((row) => toText(row.entryType) === "Payroll")
    .reduce((sum, row) => sum + toNumber(row.amount), 0);
  const avgCompletion =
    projects.length > 0
      ? Math.round(projects.reduce((sum, row) => sum + toNumber(row.completionPercent), 0) / projects.length)
      : 0;
  const conversionRate = leads.length > 0 ? Math.round((convertedLeads / leads.length) * 100) : 0;
  const callHitRate = totalCalls > 0 ? Math.round((connectedCalls / totalCalls) * 100) : 0;
  const activeServices = services.filter((row) => !["Paused", ""].includes(toText(row.status))).length;
  const openShoppingItems = shopping.filter((row) => !["Bought", "Deferred"].includes(toText(row.purchaseStatus))).length;
  const healthyServers = servers.filter((row) => toText(row.status) === "Healthy").length;
  const infraCount = servers.length + databases.length;
  const timetableCellsFilled = timetable.reduce(
    (sum, row) =>
      sum +
      ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].filter((key) => toText(row[key]).trim() !== "").length,
    0
  );

  return [
    { label: "Project Value", value: formatCurrency(totalProjectValue), helper: "Total value of all listed projects" },
    { label: "Received", value: formatCurrency(totalReceived), helper: "Money already collected" },
    { label: "Pending", value: formatCurrency(totalPending), helper: "Money still to be collected" },
    { label: "Revenue", value: formatCurrency(income), helper: "Income entries from revenue sheet" },
    { label: "Expenses", value: formatCurrency(expenses), helper: "Expenses + payroll + personal use" },
    { label: "Payroll", value: formatCurrency(payroll), helper: "Team payout entries only" },
    { label: "Project Completion", value: `${avgCompletion}%`, helper: "Average project completion rate" },
    { label: "Lead Conversion", value: `${conversionRate}%`, helper: "Converted leads from lead sheet" },
    { label: "Call Hit Rate", value: `${callHitRate}%`, helper: "Connected or interested calls" },
    { label: "Live Services", value: `${activeServices}`, helper: "Offers currently being pushed" },
    { label: "Team Size", value: `${team.length}`, helper: "Current rows in team sheet" },
    { label: "Shopping Queue", value: `${openShoppingItems}`, helper: "Things still left to buy" },
    { label: "Infra Coverage", value: `${healthyServers}/${infraCount}`, helper: "Healthy servers out of total infra assets" },
    { label: "Timetable Slots", value: `${timetableCellsFilled}`, helper: "Filled plan cells across the weekly timetable" }
  ];
}

export function buildBusinessSummary(sheets: Record<string, SheetData>) {
  const projects = sheets.projects?.rows ?? [];
  const leads = sheets.leads?.rows ?? [];
  const revenue = sheets.revenue?.rows ?? [];
  const team = sheets.team?.rows ?? [];
  const content = sheets.content?.rows ?? [];
  const services = sheets.services?.rows ?? [];
  const shopping = sheets.shopping?.rows ?? [];
  const servers = sheets.servers?.rows ?? [];
  const databases = sheets.databases?.rows ?? [];
  const timetable = sheets.timetable?.rows ?? [];

  const activeProjects = projects.filter((row) => toText(row.projectStatus) === "In Progress").length;
  const completedProjects = projects.filter((row) => toText(row.projectStatus) === "Completed").length;
  const followUps = leads.filter((row) => toText(row.leadStatus) === "Follow-up").length;
  const proposals = leads.filter((row) => toText(row.leadStatus) === "Proposal Sent").length;
  const converted = leads.filter((row) => toText(row.leadStatus) === "Converted").length;
  const payroll = revenue
    .filter((row) => toText(row.entryType) === "Payroll")
    .reduce((sum, row) => sum + toNumber(row.amount), 0);
  const expenses = revenue
    .filter((row) => ["Expense", "Payroll", "Personal Use"].includes(toText(row.entryType)))
    .reduce((sum, row) => sum + toNumber(row.amount), 0);
  const income = revenue
    .filter((row) => toText(row.entryType) === "Income")
    .reduce((sum, row) => sum + toNumber(row.amount), 0);
  const personalUse = revenue
    .filter((row) => toText(row.entryType) === "Personal Use")
    .reduce((sum, row) => sum + toNumber(row.amount), 0);
  const profit = income - expenses;
  const scheduledContent = content.filter((row) => ["Scheduled", "Posted"].includes(toText(row.stage))).length;
  const totalContentLeads = content.reduce((sum, row) => sum + toNumber(row.leadsGenerated), 0);
  const teamHours = team.reduce((sum, row) => sum + toNumber(row.hoursPerWeek), 0);
  const servicesDelivered = services.reduce((sum, row) => sum + toNumber(row.projectsDone), 0);
  const shoppingPending = shopping.filter((row) => ["To Buy", "Ordered"].includes(toText(row.purchaseStatus))).length;
  const companyShopping = shopping.filter((row) => toText(row.listType) === "Company").length;
  const personalShopping = shopping.filter((row) => toText(row.listType) === "Personal").length;
  const healthyServers = servers.filter((row) => toText(row.status) === "Healthy").length;
  const warningServers = servers.filter((row) => ["Warning", "Down"].includes(toText(row.status))).length;
  const timetablePlannedCells = timetable.reduce(
    (sum, row) =>
      sum +
      ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].filter((key) => toText(row[key]).trim() !== "").length,
    0
  );

  return {
    activeProjects,
    completedProjects,
    followUps,
    proposals,
    converted,
    payroll,
    expenses,
    income,
    personalUse,
    profit,
    scheduledContent,
    totalContentLeads,
    teamHours,
    servicesDelivered,
    shoppingPending,
    companyShopping,
    personalShopping,
    healthyServers,
    warningServers,
    databasesTracked: databases.length,
    timetablePlannedCells
  };
}

export function buildRevenueByCategory(sheets: Record<string, SheetData>) {
  const rows = sheets.projects?.rows ?? [];
  const totals = new Map<string, number>();

  rows
    .forEach((row) => {
      const key = toText(row.category) || "Uncategorized";
      totals.set(key, (totals.get(key) ?? 0) + toNumber(row.projectValue || row.amountReceived));
    });

  return Array.from(totals.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((left, right) => right.value - left.value);
}

export function buildRevenueBySector(sheets: Record<string, SheetData>) {
  const rows = sheets.projects?.rows ?? [];
  const totals = new Map<string, number>();

  rows.forEach((row) => {
    const key = toText(row.sector) || "Unknown";
    totals.set(key, (totals.get(key) ?? 0) + toNumber(row.amountReceived));
  });

  return Array.from(totals.entries()).map(([name, value]) => ({ name, value }));
}

export function buildProjectStatusData(sheets: Record<string, SheetData>) {
  const rows = sheets.projects?.rows ?? [];
  const totals = new Map<string, number>();

  rows.forEach((row) => {
    const key = toText(row.projectStatus) || "Unknown";
    totals.set(key, (totals.get(key) ?? 0) + 1);
  });

  return Array.from(totals.entries()).map(([name, value]) => ({ name, value }));
}

export function buildLeadStatusData(sheets: Record<string, SheetData>) {
  const rows = sheets.leads?.rows ?? [];
  const totals = new Map<string, number>();

  rows.forEach((row) => {
    const key = toText(row.leadStatus) || "Unknown";
    totals.set(key, (totals.get(key) ?? 0) + 1);
  });

  return Array.from(totals.entries()).map(([stage, value]) => ({ stage, value }));
}

export function buildMonthlyRevenue(sheets: Record<string, SheetData>) {
  const rows = sheets.projects?.rows ?? [];
  const totals = new Map<string, { revenue: number; target: number }>();
  const datedProjects = rows
    .map((row) => ({
      startDate: parseDate(row.startDate) ?? parseDate(row.deliveryDate),
      amountReceived: toNumber(row.amountReceived),
      projectValue: toNumber(row.projectValue)
    }))
    .filter((row) => row.startDate);

  if (datedProjects.length === 0) {
    return [];
  }

  datedProjects.forEach((row) => {
    const monthKey = getMonthKey(row.startDate as Date);
    const current = totals.get(monthKey) ?? { revenue: 0, target: 0 };

    totals.set(monthKey, {
      revenue: current.revenue + row.amountReceived,
      target: current.target + row.projectValue
    });
  });

  const sortedKeys = Array.from(totals.keys()).sort();
  const firstMonth = sortedKeys[0];
  const lastProjectMonth = sortedKeys[sortedKeys.length - 1];
  const now = new Date();
  const lastMonth = getMonthKey(new Date(Math.max(new Date(`${lastProjectMonth}-01`).getTime(), new Date(now.getFullYear(), now.getMonth(), 1).getTime())));
  const filled: { month: string; revenue: number; target: number }[] = [];

  let cursor = new Date(`${firstMonth}-01`);
  const end = new Date(`${lastMonth}-01`);

  while (cursor <= end) {
    const monthKey = getMonthKey(cursor);
    const current = totals.get(monthKey) ?? { revenue: 0, target: 0 };

    filled.push({
      month: formatMonthLabel(monthKey),
      revenue: current.revenue,
      target: current.target
    });

    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }

  return filled;
}

export function buildRevenueTypeData(sheets: Record<string, SheetData>) {
  const rows = sheets.revenue?.rows ?? [];
  const totals = new Map<string, number>();

  rows.forEach((row) => {
    const key = toText(row.entryType) || "Other";
    totals.set(key, (totals.get(key) ?? 0) + toNumber(row.amount));
  });

  return Array.from(totals.entries()).map(([name, value]) => ({ name, value }));
}

export function buildServiceDemandData(sheets: Record<string, SheetData>) {
  const rows = sheets.services?.rows ?? [];

  return rows.map((row) => ({
    name: toText(row.serviceName) || "Untitled",
    leads: toNumber(row.monthlyLeads),
    projects: toNumber(row.projectsDone)
  }));
}

export function buildServiceDeliveryData(sheets: Record<string, SheetData>) {
  const rows = sheets.services?.rows ?? [];

  return rows.map((row) => ({
    name: toText(row.serviceName) || "Untitled",
    days: toNumber(row.avgDeliveryDays),
    price: toNumber(row.price)
  }));
}

export function buildTeamCapacityData(sheets: Record<string, SheetData>) {
  const rows = sheets.team?.rows ?? [];

  return rows.map((row) => ({
    name: toText(row.memberName) || "Team",
    capacity: toText(row.availability) === "Available" ? 100 : toText(row.availability) === "Busy" ? 60 : 20,
    active: toText(row.availability) === "On Hold" ? 0 : 1
  }));
}

export function buildContentPerformanceData(sheets: Record<string, SheetData>) {
  const rows = sheets.content?.rows ?? [];

  return rows.map((row) => ({
    name: toText(row.contentTitle) || "Untitled",
    leads: toNumber(row.leadsGenerated)
  }));
}

export function buildShoppingStatusData(sheets: Record<string, SheetData>) {
  const rows = sheets.shopping?.rows ?? [];
  const totals = new Map<string, number>();

  rows.forEach((row) => {
    const key = toText(row.purchaseStatus) || "Unknown";
    totals.set(key, (totals.get(key) ?? 0) + 1);
  });

  return Array.from(totals.entries()).map(([name, value]) => ({ name, value }));
}

export function buildShoppingSplitData(sheets: Record<string, SheetData>) {
  const rows = sheets.shopping?.rows ?? [];
  const totals = new Map<string, number>();

  rows.forEach((row) => {
    const key = toText(row.listType) || "Unknown";
    totals.set(key, (totals.get(key) ?? 0) + 1);
  });

  return Array.from(totals.entries()).map(([name, value]) => ({ name, value }));
}

export function buildTimetableCoverageData(sheets: Record<string, SheetData>) {
  const rows = sheets.timetable?.rows ?? [];
  const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

  return days.map((day) => ({
    name: day.charAt(0).toUpperCase() + day.slice(1),
    value: rows.reduce((sum, row) => sum + (toText(row[day]).trim() !== "" ? 1 : 0), 0)
  }));
}

export function buildInfrastructureStatusData(sheets: Record<string, SheetData>) {
  const servers = sheets.servers?.rows ?? [];
  const databases = sheets.databases?.rows ?? [];

  return [
    { name: "Healthy Servers", value: servers.filter((row) => toText(row.status) === "Healthy").length },
    { name: "Server Alerts", value: servers.filter((row) => ["Warning", "Down"].includes(toText(row.status))).length },
    { name: "Databases", value: databases.length },
    { name: "Prod Infra", value: servers.filter((row) => toText(row.environment) === "Production").length }
  ];
}

export function buildInfrastructureEngineData(sheets: Record<string, SheetData>) {
  const rows = sheets.databases?.rows ?? [];
  const totals = new Map<string, number>();

  rows.forEach((row) => {
    const key = toText(row.engine) || "Unknown";
    totals.set(key, (totals.get(key) ?? 0) + 1);
  });

  return Array.from(totals.entries()).map(([name, value]) => ({ name, value }));
}

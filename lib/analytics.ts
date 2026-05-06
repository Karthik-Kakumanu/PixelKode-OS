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

export function buildDashboardMetrics(sheets: Record<string, SheetData>): DashboardMetric[] {
  const projects = sheets.projects?.rows ?? [];
  const leads = sheets.leads?.rows ?? [];
  const revenue = sheets.revenue?.rows ?? [];
  const services = sheets.services?.rows ?? [];
  const team = sheets.team?.rows ?? [];

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
    { label: "Team Size", value: `${team.length}`, helper: "Current rows in team sheet" }
  ];
}

export function buildBusinessSummary(sheets: Record<string, SheetData>) {
  const projects = sheets.projects?.rows ?? [];
  const leads = sheets.leads?.rows ?? [];
  const revenue = sheets.revenue?.rows ?? [];
  const team = sheets.team?.rows ?? [];
  const content = sheets.content?.rows ?? [];
  const services = sheets.services?.rows ?? [];

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
    servicesDelivered
  };
}

export function buildRevenueByCategory(sheets: Record<string, SheetData>) {
  const rows = sheets.revenue?.rows ?? [];
  const totals = new Map<string, number>();

  rows
    .filter((row) => toText(row.entryType) === "Income")
    .forEach((row) => {
      const key = toText(row.category) || "Uncategorized";
      totals.set(key, (totals.get(key) ?? 0) + toNumber(row.amount));
    });

  return Array.from(totals.entries()).map(([name, value]) => ({ name, value }));
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
  const rows = sheets.revenue?.rows ?? [];
  const totals = new Map<string, number>();

  rows.forEach((row) => {
    const date = toText(row.entryDate);
    const month = date ? new Date(date).toLocaleString("en-US", { month: "short" }) : "Unknown";
    const signed = ["Expense", "Payroll", "Personal Use"].includes(toText(row.entryType))
      ? -toNumber(row.amount)
      : toNumber(row.amount);
    totals.set(month, (totals.get(month) ?? 0) + signed);
  });

  return Array.from(totals.entries()).map(([month, revenue]) => ({ month, revenue, target: revenue * 0.85 }));
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
    hours: toNumber(row.hoursPerWeek),
    projects: toNumber(row.activeProjects)
  }));
}

export function buildContentPerformanceData(sheets: Record<string, SheetData>) {
  const rows = sheets.content?.rows ?? [];

  return rows.map((row) => ({
    name: toText(row.contentTitle) || "Untitled",
    leads: toNumber(row.leadsGenerated)
  }));
}

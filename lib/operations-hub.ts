import { createPdfBlob, type DocumentSection, documentPresetStorageKey } from "@/lib/document-studio";
import { parseDateValue, startOfLocalDay } from "@/lib/date";
import type { SheetData, SheetKey, SheetRow } from "@/lib/types";

export type RecurringReminder = {
  id: string;
  title: string;
  description: string;
  frequency: string;
  dueDate: string;
  tone: "high" | "medium" | "low";
};

export type ForecastItem = {
  id: string;
  projectName: string;
  clientName: string;
  amount: number;
  dueDate: string;
  status: "overdue" | "this-week" | "this-month";
};

export type CashFlowForecast = {
  expectedCollectionsThisWeek: number;
  expectedCollectionsThisMonth: number;
  pendingRiskAmount: number;
  overdueCollections: number;
  upcoming: ForecastItem[];
};

export type SearchResult = {
  id: string;
  kind: "sheet" | "document" | "collection" | "note";
  title: string;
  subtitle: string;
  href: string;
  detail: string;
};

type SavedPresetLike = {
  id: string;
  name: string;
  documentType: string;
  form?: {
    projectName?: string;
    clientBusinessName?: string;
    serviceName?: string;
    notes?: string;
  };
};

function toText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function nextOccurrence(dayOfMonth: number, reference: Date) {
  const current = new Date(reference.getFullYear(), reference.getMonth(), dayOfMonth);
  if (current >= startOfLocalDay(reference)) {
    return current;
  }
  return new Date(reference.getFullYear(), reference.getMonth() + 1, dayOfMonth);
}

function nextWeekday(targetWeekday: number, reference: Date) {
  const start = startOfLocalDay(reference);
  const currentWeekday = start.getDay();
  const distance = (targetWeekday - currentWeekday + 7) % 7;
  return addDays(start, distance === 0 ? 7 : distance);
}

function parseProjectDueDate(row: SheetRow) {
  return parseDateValue(toText(row.deliveryDate)) ?? parseDateValue(toText(row.startDate));
}

export function buildRecurringReminders(sheets: Record<SheetKey, SheetData>) {
  const today = new Date();
  const reminders: RecurringReminder[] = [];
  const pendingCollections = (sheets.projects?.rows ?? []).filter((row) => toNumber(row.pendingAmount) > 0);
  const teamRows = sheets.team?.rows ?? [];
  const revenueRows = sheets.revenue?.rows ?? [];

  if (pendingCollections.length > 0) {
    const dueDate = nextOccurrence(3, today);
    reminders.push({
      id: "recurring-invoice-follow-up",
      title: "Monthly invoice follow-up",
      description: `Review ${pendingCollections.length} pending collection${pendingCollections.length === 1 ? "" : "s"} and send payment nudges before cash flow slips.`,
      frequency: "Monthly",
      dueDate: formatDateKey(dueDate),
      tone: "medium"
    });
  }

  if (teamRows.length > 0) {
    const dueDate = nextWeekday(5, today);
    reminders.push({
      id: "recurring-team-review",
      title: "Weekly team review",
      description: `Check workload, blockers, and capacity across ${teamRows.length} active team row${teamRows.length === 1 ? "" : "s"}.`,
      frequency: "Weekly",
      dueDate: formatDateKey(dueDate),
      tone: "low"
    });
  }

  if (revenueRows.length > 0) {
    const dueDate = nextOccurrence(25, today);
    reminders.push({
      id: "recurring-gst-prep",
      title: "Monthly GST / accounting prep",
      description: "Review revenue, expenses, and supporting notes so accounting stays current before month close.",
      frequency: "Monthly",
      dueDate: formatDateKey(dueDate),
      tone: "medium"
    });
  }

  if (teamRows.length > 0 || revenueRows.some((row) => toText(row.entryType) === "Payroll")) {
    const dueDate = nextOccurrence(28, today);
    reminders.push({
      id: "recurring-payroll",
      title: "Recurring payroll reminder",
      description: "Confirm payroll totals, approvals, and payout readiness before salary processing day.",
      frequency: "Monthly",
      dueDate: formatDateKey(dueDate),
      tone: "high"
    });
  }

  return reminders.sort((left, right) => new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime());
}

export function buildCashFlowForecast(sheets: Record<SheetKey, SheetData>): CashFlowForecast {
  const today = startOfLocalDay(new Date());
  const weekEnd = addDays(today, 7);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const projects = sheets.projects?.rows ?? [];

  const upcoming: ForecastItem[] = [];
  let expectedCollectionsThisWeek = 0;
  let expectedCollectionsThisMonth = 0;
  let pendingRiskAmount = 0;
  let overdueCollections = 0;

  projects.forEach((row) => {
    const pendingAmount = toNumber(row.pendingAmount);
    if (pendingAmount <= 0) return;

    const dueDate = parseProjectDueDate(row);
    const dueDateKey = dueDate ? formatDateKey(dueDate) : "No due date";
    const projectName = toText(row.projectName) || "Untitled project";
    const clientName = toText(row.clientName) || "Unknown client";

    if (!dueDate) {
      pendingRiskAmount += pendingAmount;
      return;
    }

    if (dueDate < today) {
      overdueCollections += pendingAmount;
      pendingRiskAmount += pendingAmount;
      upcoming.push({
        id: `${toText(row.id)}-overdue`,
        projectName,
        clientName,
        amount: pendingAmount,
        dueDate: dueDateKey,
        status: "overdue"
      });
      return;
    }

    if (dueDate <= weekEnd) {
      expectedCollectionsThisWeek += pendingAmount;
      expectedCollectionsThisMonth += pendingAmount;
      upcoming.push({
        id: `${toText(row.id)}-week`,
        projectName,
        clientName,
        amount: pendingAmount,
        dueDate: dueDateKey,
        status: "this-week"
      });
      return;
    }

    if (dueDate <= monthEnd) {
      expectedCollectionsThisMonth += pendingAmount;
      upcoming.push({
        id: `${toText(row.id)}-month`,
        projectName,
        clientName,
        amount: pendingAmount,
        dueDate: dueDateKey,
        status: "this-month"
      });
    }
  });

  return {
    expectedCollectionsThisWeek,
    expectedCollectionsThisMonth,
    pendingRiskAmount,
    overdueCollections,
    upcoming: upcoming.sort((left, right) => {
      const leftScore = left.status === "overdue" ? 0 : left.status === "this-week" ? 1 : 2;
      const rightScore = right.status === "overdue" ? 0 : right.status === "this-week" ? 1 : 2;
      if (leftScore !== rightScore) return leftScore - rightScore;
      return left.dueDate.localeCompare(right.dueDate);
    })
  };
}

const searchSourceMeta: Record<SheetKey, { label: string; href: string; titleField: string }> = {
  projects: { label: "Projects", href: "/projects", titleField: "projectName" },
  leads: { label: "Leads", href: "/leads", titleField: "businessName" },
  revenue: { label: "Revenue", href: "/revenue", titleField: "sourceName" },
  team: { label: "Team", href: "/team", titleField: "memberName" },
  content: { label: "Content", href: "/content", titleField: "contentTitle" },
  services: { label: "Services", href: "/services", titleField: "serviceName" },
  shopping: { label: "Shopping", href: "/shopping", titleField: "itemName" },
  timetable: { label: "Timetable", href: "/timetable", titleField: "slotLabel" },
  servers: { label: "Servers", href: "/servers", titleField: "serverName" },
  databases: { label: "Databases", href: "/databases", titleField: "dbName" }
};

export function searchWorkspace(
  sheets: Record<SheetKey, SheetData>,
  query: string,
  documentPresets: SavedPresetLike[] = []
) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [] as SearchResult[];

  const results: SearchResult[] = [];

  (Object.keys(searchSourceMeta) as SheetKey[]).forEach((sheetKey) => {
    const sheet = sheets[sheetKey];
    if (!sheet) return;

    sheet.rows.forEach((row, rowIndex) => {
      const matchingFields = sheet.columns.filter((column) => String(row[column.id] ?? "").toLowerCase().includes(normalized));
      if (matchingFields.length === 0) return;

      const meta = searchSourceMeta[sheetKey];
      const title = toText(row[meta.titleField]) || `${meta.label} row ${rowIndex + 1}`;
      const detail = matchingFields
        .slice(0, 3)
        .map((field) => `${field.label}: ${String(row[field.id] ?? "")}`)
        .join(" • ");
      const matchedNotes = matchingFields.some((field) => field.id.toLowerCase().includes("note"));

      results.push({
        id: `${sheetKey}-${toText(row.id) || rowIndex}`,
        kind: matchedNotes ? "note" : "sheet",
        title,
        subtitle: meta.label,
        href: meta.href,
        detail
      });
    });
  });

  (sheets.projects?.rows ?? [])
    .filter((row) => toNumber(row.pendingAmount) > 0)
    .forEach((row, index) => {
      const searchable = `${toText(row.projectName)} ${toText(row.clientName)} ${toText(row.notes)}`.toLowerCase();
      if (!searchable.includes(normalized)) return;

      results.push({
        id: `collection-${toText(row.id) || index}`,
        kind: "collection",
        title: toText(row.projectName) || "Pending collection",
        subtitle: "Collections",
        href: "/collections",
        detail: `${toText(row.clientName) || "Unknown client"} • Pending INR ${toNumber(row.pendingAmount).toLocaleString("en-IN")}`
      });
    });

  documentPresets.forEach((preset) => {
    const searchable = [
      preset.name,
      preset.documentType,
      preset.form?.projectName,
      preset.form?.clientBusinessName,
      preset.form?.serviceName,
      preset.form?.notes
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (!searchable.includes(normalized)) return;

    results.push({
      id: `document-${preset.id}`,
      kind: "document",
      title: preset.name,
      subtitle: `Documents • ${preset.documentType}`,
      href: "/documents",
      detail: `${preset.form?.projectName || "No project"} • ${preset.form?.clientBusinessName || "No client"}`
    });
  });

  return results.slice(0, 40);
}

function escapeCsv(value: string | number) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, "\"\"")}"`;
  }
  return text;
}

export function buildSheetCsv(sheetName: string, sheet: SheetData) {
  const header = ["id", ...sheet.columns.map((column) => column.label)];
  const rows = sheet.rows.map((row) => [
    toText(row.id),
    ...sheet.columns.map((column) => escapeCsv(String(row[column.id] ?? "")))
  ]);

  return [header.map(escapeCsv).join(","), ...rows.map((row) => row.join(","))].join("\n");
}

export function buildWorkbookHtml(sheets: Record<SheetKey, SheetData>) {
  const tables = (Object.keys(searchSourceMeta) as SheetKey[])
    .map((sheetKey) => {
      const sheet = sheets[sheetKey];
      const meta = searchSourceMeta[sheetKey];
      const header = ["ID", ...sheet.columns.map((column) => column.label)];
      const body = sheet.rows
        .map(
          (row) =>
            `<tr>${[toText(row.id), ...sheet.columns.map((column) => String(row[column.id] ?? ""))]
              .map((cell) => `<td>${String(cell).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>`)
              .join("")}</tr>`
        )
        .join("");

      return `
        <h2>${meta.label}</h2>
        <table border="1" cellspacing="0" cellpadding="6">
          <thead><tr>${header.map((cell) => `<th>${cell}</th>`).join("")}</tr></thead>
          <tbody>${body}</tbody>
        </table>
      `;
    })
    .join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8" /><title>PixelKode OS Export</title></head><body>${tables}</body></html>`;
}

export function buildOperationsReportPdf(sheets: Record<SheetKey, SheetData>) {
  const forecast = buildCashFlowForecast(sheets);
  const reminders = buildRecurringReminders(sheets);
  const sections: DocumentSection[] = [
    {
      heading: "Realtime Operations Snapshot",
      lines: [
        `Expected collections this week: INR ${forecast.expectedCollectionsThisWeek.toLocaleString("en-IN")}`,
        `Expected collections this month: INR ${forecast.expectedCollectionsThisMonth.toLocaleString("en-IN")}`,
        `Pending risk amount: INR ${forecast.pendingRiskAmount.toLocaleString("en-IN")}`,
        `Overdue collections: INR ${forecast.overdueCollections.toLocaleString("en-IN")}`
      ]
    },
    {
      heading: "Recurring Reminders",
      lines: reminders.map((reminder) => `${reminder.title} - ${reminder.dueDate} (${reminder.frequency})`)
    },
    {
      heading: "Upcoming Collections",
      lines:
        forecast.upcoming.length > 0
          ? forecast.upcoming.map(
              (item) => `${item.projectName} (${item.clientName}) - INR ${item.amount.toLocaleString("en-IN")} due ${item.dueDate}`
            )
          : ["No upcoming collection commitments are currently scheduled."]
    }
  ];

  return createPdfBlob("PixelKode OS Realtime Operations Report", sections);
}

export function buildClientPaymentHistory(sheets: Record<SheetKey, SheetData>, clientName: string) {
  const normalizedClient = clientName.trim().toLowerCase();
  const matchingProjects = (sheets.projects?.rows ?? []).filter(
    (row) =>
      toText(row.clientName).toLowerCase().includes(normalizedClient) ||
      toText(row.projectName).toLowerCase().includes(normalizedClient)
  );
  const projectNames = new Set(matchingProjects.map((row) => toText(row.projectName).toLowerCase()));
  const revenueEntries = (sheets.revenue?.rows ?? []).filter(
    (row) =>
      toText(row.entryType) === "Income" &&
      (toText(row.sourceName).toLowerCase().includes(normalizedClient) || projectNames.has(toText(row.sourceName).toLowerCase()))
  );

  return {
    matchingProjects,
    revenueEntries
  };
}

export function readDocumentPresets() {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") return [] as SavedPresetLike[];

  try {
    const raw = window.localStorage.getItem(documentPresetStorageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as SavedPresetLike[]) : [];
  } catch {
    return [];
  }
}

import { buildDashboardMetrics } from "@/lib/analytics";
import { deriveOperationalAlerts } from "@/lib/operations";
import { sheetTitles } from "@/lib/data";
import type { OperationAlert, SheetData, SheetKey } from "@/lib/types";

type MeetHistoryRecord = {
  id: string;
  title: string;
  mode: "instant" | "scheduled";
  attendeeEmail: string | null;
  hostEmail: string | null;
  meetLink: string;
  calendarLink: string | null;
  createdAt: string;
  scheduledAt: string | null;
};

function compactRows(rows: Record<string, unknown>[], limit = 12) {
  return rows.slice(0, limit);
}

export function buildAIWorkspaceContext(
  sheets: Record<SheetKey, SheetData>,
  meetHistory: MeetHistoryRecord[] = [],
  alerts?: OperationAlert[]
) {
  const derivedAlerts = alerts ?? deriveOperationalAlerts(sheets);
  const metrics = buildDashboardMetrics(sheets);

  const sheetSummaries = (Object.keys(sheets) as SheetKey[]).map((sheetKey) => {
    const sheet = sheets[sheetKey];
    const meta = sheetTitles[sheetKey];

    return {
      sheetKey,
      title: meta.title,
      description: meta.description,
      columns: sheet.columns.map((column) => ({
        id: column.id,
        label: column.label,
        type: column.type
      })),
      rowCount: sheet.rows.length,
      rows: compactRows(sheet.rows)
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    metrics,
    alerts: derivedAlerts.slice(0, 20),
    meetHistory: compactRows(meetHistory, 8),
    sheets: sheetSummaries
  };
}

export function buildAssistantSystemPrompt() {
  return [
    "You are the business copilot inside PixelKode OS.",
    "You analyze the user's real workspace data across projects, leads, revenue, timetable, services, content, team, shopping, servers, databases, alerts, and meeting history.",
    "Prioritize concrete business analysis, automation opportunities, risks, cash flow, delivery bottlenecks, lead conversion, scheduling issues, service demand, infra issues, and next actions.",
    "When the user asks for analysis, cover the entire workspace, not just one sheet, unless they clearly scope the request.",
    "Be direct, structured, practical, and concise.",
    "If data is missing, say that clearly instead of inventing it.",
    "If the user asks for content ideas, provide strong business-relevant ideas tailored to the current data.",
    "If the user asks what to do next, give prioritized action steps."
  ].join(" ");
}

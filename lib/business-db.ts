import { db } from "@/lib/db";
import { createDefaultSheets } from "@/lib/data";
import type { CellValue, ColumnType, SheetColumn, SheetData, SheetKey, SheetRow } from "@/lib/types";

const DEFAULT_STATE_ID = "pixelkode-main";

type BusinessSheets = ReturnType<typeof createDefaultSheets>;
const validColumnTypes = new Set<ColumnType>(["text", "number", "date", "select", "textarea"]);
const legacyTeamColumnIds = new Set(["activeProjects", "monthlyPayout", "hoursPerWeek"]);

declare global {
  // eslint-disable-next-line no-var
  var __pixelkodeFallbackSheets: BusinessSheets | undefined;
}

function sanitizeText(value: unknown, fallback = "") {
  if (typeof value !== "string") return fallback;
  return value.trim();
}

function sanitizeCellValue(value: unknown, type: ColumnType): CellValue {
  if (type === "number") {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
    return 0;
  }

  if (typeof value === "boolean") {
    return value;
  }

  return typeof value === "string" ? value : "";
}

function normalizeColumn(column: unknown, index: number): SheetColumn | null {
  if (!column || typeof column !== "object") return null;

  const candidate = column as Record<string, unknown>;
  const id = sanitizeText(candidate.id, `column_${index + 1}`).replace(/[^a-zA-Z0-9_]/g, "_");
  const label = sanitizeText(candidate.label, `Column ${index + 1}`);
  const type = validColumnTypes.has(candidate.type as ColumnType) ? (candidate.type as ColumnType) : "text";
  const options =
    type === "select" && Array.isArray(candidate.options)
      ? candidate.options.map((option) => sanitizeText(option)).filter(Boolean)
      : undefined;
  const width = typeof candidate.width === "string" && /^\d+px$/.test(candidate.width) ? candidate.width : undefined;

  return {
    id,
    label,
    type,
    options,
    width
  };
}

function normalizeRow(row: unknown, columns: SheetColumn[], index: number): SheetRow {
  const candidate = row && typeof row === "object" ? (row as Record<string, unknown>) : {};
  const normalized: SheetRow = {
    id: sanitizeText(candidate.id, `row_${index + 1}`)
  };

  columns.forEach((column) => {
    if (column.id === "id") return;
    normalized[column.id] = sanitizeCellValue(candidate[column.id], column.type);
  });

  return normalized;
}

function normalizeSheet(sheet: unknown, fallback: SheetData): SheetData {
  if (!sheet || typeof sheet !== "object") {
    return fallback;
  }

  const candidate = sheet as Record<string, unknown>;
  const columns =
    Array.isArray(candidate.columns) && candidate.columns.length > 0
      ? candidate.columns
          .map((column, index) => normalizeColumn(column, index))
          .filter((column): column is SheetColumn => column !== null)
      : fallback.columns;

  const rows = Array.isArray(candidate.rows)
    ? candidate.rows.map((row, index) => normalizeRow(row, columns, index))
    : fallback.rows;

  return {
    columns: columns.length > 0 ? columns : fallback.columns,
    rows
  };
}

function stripLegacyTeamFields(sheet: SheetData): SheetData {
  const columns = sheet.columns.filter((column) => !legacyTeamColumnIds.has(column.id));
  const rows = sheet.rows.map((row) => {
    const nextRow = { ...row };

    legacyTeamColumnIds.forEach((columnId) => {
      delete nextRow[columnId];
    });

    return nextRow;
  });

  return {
    columns,
    rows
  };
}

function normalizeSheets(input: unknown): BusinessSheets {
  const fallback = createDefaultSheets();

  if (!input || typeof input !== "object") {
    return fallback;
  }

  const candidate = input as Record<string, unknown>;
  const team = stripLegacyTeamFields(normalizeSheet(candidate.team, fallback.team));

  return {
    projects: normalizeSheet(candidate.projects, fallback.projects),
    leads: normalizeSheet(candidate.leads, fallback.leads),
    revenue: normalizeSheet(candidate.revenue, fallback.revenue),
    team,
    content: normalizeSheet(candidate.content, fallback.content),
    services: normalizeSheet(candidate.services, fallback.services),
    servers: normalizeSheet(candidate.servers, fallback.servers),
    databases: normalizeSheet(candidate.databases, fallback.databases)
  };
}

export function assertDatabaseConfigured() {
  if (!db) {
    throw new Error("DATABASE_URL is not configured.");
  }
}

export function validateSheetPayload(input: unknown): asserts input is { sheets: Record<SheetKey, SheetData> } {
  if (!input || typeof input !== "object" || !("sheets" in input)) {
    throw new Error("Invalid request payload.");
  }
}

export async function ensureBusinessStateTable() {
  if (!db) return;

  await db.query(`
    create table if not exists business_state (
      id text primary key,
      sheets jsonb not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);
}

export async function getBusinessState() {
  if (!db) {
    global.__pixelkodeFallbackSheets ??= createDefaultSheets();
    return normalizeSheets(global.__pixelkodeFallbackSheets);
  }

  await ensureBusinessStateTable();

  const existing = await db.query("select sheets from business_state where id = $1 limit 1", [DEFAULT_STATE_ID]);

  if (existing.rowCount && existing.rows[0]?.sheets) {
    return normalizeSheets(existing.rows[0].sheets);
  }

  const sheets = createDefaultSheets();

  await db.query(
    `
      insert into business_state (id, sheets)
      values ($1, $2::jsonb)
      on conflict (id) do nothing
    `,
    [DEFAULT_STATE_ID, JSON.stringify(sheets)]
  );

  return sheets;
}

export async function saveBusinessState(sheets: unknown) {
  if (!db) {
    const normalized = normalizeSheets(sheets);
    global.__pixelkodeFallbackSheets = normalized;
    return normalized;
  }

  await ensureBusinessStateTable();

  const normalized = normalizeSheets(sheets);

  await db.query(
    `
      insert into business_state (id, sheets, updated_at)
      values ($1, $2::jsonb, now())
      on conflict (id) do update
      set sheets = excluded.sheets,
          updated_at = now()
    `,
    [DEFAULT_STATE_ID, JSON.stringify(normalized)]
  );

  return normalized;
}

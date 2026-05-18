import { db } from "@/lib/db";
import { createDefaultSheets, normalizeTimetableSheet } from "@/lib/data";
import type { CellValue, ColumnType, SheetColumn, SheetData, SheetKey, SheetRow } from "@/lib/types";

const DEFAULT_STATE_ID = "pixelkode-main";
const META_TABLE = "business_sheet_meta";
const SHEET_KEYS: SheetKey[] = [
  "projects",
  "leads",
  "revenue",
  "team",
  "content",
  "services",
  "shopping",
  "timetable",
  "servers",
  "databases"
];

const SHEET_STORAGE: Record<
  SheetKey,
  { columnsTable: string; rowsTable: string; cellsTable: string }
> = {
  projects: {
    columnsTable: "business_projects_columns",
    rowsTable: "business_projects_rows",
    cellsTable: "business_projects_cells"
  },
  leads: {
    columnsTable: "business_leads_columns",
    rowsTable: "business_leads_rows",
    cellsTable: "business_leads_cells"
  },
  revenue: {
    columnsTable: "business_revenue_columns",
    rowsTable: "business_revenue_rows",
    cellsTable: "business_revenue_cells"
  },
  team: {
    columnsTable: "business_team_columns",
    rowsTable: "business_team_rows",
    cellsTable: "business_team_cells"
  },
  content: {
    columnsTable: "business_content_columns",
    rowsTable: "business_content_rows",
    cellsTable: "business_content_cells"
  },
  services: {
    columnsTable: "business_services_columns",
    rowsTable: "business_services_rows",
    cellsTable: "business_services_cells"
  },
  shopping: {
    columnsTable: "business_shopping_columns",
    rowsTable: "business_shopping_rows",
    cellsTable: "business_shopping_cells"
  },
  timetable: {
    columnsTable: "business_timetable_columns",
    rowsTable: "business_timetable_rows",
    cellsTable: "business_timetable_cells"
  },
  servers: {
    columnsTable: "business_servers_columns",
    rowsTable: "business_servers_rows",
    cellsTable: "business_servers_cells"
  },
  databases: {
    columnsTable: "business_databases_columns",
    rowsTable: "business_databases_rows",
    cellsTable: "business_databases_cells"
  }
};

const LEGACY_JSON_TABLES: Record<SheetKey, string> = {
  projects: "business_projects",
  leads: "business_leads",
  revenue: "business_revenue",
  team: "business_team",
  content: "business_content",
  services: "business_services",
  shopping: "business_shopping",
  timetable: "business_timetable",
  servers: "business_servers",
  databases: "business_databases"
};

type BusinessSheets = ReturnType<typeof createDefaultSheets>;

export type BusinessStateRecord = {
  sheets: BusinessSheets;
  version: number;
  updatedAt: string | null;
};

type Queryable = {
  query: (text: string, params?: unknown[]) => Promise<{ rowCount: number; rows: Record<string, unknown>[] }>;
};

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

function normalizeSheet(sheet: unknown, fallback: SheetData, sheetKey: SheetKey): SheetData {
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

  const seenIds = new Set<string>();
  const rows = Array.isArray(candidate.rows)
    ? candidate.rows
        .map((row, index) => normalizeRow(row, columns, index))
        .map((row) => {
          let id = sanitizeText(row.id);

          if (!id || seenIds.has(id)) {
            id = `${sheetKey}-${crypto.randomUUID()}`;
          }

          seenIds.add(id);

          return {
            ...row,
            id
          };
        })
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
  const team = stripLegacyTeamFields(normalizeSheet(candidate.team, fallback.team, "team"));

  return {
    projects: normalizeSheet(candidate.projects, fallback.projects, "projects"),
    leads: normalizeSheet(candidate.leads, fallback.leads, "leads"),
    revenue: normalizeSheet(candidate.revenue, fallback.revenue, "revenue"),
    team,
    content: normalizeSheet(candidate.content, fallback.content, "content"),
    services: normalizeSheet(candidate.services, fallback.services, "services"),
    shopping: normalizeSheet(candidate.shopping, fallback.shopping, "shopping"),
    timetable: normalizeTimetableSheet(normalizeSheet(candidate.timetable, fallback.timetable, "timetable")),
    servers: normalizeSheet(candidate.servers, fallback.servers, "servers"),
    databases: normalizeSheet(candidate.databases, fallback.databases, "databases")
  };
}

function maxIsoDate(left: string | null, right: string | null) {
  if (!left) return right;
  if (!right) return left;
  return new Date(left).getTime() >= new Date(right).getTime() ? left : right;
}

function serializeCellValue(value: CellValue) {
  if (typeof value === "number") {
    return {
      valueText: null,
      valueNumber: value,
      valueBoolean: null,
      valueKind: "number"
    };
  }

  if (typeof value === "boolean") {
    return {
      valueText: null,
      valueNumber: null,
      valueBoolean: value,
      valueKind: "boolean"
    };
  }

  return {
    valueText: String(value),
    valueNumber: null,
    valueBoolean: null,
    valueKind: "text"
  };
}

function deserializeCellValue(row: Record<string, unknown>): CellValue {
  const kind = String(row.value_kind ?? "text");

  if (kind === "number") {
    return typeof row.value_number === "number" ? row.value_number : Number(row.value_number ?? 0);
  }

  if (kind === "boolean") {
    return Boolean(row.value_boolean);
  }

  return String(row.value_text ?? "");
}

async function tableExists(queryable: Queryable, tableName: string) {
  const result = await queryable.query(
    `
      select exists (
        select 1
        from information_schema.tables
        where table_schema = 'public' and table_name = $1
      ) as exists
    `,
    [tableName]
  );

  return Boolean(result.rows[0]?.exists);
}

async function columnExists(queryable: Queryable, tableName: string, columnName: string) {
  const result = await queryable.query(
    `
      select exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = $1
          and column_name = $2
      ) as exists
    `,
    [tableName, columnName]
  );

  return Boolean(result.rows[0]?.exists);
}

async function ensureMetaTable(queryable: Queryable) {
  await queryable.query(`
    create table if not exists ${META_TABLE} (
      sheet_key text primary key,
      version bigint not null default 1,
      migrated_from_legacy boolean not null default false,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);
}

async function ensureSectorTables(queryable: Queryable, sheetKey: SheetKey) {
  const storage = SHEET_STORAGE[sheetKey];

  await queryable.query(`
    create table if not exists ${storage.columnsTable} (
      sheet_id text not null,
      column_id text not null,
      label text not null,
      type text not null,
      options_text text,
      width text,
      position integer not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      primary key (sheet_id, column_id)
    )
  `);

  await queryable.query(`
    create table if not exists ${storage.rowsTable} (
      sheet_id text not null,
      row_id text not null,
      position integer not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      primary key (sheet_id, row_id)
    )
  `);

  await queryable.query(`
    create table if not exists ${storage.cellsTable} (
      sheet_id text not null,
      row_id text not null,
      column_id text not null,
      value_text text,
      value_number double precision,
      value_boolean boolean,
      value_kind text not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      primary key (sheet_id, row_id, column_id)
    )
  `);
}

async function ensureAllTables(queryable: Queryable) {
  await ensureMetaTable(queryable);

  for (const sheetKey of SHEET_KEYS) {
    await ensureSectorTables(queryable, sheetKey);
  }
}

async function readLegacyBusinessState(queryable: Queryable) {
  if (!(await tableExists(queryable, "business_state"))) return null;

  const existing = await queryable.query("select sheets, version, updated_at from business_state where id = $1 limit 1", [DEFAULT_STATE_ID]);
  if (!existing.rowCount || !existing.rows[0]?.sheets) {
    return null;
  }

  return {
    sheets: normalizeSheets(existing.rows[0].sheets),
    version: Number(existing.rows[0].version ?? 1),
    updatedAt: existing.rows[0].updated_at instanceof Date ? existing.rows[0].updated_at.toISOString() : null
  } satisfies BusinessStateRecord;
}

async function writeSheetSnapshot(
  queryable: Queryable,
  sheetKey: SheetKey,
  sheet: SheetData,
  options?: { setVersion?: number; migratedFromLegacy?: boolean }
) {
  const storage = SHEET_STORAGE[sheetKey];

  await queryable.query(`delete from ${storage.cellsTable} where sheet_id = $1`, [DEFAULT_STATE_ID]);
  await queryable.query(`delete from ${storage.rowsTable} where sheet_id = $1`, [DEFAULT_STATE_ID]);
  await queryable.query(`delete from ${storage.columnsTable} where sheet_id = $1`, [DEFAULT_STATE_ID]);

  for (const [index, column] of sheet.columns.entries()) {
    await queryable.query(
      `
        insert into ${storage.columnsTable}
          (sheet_id, column_id, label, type, options_text, width, position)
        values ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        DEFAULT_STATE_ID,
        column.id,
        column.label,
        column.type,
        column.options?.join("||") ?? null,
        column.width ?? null,
        index
      ]
    );
  }

  for (const [rowIndex, row] of sheet.rows.entries()) {
    const rowId = String(row.id);
    await queryable.query(
      `
        insert into ${storage.rowsTable} (sheet_id, row_id, position)
        values ($1, $2, $3)
      `,
      [DEFAULT_STATE_ID, rowId, rowIndex]
    );

    for (const column of sheet.columns) {
      if (column.id === "id") continue;
      const serialized = serializeCellValue((row[column.id] ?? (column.type === "number" ? 0 : "")) as CellValue);

      await queryable.query(
        `
          insert into ${storage.cellsTable}
            (sheet_id, row_id, column_id, value_text, value_number, value_boolean, value_kind)
          values ($1, $2, $3, $4, $5, $6, $7)
        `,
        [
          DEFAULT_STATE_ID,
          rowId,
          column.id,
          serialized.valueText,
          serialized.valueNumber,
          serialized.valueBoolean,
          serialized.valueKind
        ]
      );
    }
  }

  if (typeof options?.setVersion === "number") {
    await queryable.query(
      `
        insert into ${META_TABLE} (sheet_key, version, migrated_from_legacy, updated_at)
        values ($1, $2, $3, now())
        on conflict (sheet_key) do update
        set version = excluded.version,
            migrated_from_legacy = excluded.migrated_from_legacy,
            updated_at = now()
      `,
      [sheetKey, options.setVersion, Boolean(options.migratedFromLegacy)]
    );
    return {
      version: options.setVersion,
      updatedAt: new Date().toISOString()
    };
  }

  const meta = await queryable.query(
    `
      insert into ${META_TABLE} (sheet_key, version, migrated_from_legacy, updated_at)
      values ($1, 1, false, now())
      on conflict (sheet_key) do update
      set version = ${META_TABLE}.version + 1,
          migrated_from_legacy = false,
          updated_at = now()
      returning version, updated_at
    `,
    [sheetKey]
  );

  return {
    version: Number(meta.rows[0]?.version ?? 1),
    updatedAt: meta.rows[0]?.updated_at instanceof Date ? meta.rows[0].updated_at.toISOString() : new Date().toISOString()
  };
}

async function readSheetSnapshot(queryable: Queryable, sheetKey: SheetKey, fallback: SheetData) {
  const storage = SHEET_STORAGE[sheetKey];
  const columnsResult = await queryable.query(
    `
      select column_id, label, type, options_text, width
      from ${storage.columnsTable}
      where sheet_id = $1
      order by position asc
    `,
    [DEFAULT_STATE_ID]
  );

  const rowsResult = await queryable.query(
    `
      select row_id
      from ${storage.rowsTable}
      where sheet_id = $1
      order by position asc
    `,
    [DEFAULT_STATE_ID]
  );

  const cellsResult = await queryable.query(
    `
      select row_id, column_id, value_text, value_number, value_boolean, value_kind
      from ${storage.cellsTable}
      where sheet_id = $1
    `,
    [DEFAULT_STATE_ID]
  );

  const columns =
    columnsResult.rows.length > 0
      ? columnsResult.rows.map((row, index) => ({
          id: String(row.column_id),
          label: String(row.label),
          type: validColumnTypes.has(row.type as ColumnType) ? (row.type as ColumnType) : normalizeColumn({ type: row.type, id: row.column_id, label: row.label }, index)?.type ?? "text",
          options: typeof row.options_text === "string" && row.options_text ? row.options_text.split("||").filter(Boolean) : undefined,
          width: typeof row.width === "string" && row.width ? row.width : undefined
        }))
      : fallback.columns;

  const cellMap = new Map<string, CellValue>();
  cellsResult.rows.forEach((row) => {
    cellMap.set(`${String(row.row_id)}::${String(row.column_id)}`, deserializeCellValue(row));
  });

  const rows =
    rowsResult.rows.length > 0
      ? rowsResult.rows.map((row, index) => {
          const normalizedRow: SheetRow = {
            id: String(row.row_id ?? `row_${index + 1}`)
          };

          columns.forEach((column) => {
            if (column.id === "id") return;
            const cellKey = `${normalizedRow.id}::${column.id}`;
            normalizedRow[column.id] = cellMap.has(cellKey)
              ? (cellMap.get(cellKey) as CellValue)
              : column.type === "number"
                ? 0
                : "";
          });

          return normalizedRow;
        })
      : fallback.rows;

  return normalizeSheet({ columns, rows }, fallback, sheetKey);
}

async function migrateLegacyBusinessStateIfNeeded(queryable: Queryable) {
  await ensureAllTables(queryable);

  const metaCount = await queryable.query(`select count(*)::int as count from ${META_TABLE}`);
  if (Number(metaCount.rows[0]?.count ?? 0) >= SHEET_KEYS.length) {
    return;
  }

  const defaults = createDefaultSheets();
  const legacyState = await readLegacyBusinessState(queryable);
  const sourceSheets = legacyState?.sheets ?? defaults;
  const legacyVersion = legacyState?.version ?? 1;

  for (const sheetKey of SHEET_KEYS) {
    const meta = await queryable.query(`select 1 from ${META_TABLE} where sheet_key = $1 limit 1`, [sheetKey]);
    if (meta.rowCount) {
      continue;
    }

    await writeSheetSnapshot(queryable, sheetKey, sourceSheets[sheetKey] ?? defaults[sheetKey], {
      setVersion: legacyVersion,
      migratedFromLegacy: Boolean(legacyState)
    });
  }
}

async function archiveLegacyJsonTablesIfPresent(queryable: Queryable) {
  if (!(await tableExists(queryable, META_TABLE))) {
    return;
  }

  const metaCount = await queryable.query(`select count(*)::int as count from ${META_TABLE}`);
  if (Number(metaCount.rows[0]?.count ?? 0) < SHEET_KEYS.length) {
    return;
  }

  if (await tableExists(queryable, "business_state")) {
    const archiveName = "legacy_business_state_json";
    const archiveExists = await tableExists(queryable, archiveName);

    if (!archiveExists) {
      await queryable.query(`alter table business_state rename to ${archiveName}`);
    }
  }

  for (const sheetKey of SHEET_KEYS) {
    const legacyTable = LEGACY_JSON_TABLES[sheetKey];
    const archiveTable = `legacy_${legacyTable}_json`;

    if (!(await tableExists(queryable, legacyTable))) {
      continue;
    }

    // Only archive the old JSON-shaped tables, never the new normalized tables.
    if (!(await columnExists(queryable, legacyTable, "sheet_columns")) || !(await columnExists(queryable, legacyTable, "sheet_rows"))) {
      continue;
    }

    if (await tableExists(queryable, archiveTable)) {
      continue;
    }

    await queryable.query(`alter table ${legacyTable} rename to ${archiveTable}`);
  }
}

async function readAllSheetsFromTables() {
  if (!db) {
    global.__pixelkodeFallbackSheets ??= createDefaultSheets();
    return {
      sheets: normalizeSheets(global.__pixelkodeFallbackSheets),
      version: 1,
      updatedAt: null
    } satisfies BusinessStateRecord;
  }

  const client = await db.connect();

  try {
    await migrateLegacyBusinessStateIfNeeded(client);
    await archiveLegacyJsonTablesIfPresent(client);

    const defaults = createDefaultSheets();
    const sheets = createDefaultSheets();
    let version = 0;
    let updatedAt: string | null = null;

    for (const sheetKey of SHEET_KEYS) {
      sheets[sheetKey] = await readSheetSnapshot(client, sheetKey, defaults[sheetKey]);
    }

    const meta = await client.query(
      `
        select sheet_key, version, updated_at
        from ${META_TABLE}
        where sheet_key = any($1::text[])
      `,
      [SHEET_KEYS]
    );

    meta.rows.forEach((row) => {
      version += Number(row.version ?? 1);
      updatedAt = maxIsoDate(updatedAt, row.updated_at instanceof Date ? row.updated_at.toISOString() : null);
    });

    sheets.timetable = normalizeTimetableSheet(sheets.timetable);

    return {
      sheets,
      version,
      updatedAt
    } satisfies BusinessStateRecord;
  } finally {
    client.release();
  }
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

export async function getBusinessState() {
  return readAllSheetsFromTables();
}

export async function saveBusinessState(sheets: unknown) {
  const normalized = normalizeSheets(sheets);

  if (!db) {
    global.__pixelkodeFallbackSheets = normalized;
    return {
      sheets: normalized,
      version: 1,
      updatedAt: null
    } satisfies BusinessStateRecord;
  }

  const client = await db.connect();

  try {
    await client.query("begin");
    await migrateLegacyBusinessStateIfNeeded(client);
    await archiveLegacyJsonTablesIfPresent(client);

    let version = 0;
    let updatedAt: string | null = null;

    for (const sheetKey of SHEET_KEYS) {
      const meta = await writeSheetSnapshot(client, sheetKey, normalized[sheetKey]);
      version += meta.version;
      updatedAt = maxIsoDate(updatedAt, meta.updatedAt);
    }

    await client.query("commit");

    return {
      sheets: normalized,
      version,
      updatedAt
    } satisfies BusinessStateRecord;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

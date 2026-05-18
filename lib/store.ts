"use client";

import { create } from "zustand";

import { createBackupSnapshot, maybeCreateAutoBackup, readBackups, type BackupSnapshot } from "@/lib/backup-manager";
import { createDefaultSheets, normalizeTimetableSheet, timetableDayColumnIds } from "@/lib/data";
import { formatLocalDateKey, getUpcomingSaturdayDateKey } from "@/lib/date";
import { deriveOperationalAlerts } from "@/lib/operations";
import type { CellValue, OperationAlert, SheetColumn, SheetData, SheetKey, SheetRow } from "@/lib/types";

interface BusinessStore {
  sheets: Record<SheetKey, SheetData>;
  alerts: OperationAlert[];
  readAlertIds: string[];
  backups: BackupSnapshot[];
  theme: "light" | "dark";
  serverVersion: number | null;
  lastSyncedAt: string | null;
  isLoaded: boolean;
  isSaving: boolean;
  error: string;
  loadSheets: () => Promise<void>;
  syncPendingChanges: () => Promise<void>;
  refreshFromServer: (options?: { force?: boolean }) => Promise<void>;
  hydrateFromLocalCache: () => void;
  refreshBackups: () => void;
  createRestorePoint: (label?: string) => void;
  restoreBackup: (backupId: string) => void;
  setTheme: (theme: "light" | "dark") => void;
  addRow: (sheet: SheetKey) => void;
  addRowWithValues: (sheet: SheetKey, values: Record<string, CellValue>, keepUnspecifiedEmpty?: boolean) => void;
  deleteRow: (sheet: SheetKey, rowIndex: number) => void;
  moveRow: (sheet: SheetKey, fromIndex: number, toIndex: number) => void;
  updateCell: (
    sheet: SheetKey,
    rowIndex: number,
    columnId: string,
    value: CellValue,
    options?: { suppressProjectReceiptLog?: boolean }
  ) => void;
  addColumn: (sheet: SheetKey, column: SheetColumn) => void;
  deleteColumn: (sheet: SheetKey, columnId: string) => void;
  moveColumn: (sheet: SheetKey, columnId: string, direction: "left" | "right") => void;
  updateColumnWidth: (sheet: SheetKey, columnId: string, width: number) => void;
  addColumnOption: (sheet: SheetKey, columnId: string, option: string) => void;
  markAlertRead: (alertId: string) => void;
  markAllAlertsRead: () => void;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let queuedSheets: Record<SheetKey, SheetData> | null = null;
let activeSaveRequest = 0;
let remoteRefreshInFlight: Promise<void> | null = null;
let realtimeSyncInterval: ReturnType<typeof setInterval> | null = null;
let storageSyncInitialized = false;

const PROJECT_REVENUE_SYNC_SOURCE = "project_income_sync";
const PROJECT_VALUE_SYNC_SOURCE = "project_value_sync";
const PROJECT_PENDING_SYNC_SOURCE = "project_pending_sync";
const LOCAL_CACHE_KEY = "pixelkode_os_cached_sheets";
const LOCAL_PENDING_KEY = "pixelkode_os_pending_sheets";
const LOCAL_READ_ALERTS_KEY = "pixelkode_os_read_alert_ids";
const LOCAL_THEME_KEY = "pixelkode_os_theme";
const LOCAL_TIMETABLE_ROLLOVER_KEY = "pixelkode_os_timetable_rollover_date";
const REMOTE_SYNC_INTERVAL_MS = 5000;
const LOCAL_SAVE_DEBOUNCE_MS = 350;
const rowIdPrefixes: Record<SheetKey, string> = {
  projects: "project",
  leads: "lead",
  revenue: "revenue",
  team: "team",
  content: "content",
  services: "service",
  shopping: "shopping",
  timetable: "slot",
  servers: "server",
  databases: "database"
};

let alertRefreshTimer: ReturnType<typeof setTimeout> | null = null;

type BusinessStatePayload = {
  sheets?: Record<SheetKey, SheetData>;
  version?: number;
  updatedAt?: string | null;
};

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readStoredSheets(key: string) {
  if (!canUseStorage()) return null;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;

    return JSON.parse(raw) as Record<SheetKey, SheetData>;
  } catch {
    return null;
  }
}

function writeStoredSheets(key: string, sheets: Record<SheetKey, SheetData>) {
  if (!canUseStorage()) return;

  try {
    window.localStorage.setItem(key, JSON.stringify(sheets));
  } catch {
    // Ignore storage quota or serialization issues and continue with app state.
  }
}

function clearStoredSheets(key: string) {
  if (!canUseStorage()) return;

  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage cleanup failures.
  }
}

function readStoredAlertIds() {
  if (!canUseStorage()) return [] as string[];

  try {
    const raw = window.localStorage.getItem(LOCAL_READ_ALERTS_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function writeStoredAlertIds(readAlertIds: string[]) {
  if (!canUseStorage()) return;

  try {
    window.localStorage.setItem(LOCAL_READ_ALERTS_KEY, JSON.stringify(readAlertIds));
  } catch {
    // Ignore storage quota or serialization issues and continue with app state.
  }
}

function readStoredTheme() {
  if (!canUseStorage()) return "light" as const;

  try {
    const raw = window.localStorage.getItem(LOCAL_THEME_KEY);
    return raw === "dark" ? "dark" : "light";
  } catch {
    return "light" as const;
  }
}

function createRowId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getMostRecentlyCompletedPlannerDate(now: Date) {
  const today = startOfDay(now);
  const afterCutoff = now.getHours() > 23 || (now.getHours() === 23 && now.getMinutes() >= 0);
  return afterCutoff ? today : addDays(today, -1);
}

function readTimetableRolloverMarker() {
  if (!canUseStorage()) return null;

  try {
    return window.localStorage.getItem(LOCAL_TIMETABLE_ROLLOVER_KEY);
  } catch {
    return null;
  }
}

function writeTimetableRolloverMarker(value: string) {
  if (!canUseStorage()) return;

  try {
    window.localStorage.setItem(LOCAL_TIMETABLE_ROLLOVER_KEY, value);
  } catch {
    // Ignore storage quota issues.
  }
}

function clearEntireTimetable(sheets: Record<SheetKey, SheetData>) {
  const timetable = sheets.timetable;
  if (!timetable) return sheets;

  const rows = timetable.rows.map((row) => ({
    ...row,
    ...Object.fromEntries(timetableDayColumnIds.map((columnId) => [columnId, ""]))
  }));

  return {
    ...sheets,
    timetable: {
      ...timetable,
      rows
    }
  };
}

function applyTimetableRollover(sheets: Record<SheetKey, SheetData>) {
  const completedDate = getMostRecentlyCompletedPlannerDate(new Date());
  const completedDateKey = formatLocalDateKey(completedDate);
  const storedMarker = readTimetableRolloverMarker();

  if (storedMarker === completedDateKey) {
    return { sheets, changed: false };
  }

  const nextSheets = clearEntireTimetable(sheets);
  writeTimetableRolloverMarker(completedDateKey);

  return { sheets: nextSheets, changed: true };
}

function writeStoredTheme(theme: "light" | "dark") {
  if (!canUseStorage()) return;

  try {
    window.localStorage.setItem(LOCAL_THEME_KEY, theme);
  } catch {
    // Ignore storage quota issues.
  }
}

function normalizeSyncText(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function makeEmptyRow(columns: SheetColumn[], prefix: string, length: number): SheetRow {
  const nextRow: SheetRow = { id: createRowId(prefix) };

  columns.forEach((column) => {
    if (column.id === "id") return;
    nextRow[column.id] = column.type === "number" ? 0 : "";
  });

  return nextRow;
}

function makeAssistantRow(columns: SheetColumn[], prefix: string, length: number): SheetRow {
  const nextRow: SheetRow = { id: createRowId(prefix) };

  columns.forEach((column) => {
    if (column.id === "id") return;
    nextRow[column.id] = "";
  });

  return nextRow;
}

function clampNumber(value: unknown, min = 0, max = Number.POSITIVE_INFINITY) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return min;
  }

  return Math.min(Math.max(parsed, min), max);
}

function ensureUniqueRowIds(rows: SheetRow[], prefix: string): SheetRow[] {
  const seen = new Set<string>();

  return rows.map((row) => {
    let id = String(row.id ?? "").trim();

    if (!id || seen.has(id)) {
      id = createRowId(prefix);
    }

    seen.add(id);

    return {
      ...row,
      id
    };
  });
}

function normalizeLeadRow(row: SheetRow): SheetRow {
  const callStatus = String(row.callStatus ?? "").trim() || "Not Called";
  const leadStatus = String(row.leadStatus ?? "").trim() || "Fresh";
  const followUpDate = String(row.followUpDate ?? "").trim();
  const mobileNumber = String(row.mobileNumber ?? "").trim();

  return {
    ...row,
    callStatus,
    leadStatus,
    mobileNumber,
    followUpDate: followUpDate || (leadStatus === "Fresh" && callStatus === "Not Called" ? getUpcomingSaturdayDateKey() : "")
  };
}

function normalizePhoneNumber(value: unknown) {
  return String(value ?? "").replace(/\D+/g, "");
}

function findDuplicateLeadPhoneIndex(rows: SheetRow[], mobileNumber: unknown, excludeRowIndex?: number) {
  const normalizedTarget = normalizePhoneNumber(mobileNumber);
  if (!normalizedTarget) return -1;

  return rows.findIndex((row, index) => {
    if (excludeRowIndex != null && index === excludeRowIndex) return false;
    return normalizePhoneNumber(row.mobileNumber) === normalizedTarget;
  });
}

function createProjectFromLead(lead: SheetRow): SheetRow {
  const leadId = String(lead.id ?? "");
  const marker = `Converted from lead ${leadId}`;
  const expectedValue = clampNumber(lead.expectedValue);
  const businessName = String(lead.businessName ?? "").trim();
  const contactName = String(lead.contactName ?? "").trim();
  const category = String(lead.category ?? "").trim();
  const servicePitch = String(lead.servicePitch ?? "").trim();
  const notes = String(lead.notes ?? "").trim();

  return {
    id: createRowId("project"),
    projectName: businessName || `${contactName || "New"} Project`,
    clientName: contactName || businessName || "New Client",
    sector: category,
    category: servicePitch,
    domain: "",
    address: "",
    projectStatus: "Not Started",
    paymentStatus: "Pending",
    projectValue: expectedValue,
    amountReceived: 0,
    pendingAmount: expectedValue,
    completionPercent: 0,
    startDate: formatLocalDateKey(new Date()),
    deliveryDate: "",
    notes: notes ? `${marker} - ${notes}` : marker
  };
}

function applyLeadAutomation(sheets: Record<SheetKey, SheetData>) {
  const leadsSheet = sheets.leads;
  const projectsSheet = sheets.projects;

  if (!leadsSheet || !projectsSheet) {
    return sheets;
  }

  const nextProjects = [...ensureUniqueRowIds(projectsSheet.rows, rowIdPrefixes.projects)];
  const nextLeads = ensureUniqueRowIds(leadsSheet.rows, rowIdPrefixes.leads).reduce<SheetRow[]>((result, rawLead) => {
    const lead = normalizeLeadRow(rawLead);
    const leadStatus = String(lead.leadStatus ?? "");

    if (leadStatus === "Dropped") {
      return result;
    }

    if (leadStatus === "Converted") {
      const marker = `Converted from lead ${String(lead.id ?? "")}`;
      const alreadyExists = nextProjects.some((project) => String(project.notes ?? "").includes(marker));

      if (!alreadyExists) {
        nextProjects.unshift(createProjectFromLead(lead));
      }

      return result;
    }

    result.push(lead);
    return result;
  }, []);

  return {
    ...sheets,
    leads: {
      ...leadsSheet,
      rows: nextLeads
    },
    projects: {
      ...projectsSheet,
      rows: ensureUniqueRowIds(nextProjects, rowIdPrefixes.projects)
    }
  };
}

function syncProjectDerivedFields(rows: SheetRow[]) {
  return rows.map<SheetRow>((row) => {
    const projectValue = clampNumber(row.projectValue);
    const amountReceived = clampNumber(row.amountReceived, 0, projectValue);
    const completionPercent = clampNumber(row.completionPercent, 0, 100);
    const pendingAmount = Math.max(projectValue - amountReceived, 0);
    const paymentStatus =
      projectValue <= 0 || amountReceived <= 0
        ? "Pending"
        : pendingAmount <= 0
          ? "Paid"
          : "Partially Paid";
    const projectStatus =
      completionPercent >= 100
        ? "Completed"
        : completionPercent > 0
          ? "In Progress"
          : "Not Started";

    return {
      ...row,
      projectValue,
      amountReceived,
      completionPercent,
      pendingAmount,
      paymentStatus,
      projectStatus
    };
  });
}

function syncProjectSheet(sheets: Record<SheetKey, SheetData>) {
  const projectsSheet = sheets.projects;
  if (!projectsSheet) {
    return sheets;
  }

  return {
    ...sheets,
    projects: {
      ...projectsSheet,
      rows: syncProjectDerivedFields(projectsSheet.rows)
    }
  };
}

function buildSyncedRevenueRows(projectsSheet: SheetData) {
  const today = formatLocalDateKey(new Date());
  const totalAmountReceived = projectsSheet.rows.reduce((sum, project) => sum + Number(project.amountReceived ?? 0), 0);

  return [
    {
      id: "sync-project-received",
      entryDate: today,
      entryType: "Income",
      sourceName: "Projects Received Till Date",
      sector: "Automation",
      category: "Project Receipts",
      amount: totalAmountReceived,
      paymentMode: "Auto",
      remarks: "Auto-generated from project amount received",
      syncSource: PROJECT_REVENUE_SYNC_SOURCE
    }
  ] as SheetRow[];
}

function appendProjectReceiptDeltaRow(
  sheets: Record<SheetKey, SheetData>,
  previousProjectRow: SheetRow | null | undefined,
  nextProjectRow: SheetRow | null | undefined
) {
  if (!previousProjectRow || !nextProjectRow) {
    return sheets;
  }

  const previousProjectValue = clampNumber(previousProjectRow.projectValue);
  const nextProjectValue = clampNumber(nextProjectRow.projectValue);
  const previousAmountReceived = clampNumber(previousProjectRow.amountReceived, 0, previousProjectValue);
  const nextAmountReceived = clampNumber(nextProjectRow.amountReceived, 0, nextProjectValue);
  const receivedDelta = nextAmountReceived - previousAmountReceived;

  if (!Number.isFinite(receivedDelta) || receivedDelta <= 0) {
    return sheets;
  }

  const revenueSheet = sheets.revenue;
  if (!revenueSheet) {
    return sheets;
  }

  const today = formatLocalDateKey(new Date());
  const projectName = String(nextProjectRow.projectName ?? previousProjectRow.projectName ?? "Project").trim() || "Project";
  const projectId = String(nextProjectRow.id ?? previousProjectRow.id ?? "").trim();
  const clientName = String(nextProjectRow.clientName ?? previousProjectRow.clientName ?? "").trim();
  const sector = String(nextProjectRow.sector ?? previousProjectRow.sector ?? "").trim();

  return {
    ...sheets,
    revenue: {
      ...revenueSheet,
      rows: [
        ...revenueSheet.rows,
        {
          id: createRowId(rowIdPrefixes.revenue),
          entryDate: today,
          entryType: "Income",
          sourceName: projectName,
          sector: sector || "Projects",
          category: "Project Receipt",
          amount: receivedDelta,
          paymentMode: "Project Update",
          remarks: clientName
            ? `Auto-logged from project amount received update for ${clientName}`
            : "Auto-logged from project amount received update",
          linkedProjectId: projectId,
          syncSource: "project_receipt_delta"
        }
      ]
    }
  };
}

function syncRevenueFromProjects(sheets: Record<SheetKey, SheetData>) {
  const syncedSheets = syncProjectSheet(applyLeadAutomation(sheets));
  const projectsSheet = syncedSheets.projects;
  const revenueSheet = syncedSheets.revenue;

  if (!projectsSheet || !revenueSheet) {
    return syncedSheets;
  }

  const manualRevenueRows = revenueSheet.rows.filter((row) =>
    ![PROJECT_REVENUE_SYNC_SOURCE, PROJECT_VALUE_SYNC_SOURCE, PROJECT_PENDING_SYNC_SOURCE].includes(String(row.syncSource ?? ""))
  );
  const rows = manualRevenueRows.filter((row) => {
    const sourceName = normalizeSyncText(row.sourceName);
    const category = normalizeSyncText(row.category);
    const remarks = normalizeSyncText(row.remarks);
    const entryType = normalizeSyncText(row.entryType);

    return !(
      (entryType === "income" &&
        [
          "tilldate",
          "receivedtilldate",
          "projectsreceivedtilldate",
          "earnedtilldate",
          "totalreceived",
          "totaltilldate"
        ].includes(sourceName)) ||
      category === "projectreceipts" ||
      remarks.includes("projectsreceivedtilldate") ||
      remarks.includes("totalreceived")
    );
  });
  const syncedRevenueRows = buildSyncedRevenueRows(projectsSheet);

  return {
    ...syncedSheets,
    revenue: {
      ...revenueSheet,
      rows: [...syncedRevenueRows, ...rows]
    }
  };
}

async function fetchServerState() {
  const response = await fetch("/api/business-state", {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Load failed (${response.status})`);
  }

  return (await response.json()) as BusinessStatePayload;
}

async function persistSheets(
  sheets: Record<SheetKey, SheetData>,
  set: (partial: Partial<BusinessStore>) => void,
  get: () => BusinessStore
) {
  const requestId = ++activeSaveRequest;
  set({ isSaving: true, error: "" });

  try {
    const response = await fetch("/api/business-state", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ sheets, version: get().serverVersion })
    });

    if (!response.ok) {
      throw new Error(`Save failed (${response.status})`);
    }

    const payload = (await response.json()) as BusinessStatePayload;
    writeStoredSheets(LOCAL_CACHE_KEY, sheets);
    clearStoredSheets(LOCAL_PENDING_KEY);
    set({
      serverVersion: typeof payload.version === "number" ? payload.version : get().serverVersion,
      lastSyncedAt: payload.updatedAt ?? new Date().toISOString(),
      error: ""
    });
  } catch (error) {
    console.error(error);
    writeStoredSheets(LOCAL_CACHE_KEY, sheets);
    writeStoredSheets(LOCAL_PENDING_KEY, sheets);
    set({ error: "Offline mode active. Changes are saved on this device and will sync automatically." });
  } finally {
    if (requestId === activeSaveRequest) {
      set({ isSaving: false });
    }
  }
}

function queuePersist(
  sheets: Record<SheetKey, SheetData>,
  set: (partial: Partial<BusinessStore>) => void,
  get: () => BusinessStore
) {
  queuedSheets = sheets;
  set({ isSaving: true, error: "" });

  if (saveTimer) {
    clearTimeout(saveTimer);
  }

  saveTimer = setTimeout(() => {
    const nextSheets = queuedSheets;
    queuedSheets = null;
    saveTimer = null;

    if (!nextSheets) {
      set({ isSaving: false });
      return;
    }

    writeStoredSheets(LOCAL_CACHE_KEY, nextSheets);
    writeStoredSheets(LOCAL_PENDING_KEY, nextSheets);

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      set({ isSaving: false, error: "Offline mode active. Changes are saved on this device and will sync automatically." });
      return;
    }

    void persistSheets(nextSheets, set, get);
  }, LOCAL_SAVE_DEBOUNCE_MS);
}

function buildOperationalState(sheets: Record<SheetKey, SheetData>, readAlertIds: string[]) {
  const alerts = deriveOperationalAlerts(sheets);
  const validReadAlertIds = readAlertIds.filter((alertId) => alerts.some((alert) => alert.id === alertId));

  return {
    sheets,
    alerts,
    readAlertIds: validReadAlertIds
  };
}

function ensureAllSheetsPresent(sheets: Record<SheetKey, SheetData> | null | undefined) {
  const defaults = createDefaultSheets();
  if (!sheets) return defaults;

  // Fill missing keys from defaults but keep existing user data.
  const merged: Record<SheetKey, SheetData> = { ...defaults } as Record<SheetKey, SheetData>;

  Object.keys(sheets).forEach((k) => {
    const sheetKey = k as SheetKey;
    const nextSheet = sheets[sheetKey];
    const defaultSheet = defaults[sheetKey];
    const mergedColumns = defaultSheet.columns.map((defaultColumn) => {
      const existingColumn = nextSheet.columns.find((column) => column.id === defaultColumn.id);
      return existingColumn ? { ...defaultColumn, ...existingColumn } : defaultColumn;
    });
    const extraColumns = nextSheet.columns.filter(
      (column) => !defaultSheet.columns.some((defaultColumn) => defaultColumn.id === column.id)
    );
    const columns = [...mergedColumns, ...extraColumns];
    const rowsWithMissingFields = ensureUniqueRowIds(nextSheet.rows, rowIdPrefixes[sheetKey]).map((row) => {
      const nextRow = { ...row };
      columns.forEach((column) => {
        if (nextRow[column.id] === undefined) {
          nextRow[column.id] = column.type === "number" ? 0 : "";
        }
      });
      return nextRow;
    });

    merged[sheetKey] = {
      ...defaultSheet,
      ...nextSheet,
      columns,
      rows: rowsWithMissingFields
    };
  });

  merged.timetable = normalizeTimetableSheet(merged.timetable);

  return merged;
}

function buildSheetsState(sheets: Record<SheetKey, SheetData>, readAlertIds: string[]) {
  const mergedPayload = ensureAllSheetsPresent(sheets);
  const rollover = applyTimetableRollover(mergedPayload);
  const syncedSheets = syncRevenueFromProjects(rollover.sheets);
  const nextState = buildOperationalState(syncedSheets, readAlertIds);
  const backups = maybeCreateAutoBackup(nextState.sheets);

  return {
    ...nextState,
    backups,
    rolloverChanged: rollover.changed
  };
}

function applySheetsSnapshot(
  set: (partial: Partial<BusinessStore>) => void,
  readAlertIds: string[],
  sheets: Record<SheetKey, SheetData>,
  metadata?: { version?: number | null; updatedAt?: string | null; error?: string }
) {
  const nextState = buildSheetsState(sheets, readAlertIds);

  set({
    sheets: nextState.sheets,
    alerts: nextState.alerts,
    readAlertIds: nextState.readAlertIds,
    backups: nextState.backups,
    serverVersion: metadata?.version ?? null,
    lastSyncedAt: metadata?.updatedAt ?? null,
    isLoaded: true,
    error: metadata?.error ?? ""
  });

  writeStoredAlertIds(nextState.readAlertIds);
  writeStoredSheets(LOCAL_CACHE_KEY, nextState.sheets);
  if (nextState.rolloverChanged) {
    writeStoredSheets(LOCAL_PENDING_KEY, nextState.sheets);
  }
}

function ensureRealtimeSync(get: () => BusinessStore) {
  if (typeof window === "undefined") {
    return;
  }

  if (!storageSyncInitialized) {
    const handleStorage = (event: StorageEvent) => {
      const store = useBusinessStore.getState();

      if (event.key === LOCAL_THEME_KEY) {
        useBusinessStore.setState({ theme: readStoredTheme() });
        return;
      }

      if (event.key === LOCAL_READ_ALERTS_KEY) {
        const nextReadAlertIds = readStoredAlertIds();
        useBusinessStore.setState({ readAlertIds: nextReadAlertIds });
        return;
      }

      if (event.key !== LOCAL_CACHE_KEY && event.key !== LOCAL_PENDING_KEY) {
        return;
      }

      if (!store.isLoaded || store.isSaving) {
        return;
      }

      if (readStoredSheets(LOCAL_PENDING_KEY)) {
        return;
      }

      store.hydrateFromLocalCache();
    };

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === "hidden") {
        return;
      }

      void useBusinessStore.getState().refreshFromServer();
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", handleVisibilityOrFocus);
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);
    storageSyncInitialized = true;
  }

  if (!realtimeSyncInterval) {
    realtimeSyncInterval = setInterval(() => {
      if (document.visibilityState === "hidden") {
        return;
      }

      const store = get();
      if (!store.isLoaded || store.isSaving) {
        return;
      }

      void store.refreshFromServer();
    }, REMOTE_SYNC_INTERVAL_MS);
  }
}

function getNextPlannerRefreshDelay() {
  const now = new Date();
  const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  const nextCutoffToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 0, 0, 0);
  const nextCutoff = now.getTime() < nextCutoffToday.getTime()
    ? nextCutoffToday
    : new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 0, 0, 0);

  return Math.max(Math.min(nextMidnight.getTime(), nextCutoff.getTime()) - now.getTime(), 1000);
}

function scheduleAlertRefresh(get: () => BusinessStore, set: (partial: Partial<BusinessStore>) => void) {
  if (alertRefreshTimer) {
    clearTimeout(alertRefreshTimer);
  }

  if (!canUseStorage()) {
    return;
  }

  alertRefreshTimer = setTimeout(() => {
    const current = get();
    const rollover = applyTimetableRollover(current.sheets);
    const syncedSheets = syncRevenueFromProjects(rollover.sheets);
    const nextState = buildOperationalState(syncedSheets, current.readAlertIds);

    set({
      sheets: nextState.sheets,
      alerts: nextState.alerts,
      readAlertIds: nextState.readAlertIds
    });

    writeStoredSheets(LOCAL_CACHE_KEY, nextState.sheets);
    if (rollover.changed) {
      writeStoredSheets(LOCAL_PENDING_KEY, nextState.sheets);
      queuePersist(nextState.sheets, set, get);
    }
    writeStoredAlertIds(nextState.readAlertIds);
    scheduleAlertRefresh(get, set);
  }, getNextPlannerRefreshDelay());
}

export const useBusinessStore = create<BusinessStore>((set, get) => ({
  sheets: createDefaultSheets(),
  alerts: deriveOperationalAlerts(createDefaultSheets()),
  readAlertIds: readStoredAlertIds(),
  backups: [],
  theme: readStoredTheme(),
  serverVersion: null,
  lastSyncedAt: null,
  isLoaded: false,
  isSaving: false,
  error: "",
  loadSheets: async () => {
    if (get().isLoaded) return;

    const cachedSheets = readStoredSheets(LOCAL_CACHE_KEY);
    const pendingSheets = readStoredSheets(LOCAL_PENDING_KEY);
    const localSheets = pendingSheets ?? cachedSheets;

    if (localSheets) {
      applySheetsSnapshot(set, get().readAlertIds, localSheets, {
        version: get().serverVersion,
        updatedAt: get().lastSyncedAt,
        error: pendingSheets ? "Offline changes are waiting to sync." : ""
      });
      scheduleAlertRefresh(get, set);
      ensureRealtimeSync(get);
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      if (!localSheets) {
        set({
          sheets: createDefaultSheets(),
          serverVersion: null,
          lastSyncedAt: null,
          isLoaded: true,
          error: "Offline and no local cache found yet."
        });
      }
      return;
    }

    try {
      if (pendingSheets) {
        await persistSheets(syncRevenueFromProjects(ensureAllSheetsPresent(pendingSheets)), set, get);
      }

      const payload = await fetchServerState();
      applySheetsSnapshot(set, get().readAlertIds, payload.sheets ?? createDefaultSheets(), {
        version: typeof payload.version === "number" ? payload.version : null,
        updatedAt: payload.updatedAt ?? null,
        error: ""
      });
      scheduleAlertRefresh(get, set);
      ensureRealtimeSync(get);
    } catch (error) {
      console.error(error);
      if (!localSheets) {
        set({
          sheets: createDefaultSheets(),
          serverVersion: null,
          lastSyncedAt: null,
          isLoaded: true,
          error: "Railway data could not be loaded and no local cache was found."
        });
      } else {
        set({
          isLoaded: true,
          error: pendingSheets
            ? "Offline changes are still stored locally and will sync when the connection returns."
            : "Loaded from local cache. Server sync will retry automatically."
        });
      }
    }
  },
  syncPendingChanges: async () => {
    const pendingSheets = readStoredSheets(LOCAL_PENDING_KEY);

    if (!pendingSheets) {
      return;
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return;
    }

    await persistSheets(syncRevenueFromProjects(pendingSheets), set, get);
  },
  refreshFromServer: async (options) => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return;
    }

    if (readStoredSheets(LOCAL_PENDING_KEY) && !options?.force) {
      return;
    }

    if (remoteRefreshInFlight) {
      return remoteRefreshInFlight;
    }

    remoteRefreshInFlight = (async () => {
      try {
        const payload = await fetchServerState();
        const nextVersion = typeof payload.version === "number" ? payload.version : null;
        const currentVersion = get().serverVersion;

        if (!options?.force && nextVersion !== null && currentVersion !== null && nextVersion <= currentVersion) {
          if (payload.updatedAt && payload.updatedAt !== get().lastSyncedAt) {
            set({ lastSyncedAt: payload.updatedAt });
          }
          return;
        }

        applySheetsSnapshot(set, get().readAlertIds, payload.sheets ?? createDefaultSheets(), {
          version: nextVersion,
          updatedAt: payload.updatedAt ?? null,
          error: readStoredSheets(LOCAL_PENDING_KEY) ? "Offline changes are waiting to sync." : ""
        });
      } catch (error) {
        console.error("Background refresh failed", error);
      } finally {
        remoteRefreshInFlight = null;
      }
    })();

    return remoteRefreshInFlight;
  },
  hydrateFromLocalCache: () => {
    const pendingSheets = readStoredSheets(LOCAL_PENDING_KEY);
    const cachedSheets = readStoredSheets(LOCAL_CACHE_KEY);
    const localSheets = pendingSheets ?? cachedSheets;

    if (!localSheets) {
      return;
    }

    applySheetsSnapshot(set, get().readAlertIds, localSheets, {
      version: get().serverVersion,
      updatedAt: get().lastSyncedAt,
      error: pendingSheets ? "Offline changes are waiting to sync." : ""
    });
  },
  refreshBackups: () => {
    set({ backups: readBackups() });
  },
  createRestorePoint: (label) => {
    const backups = createBackupSnapshot(get().sheets, label?.trim() || "Manual restore point", "manual");
    set({ backups });
  },
  restoreBackup: (backupId) => {
    const current = get();
    const target = current.backups.find((backup) => backup.id === backupId);
    if (!target) {
      set({ error: "That restore point is no longer available." });
      return;
    }

    const backups = createBackupSnapshot(current.sheets, "Before restore", "manual");
    const restoredSheets = syncRevenueFromProjects(ensureAllSheetsPresent(target.sheets));
    const nextState = buildOperationalState(restoredSheets, current.readAlertIds);

    set({
      ...nextState,
      backups,
      error: ""
    });
    writeStoredSheets(LOCAL_CACHE_KEY, nextState.sheets);
    writeStoredSheets(LOCAL_PENDING_KEY, nextState.sheets);
    writeStoredAlertIds(nextState.readAlertIds);
    queuePersist(nextState.sheets, set, get);
  },
  addRow: (sheet) => {
    const current = get().sheets[sheet];
    const nextSheets = {
      ...get().sheets,
      [sheet]: {
        ...current,
        rows: [...current.rows, makeEmptyRow(current.columns, rowIdPrefixes[sheet], current.rows.length)]
      }
    };
    const sheets = syncRevenueFromProjects(nextSheets);
    const nextState = buildOperationalState(sheets, get().readAlertIds);
    const backups = maybeCreateAutoBackup(sheets);

    set({ ...nextState, backups });
    queuePersist(sheets, set, get);
  },
  addRowWithValues: (sheet, values, keepUnspecifiedEmpty = false) => {
    const current = get().sheets[sheet];
    if (sheet === "leads") {
      const duplicateIndex = findDuplicateLeadPhoneIndex(current.rows, values.mobileNumber);
      if (duplicateIndex >= 0) {
        set({ error: "This mobile number already exists in Leads. Duplicate lead entries are not allowed." });
        return;
      }
    }
    const nextRow = {
      ...(keepUnspecifiedEmpty
        ? makeAssistantRow(current.columns, rowIdPrefixes[sheet], current.rows.length)
        : makeEmptyRow(current.columns, rowIdPrefixes[sheet], current.rows.length)),
      ...values
    };
    const nextSheets = {
      ...get().sheets,
      [sheet]: {
        ...current,
        rows: [...current.rows, nextRow]
      }
    };
    const sheets = syncRevenueFromProjects(nextSheets);
    const nextState = buildOperationalState(sheets, get().readAlertIds);
    const backups = maybeCreateAutoBackup(sheets);

    set({ ...nextState, backups });
    queuePersist(sheets, set, get);
  },
  deleteRow: (sheet, rowIndex) => {
    const current = get().sheets[sheet];
    const rows = current.rows.filter((_, index) => index !== rowIndex);
    const nextSheets = {
      ...get().sheets,
      [sheet]: {
        ...current,
        rows
      }
    };
    const sheets = syncRevenueFromProjects(nextSheets);
    const nextState = buildOperationalState(sheets, get().readAlertIds);
    const backups = maybeCreateAutoBackup(sheets);

    set({ ...nextState, backups });
    queuePersist(sheets, set, get);
  },
  updateCell: (sheet, rowIndex, columnId, value, options) => {
    const current = get().sheets[sheet];
    if (sheet === "leads" && columnId === "mobileNumber") {
      const duplicateIndex = findDuplicateLeadPhoneIndex(current.rows, value, rowIndex);
      if (duplicateIndex >= 0) {
        set({ error: "This mobile number is already used in another lead. Please enter a unique number." });
        return;
      }
    }
    const previousRow = current.rows[rowIndex] ?? null;
    const rows = current.rows.map((row, index) => (index === rowIndex ? { ...row, [columnId]: value } : row));
    let nextSheets = {
      ...get().sheets,
      [sheet]: {
        ...current,
        rows
      }
    };
    const nextRow = rows[rowIndex] ?? null;

    if (sheet === "projects" && columnId === "amountReceived" && !options?.suppressProjectReceiptLog) {
      nextSheets = appendProjectReceiptDeltaRow(nextSheets, previousRow, nextRow);
    }

    const sheets = syncRevenueFromProjects(nextSheets);
    const nextState = buildOperationalState(sheets, get().readAlertIds);
    const backups = maybeCreateAutoBackup(sheets);

    set({ ...nextState, backups });
    queuePersist(sheets, set, get);
  },
  moveRow: (sheet, fromIndex, toIndex) => {
    const current = get().sheets[sheet];
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= current.rows.length || toIndex >= current.rows.length) {
      return;
    }

    const rows = [...current.rows];
    const [moved] = rows.splice(fromIndex, 1);
    rows.splice(toIndex, 0, moved);

    const nextSheets = {
      ...get().sheets,
      [sheet]: {
        ...current,
        rows
      }
    };
    const sheets = syncRevenueFromProjects(nextSheets);
    const nextState = buildOperationalState(sheets, get().readAlertIds);
    const backups = maybeCreateAutoBackup(sheets);

    set({ ...nextState, backups });
    queuePersist(sheets, set, get);
  },
  addColumn: (sheet, column) => {
    const current = get().sheets[sheet];
    const rows = current.rows.map((row) => ({
      ...row,
      [column.id]: column.type === "number" ? 0 : ""
    }));
    const nextSheets = {
      ...get().sheets,
      [sheet]: {
        columns: [...current.columns, column],
        rows
      }
    };
    const sheets = syncRevenueFromProjects(nextSheets);
    const nextState = buildOperationalState(sheets, get().readAlertIds);
    const backups = maybeCreateAutoBackup(sheets);

    set({ ...nextState, backups });
    queuePersist(sheets, set, get);
  },
  deleteColumn: (sheet, columnId) => {
    const current = get().sheets[sheet];

    if (current.columns.length <= 1) {
      set({ error: "At least one column must remain in each sheet." });
      return;
    }

    const columns = current.columns.filter((column) => column.id !== columnId);
    const rows = current.rows.map((row) => {
      const nextRow = { ...row };
      delete nextRow[columnId];
      return nextRow;
    });
    const nextSheets = {
      ...get().sheets,
      [sheet]: {
        columns,
        rows
      }
    };
    const sheets = syncRevenueFromProjects(nextSheets);
    const nextState = buildOperationalState(sheets, get().readAlertIds);
    const backups = maybeCreateAutoBackup(sheets);

    set({ ...nextState, backups });
    queuePersist(sheets, set, get);
  },
  moveColumn: (sheet, columnId, direction) => {
    const current = get().sheets[sheet];
    const columnIndex = current.columns.findIndex((column) => column.id === columnId);

    if (columnIndex === -1) {
      return;
    }

    const targetIndex = direction === "left" ? columnIndex - 1 : columnIndex + 1;
    if (targetIndex < 0 || targetIndex >= current.columns.length) {
      return;
    }

    const columns = [...current.columns];
    const [moved] = columns.splice(columnIndex, 1);
    columns.splice(targetIndex, 0, moved);

    const nextSheets = {
      ...get().sheets,
      [sheet]: {
        ...current,
        columns
      }
    };
    const sheets = syncRevenueFromProjects(nextSheets);
    const nextState = buildOperationalState(sheets, get().readAlertIds);
    const backups = maybeCreateAutoBackup(sheets);

    set({ ...nextState, backups });
    queuePersist(sheets, set, get);
  },
  updateColumnWidth: (sheet, columnId, width) => {
    const current = get().sheets[sheet];
    const normalizedWidth = `${Math.round(clampNumber(width, 80, 1400))}px`;
    const columns = current.columns.map((column) =>
      column.id === columnId ? { ...column, width: normalizedWidth } : column
    );

    const nextSheets = {
      ...get().sheets,
      [sheet]: {
        ...current,
        columns
      }
    };
    const sheets = syncRevenueFromProjects(nextSheets);
    const nextState = buildOperationalState(sheets, get().readAlertIds);
    const backups = maybeCreateAutoBackup(sheets);

    set({ ...nextState, backups });
    queuePersist(sheets, set, get);
  },
  addColumnOption: (sheet, columnId, option) => {
    const normalizedOption = option.trim();

    if (!normalizedOption) {
      return;
    }

    const current = get().sheets[sheet];
    const columns = current.columns.map((column) => {
      if (column.id !== columnId) {
        return column;
      }

      const existingOptions = column.options ?? [];
      const hasOption = existingOptions.some(
        (existingOption) => existingOption.toLowerCase() === normalizedOption.toLowerCase()
      );

      if (hasOption) {
        return column;
      }

      return {
        ...column,
        options: [...existingOptions, normalizedOption]
      };
    });

    const nextSheets = {
      ...get().sheets,
      [sheet]: {
        ...current,
        columns
      }
    };
    const sheets = syncRevenueFromProjects(nextSheets);
    const nextState = buildOperationalState(sheets, get().readAlertIds);
    const backups = maybeCreateAutoBackup(sheets);

    set({ ...nextState, backups });
    queuePersist(sheets, set, get);
  },
  setTheme: (theme) => {
    const nextTheme = theme === "dark" ? "dark" : "light";
    writeStoredTheme(nextTheme);
    set({ theme: nextTheme });
  },
  markAlertRead: (alertId) => {
    const { readAlertIds } = get();
    if (readAlertIds.includes(alertId)) return;

    const nextReadAlertIds = [...readAlertIds, alertId];
    set({ readAlertIds: nextReadAlertIds });
    writeStoredAlertIds(nextReadAlertIds);
  },
  markAllAlertsRead: () => {
    const nextReadAlertIds = get().alerts.map((alert) => alert.id);
    set({ readAlertIds: nextReadAlertIds });
    writeStoredAlertIds(nextReadAlertIds);
  }
}));

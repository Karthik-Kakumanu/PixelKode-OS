"use client";

import { create } from "zustand";

import { createDefaultSheets } from "@/lib/data";
import { deriveOperationalAlerts } from "@/lib/operations";
import type { CellValue, OperationAlert, SheetColumn, SheetData, SheetKey, SheetRow } from "@/lib/types";

interface BusinessStore {
  sheets: Record<SheetKey, SheetData>;
  alerts: OperationAlert[];
  readAlertIds: string[];
  isLoaded: boolean;
  isSaving: boolean;
  error: string;
  loadSheets: () => Promise<void>;
  syncPendingChanges: () => Promise<void>;
  addRow: (sheet: SheetKey) => void;
  addRowWithValues: (sheet: SheetKey, values: Record<string, CellValue>, keepUnspecifiedEmpty?: boolean) => void;
  deleteRow: (sheet: SheetKey, rowIndex: number) => void;
  updateCell: (sheet: SheetKey, rowIndex: number, columnId: string, value: CellValue) => void;
  addColumn: (sheet: SheetKey, column: SheetColumn) => void;
  deleteColumn: (sheet: SheetKey, columnId: string) => void;
  addColumnOption: (sheet: SheetKey, columnId: string, option: string) => void;
  markAlertRead: (alertId: string) => void;
  markAllAlertsRead: () => void;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let queuedSheets: Record<SheetKey, SheetData> | null = null;
let activeSaveRequest = 0;

const PROJECT_REVENUE_SYNC_SOURCE = "project_income_sync";
const LOCAL_CACHE_KEY = "pixelkode_os_cached_sheets";
const LOCAL_PENDING_KEY = "pixelkode_os_pending_sheets";
const LOCAL_READ_ALERTS_KEY = "pixelkode_os_read_alert_ids";

let alertRefreshTimer: ReturnType<typeof setTimeout> | null = null;

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

function normalizeSyncText(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function makeEmptyRow(columns: SheetColumn[], prefix: string, length: number): SheetRow {
  const nextRow: SheetRow = { id: `${prefix}-${length + 1}` };

  columns.forEach((column) => {
    if (column.id === "id") return;
    nextRow[column.id] = column.type === "number" ? 0 : "";
  });

  return nextRow;
}

function makeAssistantRow(columns: SheetColumn[], prefix: string, length: number): SheetRow {
  const nextRow: SheetRow = { id: `${prefix}-${length + 1}` };

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

function syncProjectDerivedFields(rows: SheetRow[]) {
  return rows.map<SheetRow>((row) => {
    const projectValue = clampNumber(row.projectValue);
    const amountReceived = clampNumber(row.amountReceived, 0, projectValue);
    const completionPercent = clampNumber(row.completionPercent, 0, 100);
    const pendingAmount = Math.max(projectValue - amountReceived, 0);
    const paymentStatus =
      amountReceived >= projectValue && projectValue > 0
        ? "Paid"
        : amountReceived > 0
          ? "Partially Paid"
          : "Pending";
    const projectStatus = completionPercent >= 100 ? "Completed" : row.projectStatus;

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

function syncRevenueFromProjects(sheets: Record<SheetKey, SheetData>) {
  const syncedSheets = syncProjectSheet(sheets);
  const projectsSheet = syncedSheets.projects;
  const revenueSheet = sheets.revenue;

  if (!projectsSheet || !revenueSheet) {
    return syncedSheets;
  }

  const manualRevenueRows = revenueSheet.rows.filter((row) => String(row.syncSource ?? "") !== PROJECT_REVENUE_SYNC_SOURCE);
  const totalAmountReceived = projectsSheet.rows.reduce((sum, project) => sum + Number(project.amountReceived ?? 0), 0);
  const rows = manualRevenueRows.map((row) => {
    const sourceName = normalizeSyncText(row.sourceName);
    const category = normalizeSyncText(row.category);
    const remarks = normalizeSyncText(row.remarks);
    const entryType = normalizeSyncText(row.entryType);
    const shouldSyncTotalRow =
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
      remarks.includes("totalreceived");

    if (!shouldSyncTotalRow) {
      return row;
    }

    return {
      ...row,
      amount: totalAmountReceived
    };
  });

  return {
    ...syncedSheets,
    revenue: {
      ...revenueSheet,
      rows
    }
  };
}

async function persistSheets(sheets: Record<SheetKey, SheetData>, set: (partial: Partial<BusinessStore>) => void) {
  const requestId = ++activeSaveRequest;
  set({ isSaving: true, error: "" });

  try {
    const response = await fetch("/api/business-state", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ sheets })
    });

    if (!response.ok) {
      throw new Error(`Save failed (${response.status})`);
    }

    writeStoredSheets(LOCAL_CACHE_KEY, sheets);
    clearStoredSheets(LOCAL_PENDING_KEY);
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

function queuePersist(sheets: Record<SheetKey, SheetData>, set: (partial: Partial<BusinessStore>) => void) {
  queuedSheets = sheets;
  set({ isSaving: true, error: "" });
  writeStoredSheets(LOCAL_CACHE_KEY, sheets);
  writeStoredSheets(LOCAL_PENDING_KEY, sheets);

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

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      set({ isSaving: false, error: "Offline mode active. Changes are saved on this device and will sync automatically." });
      return;
    }

    void persistSheets(nextSheets, set);
  }, 400);
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
    // @ts-ignore - runtime key check
    merged[k as SheetKey] = sheets[k as SheetKey];
  });

  return merged;
}

function getNextMidnightDelay() {
  const now = new Date();
  const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return Math.max(nextMidnight.getTime() - now.getTime(), 1000);
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
    const syncedSheets = syncRevenueFromProjects(current.sheets);
    const nextState = buildOperationalState(syncedSheets, current.readAlertIds);

    set({
      alerts: nextState.alerts,
      readAlertIds: nextState.readAlertIds
    });

    writeStoredAlertIds(nextState.readAlertIds);
    scheduleAlertRefresh(get, set);
  }, getNextMidnightDelay());
}

export const useBusinessStore = create<BusinessStore>((set, get) => ({
  sheets: createDefaultSheets(),
  alerts: deriveOperationalAlerts(createDefaultSheets()),
  readAlertIds: readStoredAlertIds(),
  isLoaded: false,
  isSaving: false,
  error: "",
  loadSheets: async () => {
    if (get().isLoaded) return;

    const cachedSheets = readStoredSheets(LOCAL_CACHE_KEY);
    const pendingSheets = readStoredSheets(LOCAL_PENDING_KEY);
    const localSheets = pendingSheets ?? cachedSheets;

    if (localSheets) {
      const mergedLocal = ensureAllSheetsPresent(localSheets);
      const syncedLocalSheets = syncRevenueFromProjects(mergedLocal);
      const localState = buildOperationalState(syncedLocalSheets, get().readAlertIds);

      set({
        sheets: localState.sheets,
        alerts: localState.alerts,
        readAlertIds: localState.readAlertIds,
        isLoaded: true,
        error: pendingSheets ? "Offline changes are waiting to sync." : ""
      });

      writeStoredAlertIds(localState.readAlertIds);
      scheduleAlertRefresh(get, set);
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      if (!localSheets) {
        set({
          sheets: createDefaultSheets(),
          isLoaded: true,
          error: "Offline and no local cache found yet."
        });
      }
      return;
    }

    try {
      if (pendingSheets) {
        await persistSheets(syncRevenueFromProjects(ensureAllSheetsPresent(pendingSheets)), set);
      }

      const response = await fetch("/api/business-state", {
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error(`Load failed (${response.status})`);
      }

      const payload = (await response.json()) as { sheets?: Record<SheetKey, SheetData> };
      const mergedPayload = ensureAllSheetsPresent(payload.sheets ?? createDefaultSheets());
      const syncedSheets = syncRevenueFromProjects(mergedPayload);
      const nextState = buildOperationalState(syncedSheets, get().readAlertIds);

      set({
        sheets: nextState.sheets,
        alerts: nextState.alerts,
        readAlertIds: nextState.readAlertIds,
        isLoaded: true,
        error: ""
      });
      writeStoredSheets(LOCAL_CACHE_KEY, nextState.sheets);
      writeStoredAlertIds(nextState.readAlertIds);
      scheduleAlertRefresh(get, set);
    } catch (error) {
      console.error(error);
      if (!localSheets) {
        set({
          sheets: createDefaultSheets(),
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

    await persistSheets(syncRevenueFromProjects(pendingSheets), set);
  },
  addRow: (sheet) => {
    const current = get().sheets[sheet];
    const nextSheets = {
      ...get().sheets,
      [sheet]: {
        ...current,
        rows: [...current.rows, makeEmptyRow(current.columns, sheet, current.rows.length)]
      }
    };
    const sheets = syncRevenueFromProjects(nextSheets);
    const nextState = buildOperationalState(sheets, get().readAlertIds);

    set(nextState);
    queuePersist(sheets, set);
  },
  addRowWithValues: (sheet, values, keepUnspecifiedEmpty = false) => {
    const current = get().sheets[sheet];
    const nextRow = {
      ...(keepUnspecifiedEmpty
        ? makeAssistantRow(current.columns, sheet, current.rows.length)
        : makeEmptyRow(current.columns, sheet, current.rows.length)),
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

    set(nextState);
    queuePersist(sheets, set);
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

    set(nextState);
    queuePersist(sheets, set);
  },
  updateCell: (sheet, rowIndex, columnId, value) => {
    const current = get().sheets[sheet];
    const rows = current.rows.map((row, index) => (index === rowIndex ? { ...row, [columnId]: value } : row));
    const nextSheets = {
      ...get().sheets,
      [sheet]: {
        ...current,
        rows
      }
    };
    const sheets = syncRevenueFromProjects(nextSheets);
    const nextState = buildOperationalState(sheets, get().readAlertIds);

    set(nextState);
    queuePersist(sheets, set);
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

    set(nextState);
    queuePersist(sheets, set);
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

    set(nextState);
    queuePersist(sheets, set);
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

    set(nextState);
    queuePersist(sheets, set);
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

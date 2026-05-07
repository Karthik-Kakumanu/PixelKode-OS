"use client";

import { create } from "zustand";

import { createDefaultSheets } from "@/lib/data";
import type { CellValue, SheetColumn, SheetData, SheetKey, SheetRow } from "@/lib/types";

interface BusinessStore {
  sheets: Record<SheetKey, SheetData>;
  isLoaded: boolean;
  isSaving: boolean;
  error: string;
  loadSheets: () => Promise<void>;
  addRow: (sheet: SheetKey) => void;
  addRowWithValues: (sheet: SheetKey, values: Record<string, CellValue>) => void;
  deleteRow: (sheet: SheetKey, rowIndex: number) => void;
  updateCell: (sheet: SheetKey, rowIndex: number, columnId: string, value: CellValue) => void;
  addColumn: (sheet: SheetKey, column: SheetColumn) => void;
  deleteColumn: (sheet: SheetKey, columnId: string) => void;
  addColumnOption: (sheet: SheetKey, columnId: string, option: string) => void;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let queuedSheets: Record<SheetKey, SheetData> | null = null;
let activeSaveRequest = 0;

const PROJECT_REVENUE_SYNC_SOURCE = "project_income_sync";

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

    return {
      ...row,
      projectValue,
      amountReceived,
      completionPercent,
      pendingAmount
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
  } catch (error) {
    console.error(error);
    set({ error: "Failed to save securely to the Railway database." });
  } finally {
    if (requestId === activeSaveRequest) {
      set({ isSaving: false });
    }
  }
}

function queuePersist(sheets: Record<SheetKey, SheetData>, set: (partial: Partial<BusinessStore>) => void) {
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

    void persistSheets(nextSheets, set);
  }, 400);
}

export const useBusinessStore = create<BusinessStore>((set, get) => ({
  sheets: createDefaultSheets(),
  isLoaded: false,
  isSaving: false,
  error: "",
  loadSheets: async () => {
    if (get().isLoaded) return;

    try {
      const response = await fetch("/api/business-state", {
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error(`Load failed (${response.status})`);
      }

      const payload = (await response.json()) as { sheets?: Record<SheetKey, SheetData> };
      const syncedSheets = syncRevenueFromProjects(payload.sheets ?? createDefaultSheets());

      set({
        sheets: syncedSheets,
        isLoaded: true,
        error: ""
      });
    } catch (error) {
      console.error(error);
      set({
        sheets: createDefaultSheets(),
        isLoaded: true,
        error: "Railway data could not be loaded from the database."
      });
    }
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

    set({ sheets });
    queuePersist(sheets, set);
  },
  addRowWithValues: (sheet, values) => {
    const current = get().sheets[sheet];
    const nextRow = {
      ...makeEmptyRow(current.columns, sheet, current.rows.length),
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

    set({ sheets });
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

    set({ sheets });
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

    set({ sheets });
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

    set({ sheets });
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

    set({ sheets });
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

    set({ sheets });
    queuePersist(sheets, set);
  }
}));

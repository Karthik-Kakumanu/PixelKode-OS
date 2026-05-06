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
  updateCell: (sheet: SheetKey, rowIndex: number, columnId: string, value: CellValue) => void;
  addColumn: (sheet: SheetKey, column: SheetColumn) => void;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let queuedSheets: Record<SheetKey, SheetData> | null = null;
let activeSaveRequest = 0;

function makeEmptyRow(columns: SheetColumn[], prefix: string, length: number): SheetRow {
  const nextRow: SheetRow = { id: `${prefix}-${length + 1}` };

  columns.forEach((column) => {
    if (column.id === "id") return;
    nextRow[column.id] = column.type === "number" ? 0 : "";
  });

  return nextRow;
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

      set({
        sheets: payload.sheets ?? createDefaultSheets(),
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
    const sheets = {
      ...get().sheets,
      [sheet]: {
        ...current,
        rows: [...current.rows, makeEmptyRow(current.columns, sheet, current.rows.length)]
      }
    };

    set({ sheets });
    queuePersist(sheets, set);
  },
  updateCell: (sheet, rowIndex, columnId, value) => {
    const current = get().sheets[sheet];
    const rows = current.rows.map((row, index) => (index === rowIndex ? { ...row, [columnId]: value } : row));
    const sheets = {
      ...get().sheets,
      [sheet]: {
        ...current,
        rows
      }
    };

    set({ sheets });
    queuePersist(sheets, set);
  },
  addColumn: (sheet, column) => {
    const current = get().sheets[sheet];
    const rows = current.rows.map((row) => ({
      ...row,
      [column.id]: column.type === "number" ? 0 : ""
    }));
    const sheets = {
      ...get().sheets,
      [sheet]: {
        columns: [...current.columns, column],
        rows
      }
    };

    set({ sheets });
    queuePersist(sheets, set);
  }
}));

"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  Download,
  Filter,
  LayoutGrid,
  ListFilter,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatLocalDateKey } from "@/lib/date";
import { sheetTitles } from "@/lib/data";
import { getColumnIcon, getColumnOptions, getOptionClasses, getRequiredColumns } from "@/lib/sheet-ui";
import { useBusinessStore } from "@/lib/store";
import type { CellValue, ColumnType, SheetColumn, SheetData, SheetKey } from "@/lib/types";

type QuickView = {
  id: string;
  label: string;
  matches: (row: Record<string, CellValue>) => boolean;
};

type BufferedInputProps = {
  className: string;
  value: CellValue | undefined;
  type: "text" | "number" | "date";
  onCommit: (nextValue: string) => void;
  min?: number;
  max?: number;
  suffix?: string;
};

const BufferedInput = memo(function BufferedInput({
  className,
  value,
  type,
  onCommit,
  min,
  max,
  suffix
}: BufferedInputProps) {
  const [localValue, setLocalValue] = useState(String(value ?? ""));

  useEffect(() => {
    setLocalValue(String(value ?? ""));
  }, [value]);

  return (
    <div className={suffix ? "relative" : undefined}>
      <input
        type={type}
        value={localValue}
        onChange={(event) => setLocalValue(event.target.value)}
        onBlur={() => {
          if (localValue !== String(value ?? "")) onCommit(localValue);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
        }}
        onWheel={(event) => {
          if (type === "number") event.currentTarget.blur();
        }}
        suppressHydrationWarning
        className={`${className} ${suffix ? "pr-8" : ""}`}
        {...(type === "number" ? { min, max } : {})}
      />
      {suffix ? (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500 dark:text-zinc-400">
          {suffix}
        </span>
      ) : null}
    </div>
  );
});

const BufferedTextarea = memo(function BufferedTextarea({
  className,
  value,
  onCommit
}: {
  className: string;
  value: CellValue | undefined;
  onCommit: (nextValue: string) => void;
}) {
  const [localValue, setLocalValue] = useState(String(value ?? ""));

  useEffect(() => {
    setLocalValue(String(value ?? ""));
  }, [value]);

  return (
    <textarea
      value={localValue}
      onChange={(event) => setLocalValue(event.target.value)}
      onBlur={() => {
        if (localValue !== String(value ?? "")) onCommit(localValue);
      }}
      suppressHydrationWarning
      className={className}
    />
  );
});

function shouldRenderAsSelect(sheetKey: SheetKey, column: SheetColumn) {
  if (column.type === "select") return true;
  return (
    sheetKey === "projects" &&
    ["sector", "category", "domain", "completionPercent"].includes(column.id)
  );
}

function castValue(type: ColumnType, value: string) {
  if (type === "number") return value === "" ? 0 : Number(value);
  return value;
}

function clampDimension(value: number, min = 50, max = 2000) {
  return Math.min(Math.max(value, min), max);
}

function getAutoColumnWidth(sheet: SheetData, columnId: string): number {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const font = "500 14px Inter, system-ui, sans-serif";
  if (context) {
    context.font = font;
  }

  const estimateWidth = (text: string) => {
    if (!context) return text.length * 10;
    return context.measureText(text).width;
  };

  let maxWidth = 80;
  const headerText = String(sheet.columns.find((column) => column.id === columnId)?.label ?? "");
  maxWidth = Math.max(maxWidth, estimateWidth(headerText) + 48);

  sheet.rows.forEach((row) => {
    const value = String(row[columnId] ?? "");
    maxWidth = Math.max(maxWidth, estimateWidth(value) + 24);
  });

  return Math.min(Math.max(maxWidth, 80), 1400);
}

function getAutoRowHeight(sheet: SheetData, rowIndex: number): number {
  const row = sheet.rows[rowIndex];
  const longestText = sheet.columns.reduce((max, column) => {
    const value = String(row[column.id] ?? "");
    return Math.max(max, value.length);
  }, 0);

  const estimatedLines = Math.max(1, Math.ceil(longestText / 25));
  return clampDimension(32 + estimatedLines * 22, 52, 600);
}

function normalizeSortValue(value: CellValue) {
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  const stringValue = String(value ?? "").trim();
  if (/^\d+$/.test(stringValue)) return Number(stringValue);
  return stringValue.toLowerCase();
}

function quoteCsv(value: string) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function getNumberInputBounds(sheetKey: SheetKey, row: Record<string, CellValue>, columnId: string) {
  if (sheetKey !== "projects") return {};
  if (columnId === "amountReceived") {
    const projectValue = Number(row.projectValue ?? 0);
    return { min: 0, max: Number.isFinite(projectValue) ? projectValue : 0 };
  }
  if (columnId === "completionPercent") {
    return { min: 0, max: 100 };
  }
  if (columnId === "projectValue") {
    return { min: 0 };
  }
  return {};
}

function getCellClasses(column: SheetColumn, value: CellValue | undefined) {
  const base =
    "h-11 w-full rounded-2xl border px-3 text-sm text-slate-800 dark:text-zinc-100 outline-none transition-all focus-visible:ring-2 focus-visible:ring-fuchsia-400 dark:focus-visible:ring-cyan-500/50";

  if (column.type === "select") {
    return `${base} ${getOptionClasses(String(value ?? ""))} shadow-lg dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-100 dark:[color-scheme:dark]`;
  }

  return `${base} border-slate-200 dark:border-white/10 bg-white/90 dark:bg-zinc-900 shadow-[0_12px_30px_rgba(31,41,55,0.06)] dark:shadow-[0_12px_30px_rgba(0,0,0,0.4)]`;
}

function getDarkSelectClasses(extra = "") {
  return `h-10 w-full rounded-2xl border border-slate-200 bg-white/90 text-xs text-slate-800 outline-none dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-100 dark:[color-scheme:dark] ${extra}`.trim();
}

function toDayString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function getTimetableReferenceDate(now: Date) {
  const reference = new Date(now);
  if (now.getHours() > 23 || (now.getHours() === 23 && now.getMinutes() >= 0)) {
    reference.setDate(reference.getDate() + 1);
  }
  reference.setHours(0, 0, 0, 0);
  return reference;
}

function formatTimetableHeader(columnId: string, fallbackLabel: string, now: Date) {
  const weekdayOrder = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const targetDay = weekdayOrder.indexOf(columnId);
  if (targetDay === -1) return fallbackLabel;

  const reference = getTimetableReferenceDate(now);
  const delta = (targetDay - reference.getDay() + 7) % 7;
  const targetDate = new Date(reference);
  targetDate.setDate(reference.getDate() + delta);

  const dateLabel = `${String(targetDate.getDate()).padStart(2, "0")}/${String(targetDate.getMonth() + 1).padStart(2, "0")}/${targetDate.getFullYear()}`;
  return `${fallbackLabel} - ${dateLabel}`;
}

function getVisibleTimetableDayIds(now: Date) {
  const weekdayOrder = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
  const reference = getTimetableReferenceDate(now);
  const todayDayId = weekdayOrder[reference.getDay()];
  const tomorrowDayId = weekdayOrder[(reference.getDay() + 1) % weekdayOrder.length];

  return new Set<string>([todayDayId, tomorrowDayId]);
}

function buildQuickViews(sheetKey: SheetKey): QuickView[] {
  const today = formatLocalDateKey(new Date());
  switch (sheetKey) {
    case "projects": return [{ id: "all", label: "All", matches: () => true }, { id: "overdue", label: "Overdue", matches: (row) => toDayString(row.deliveryDate) !== "" && toDayString(row.deliveryDate) < today && String(row.projectStatus ?? "") !== "Completed" }, { id: "pending-payment", label: "Pending Payment", matches: (row) => Number(row.pendingAmount ?? 0) > 0 }, { id: "active", label: "Active", matches: (row) => String(row.projectStatus ?? "") === "In Progress" }];
    case "leads": return [{ id: "all", label: "All", matches: () => true }, { id: "due-today", label: "Due Today", matches: (row) => toDayString(row.followUpDate) === today }, { id: "overdue", label: "Overdue", matches: (row) => toDayString(row.followUpDate) !== "" && toDayString(row.followUpDate) < today }, { id: "proposal", label: "Proposal Sent", matches: (row) => String(row.leadStatus ?? "") === "Proposal Sent" }];
    case "content": return [{ id: "all", label: "All", matches: () => true }, { id: "scheduled", label: "Scheduled", matches: (row) => String(row.stage ?? "") === "Scheduled" }, { id: "publishing-today", label: "Publishing Today", matches: (row) => toDayString(row.publishDate) === today }];
    case "team": return [{ id: "all", label: "All", matches: () => true }, { id: "busy", label: "Busy", matches: (row) => String(row.availability ?? "") === "Busy" }, { id: "available", label: "Available", matches: (row) => String(row.availability ?? "") === "Available" }];
    case "revenue": return [{ id: "all", label: "All", matches: () => true }, { id: "income", label: "Income", matches: (row) => String(row.entryType ?? "") === "Income" }, { id: "expense", label: "Expense", matches: (row) => ["Expense", "Payroll", "Personal Use"].includes(String(row.entryType ?? "")) }];
    case "services": return [{ id: "all", label: "All", matches: () => true }, { id: "core", label: "Core Offer", matches: (row) => String(row.status ?? "") === "Core Offer" }, { id: "high-demand", label: "High Demand", matches: (row) => String(row.status ?? "") === "High Demand" }];
    default: return [{ id: "all", label: "All", matches: () => true }];
  }
}

type SheetRowViewProps = {
  row: Record<string, CellValue>;
  rowIndex: number;
  displayIndex: number;
  height: number;
  displayColumns: SheetColumn[];
  sheetRowsLength: number;
  sheetKey: SheetKey;
  servicesSheetRows: Record<string, CellValue>[];
  columnWidths: Record<string, number>;
  deleteRow: (sheet: SheetKey, rowIndex: number) => void;
  moveRow: (sheet: SheetKey, fromIndex: number, toIndex: number) => void;
  updateCell: (sheet: SheetKey, rowIndex: number, columnId: string, value: CellValue) => void;
  addColumnOption: (sheet: SheetKey, columnId: string, option: string) => void;
  customOptionDrafts: Record<string, string>;
  setCustomDraft: (rowId: string, columnId: string, value: string) => void;
  rowResizeStart: (rowIndex: number, startY: number, startHeight: number) => void;
  autoRowHeight: (rowIndex: number) => void;
};

const SheetRowView = memo(function SheetRowView({
  row,
  rowIndex,
  displayIndex,
  height,
  displayColumns,
  sheetRowsLength,
  sheetKey,
  servicesSheetRows,
  columnWidths,
  deleteRow,
  moveRow,
  updateCell,
  addColumnOption,
  customOptionDrafts,
  setCustomDraft,
  rowResizeStart,
  autoRowHeight
}: SheetRowViewProps) {
  return (
    <tr className="group" style={{ height: `${height}px` }}>
      <td className="sticky left-0 z-10 border-b border-slate-200 dark:border-white/10 bg-white/95 dark:bg-zinc-900/95 px-3 py-2 text-sm text-slate-700 dark:text-zinc-200 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold">{displayIndex + 1}</span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" type="button" className="h-8 w-8 rounded-xl dark:hover:bg-white/10" onClick={() => moveRow(sheetKey, rowIndex, rowIndex - 1)} disabled={rowIndex === 0}>
              <ArrowUp className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" type="button" className="h-8 w-8 rounded-xl dark:hover:bg-white/10" onClick={() => moveRow(sheetKey, rowIndex, rowIndex + 1)} disabled={rowIndex === sheetRowsLength - 1}>
              <ArrowDown className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div
          className="absolute inset-x-0 bottom-0 h-6 cursor-row-resize"
          onMouseDown={(event) => {
            event.preventDefault();
            rowResizeStart(rowIndex, event.clientY, height);
          }}
          onDoubleClick={() => autoRowHeight(rowIndex)}
        >
          <div className="mx-auto h-1 w-12 rounded-full bg-slate-200/70 dark:bg-white/10 transition hover:bg-slate-400/90 dark:hover:bg-cyan-500/50" />
        </div>
      </td>
      {displayColumns.map((column) => {
        const value = row[column.id];
        const dynamicOptions = sheetKey === "leads" && column.id === "servicePitch" ? servicesSheetRows.map((item) => String(item.serviceName ?? "")).filter(Boolean) : [];
        const options = Array.from(new Set([...getColumnOptions(sheetKey, column), ...dynamicOptions]));
        const shouldUseSelect = shouldRenderAsSelect(sheetKey, column);
        const draftKey = `${String(row.id)}:${column.id}`;
        const isCustomMode = shouldUseSelect && String(value ?? "") === "__custom__";
        const numberBounds = column.type === "number" ? getNumberInputBounds(sheetKey, row, column.id) : {};

        return (
          <td
            key={column.id}
            className="border-b border-slate-200 dark:border-white/10 bg-gradient-to-b from-white/50 via-slate-50 to-fuchsia-50 dark:from-zinc-900/50 dark:via-zinc-800/50 dark:to-zinc-900/50 px-2 py-2 align-top group-hover:from-white/80 group-hover:to-fuchsia-50/60 dark:group-hover:from-zinc-800/80 dark:group-hover:via-zinc-800/80 dark:group-hover:to-zinc-800/80"
            style={{ width: `${columnWidths[column.id] ?? 180}px`, minWidth: `${columnWidths[column.id] ?? 180}px` }}
          >
            {shouldUseSelect ? (
              <div className="space-y-2">
                <select
                  value={String(value ?? "")}
                  onChange={(event) => updateCell(sheetKey, rowIndex, column.id, event.target.value)}
                  suppressHydrationWarning
                  className={getCellClasses({ ...column, type: "select" }, value)}
                >
                  <option value="">Select</option>
                  {options.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                  <option value="__custom__">Others - Add New</option>
                </select>
                {isCustomMode ? (
                  <div className="flex gap-2">
                    <Input
                      value={customOptionDrafts[draftKey] ?? ""}
                      onChange={(event) => setCustomDraft(String(row.id), column.id, event.target.value)}
                      placeholder={`Add new ${column.label}`}
                      className="h-10 rounded-xl dark:bg-zinc-900 dark:border-white/10 dark:text-zinc-100"
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          const nextOption = (customOptionDrafts[draftKey] ?? "").trim();
                          if (!nextOption) return;
                          addColumnOption(sheetKey, column.id, nextOption);
                          updateCell(sheetKey, rowIndex, column.id, nextOption);
                          setCustomDraft(String(row.id), column.id, "");
                        }
                      }}
                    />
                    <Button
                      type="button"
                      size="sm"
                      className="shrink-0 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                      onClick={() => {
                        const nextOption = (customOptionDrafts[draftKey] ?? "").trim();
                        if (!nextOption) return;
                        addColumnOption(sheetKey, column.id, nextOption);
                        updateCell(sheetKey, rowIndex, column.id, nextOption);
                        setCustomDraft(String(row.id), column.id, "");
                      }}
                    >
                      Add
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : column.type === "textarea" ? (
              <BufferedTextarea
                value={value}
                onCommit={(nextValue) => updateCell(sheetKey, rowIndex, column.id, nextValue)}
                className="min-h-[96px] w-full resize-none rounded-2xl border border-slate-200 dark:border-white/10 bg-white/90 dark:bg-zinc-900 px-3 py-3 text-sm text-slate-800 dark:text-zinc-100 outline-none shadow-[0_12px_30px_rgba(31,41,55,0.06)] dark:shadow-none focus-visible:ring-2 focus-visible:ring-fuchsia-400 dark:focus-visible:ring-cyan-500/50"
              />
            ) : (
              <BufferedInput
                type={column.type === "number" ? "number" : column.type === "date" ? "date" : "text"}
                value={value}
                onCommit={(nextValue) => updateCell(sheetKey, rowIndex, column.id, castValue(column.type, nextValue))}
                className={getCellClasses(column, value)}
                min={numberBounds.min}
                max={numberBounds.max}
                suffix={column.id === "completionPercent" ? "%" : undefined}
              />
            )}
          </td>
        );
      })}
      <td className="sticky right-0 border-b border-slate-200 dark:border-white/10 bg-white/90 dark:bg-zinc-900/90 px-2 py-2 text-center align-top">
        <Button variant="ghost" size="icon" type="button" className="h-10 w-10 rounded-2xl dark:hover:bg-rose-500/10" onClick={() => deleteRow(sheetKey, rowIndex)} aria-label="Delete row">
          <Trash2 className="h-4 w-4 text-rose-500 dark:text-rose-400" />
        </Button>
      </td>
    </tr>
  );
}, (prev, next) =>
  prev.row === next.row &&
  prev.rowIndex === next.rowIndex &&
  prev.displayIndex === next.displayIndex &&
  prev.height === next.height &&
  prev.displayColumns === next.displayColumns &&
  prev.sheetRowsLength === next.sheetRowsLength &&
  prev.servicesSheetRows === next.servicesSheetRows &&
  prev.columnWidths === next.columnWidths &&
  prev.customOptionDrafts === next.customOptionDrafts
);

export function EditableSheet({ sheetKey }: { sheetKey: SheetKey }) {
  const sheetMeta = sheetTitles[sheetKey];
  const sheet = useBusinessStore((state) => state.sheets[sheetKey]);
  const servicesSheet = useBusinessStore((state) => state.sheets.services);
  const addRow = useBusinessStore((state) => state.addRow);
  const deleteRow = useBusinessStore((state) => state.deleteRow);
  const moveRow = useBusinessStore((state) => state.moveRow);
  const addColumn = useBusinessStore((state) => state.addColumn);
  const deleteColumn = useBusinessStore((state) => state.deleteColumn);
  const moveColumn = useBusinessStore((state) => state.moveColumn);
  const updateColumnWidth = useBusinessStore((state) => state.updateColumnWidth);
  const updateCell = useBusinessStore((state) => state.updateCell);
  const addColumnOption = useBusinessStore((state) => state.addColumnOption);
  const isLoaded = useBusinessStore((state) => state.isLoaded);
  const isSaving = useBusinessStore((state) => state.isSaving);
  const error = useBusinessStore((state) => state.error);

  const [newColumnLabel, setNewColumnLabel] = useState("");
  const [newColumnType, setNewColumnType] = useState<ColumnType>("text");
  const [newColumnOptions, setNewColumnOptions] = useState("");
  const [search, setSearch] = useState("");
  const [filterColumnId, setFilterColumnId] = useState("all");
  const [filterValue, setFilterValue] = useState("all");
  const [quickViewId, setQuickViewId] = useState("all");
  const [customOptionDrafts, setCustomOptionDrafts] = useState<Record<string, string>>({});
  const [isMounted, setIsMounted] = useState(false);
  const [sortKey, setSortKey] = useState("none");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    if (!sheet) return {};
    return sheet.columns.reduce<Record<string, number>>((result, column) => {
      result[column.id] = Number(String(column.width ?? "").replace(/px/g, "")) || 180;
      return result;
    }, {});
  });
  const [rowHeights, setRowHeights] = useState<Record<number, number>>(() => {
    if (!sheet) return {};
    return sheet.rows.reduce<Record<number, number>>((result, _, index) => {
      result[index] = 52;
      return result;
    }, {});
  });
  const [columnResizing, setColumnResizing] = useState<{
    columnId: string;
    startX: number;
    startWidth: number;
    pointerId: number;
  } | null>(null);
  const [rowResizing, setRowResizing] = useState<{
    rowIndex: number;
    startY: number;
    startHeight: number;
  } | null>(null);
  const tableContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { setIsMounted(true); }, []);
  useEffect(() => {
    setColumnWidths(() =>
      sheet.columns.reduce<Record<string, number>>((result, column) => {
        result[column.id] = Number(String(column.width ?? "").replace(/px/g, "")) || 180;
        return result;
      }, {})
    );
  }, [sheet.columns]);

  useEffect(() => {
    setRowHeights((current) => {
      const next = { ...current };
      sheet.rows.forEach((_, index) => {
        if (next[index] == null) {
          next[index] = 52;
        }
      });
      return next;
    });
  }, [sheet.rows.length]);

  useEffect(() => {
    if (!columnResizing && !rowResizing) return;

    const handlePointerMove = (event: PointerEvent) => {
      if (columnResizing) {
        const nextWidth = clampDimension(columnResizing.startWidth + event.clientX - columnResizing.startX);
        setColumnWidths((current) => ({ ...current, [columnResizing.columnId]: nextWidth }));
      }
      if (rowResizing) {
        const nextHeight = clampDimension(rowResizing.startHeight + event.clientY - rowResizing.startY, 32, 1200);
        setRowHeights((current) => ({ ...current, [rowResizing.rowIndex]: nextHeight }));
      }
    };

    const finishResize = () => {
      if (columnResizing) {
        const width = columnWidths[columnResizing.columnId];
        if (width != null) {
          updateColumnWidth(sheetKey, columnResizing.columnId, width);
        }
        tableContainerRef.current?.releasePointerCapture?.(columnResizing.pointerId);
      }
      setColumnResizing(null);
      setRowResizing(null);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.body.style.cursor = columnResizing ? "col-resize" : rowResizing ? "row-resize" : "";
    document.body.style.userSelect = "none";
    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", finishResize);
    document.addEventListener("pointercancel", finishResize);

    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", finishResize);
      document.removeEventListener("pointercancel", finishResize);
    };
  }, [columnResizing, rowResizing, columnWidths, sheetKey, updateColumnWidth]);

  const requiredColumns = useMemo(() => new Set(getRequiredColumns(sheetKey)), [sheetKey]);
  const quickViews = useMemo(() => buildQuickViews(sheetKey), [sheetKey]);
  const selectableColumns = useMemo(() => (sheet ? sheet.columns.filter((column) => shouldRenderAsSelect(sheetKey, column)) : []), [sheet, sheetKey]);
  const displayColumns = useMemo(() => {
    if (!isMounted || sheetKey !== "timetable") return sheet.columns;
    const now = new Date();
    const visibleDayIds = getVisibleTimetableDayIds(now);

    return sheet.columns
      .filter((column) => {
        if (!["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].includes(column.id)) return true;
        return visibleDayIds.has(column.id);
      })
      .map((column) => {
        if (!["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].includes(column.id)) return column;

        return { ...column, label: formatTimetableHeader(column.id, column.label, now) };
      });
  }, [isMounted, sheet.columns, sheetKey]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const rows = sheet?.rows ?? [];
    const columns = sheet?.columns ?? [];

    return rows.filter((row) => {
      const quickView = quickViews.find((item) => item.id === quickViewId);
      const matchesQuery = query.length === 0 || columns.some((column) => String(row[column.id] ?? "").toLowerCase().includes(query));
      if (!matchesQuery) return false;
      if (quickView && !quickView.matches(row)) return false;
      if (filterColumnId === "all" || filterValue === "all") return true;
      return String(row[filterColumnId] ?? "") === filterValue;
    });
  }, [filterColumnId, filterValue, quickViewId, quickViews, search, sheet]);

  const activeFilterOptions = useMemo(() => {
    if (filterColumnId === "all") return [];
    const columns = sheet?.columns ?? [];
    const column = columns.find((item) => item.id === filterColumnId);
    if (!column) return [];
    const dynamicOptions = sheetKey === "leads" && column.id === "servicePitch"
        ? (servicesSheet?.rows ?? []).map((row) => String(row.serviceName ?? "")).filter(Boolean)
        : [];
    return Array.from(new Set([...getColumnOptions(sheetKey, column), ...dynamicOptions]));
  }, [filterColumnId, servicesSheet?.rows, sheet, sheetKey]);

  const sortedRows = useMemo(() => {
    const rows = [...filteredRows];
    if (sortKey === "none" || sortKey === "slNo") return rows;
    const column = sheet.columns.find((item) => item.id === sortKey);
    if (!column) return rows;

    return rows.sort((left, right) => {
      const leftValue = normalizeSortValue(left[sortKey]);
      const rightValue = normalizeSortValue(right[sortKey]);
      if (leftValue < rightValue) return sortDirection === "asc" ? -1 : 1;
      if (leftValue > rightValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredRows, sheet.columns, sortDirection, sortKey]);

  const downloadSheetCsv = () => {
    const headers = ["SL. No", ...displayColumns.map((column) => column.label)];
    const rows = sortedRows.map((row, index) => [String(index + 1), ...displayColumns.map((column) => String(row[column.id] ?? ""))]);
    const csv = [headers, ...rows].map((items) => items.map(quoteCsv).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const href = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `${sheetKey}-sheet.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(href);
  };

  const setCustomDraft = (rowId: string, columnId: string, value: string) => {
    setCustomOptionDrafts((current) => ({ ...current, [`${rowId}:${columnId}`]: value }));
  };

  const handleDeleteRow = useCallback((targetSheet: SheetKey, rowIndex: number) => deleteRow(targetSheet, rowIndex), [deleteRow]);
  const handleMoveRow = useCallback((targetSheet: SheetKey, fromIndex: number, toIndex: number) => moveRow(targetSheet, fromIndex, toIndex), [moveRow]);
  const handleUpdateCell = useCallback((targetSheet: SheetKey, rowIndex: number, columnId: string, value: CellValue) => updateCell(targetSheet, rowIndex, columnId, value), [updateCell]);
  const handleAddColumnOption = useCallback((targetSheet: SheetKey, columnId: string, option: string) => addColumnOption(targetSheet, columnId, option), [addColumnOption]);
  const handleRowResizeStart = useCallback((rowIndex: number, startY: number, startHeight: number) => {
    setRowResizing({ rowIndex, startY, startHeight });
  }, []);
  const handleAutoRowHeight = useCallback((rowIndex: number) => {
    setRowHeights((prev) => ({ ...prev, [rowIndex]: getAutoRowHeight(sheet, rowIndex) }));
  }, [sheet]);

  if (!isMounted) {
    return (
      <div className="space-y-6" suppressHydrationWarning>
        <Card className="overflow-hidden p-0 border-slate-200 dark:border-white/10 bg-white/50 dark:bg-black/20 backdrop-blur-xl">
          <div className="border-b border-slate-200 dark:border-white/10 bg-white/80 dark:bg-zinc-900/80 px-4 py-3">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{sheetMeta.title}</h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">Preparing workspace...</p>
            </div>
          </div>
          <div className="space-y-4 p-4">
            <div className="h-11 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-zinc-800/60" />
            <div className="overflow-hidden rounded-[22px] border border-slate-200 dark:border-white/10 bg-white/45 dark:bg-zinc-900/40">
              <div className="h-72 bg-gradient-to-b from-white/60 to-fuchsia-50/30 dark:from-zinc-900/60 dark:to-zinc-800/30" />
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (!sheet) {
    return (
      <div className="space-y-6">
        <Card className="overflow-hidden p-0 border-slate-200 dark:border-white/10 bg-white/50 dark:bg-black/20 backdrop-blur-xl">
          <div className="border-b border-slate-200 dark:border-white/10 bg-white/80 dark:bg-zinc-900/80 px-4 py-3">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{sheetMeta.title}</h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">Sheet not found in workspace.</p>
            </div>
          </div>
          <div className="space-y-4 p-4">
            <p className="rounded-2xl bg-rose-50 dark:bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20">This sheet is not available. Try reloading or check your workspace configuration.</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden p-0 border-slate-200 dark:border-white/10 bg-white/50 dark:bg-zinc-950/40 backdrop-blur-xl shadow-xl">
        <div className="border-b border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-zinc-900/80 px-4 py-3 backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{sheetMeta.title}</h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">{sheetMeta.description}</p>
            </div>
            <div className="flex gap-2">
              <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-zinc-800/80 px-3 py-2 text-sm font-medium text-slate-600 dark:text-zinc-300 shadow-sm backdrop-blur-sm">
                {!isLoaded ? "Loading data..." : isSaving ? "Saving changes..." : `${filteredRows.length} visible rows`}
              </div>
              <Button variant="secondary" size="sm" onClick={() => addRow(sheetKey)} className="dark:bg-white dark:text-black dark:hover:bg-zinc-200">
                <Plus className="mr-2 h-4 w-4" />
                Add Row
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-4 p-4">
          {error ? <p className="rounded-2xl bg-rose-50 dark:bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20">{error}</p> : null}

          <div className="rounded-[26px] border border-slate-200 dark:border-white/10 bg-white/90 dark:bg-zinc-900 p-4 shadow-sm space-y-3 backdrop-blur-md">
            {/* Row 1: Quick views + Search */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-1.5">
                {quickViews.map((view) => (
                  <button
                    key={view.id}
                    type="button"
                    onClick={() => setQuickViewId(view.id)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      quickViewId === view.id
                        ? "border-slate-800 bg-slate-800 text-white dark:border-white dark:bg-white dark:text-black"
                        : "border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-white"
                    }`}
                  >
                    {view.label}
                  </button>
                ))}
              </div>
              
              <div className="relative w-full lg:w-72">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="h-10 w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-white/90 dark:bg-zinc-900 pl-11 pr-4 text-sm text-slate-800 dark:text-zinc-200 dark:placeholder-zinc-500"
                  placeholder="Search rows, names, values, notes..."
                />
              </div>
            </div>
            
            {/* Row 2: Filters + Sort */}
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <div className="relative">
                <ListFilter className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                <select
                  value={filterColumnId}
                  onChange={(event) => {
                    setFilterColumnId(event.target.value);
                    setFilterValue("all");
                  }}
                  suppressHydrationWarning
                  className={getDarkSelectClasses("pl-11 pr-4")}
                >
                  <option value="all">Filter by all columns</option>
                  {selectableColumns.map((column) => (
                    <option key={column.id} value={column.id}>
                      {column.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="relative">
                <Filter className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                <select
                  value={filterValue}
                  onChange={(event) => setFilterValue(event.target.value)}
                  disabled={filterColumnId === "all"}
                  suppressHydrationWarning
                  className={getDarkSelectClasses("pl-11 pr-4 disabled:cursor-not-allowed disabled:opacity-60")}
                >
                  <option value="all">All values</option>
                  {activeFilterOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-end gap-2">
                <select
                  value={sortKey}
                  onChange={(event) => setSortKey(event.target.value)}
                  className={getDarkSelectClasses("flex-1 px-4")}
                >
                  <option value="none">No sorting</option>
                  <option value="slNo">SL. No</option>
                  {displayColumns.map((column) => (
                    <option key={column.id} value={column.id}>
                      {column.label}
                    </option>
                  ))}
                </select>
                <Button
                  variant="outline" size="sm" type="button"
                  onClick={() => setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"))}
                  className="h-10 rounded-2xl dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Row 3: Add column + Export */}
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-[1fr_120px] lg:grid-cols-[minmax(180px,1fr)_140px_100px_100px]">
              <div className="relative">
                <Input
                  value={newColumnLabel}
                  onChange={(event) => setNewColumnLabel(event.target.value)}
                  placeholder="Column name"
                  className="h-10 w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-white/90 dark:bg-zinc-900 px-4 text-sm text-slate-800 dark:text-zinc-200 dark:placeholder-zinc-500"
                />
              </div>
              
              <select
                value={newColumnType}
                onChange={(event) => {
                  const nextType = event.target.value as ColumnType;
                  setNewColumnType(nextType);
                  if (nextType !== "select") setNewColumnOptions("");
                }}
                suppressHydrationWarning
                className={getDarkSelectClasses("px-3")}
              >
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="date">Date</option>
                <option value="select">Dropdown</option>
                <option value="textarea">Long text</option>
              </select>

              {newColumnType === "select" ? (
                <Input
                  value={newColumnOptions}
                  onChange={(event) => setNewColumnOptions(event.target.value)}
                  placeholder="Dropdown options, comma separated"
                  className="h-10 w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-white/90 dark:bg-zinc-900 px-4 text-sm text-slate-800 dark:text-zinc-200 dark:placeholder-zinc-500 lg:col-span-2"
                />
              ) : null}
              
              <Button
                size="sm"
                className="h-10 rounded-2xl dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                onClick={() => {
                  const sanitized = newColumnLabel.trim();
                  const parsedOptions = newColumnType === "select" ? Array.from(new Set(newColumnOptions.split(",").map((o) => o.trim()).filter(Boolean))) : undefined;
                  if (!sanitized) return;
                  if (newColumnType === "select" && (!parsedOptions || parsedOptions.length === 0)) return;
                  addColumn(sheetKey, { id: sanitized.toLowerCase().replace(/\s+/g, "_"), label: sanitized, type: newColumnType, options: parsedOptions, width: "180px" });
                  setNewColumnLabel("");
                  setNewColumnOptions("");
                }}
              >
                Add
              </Button>
              
              <Button
                variant="outline" size="sm" type="button" onClick={downloadSheetCsv}
                className="h-10 rounded-2xl dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Export
              </Button>
            </div>
          </div>

          <div ref={tableContainerRef} className="overflow-x-auto rounded-[22px] border border-slate-200 dark:border-white/10 bg-white/45 dark:bg-zinc-900/40 backdrop-blur-md">
            <table className="min-w-full table-fixed border-separate border-spacing-0 text-left text-sm">
              <colgroup>
                <col style={{ width: 72 }} />
                {displayColumns.map((column) => (
                  <col key={column.id} style={{ width: `${columnWidths[column.id] ?? 180}px` }} />
                ))}
                <col style={{ width: 110 }} />
              </colgroup>
              <thead>
                <tr>
                  <th className="sticky left-0 top-0 z-20 border-b border-slate-200 dark:border-white/10 bg-gradient-to-b from-white to-fuchsia-50/90 dark:from-zinc-900 dark:to-zinc-800 px-3 py-3 text-left text-sm font-semibold text-slate-700 dark:text-zinc-200 shadow-sm">
                    SL. No
                  </th>
                  {displayColumns.map((column, columnIndex) => {
                    const Icon = getColumnIcon(column.id);
                    return (
                      <th
                        key={column.id}
                        className="group sticky top-0 z-10 border-b border-slate-200 dark:border-white/10 bg-gradient-to-b from-white to-fuchsia-50/70 dark:from-zinc-900 dark:to-zinc-800 px-3 py-3 text-left text-sm font-semibold text-slate-700 dark:text-zinc-200"
                        style={{ width: `${columnWidths[column.id] ?? 180}px`, minWidth: `${columnWidths[column.id] ?? 180}px` }}
                      >
                        <div className="relative flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white dark:bg-zinc-800 text-fuchsia-600 dark:text-cyan-400 shadow-sm border border-slate-100 dark:border-white/5">
                              <Icon className="h-4 w-4" />
                            </span>
                            <div>
                              <span className="block">{column.label}</span>
                              {requiredColumns.has(column.id) ? (
                                <span className="text-[10px] uppercase tracking-[0.18em] text-orange-500">Priority</span>
                              ) : null}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                            <Button variant="ghost" size="icon" type="button" className="h-8 w-8 rounded-xl dark:hover:bg-white/10" onClick={() => moveColumn(sheetKey, column.id, "left")} disabled={columnIndex === 0}>
                              <ArrowLeft className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" type="button" className="h-8 w-8 rounded-xl dark:hover:bg-white/10" onClick={() => moveColumn(sheetKey, column.id, "right")} disabled={columnIndex === sheet.columns.length - 1}>
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" type="button" className="h-8 w-8 rounded-xl dark:hover:bg-white/10" onClick={() => deleteColumn(sheetKey, column.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <div
                            className="absolute -right-3 top-0 z-40 flex h-full w-6 cursor-col-resize touch-none items-center justify-center"
                            onPointerDown={(event) => {
                              event.preventDefault(); event.stopPropagation(); tableContainerRef.current?.setPointerCapture?.(event.pointerId);
                              setColumnResizing({ columnId: column.id, startX: event.clientX, startWidth: columnWidths[column.id] ?? 180, pointerId: event.pointerId });
                            }}
                            onDoubleClick={() => {
                              const nextWidth = getAutoColumnWidth(sheet, column.id);
                              setColumnWidths((prev) => ({ ...prev, [column.id]: nextWidth }));
                              updateColumnWidth(sheetKey, column.id, nextWidth);
                            }}
                          >
                            <div className="h-full w-1 rounded-full bg-slate-300/90 dark:bg-zinc-700 transition group-hover:bg-slate-500 dark:group-hover:bg-cyan-500" />
                          </div>
                        </div>
                      </th>
                    );
                  })}
                  <th className="sticky right-0 top-0 z-10 w-[110px] border-b border-slate-200 dark:border-white/10 bg-gradient-to-b from-white to-sky-50/70 dark:from-zinc-900 dark:to-zinc-800 px-2 py-3 text-center text-sm font-semibold text-slate-700 dark:text-zinc-200">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row, displayIndex) => {
                  const rowIndex = sheet.rows.findIndex((item) => item.id === row.id);
                  const height = rowHeights[rowIndex] ?? 52;

                  return (
                    <SheetRowView
                      key={String(row.id)}
                      row={row}
                      rowIndex={rowIndex}
                      displayIndex={displayIndex}
                      height={height}
                      displayColumns={displayColumns}
                      sheetRowsLength={sheet.rows.length}
                      sheetKey={sheetKey}
                      servicesSheetRows={servicesSheet.rows}
                      columnWidths={columnWidths}
                      deleteRow={handleDeleteRow}
                      moveRow={handleMoveRow}
                      updateCell={handleUpdateCell}
                      addColumnOption={handleAddColumnOption}
                      customOptionDrafts={customOptionDrafts}
                      setCustomDraft={setCustomDraft}
                      rowResizeStart={handleRowResizeStart}
                      autoRowHeight={handleAutoRowHeight}
                    />
                  );
                })}
              </tbody>
            </table>

            {sortedRows.length === 0 ? (
              <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br from-fuchsia-200 via-orange-100 to-sky-100 dark:from-zinc-800 dark:to-zinc-800 dark:border dark:border-white/10 text-fuchsia-600 dark:text-cyan-400">
                  <LayoutGrid className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-slate-900 dark:text-white">No rows match this view</p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">Try a different search or filter, or add a fresh row.</p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </Card>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { Filter, LayoutGrid, ListFilter, Plus, Search, SlidersHorizontal, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getColumnIcon, getColumnOptions, getOptionClasses, getRequiredColumns } from "@/lib/sheet-ui";
import { useBusinessStore } from "@/lib/store";
import type { CellValue, ColumnType, SheetColumn, SheetKey } from "@/lib/types";

function castValue(type: ColumnType, value: string) {
  if (type === "number") return value === "" ? 0 : Number(value);
  return value;
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
    "h-11 w-full rounded-2xl border px-3 text-sm text-slate-800 outline-none transition-all focus-visible:ring-2 focus-visible:ring-fuchsia-200";

  if (column.type === "select") {
    return `${base} ${getOptionClasses(String(value ?? ""))} shadow-lg`;
  }

  return `${base} border-white/70 bg-white/90 shadow-[0_12px_30px_rgba(31,41,55,0.06)]`;
}

export function EditableSheet({ sheetKey }: { sheetKey: SheetKey }) {
  const sheet = useBusinessStore((state) => state.sheets[sheetKey]);
  const addRow = useBusinessStore((state) => state.addRow);
  const deleteRow = useBusinessStore((state) => state.deleteRow);
  const addColumn = useBusinessStore((state) => state.addColumn);
  const deleteColumn = useBusinessStore((state) => state.deleteColumn);
  const updateCell = useBusinessStore((state) => state.updateCell);
  const addColumnOption = useBusinessStore((state) => state.addColumnOption);
  const isLoaded = useBusinessStore((state) => state.isLoaded);
  const isSaving = useBusinessStore((state) => state.isSaving);
  const error = useBusinessStore((state) => state.error);

  const [newColumnLabel, setNewColumnLabel] = useState("");
  const [newColumnType, setNewColumnType] = useState<ColumnType>("text");
  const [search, setSearch] = useState("");
  const [filterColumnId, setFilterColumnId] = useState("all");
  const [filterValue, setFilterValue] = useState("all");
  const [customOptionDrafts, setCustomOptionDrafts] = useState<Record<string, string>>({});
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const requiredColumns = useMemo(() => new Set(getRequiredColumns(sheetKey)), [sheetKey]);
  const selectableColumns = useMemo(
    () => sheet.columns.filter((column) => getColumnOptions(sheetKey, column).length > 0),
    [sheet.columns, sheetKey]
  );

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return sheet.rows.filter((row) => {
      const matchesQuery =
        query.length === 0 ||
        sheet.columns.some((column) => String(row[column.id] ?? "").toLowerCase().includes(query));

      if (!matchesQuery) return false;
      if (filterColumnId === "all" || filterValue === "all") return true;
      return String(row[filterColumnId] ?? "") === filterValue;
    });
  }, [filterColumnId, filterValue, search, sheet.columns, sheet.rows]);

  const activeFilterOptions = useMemo(() => {
    if (filterColumnId === "all") return [];
    const column = sheet.columns.find((item) => item.id === filterColumnId);
    return column ? getColumnOptions(sheetKey, column) : [];
  }, [filterColumnId, sheet.columns, sheetKey]);

  const setCustomDraft = (rowId: string, columnId: string, value: string) => {
    setCustomOptionDrafts((current) => ({
      ...current,
      [`${rowId}:${columnId}`]: value
    }));
  };

  const addCustomOption = (rowId: string, rowIndex: number, column: SheetColumn) => {
    const draftKey = `${rowId}:${column.id}`;
    const nextOption = (customOptionDrafts[draftKey] ?? "").trim();

    if (!nextOption) return;

    addColumnOption(sheetKey, column.id, nextOption);
    updateCell(sheetKey, rowIndex, column.id, nextOption);
    setCustomOptionDrafts((current) => ({
      ...current,
      [draftKey]: ""
    }));
  };

  if (!isMounted) {
    return (
      <div className="space-y-6">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-white/70 bg-white/80 px-4 py-3">
            <div>
              <h1 className="premium-heading text-2xl font-semibold capitalize">{sheetKey}</h1>
              <p className="mt-1 text-sm text-slate-600">Preparing workspace...</p>
            </div>
          </div>
          <div className="space-y-4 p-4">
            <div className="h-11 rounded-2xl border border-white/70 bg-white/60" />
            <div className="overflow-hidden rounded-[22px] border border-white/70 bg-white/45">
              <div className="h-72 bg-gradient-to-b from-white/60 to-fuchsia-50/30" />
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden p-0">
        <div className="border-b border-white/70 bg-white/80 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="premium-heading text-2xl font-semibold capitalize">{sheetKey}</h1>
              <p className="mt-1 text-sm text-slate-600">Manage rows, filters, and columns with a tighter workspace.</p>
            </div>
            <div className="flex gap-2">
              <div className="rounded-2xl border border-white/80 bg-white/80 px-3 py-2 text-sm font-medium text-slate-600 shadow-sm">
                {!isLoaded ? "Loading data..." : isSaving ? "Saving changes..." : `${filteredRows.length} visible rows`}
              </div>
              <Button variant="secondary" size="sm" onClick={() => addRow(sheetKey)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Row
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-4 p-4">
          {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

          <div className="grid gap-3 xl:grid-cols-[minmax(260px,1.2fr)_220px_220px_auto]">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} className="pl-11" placeholder="Search rows, names, values, notes..." />
            </div>
            <div className="relative">
              <ListFilter className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select
                value={filterColumnId}
                onChange={(event) => {
                  setFilterColumnId(event.target.value);
                  setFilterValue("all");
                }}
                suppressHydrationWarning
                className="h-11 w-full rounded-2xl border border-white/80 bg-white/90 pl-11 pr-4 text-sm text-slate-800 outline-none"
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
              <Filter className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select
                value={filterValue}
                onChange={(event) => setFilterValue(event.target.value)}
                disabled={filterColumnId === "all"}
                suppressHydrationWarning
                className="h-11 w-full rounded-2xl border border-white/80 bg-white/90 pl-11 pr-4 text-sm text-slate-800 outline-none disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="all">All values</option>
                {activeFilterOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-white/80 bg-white/70 px-3 py-2.5">
              <SlidersHorizontal className="h-4 w-4 text-orange-500" />
              <Input
                value={newColumnLabel}
                onChange={(event) => setNewColumnLabel(event.target.value)}
                placeholder="Column name"
                className="h-9 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
              />
              <select
                value={newColumnType}
                onChange={(event) => setNewColumnType(event.target.value as ColumnType)}
                suppressHydrationWarning
                className="h-9 rounded-xl border border-white/80 bg-white/90 px-3 text-sm text-slate-800 outline-none"
              >
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="date">Date</option>
                <option value="textarea">Long text</option>
              </select>
              <Button
                size="sm"
                onClick={() => {
                  const sanitized = newColumnLabel.trim();
                  if (!sanitized) return;
                  addColumn(sheetKey, {
                    id: sanitized.toLowerCase().replace(/\s+/g, "_"),
                    label: sanitized,
                    type: newColumnType,
                    width: "180px"
                  });
                  setNewColumnLabel("");
                }}
              >
                Add
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-[22px] border border-white/70 bg-white/45">
            <table className="min-w-full table-fixed border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr>
                  {sheet.columns.map((column) => {
                    const Icon = getColumnIcon(column.id);

                    return (
                      <th
                        key={column.id}
                        className="sticky top-0 z-10 border-b border-white/70 bg-gradient-to-b from-white to-fuchsia-50/70 px-3 py-3 font-semibold text-slate-700"
                        style={{ width: column.width ?? "160px", minWidth: column.width ?? "160px" }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-fuchsia-600 shadow-sm">
                              <Icon className="h-4 w-4" />
                            </span>
                            <div>
                              <span className="block">{column.label}</span>
                              {requiredColumns.has(column.id) ? (
                                <span className="text-[10px] uppercase tracking-[0.18em] text-orange-500">Priority</span>
                              ) : null}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            type="button"
                            className="h-8 w-8 rounded-xl"
                            onClick={() => deleteColumn(sheetKey, column.id)}
                            aria-label={`Delete ${column.label} column`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </th>
                    );
                  })}
                  <th className="sticky right-0 top-0 z-10 w-[76px] min-w-[76px] border-b border-white/70 bg-gradient-to-b from-white to-sky-50/70 px-2 py-3 text-center font-semibold text-slate-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => {
                  const rowIndex = sheet.rows.findIndex((item) => item.id === row.id);

                  return (
                    <tr key={String(row.id)} className="group">
                      {sheet.columns.map((column) => {
                        const value = row[column.id];
                        const options = getColumnOptions(sheetKey, column);
                        const shouldUseSelect = column.type === "select" || options.length > 0;
                        const draftKey = `${String(row.id)}:${column.id}`;
                        const isCustomMode = shouldUseSelect && String(value ?? "") === "__custom__";

                        return (
                          <td
                            key={column.id}
                            className="border-b border-white/60 bg-gradient-to-b from-white/50 to-white/35 px-2 py-2 align-top group-hover:from-white/75 group-hover:to-fuchsia-50/50"
                            style={{ width: column.width ?? "160px", minWidth: column.width ?? "160px" }}
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
                                    <option key={option} value={option}>
                                      {option}
                                    </option>
                                  ))}
                                  <option value="__custom__">Others - Add New</option>
                                </select>

                                {isCustomMode ? (
                                  <div className="flex gap-2">
                                    <Input
                                      value={customOptionDrafts[draftKey] ?? ""}
                                      onChange={(event) => setCustomDraft(String(row.id), column.id, event.target.value)}
                                      placeholder={`Add new ${column.label}`}
                                      className="h-10 rounded-xl"
                                      onKeyDown={(event) => {
                                        if (event.key === "Enter") {
                                          event.preventDefault();
                                          addCustomOption(String(row.id), rowIndex, column);
                                        }
                                      }}
                                    />
                                    <Button
                                      type="button"
                                      size="sm"
                                      className="shrink-0"
                                      onClick={() => addCustomOption(String(row.id), rowIndex, column)}
                                    >
                                      Add
                                    </Button>
                                  </div>
                                ) : null}
                              </div>
                            ) : column.type === "textarea" ? (
                              <textarea
                                value={String(value ?? "")}
                                onChange={(event) => updateCell(sheetKey, rowIndex, column.id, event.target.value)}
                                suppressHydrationWarning
                                className="min-h-[96px] w-full resize-none rounded-2xl border border-white/70 bg-white/90 px-3 py-3 text-sm text-slate-800 outline-none shadow-[0_12px_30px_rgba(31,41,55,0.06)] focus-visible:ring-2 focus-visible:ring-fuchsia-200"
                              />
                            ) : (
                              <div className={column.id === "completionPercent" ? "relative" : undefined}>
                                <input
                                  type={column.type === "number" ? "number" : column.type === "date" ? "date" : "text"}
                                  value={String(value ?? "")}
                                  onChange={(event) => updateCell(sheetKey, rowIndex, column.id, castValue(column.type, event.target.value))}
                                  suppressHydrationWarning
                                  className={`${getCellClasses(column, value)} ${column.id === "completionPercent" ? "pr-8" : ""}`}
                                  {...(column.type === "number" ? getNumberInputBounds(sheetKey, row, column.id) : {})}
                                />
                                {column.id === "completionPercent" ? (
                                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500">
                                    %
                                  </span>
                                ) : null}
                              </div>
                            )}
                          </td>
                        );
                      })}
                      <td className="sticky right-0 border-b border-white/60 bg-white/90 px-2 py-2 text-center align-top">
                        <Button
                          variant="ghost"
                          size="icon"
                          type="button"
                          className="h-10 w-10 rounded-2xl"
                          onClick={() => deleteRow(sheetKey, rowIndex)}
                          aria-label="Delete row"
                        >
                          <Trash2 className="h-4 w-4 text-rose-500" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredRows.length === 0 ? (
              <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br from-fuchsia-200 via-orange-100 to-sky-100 text-fuchsia-600">
                  <LayoutGrid className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-slate-900">No rows match this view</p>
                  <p className="mt-1 text-sm text-slate-600">Try a different search or filter, or add a fresh row.</p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </Card>
    </div>
  );
}

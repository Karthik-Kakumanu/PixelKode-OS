"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { sheetTitles } from "@/lib/data";
import { useBusinessStore } from "@/lib/store";
import type { ColumnType, SheetKey } from "@/lib/types";

function castValue(type: ColumnType, value: string) {
  if (type === "number") return value === "" ? 0 : Number(value);
  return value;
}

export function EditableSheet({ sheetKey }: { sheetKey: SheetKey }) {
  const { title, description } = sheetTitles[sheetKey];
  const sheet = useBusinessStore((state) => state.sheets[sheetKey]);
  const addRow = useBusinessStore((state) => state.addRow);
  const deleteRow = useBusinessStore((state) => state.deleteRow);
  const addColumn = useBusinessStore((state) => state.addColumn);
  const deleteColumn = useBusinessStore((state) => state.deleteColumn);
  const updateCell = useBusinessStore((state) => state.updateCell);
  const isLoaded = useBusinessStore((state) => state.isLoaded);
  const isSaving = useBusinessStore((state) => state.isSaving);
  const error = useBusinessStore((state) => state.error);
  const [newColumnLabel, setNewColumnLabel] = useState("");
  const [newColumnType, setNewColumnType] = useState<ColumnType>("text");

  const rowCountLabel = useMemo(() => `${sheet.rows.length} rows`, [sheet.rows.length]);
  const columnCountLabel = useMemo(() => `${sheet.columns.length} columns`, [sheet.columns.length]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Business Sheet"
        title={title}
        description={description}
      />

      <Card>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Editable sheet</h3>
            <p className="mt-1 text-sm text-slate-600">
              Add rows as you work. Dashboard numbers and charts will update from this data automatically.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="rounded-2xl border border-violet-100 bg-white/60 px-4 py-3 text-sm text-slate-600">
              {!isLoaded ? "Loading..." : isSaving ? "Saving..." : rowCountLabel}
            </div>
            <div className="rounded-2xl border border-violet-100 bg-white/60 px-4 py-3 text-sm text-slate-600">
              {columnCountLabel}
            </div>
            <Button variant="outline" onClick={() => addRow(sheetKey)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Row
            </Button>
          </div>
        </div>

        {error ? <p className="mt-4 text-sm text-amber-300">{error}</p> : null}

        <div className="mt-5 flex flex-col gap-3 rounded-[24px] border border-violet-100 bg-white/60 p-4 xl:flex-row">
          <Input
            value={newColumnLabel}
            onChange={(event) => setNewColumnLabel(event.target.value)}
            placeholder="New column name"
            className="xl:max-w-xs"
          />
          <select
            value={newColumnType}
            onChange={(event) => setNewColumnType(event.target.value as ColumnType)}
            className="h-11 rounded-2xl border border-violet-200 bg-white/80 px-4 text-sm text-slate-800"
          >
            <option value="text">Text</option>
            <option value="number">Number</option>
            <option value="date">Date</option>
            <option value="textarea">Long text</option>
          </select>
          <Button
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
            Add Column
          </Button>
        </div>

        <div className="mt-5 overflow-x-auto rounded-[24px] border border-violet-100 bg-white/40">
          <table className="min-w-full table-fixed border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr>
                {sheet.columns.map((column) => (
                  <th
                    key={column.id}
                    className="sticky top-0 border-b border-violet-100 bg-white/90 px-2 py-2.5 font-medium text-slate-700"
                    style={{ width: column.width ?? "140px", minWidth: column.width ?? "140px" }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span>{column.label}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        type="button"
                        className="h-7 w-7 rounded-lg"
                        onClick={() => deleteColumn(sheetKey, column.id)}
                        aria-label={`Delete ${column.label} column`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </th>
                ))}
                <th className="sticky right-0 top-0 w-[64px] min-w-[64px] border-b border-violet-100 bg-white/90 px-2 py-2.5 text-center font-medium text-slate-700">
                  Row
                </th>
              </tr>
            </thead>
            <tbody>
              {sheet.rows.map((row, rowIndex) => (
                <tr key={String(row.id)}>
                  {sheet.columns.map((column) => {
                    const value = row[column.id];

                    if (column.type === "select") {
                      return (
                        <td
                          key={column.id}
                          className="border-b border-violet-100 bg-white/35 px-1 py-1 align-top"
                          style={{ width: column.width ?? "140px", minWidth: column.width ?? "140px" }}
                        >
                          <select
                            value={String(value ?? "")}
                            onChange={(event) => updateCell(sheetKey, rowIndex, column.id, event.target.value)}
                            className="h-9 w-full rounded-lg border border-violet-200 bg-white/90 px-2.5 text-sm text-slate-800"
                          >
                            <option value="">Select</option>
                            {(column.options ?? []).map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </td>
                      );
                    }

                    if (column.type === "textarea") {
                      return (
                        <td
                          key={column.id}
                          className="border-b border-violet-100 bg-white/35 px-1 py-1 align-top"
                          style={{ width: column.width ?? "140px", minWidth: column.width ?? "140px" }}
                        >
                          <textarea
                            value={String(value ?? "")}
                            onChange={(event) => updateCell(sheetKey, rowIndex, column.id, event.target.value)}
                            className="h-[72px] min-h-[72px] w-full resize-none overflow-y-auto rounded-lg border border-violet-200 bg-white/90 px-2.5 py-2 text-sm text-slate-800 outline-none"
                          />
                        </td>
                      );
                    }

                    return (
                      <td
                        key={column.id}
                        className="border-b border-violet-100 bg-white/35 px-1 py-1 align-top"
                        style={{ width: column.width ?? "140px", minWidth: column.width ?? "140px" }}
                      >
                        <input
                          type={column.type === "number" ? "number" : column.type === "date" ? "date" : "text"}
                          value={String(value ?? "")}
                          onChange={(event) => updateCell(sheetKey, rowIndex, column.id, castValue(column.type, event.target.value))}
                          className="h-9 w-full rounded-lg border border-violet-200 bg-white/90 px-2.5 text-sm text-slate-800 outline-none"
                        />
                      </td>
                    );
                  })}
                  <td className="sticky right-0 border-b border-violet-100 bg-white/90 px-2 py-1 text-center align-top">
                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      className="h-8 w-8 rounded-lg"
                      onClick={() => deleteRow(sheetKey, rowIndex)}
                      aria-label={`Delete row ${rowIndex + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

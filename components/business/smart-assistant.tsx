"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  Bot,
  Columns3,
  FilePenLine,
  MessageSquare,
  Plus,
  Send,
  Sparkles,
  TableProperties,
  WandSparkles,
  X
} from "lucide-react";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getColumnOptions, getPrimaryColumn, getRequiredColumns, normalizeToken } from "@/lib/sheet-ui";
import { useBusinessStore } from "@/lib/store";
import type { CellValue, ColumnType, SheetColumn, SheetData, SheetKey, SheetRow } from "@/lib/types";

const sheetKeys: SheetKey[] = ["projects", "leads", "revenue", "team", "content", "services"];

const labelAliases: Partial<Record<SheetKey, Partial<Record<string, string[]>>>> = {
  projects: {
    projectName: ["project", "project name", "name", "title"],
    clientName: ["client", "client name"],
    projectValue: ["price", "value", "budget", "amount"],
    projectStatus: ["status", "project status"],
    paymentStatus: ["payment", "payment status"],
    category: ["category"],
    domain: ["domain"],
    startDate: ["start", "start date"],
    deliveryDate: ["delivery", "delivery date", "deadline"],
    notes: ["notes", "note"]
  },
  leads: {
    businessName: ["business", "company", "business name", "name"],
    contactName: ["contact", "contact name", "person"],
    expectedValue: ["value", "expected value", "budget"],
    callStatus: ["call", "call status"],
    leadStatus: ["status", "lead status"],
    category: ["category"],
    followUpDate: ["followup", "follow up", "follow-up"],
    notes: ["notes", "note"]
  },
  revenue: {
    sourceName: ["source", "project", "name"],
    amount: ["amount", "price", "value"],
    entryType: ["type", "entry type"],
    paymentMode: ["payment mode", "mode"],
    category: ["category"],
    remarks: ["remarks", "remark", "notes", "note"]
  },
  team: {
    memberName: ["member", "name"],
    role: ["role", "position"],
    availability: ["status", "availability"],
    notes: ["notes", "note"]
  },
  content: {
    contentTitle: ["title", "content", "content title", "name"],
    platform: ["platform"],
    stage: ["stage", "status"],
    publishDate: ["date", "publish date"],
    goal: ["goal", "objective"],
    notes: ["notes", "note"]
  },
  services: {
    serviceName: ["service", "service name", "name"],
    price: ["price", "amount", "value"],
    status: ["status"],
    estimatedTimeline: ["timeline", "eta"],
    notes: ["notes", "note"]
  }
};

const singularLabel: Record<SheetKey, string> = {
  projects: "project",
  leads: "lead",
  revenue: "revenue entry",
  team: "team member",
  content: "content item",
  services: "service"
};

type AssistantIntent = "add-row" | "edit-row" | "add-column";

function inferSheetKey(pathname: string): SheetKey | null {
  const segment = pathname.split("/")[1];
  return sheetKeys.includes(segment as SheetKey) ? (segment as SheetKey) : null;
}

function detectSheetKey(prompt: string, pathname: string): SheetKey | null {
  const lowerPrompt = prompt.toLowerCase();
  const explicitMatch = sheetKeys.find(
    (sheetKey) =>
      lowerPrompt.includes(`${sheetKey} page`) ||
      lowerPrompt.includes(`in ${sheetKey}`) ||
      lowerPrompt.includes(`on ${sheetKey}`) ||
      lowerPrompt.startsWith(sheetKey)
  );

  return explicitMatch ?? inferSheetKey(pathname) ?? "projects";
}

function detectIntent(prompt: string): AssistantIntent {
  const lowerPrompt = prompt.toLowerCase();

  if (lowerPrompt.includes("add column") || lowerPrompt.includes("new column") || lowerPrompt.includes("create column")) {
    return "add-column";
  }

  if (
    lowerPrompt.includes("edit ") ||
    lowerPrompt.includes("update ") ||
    lowerPrompt.includes("change ") ||
    lowerPrompt.includes("set ") ||
    lowerPrompt.includes("mark ")
  ) {
    return "edit-row";
  }

  return "add-row";
}

function castAssistantValue(column: SheetColumn, rawValue: string): CellValue {
  if (column.type === "number") {
    const numeric = rawValue.replace(/[^0-9.]/g, "");
    return numeric ? Number(numeric) : 0;
  }

  return rawValue.trim();
}

function cleanExtractedValue(value: string) {
  return value
    .replace(/^["']|["']$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchColumnOption(sheetKey: SheetKey, column: SheetColumn, rawValue: string) {
  const normalizedRaw = normalizeToken(rawValue);
  if (!normalizedRaw) return null;

  const options = getColumnOptions(sheetKey, column);
  return (
    options.find((option) => {
      const normalizedOption = normalizeToken(option);
      return normalizedOption === normalizedRaw || normalizedOption.includes(normalizedRaw) || normalizedRaw.includes(normalizedOption);
    }) ?? null
  );
}

function setDraftValue(sheetKey: SheetKey, column: SheetColumn, rawValue: string, values: Record<string, CellValue>) {
  const trimmed = cleanExtractedValue(rawValue);
  if (!trimmed) return;

  const matchedOption = matchColumnOption(sheetKey, column, trimmed);
  values[column.id] = matchedOption ?? castAssistantValue(column, trimmed);
}

function applyLooseOptionMatches(prompt: string, sheetKey: SheetKey, columns: SheetColumn[], values: Record<string, CellValue>) {
  const lowerPrompt = prompt.toLowerCase();

  columns.forEach((column) => {
    if (values[column.id] !== undefined) return;

    const matchedOption = getColumnOptions(sheetKey, column).find((option) => {
      const normalizedOption = normalizeToken(option);
      if (!normalizedOption) return false;

      return lowerPrompt.includes(option.toLowerCase()) || lowerPrompt.includes(normalizedOption);
    });

    if (matchedOption) {
      values[column.id] = matchedOption;
    }
  });
}

function inferLikelyStatusColumn(sheetKey: SheetKey, columns: SheetColumn[], prompt: string) {
  const lowerPrompt = prompt.toLowerCase();
  const preferredColumns: Partial<Record<SheetKey, string[]>> = {
    projects: ["projectStatus", "paymentStatus"],
    leads: ["leadStatus", "callStatus"],
    team: ["availability"],
    content: ["stage"],
    services: ["status"],
    revenue: ["entryType"]
  };

  for (const columnId of preferredColumns[sheetKey] ?? []) {
    const column = columns.find((item) => item.id === columnId);
    if (!column) continue;

    const match = getColumnOptions(sheetKey, column).find((option) => {
      const normalizedOption = normalizeToken(option);
      return lowerPrompt.includes(option.toLowerCase()) || lowerPrompt.includes(normalizedOption);
    });

    if (match) {
      return { column, value: match };
    }
  }

  return null;
}

function extractFromPrompt(prompt: string, sheetKey: SheetKey, columns: SheetColumn[], existingDraft: Record<string, CellValue>) {
  const lowerPrompt = prompt.toLowerCase();
  const nextValues: Record<string, CellValue> = { ...existingDraft };

  columns.forEach((column) => {
    const aliases = (labelAliases[sheetKey]?.[column.id] ?? [column.label.toLowerCase(), column.id.toLowerCase()]).sort(
      (left, right) => right.length - left.length
    );

    for (const alias of aliases) {
      const patterns = [
        new RegExp(`(?:set|change|edit|update)\\s+${escapeRegExp(alias)}\\s+(?:to|as|=|:)?\\s*([^,.;\\n]+?)(?=\\s+(?:and|with)\\s+[a-z]|[,.;\\n]|$)`, "i"),
        new RegExp(`${escapeRegExp(alias)}\\s*(?:to|as|is|=|:)?\\s*([^,.;\\n]+?)(?=\\s+(?:and|with)\\s+[a-z]|[,.;\\n]|$)`, "i")
      ];

      for (const pattern of patterns) {
        const match = prompt.match(pattern);
        if (!match?.[1]) continue;

        setDraftValue(sheetKey, column, match[1], nextValues);
        return;
      }
    }

    const options = getColumnOptions(sheetKey, column);
    const matchedOption = options.find((option) => lowerPrompt.includes(option.toLowerCase()));
    if (matchedOption) {
      nextValues[column.id] = matchedOption;
    }
  });

  const primaryColumn = columns.find((column) => column.id === getPrimaryColumn(sheetKey));
  if (primaryColumn && !nextValues[primaryColumn.id]) {
    const namePatterns = [
      /(?:named|called)\s+([^,.;\n]+?)(?=\s+(?:with|and)\s+[a-z]|[,.;\n]|$)/i,
      /(?:for|of)\s+([^,.;\n]+?)(?=\s+(?:with|and)\s+[a-z]|[,.;\n]|$)/i,
      /(?:add|create)\s+(?:a|an)?\s*[a-z\s]*?(?:named|called)?\s*([^,.;\n]+?)(?=\s+(?:with|and)\s+[a-z]|[,.;\n]|$)/i
    ];

    for (const pattern of namePatterns) {
      const nameMatch = prompt.match(pattern);
      if (!nameMatch?.[1]) continue;

      const value = cleanExtractedValue(nameMatch[1]).split(/\bwith\b/i)[0].trim();
      if (value) {
        nextValues[primaryColumn.id] = value;
        break;
      }
    }
  }

  applyLooseOptionMatches(prompt, sheetKey, columns, nextValues);

  return nextValues;
}

function missingColumns(sheetKey: SheetKey, columns: SheetColumn[], values: Record<string, CellValue>) {
  const required = new Set(getRequiredColumns(sheetKey));
  return columns.filter((column) => {
    if (!required.has(column.id)) return false;
    const value = values[column.id];
    return value === undefined || value === "" || value === 0;
  });
}

function findBestRowMatch(prompt: string, sheetKey: SheetKey, sheet: SheetData) {
  const lowerPrompt = prompt.toLowerCase();
  const primaryColumnId = getPrimaryColumn(sheetKey);
  const rankedRows = sheet.rows
    .map((row, rowIndex) => {
      const primaryValue = String(row[primaryColumnId] ?? "").trim();
      let score = 0;

      if (primaryValue && lowerPrompt.includes(primaryValue.toLowerCase())) {
        score += primaryValue.length + 100;
      }

      sheet.columns.forEach((column) => {
        const value = String(row[column.id] ?? "").trim();
        if (value && value.length > 2 && lowerPrompt.includes(value.toLowerCase())) {
          score += Math.min(value.length, 18);
        }
      });

      return { row, rowIndex, score, primaryValue };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score);

  return rankedRows[0] ?? null;
}

function detectColumnType(prompt: string): ColumnType {
  const lowerPrompt = prompt.toLowerCase();
  if (lowerPrompt.includes("date")) return "date";
  if (lowerPrompt.includes("number")) return "number";
  if (lowerPrompt.includes("textarea") || lowerPrompt.includes("long text")) return "textarea";
  return "text";
}

function getEmptyRequiredColumns(sheetKey: SheetKey, columns: SheetColumn[], values: Record<string, CellValue>) {
  return missingColumns(sheetKey, columns, values).filter((column) => column.id !== getPrimaryColumn(sheetKey));
}

function extractColumnName(prompt: string) {
  const match = prompt.match(/(?:add|create)\s+(?:a\s+)?column(?:\s+called|\s+named)?\s+([a-z0-9 _-]+)/i);
  return match?.[1]?.trim() ?? "";
}

function toColumnId(label: string) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function previewText(values: Record<string, CellValue>, columns: SheetColumn[]) {
  return columns.filter((column) => values[column.id] !== undefined && values[column.id] !== "");
}

export function SmartAssistant() {
  const pathname = usePathname();
  const sheets = useBusinessStore((state) => state.sheets);
  const addRowWithValues = useBusinessStore((state) => state.addRowWithValues);
  const addColumn = useBusinessStore((state) => state.addColumn);
  const updateCell = useBusinessStore((state) => state.updateCell);

  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [draft, setDraft] = useState<Record<string, CellValue>>({});
  const [activeSheetKey, setActiveSheetKey] = useState<SheetKey | null>(inferSheetKey(pathname) ?? "projects");
  const [messages, setMessages] = useState<string[]>([]);

  const currentSheetKey = activeSheetKey ?? inferSheetKey(pathname) ?? "projects";
  const currentSheet = sheets[currentSheetKey];

  const previewColumns = useMemo(() => {
    return currentSheet ? previewText(draft, currentSheet.columns) : [];
  }, [currentSheet, draft]);

  const missing = useMemo(() => {
    if (!currentSheet) return [];
    return getEmptyRequiredColumns(currentSheetKey, currentSheet.columns, draft);
  }, [currentSheet, currentSheetKey, draft]);

  const executePrompt = () => {
    const trimmed = prompt.trim();
    if (!trimmed) return;

    const targetSheetKey = detectSheetKey(trimmed, pathname);
    const targetSheet = targetSheetKey ? sheets[targetSheetKey] : null;

    if (!targetSheetKey || !targetSheet) {
      setMessages((current) => [...current, "I could not find that page target. Try saying projects, leads, revenue, team, content, or services."]);
      setPrompt("");
      return;
    }

    setActiveSheetKey(targetSheetKey);

    const intent = detectIntent(trimmed);

    if (intent === "add-column") {
      const columnLabel = extractColumnName(trimmed);
      if (!columnLabel) {
        setMessages((current) => [...current, `Tell me the new column name for ${targetSheetKey}. Example: add column called priority type text in ${targetSheetKey} page.`]);
        setPrompt("");
        return;
      }

      const nextType = detectColumnType(trimmed);
      addColumn(targetSheetKey, {
        id: toColumnId(columnLabel),
        label: columnLabel,
        type: nextType,
        width: "180px"
      });
      setDraft({});
      setMessages((current) => [...current, `Added the "${columnLabel}" column to ${targetSheetKey}.`]);
      setPrompt("");
      return;
    }

    if (intent === "edit-row") {
      const rowMatch = findBestRowMatch(trimmed, targetSheetKey, targetSheet);
      if (!rowMatch) {
        setMessages((current) => [
          ...current,
          `I could not find the ${singularLabel[targetSheetKey]}. Try using its current name in simple English.`
        ]);
        setPrompt("");
        return;
      }

      const nextValues = extractFromPrompt(trimmed, targetSheetKey, targetSheet.columns, {});
      const likelyStatus = inferLikelyStatusColumn(targetSheetKey, targetSheet.columns, trimmed);
      if (likelyStatus && nextValues[likelyStatus.column.id] === undefined) {
        nextValues[likelyStatus.column.id] = likelyStatus.value;
      }
      const changedColumns = targetSheet.columns.filter(
        (column) => nextValues[column.id] !== undefined && String(nextValues[column.id]) !== String(rowMatch.row[column.id] ?? "")
      );

      if (changedColumns.length === 0) {
        setMessages((current) => [
          ...current,
          `I found "${rowMatch.primaryValue || singularLabel[targetSheetKey]}". Now tell me what to change. Example: change status to Completed.`
        ]);
        setPrompt("");
        return;
      }

      changedColumns.forEach((column) => {
        updateCell(targetSheetKey, rowMatch.rowIndex, column.id, nextValues[column.id] as CellValue);
      });

      setDraft({});
      setMessages((current) => [
        ...current,
        `Updated ${rowMatch.primaryValue || singularLabel[targetSheetKey]} in ${targetSheetKey}: ${changedColumns.map((column) => column.label).join(", ")}.`
      ]);
      setPrompt("");
      return;
    }

    const nextDraft = extractFromPrompt(trimmed, targetSheetKey, targetSheet.columns, draft);
    const primaryColumnId = getPrimaryColumn(targetSheetKey);
    const primaryColumn = targetSheet.columns.find((column) => column.id === primaryColumnId);
    const nextMissing = getEmptyRequiredColumns(targetSheetKey, targetSheet.columns, nextDraft);

    if (!nextDraft[primaryColumnId]) {
      setDraft(nextDraft);
      setMessages((current) => [
        ...current,
        `Tell me the ${primaryColumn?.label ?? "main name"} and I can add it. Example: add project named Website Revamp.`
      ]);
      setPrompt("");
      return;
    }

    addRowWithValues(targetSheetKey, nextDraft);
    setDraft({});
    setMessages((current) => [
      ...current,
      nextMissing.length > 0
        ? `Added a new ${singularLabel[targetSheetKey]} to ${targetSheetKey}. You can still fill: ${nextMissing.map((column) => column.label).join(", ")}.`
        : `Added a new ${singularLabel[targetSheetKey]} to ${targetSheetKey}.`
    ]);
    setPrompt("");
  };

  return (
    <div className="fixed bottom-5 right-5 z-40 flex items-end">
      {open ? (
        <Card className="w-[470px] rounded-[34px] border-white/70 bg-white/90 p-0 shadow-[0_36px_90px_rgba(41,22,90,0.18)] backdrop-blur-2xl xl:w-[520px]">
          <div className="flex items-center justify-between border-b border-white/80 bg-gradient-to-r from-fuchsia-100 via-amber-50 to-sky-100 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-400 via-rose-300 to-sky-300 text-white shadow-lg shadow-fuchsia-200/80">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <p className="text-base font-semibold text-slate-900">Pixelkode Command Assistant</p>
                <p className="text-xs text-slate-600">Works across projects, leads, revenue, team, content, and services</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close assistant">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-5 p-6">
            <div className="grid gap-3 md:grid-cols-3">
              <QuickCommand
                icon={Plus}
                title="Add row"
                description="Add project named Bakery Website with client Ravi"
                onClick={() => setPrompt("add project named Bakery Website with client Ravi")}
              />
              <QuickCommand
                icon={FilePenLine}
                title="Edit row"
                description="Change Bloomline lead status to Converted"
                onClick={() => setPrompt("change Bloomline lead status to Converted")}
              />
              <QuickCommand
                icon={Columns3}
                title="Add column"
                description="In leads page add column called Priority type text"
                onClick={() => setPrompt("in leads page add column called Priority type text")}
              />
            </div>

            <div className="rounded-[28px] border border-white/80 bg-gradient-to-br from-white via-fuchsia-50/80 to-sky-50/80 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
                <Sparkles className="h-4 w-4 text-fuchsia-500" />
                Active target
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {sheetKeys.map((sheetKey) => (
                  <button
                    key={sheetKey}
                    type="button"
                    onClick={() => setActiveSheetKey(sheetKey)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition-all ${
                      currentSheetKey === sheetKey
                        ? "bg-gradient-to-r from-fuchsia-400 via-rose-300 to-sky-300 text-white shadow-lg"
                        : "border border-white/80 bg-white text-slate-700"
                    }`}
                  >
                    {sheetKey}
                  </button>
                ))}
              </div>
            </div>

            {messages.length > 0 ? (
              <div className="max-h-44 space-y-2 overflow-y-auto rounded-[26px] border border-white/70 bg-white/65 p-3">
                {messages.map((message, index) => (
                  <div key={`${message}-${index}`} className="rounded-2xl border border-white/70 bg-white/85 px-4 py-3 text-sm text-slate-700">
                    {message}
                  </div>
                ))}
              </div>
            ) : null}

            {previewColumns.length > 0 ? (
              <div className="rounded-[26px] border border-emerald-100 bg-emerald-50/75 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-emerald-900">
                  <WandSparkles className="h-4 w-4" />
                  Draft preview for {currentSheetKey}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {previewColumns.map((column) => (
                    <span key={column.id} className="rounded-full border border-white/80 bg-white px-3 py-1.5 text-xs font-medium text-slate-700">
                      {column.label}: {String(draft[column.id])}
                    </span>
                  ))}
                </div>
                {missing.length > 0 ? (
                  <p className="mt-3 text-xs font-medium text-orange-700">
                    Optional next fields: {missing.map((column) => column.label).join(", ")}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="flex gap-3">
              <Input
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Try: change Bloomline lead status to Converted"
                className="h-12"
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    executePrompt();
                  }
                }}
              />
              <Button size="icon" className="h-12 w-12 shrink-0 rounded-2xl" onClick={executePrompt} aria-label="Run assistant command">
                <Send className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  setPrompt(
                    `add ${singularLabel[currentSheetKey]} named `
                  )
                }
              >
                Use Add Template
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      <Button
        size="lg"
        className="rounded-full px-5 shadow-[0_24px_60px_rgba(217,74,175,0.28)]"
        onClick={() => setOpen((value) => !value)}
      >
        <MessageSquare className="mr-2 h-5 w-5" />
        Command Assistant
      </Button>
    </div>
  );
}

function QuickCommand({
  icon: Icon,
  title,
  description,
  onClick
}: {
  icon: typeof Plus;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-[24px] border border-white/80 bg-white/80 p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-200 via-orange-100 to-sky-100 text-fuchsia-700">
        <Icon className="h-4 w-4" />
      </div>
      <p className="mt-3 text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-xs leading-5 text-slate-600">{description}</p>
    </button>
  );
}

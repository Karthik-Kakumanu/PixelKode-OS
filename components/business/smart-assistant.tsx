"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  CheckCircle2,
  Mic,
  MicOff,
  MessageSquare,
  Send,
  Sparkles,
  Volume2,
  VolumeX,
  WandSparkles,
  X
} from "lucide-react";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { readMeetHistory } from "@/lib/meet-session-store";
import { getColumnOptions, getPrimaryColumn, getRequiredColumns, normalizeToken } from "@/lib/sheet-ui";
import { useBusinessStore } from "@/lib/store";
import type { CellValue, ColumnType, OperationAlert, SheetColumn, SheetData, SheetKey } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

const sheetKeys: SheetKey[] = ["projects", "leads", "revenue", "team", "content", "services", "shopping", "timetable", "servers", "databases"];

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
  },
  shopping: {
    itemName: ["item", "item name", "product", "thing"],
    listType: ["for", "list type", "company or personal", "type"],
    category: ["category"],
    quantity: ["qty", "quantity"],
    estimatedCost: ["cost", "estimated cost", "budget", "price"],
    priority: ["priority"],
    purchaseStatus: ["status", "purchase status"],
    notes: ["notes", "note"]
  },
  timetable: {
    slotLabel: ["period", "slot", "period name"],
    timeRange: ["time", "time range"],
    monday: ["monday"],
    tuesday: ["tuesday"],
    wednesday: ["wednesday"],
    thursday: ["thursday"],
    friday: ["friday"],
    saturday: ["saturday"],
    sunday: ["sunday"]
  },
  servers: {
    serverName: ["server", "hostname", "server name"],
    ipAddress: ["ip", "ip address", "ipv4"],
    environment: ["env", "environment"],
    status: ["status"],
    ownerEmail: ["owner", "owner email", "email"],
    businessName: ["business", "company", "business name"],
    notes: ["notes", "note"]
  },
  databases: {
    dbName: ["database", "db", "database name"],
    host: ["host", "hostname"],
    port: ["port"],
    engine: ["engine", "type"],
    ownerEmail: ["owner", "owner email", "email"],
    businessName: ["business", "company", "business name"],
    notes: ["notes", "note"]
  }
};

labelAliases.servers = {
  serverName: ["server", "hostname", "server name"],
  ipAddress: ["ip", "ip address", "ipv4"],
  environment: ["env", "environment"],
  status: ["status"],
  ownerEmail: ["owner", "owner email", "email"],
  businessName: ["business", "company", "business name"],
  notes: ["notes", "note"]
};

labelAliases.databases = {
  dbName: ["database", "db", "database name"],
  host: ["host", "hostname"],
  port: ["port"],
  engine: ["engine", "type"],
  ownerEmail: ["owner", "owner email", "email"],
  businessName: ["business", "company", "business name"],
  notes: ["notes", "note"]
};

const singularLabel: Record<SheetKey, string> = {
  projects: "project",
  leads: "lead",
  revenue: "revenue entry",
  team: "team member",
  content: "content item",
  services: "service",
  shopping: "shopping item",
  timetable: "time slot",
  servers: "server",
  databases: "database"
};

singularLabel.servers = "server";
singularLabel.databases = "database";
const assistantWeekdayKeys = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
const assistantWeekdayLabels: Record<(typeof assistantWeekdayKeys)[number], string> = {
  sunday: "Sunday",
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday"
};

type AssistantIntent =
  | "count"
  | "summary"
  | "pending-amount"
  | "pending-projects"
  | "convert-lead"
  | "draft-collections"
  | "content-plan"
  | "ceo-report"
  | "attention-today"
  | "weekly-earnings"
  | "cash-flow-blockers"
  | "financial-query"
  | "show-overdue"
  | "search"
  | "add-column"
  | "delete-row"
  | "edit-row"
  | "add-row"
  | "create-meet"
  | "greeting"
  | "smalltalk"
  | "generate-ideas";
  

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type VoiceOption = {
  name: string;
  label: string;
};

type SpeechRecognitionLike = {
  start: () => void;
  stop: () => void;
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
};

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

const VOICE_ENABLED_STORAGE_KEY = "pixelkode_voice_replies_enabled";
const VOICE_NAME_STORAGE_KEY = "pixelkode_voice_name";
const VOICE_RATE_STORAGE_KEY = "pixelkode_voice_rate";
const EXTERNAL_VOICE_OPTIONS: VoiceOption[] = [
  { name: "cedar", label: "Cedar - Warm" },
  { name: "marin", label: "Marin - Natural" },
  { name: "coral", label: "Coral - Cheerful" },
  { name: "sage", label: "Sage - Calm" },
  { name: "alloy", label: "Alloy - Neutral" },
  { name: "nova", label: "Nova - Bright" }
];

function readStoredVoiceEnabled() {
  if (typeof window === "undefined") return true;

  try {
    const raw = window.localStorage.getItem(VOICE_ENABLED_STORAGE_KEY);
    return raw === null ? true : raw === "true";
  } catch {
    return true;
  }
}

function readStoredVoiceName() {
  if (typeof window === "undefined") return "";

  try {
    return window.localStorage.getItem(VOICE_NAME_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function stripMarkdownForSpeech(text: string) {
  return text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/#{1,6}\s*/g, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function buildSpokenSummary(text: string) {
  const cleaned = stripMarkdownForSpeech(text);
  if (!cleaned) return "";

  const sentences = cleaned
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  const summaryParts: string[] = [];
  let length = 0;

  for (const sentence of sentences) {
    if (length + sentence.length > 180 && summaryParts.length > 0) {
      break;
    }

    summaryParts.push(sentence);
    length += sentence.length + 1;

    if (summaryParts.length >= 2 || length >= 140) {
      break;
    }
  }

  return (summaryParts.join(" ") || cleaned.slice(0, 180)).trim();
}

function readStoredVoiceRate() {
  if (typeof window === "undefined") return 1.18;

  try {
    const raw = Number(window.localStorage.getItem(VOICE_RATE_STORAGE_KEY) ?? "1.18");
    return Number.isFinite(raw) ? Math.min(Math.max(raw, 0.8), 1.6) : 1.18;
  } catch {
    return 1.18;
  }
}

function buildMessage(role: ChatMessage["role"], content: string): ChatMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content
  };
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function inferSheetKey(pathname: string): SheetKey | null {
  const segment = pathname.split("/")[1];
  return sheetKeys.includes(segment as SheetKey) ? (segment as SheetKey) : null;
}

function detectSheetKey(prompt: string, pathname: string) {
  const lowerPrompt = prompt.toLowerCase();
  const aliasMap: Array<{ sheetKey: SheetKey; aliases: string[] }> = [
    { sheetKey: "projects", aliases: ["project", "projects"] },
    { sheetKey: "leads", aliases: ["lead", "leads"] },
    { sheetKey: "revenue", aliases: ["revenue", "finance", "payment", "payments"] },
    { sheetKey: "team", aliases: ["team", "employee", "employees", "member", "members", "staff"] },
    { sheetKey: "content", aliases: ["content", "post", "posts"] },
    { sheetKey: "services", aliases: ["service", "services", "offer", "offers"] },
    { sheetKey: "shopping", aliases: ["shopping", "shopping list", "buy", "purchase", "purchases"] },
    { sheetKey: "timetable", aliases: ["timetable", "schedule", "routine", "calendar block"] },
    { sheetKey: "servers", aliases: ["server", "servers", "infra", "infrastructure", "hosting"] },
    { sheetKey: "databases", aliases: ["database", "databases", "db", "sql", "postgres", "mysql"] }
  ];

  const explicitMatch = sheetKeys.find(
    (sheetKey) =>
      lowerPrompt.includes(`${sheetKey} page`) ||
      lowerPrompt.includes(`in ${sheetKey}`) ||
      lowerPrompt.includes(`on ${sheetKey}`) ||
      lowerPrompt.startsWith(sheetKey)
  );

  if (explicitMatch) {
    return explicitMatch;
  }

  const aliasMatch = aliasMap.find(({ aliases }) =>
    aliases.some((alias) => new RegExp(`\\b${escapeRegExp(alias)}\\b`, "i").test(lowerPrompt))
  );

  return aliasMatch?.sheetKey ?? inferSheetKey(pathname);
}

function detectIntent(prompt: string): AssistantIntent | "today-followups" {
  const lowerPrompt = prompt.toLowerCase();
  // Greetings and small talk
  if (/\b(hello|hi|hey|good morning|good afternoon|good evening)\b/i.test(lowerPrompt)) {
    return "greeting";
  }
  if (/\b(how are you|what's up|how's it going|how do you do|what can you do|who are you|who made you|your name)\b/i.test(lowerPrompt)) {
    return "smalltalk";
  }

  if (/\b(how many|number of|count)\b/i.test(lowerPrompt) && !/\b(delete|remove)\b/i.test(lowerPrompt)) {
    return "count";
  }

  if (/\b(summary|summarize|overview|current status|current state|analyze|analysis|full analysis|entire data|whole data)\b/i.test(lowerPrompt)) {
    return "summary";
  }

  if (
    /\b(server status|server health|database status|database health|infra status|infra health|shopping status|shopping pending|today(?:'s)? timetable|today(?:'s)? schedule|tomorrow(?:'s)? timetable|tomorrow(?:'s)? schedule|what is my timetable|show my timetable|show schedule)\b/i.test(
      lowerPrompt
    )
  ) {
    return "summary";
  }

  if (
    /\b(pending amount|pending balance|outstanding amount|amount due|remaining amount|how much .*pending|how much .*outstanding|what is the pending amount|what's the pending amount|how much do i still have to get|still have to get)\b/i.test(
      lowerPrompt
    )
  ) {
    return "pending-amount";
  }

  if (
    /\b(those projects|those\s+\d+\s+projects|those two projects|which projects|what projects|what are those projects|what are those\s+\d+\s+projects|what are those two projects|can you say me|tell me those projects|show me those projects|pending projects|open projects|projects pending|which ones are pending)\b/i.test(
      lowerPrompt
    )
  ) {
    return "pending-projects";
  }

  if (
    /\b(convert (?:this |that )?lead|move (?:this |that )?lead to project|add project from (?:this |that )?lead|create project from lead|turn lead into project)\b/i.test(
      lowerPrompt
    )
  ) {
    return "convert-lead";
  }

  if (
    /\b(pending collections|collection follow[- ]?ups|draft follow[- ]?up messages|draft collection messages|payment follow[- ]?ups|follow[- ]?up messages for pending payments)\b/i.test(
      lowerPrompt
    )
  ) {
    return "draft-collections";
  }

  if (
    /\b(content plan|generate content plan|content calendar|content strategy from services|plan content from leads|content from services and leads)\b/i.test(
      lowerPrompt
    )
  ) {
    return "content-plan";
  }

  if (/\b(weekly ceo report|ceo report|weekly report|executive weekly report)\b/i.test(lowerPrompt)) {
    return "ceo-report";
  }

  if (
    /\b(what needs attention today|needs attention today|attention today|show me what needs attention today|what should i do today|urgent today|today's attention)\b/i.test(
      lowerPrompt
    )
  ) {
    return "attention-today";
  }

  if (
    /\b(what did we earn this week|what did we earn|earn this week|this week earnings|weekly earnings|revenue this week|sales this week|income this week)\b/i.test(
      lowerPrompt
    )
  ) {
    return "weekly-earnings";
  }

  if (
    /\b(which projects are blocking cash flow|cash flow blockers|blocking cash flow|what is blocking cash flow|projects blocking cash flow|cashflow blockers|payment blockers)\b/i.test(
      lowerPrompt
    )
  ) {
    return "cash-flow-blockers";
  }

  if (
    /\b(revenue|income|expense|expenses|profit|profitability|money|cash|collection|collect|collecting|amount due|outstanding|pending amount|left to collect|how much is left to collect|how much is collected|money picture|finance snapshot|cash status|cash situation)\b/i.test(
      lowerPrompt
    )
  ) {
    return "financial-query";
  }

  if (lowerPrompt.includes("show overdue") || lowerPrompt.includes("overdue tasks")) {
    return "show-overdue";
  }

  if (/follow[- ]?ups? (today|for today|due today|today's)/i.test(lowerPrompt) ||
      /any follow[- ]?ups today/i.test(lowerPrompt) ||
      /today.*follow[- ]?ups?/i.test(lowerPrompt) ||
      /follow[- ]?ups? due today/i.test(lowerPrompt)) {
    return "today-followups";
  }

  if (lowerPrompt.startsWith("search ") || lowerPrompt.includes("search records")) {
    return "search";
  }

  if (/\b(content ideas|content idea|give me some content|suggest content|suggest (?:some )?content|content suggestions|content ideas)\b/i.test(lowerPrompt)) {
    return "generate-ideas";
  }

  if (/\b(meet|meeting|google meet)\b/i.test(lowerPrompt) && /\b(create|generate|start|schedule|instant)\b/i.test(lowerPrompt)) {
    return "create-meet";
  }

  if (/\b(add column|new column|create column)\b/i.test(lowerPrompt)) {
    return "add-column";
  }

  if (/\b(delete|remove)\b/i.test(lowerPrompt)) {
    return "delete-row";
  }

  if (/\b(edit|update|change|set|mark)\b/i.test(lowerPrompt)) {
    return "edit-row";
  }

  return "add-row";
}

function extractDeleteCount(prompt: string) {
  const numericMatch = prompt.match(/(?:delete|remove)\s+(?:the\s+)?last\s+(\d+)\s+rows?/i);
  if (numericMatch?.[1]) {
    return Math.max(1, Number(numericMatch[1]));
  }

  const wordMatch = prompt.match(/(?:delete|remove)\s+(?:the\s+)?last\s+([a-z]+)\s+rows?/i);
  if (wordMatch?.[1]) {
    const wordToNumber: Record<string, number> = {
      one: 1,
      two: 2,
      three: 3,
      four: 4,
      five: 5,
      six: 6,
      seven: 7,
      eight: 8,
      nine: 9,
      ten: 10
    };

    const parsed = wordToNumber[wordMatch[1].toLowerCase()];
    if (parsed) return parsed;
  }

  if (/(?:delete|remove)\s+(?:the\s+)?last\s+row/i.test(prompt)) {
    return 1;
  }

  return null;
}

function castAssistantValue(column: SheetColumn, rawValue: string): CellValue {
  if (column.type === "number") {
    const numeric = rawValue.replace(/[^0-9.]/g, "");
    return numeric ? Number(numeric) : 0;
  }

  return rawValue.trim();
}

function cleanExtractedValue(value: string) {
  return value.replace(/^["']|["']$/g, "").replace(/^(?:named|called|naming)\s+/i, "").replace(/\s+/g, " ").trim();
}

function normalizePromptForDedup(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
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
  values[column.id] = matchColumnOption(sheetKey, column, trimmed) ?? castAssistantValue(column, trimmed);
}

function applyLooseOptionMatches(prompt: string, sheetKey: SheetKey, columns: SheetColumn[], values: Record<string, CellValue>) {
  const lowerPrompt = prompt.toLowerCase();

  columns.forEach((column) => {
    if (values[column.id] !== undefined) return;
    const matchedOption = getColumnOptions(sheetKey, column).find((option) => {
      const normalizedOption = normalizeToken(option);
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
    revenue: ["entryType"],
    shopping: ["purchaseStatus", "priority", "listType"],
    timetable: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
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

function extractFromPrompt(
  prompt: string,
  sheetKey: SheetKey,
  columns: SheetColumn[],
  existingDraft: Record<string, CellValue>,
  options?: { explicitOnly?: boolean }
) {
  const lowerPrompt = prompt.toLowerCase();
  const nextValues: Record<string, CellValue> = { ...existingDraft };

  columns.forEach((column) => {
    const aliases = (labelAliases[sheetKey]?.[column.id] ?? [column.label.toLowerCase(), column.id.toLowerCase()]).sort(
      (left, right) => right.length - left.length
    );

    for (const alias of aliases) {
      const patterns = [
        new RegExp(`(?:set|change|edit|update)\\s+${escapeRegExp(alias)}\\s+(?:to|as|=|:)?\\s*([^,.;\\n]+?)(?=\\s+(?:and|with)\\s+[a-z]|[,.;\\n]|$)`, "i"),
        new RegExp(`(?:${escapeRegExp(alias)})\\s+is\\s+([^,.;\\n]+?)(?=\\s+(?:and|with|keep)\\s+[a-z]|[,.;\\n]|$)`, "i"),
        new RegExp(`(?:${escapeRegExp(alias)})\\s+(?:named|called|naming)\\s+([^,.;\\n]+?)(?=\\s+(?:and|with|keep|leave)\\s+[a-z]|[,.;\\n]|$)`, "i"),
        new RegExp(`${escapeRegExp(alias)}\\s*(?:to|as|is|=|:)?\\s*([^,.;\\n]+?)(?=\\s+(?:and|with)\\s+[a-z]|[,.;\\n]|$)`, "i")
      ];

      for (const pattern of patterns) {
        const match = prompt.match(pattern);
        if (!match?.[1]) continue;
        setDraftValue(sheetKey, column, match[1], nextValues);
        return;
      }
    }

    const matchedOption = getColumnOptions(sheetKey, column).find((option) => lowerPrompt.includes(option.toLowerCase()));
    if (matchedOption) {
      nextValues[column.id] = matchedOption;
    }
  });

  const primaryColumnId = getPrimaryColumn(sheetKey);
  const primaryColumn = columns.find((column) => column.id === primaryColumnId);

  if (primaryColumn && !nextValues[primaryColumn.id]) {
    const namePatterns = [
      /(?:named|called)\s+([^,.;\n]+?)(?=\s+(?:with|and)\s+[a-z]|[,.;\n]|$)/i,
      /(?:naming)\s+([^,.;\n]+?)(?=\s+(?:with|and|keep|leave)\s+[a-z]|[,.;\n]|$)/i,
      /(?:for|of)\s+([^,.;\n]+?)(?=\s+(?:with|and)\s+[a-z]|[,.;\n]|$)/i,
      /(?:add|create)\s+(?:a|an)?\s*[a-z\s]*?(?:named|called|naming)?\s*([^,.;\n]+?)(?=\s+(?:with|and|keep|leave)\s+[a-z]|[,.;\n]|$)/i
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

  if (!options?.explicitOnly) {
    applyLooseOptionMatches(prompt, sheetKey, columns, nextValues);
  }

  return nextValues;
}

function shouldKeepRemainingFieldsEmpty(prompt: string) {
  return /(?:keep|leave).*(?:remaining|rest|other).*(?:empty|blank)/i.test(prompt) || /all fields.*(?:empty|blank)/i.test(prompt);
}

function shouldUseLiteralMode(prompt: string) {
  return shouldKeepRemainingFieldsEmpty(prompt) || /\b(?:exactly|strictly|only|just)\b/i.test(prompt) || /(?:do not|don't)\s+(?:change|fill|set|touch|update|guess)/i.test(prompt);
}

function missingColumns(sheetKey: SheetKey, columns: SheetColumn[], values: Record<string, CellValue>) {
  const required = new Set(getRequiredColumns(sheetKey));
  return columns.filter((column) => required.has(column.id) && (values[column.id] === undefined || values[column.id] === "" || values[column.id] === 0));
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
  if (lowerPrompt.includes("dropdown") || lowerPrompt.includes("select")) return "select";
  if (lowerPrompt.includes("date")) return "date";
  if (lowerPrompt.includes("number")) return "number";
  if (lowerPrompt.includes("textarea") || lowerPrompt.includes("long text")) return "textarea";
  return "text";
}

function extractMeetRequest(prompt: string) {
  const titleMatch =
    prompt.match(/(?:title|meeting title)\s*(?:is|:|=)?\s*["']?([^,"'\n]+)["']?/i) ??
    prompt.match(/(?:for|called|named)\s+["']?([^,"'\n]+)["']?(?=\s+(?:with|at|on|tomorrow|today)|$)/i);
  const emailMatch = prompt.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const durationMatch = prompt.match(/(\d+)\s*(?:min|mins|minutes)/i);
  const timeMatch = prompt.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  const dateMatch = prompt.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  const isInstant = /\binstant\b/i.test(prompt) || /\bnow\b/i.test(prompt);
  const isScheduled = /\b(schedule|scheduled|tomorrow|today|at)\b/i.test(prompt) && !isInstant;

  let scheduledDate = "";
  if (dateMatch?.[1]) {
    scheduledDate = dateMatch[1];
  } else if (/\btomorrow\b/i.test(prompt)) {
    const next = new Date();
    next.setDate(next.getDate() + 1);
    scheduledDate = next.toISOString().slice(0, 10);
  } else if (/\btoday\b/i.test(prompt)) {
    scheduledDate = new Date().toISOString().slice(0, 10);
  }

  let scheduledTime = "";
  if (timeMatch) {
    let hour = Number(timeMatch[1]);
    const minute = timeMatch[2] ? Number(timeMatch[2]) : 0;
    const meridiem = timeMatch[3].toLowerCase();
    if (meridiem === "pm" && hour !== 12) hour += 12;
    if (meridiem === "am" && hour === 12) hour = 0;
    scheduledTime = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }

  return {
    attendeeEmail: emailMatch?.[0] ?? "",
    durationMinutes: durationMatch?.[1] ? Number(durationMatch[1]) : 30,
    mode: isScheduled ? "scheduled" : "instant",
    scheduledDate,
    scheduledTime,
    title: titleMatch?.[1]?.trim() ?? "Google Meet Session"
  } as const;
}

function resolveTimetableDay(prompt?: string, reference = new Date()) {
  const lowerPrompt = (prompt ?? "").toLowerCase();
  if (lowerPrompt.includes("tomorrow")) {
    return assistantWeekdayKeys[(reference.getDay() + 1) % assistantWeekdayKeys.length];
  }

  for (const dayKey of assistantWeekdayKeys) {
    if (lowerPrompt.includes(dayKey)) {
      return dayKey;
    }
  }

  return assistantWeekdayKeys[reference.getDay()];
}

function formatTimetablePlan(rows: Record<string, unknown>[], prompt?: string) {
  const dayKey = resolveTimetableDay(prompt);
  const dayLabel = assistantWeekdayLabels[dayKey];
  const entries = rows
    .map((row) => ({
      slot: String(row.slotLabel ?? "Slot"),
      timeRange: String(row.timeRange ?? ""),
      value: String(row[dayKey] ?? "").trim()
    }))
    .filter((entry) => entry.value);

  if (entries.length === 0) {
    return `${dayLabel} is still open in the timetable. Nothing is filled there yet.`;
  }

  const preview = entries
    .slice(0, 6)
    .map((entry, index) => `${index + 1}. ${entry.slot}${entry.timeRange ? ` (${entry.timeRange})` : ""} - ${entry.value}`)
    .join("\n");

  return [`${dayLabel} has ${entries.length} planned slot${entries.length === 1 ? "" : "s"}.`, preview].join("\n");
}

function formatCountReply(sheetKey: SheetKey, sheet: SheetData) {
  const count = sheet.rows.length;
  if (sheetKey === "shopping") {
    const pending = sheet.rows.filter((row) => ["To Buy", "Ordered"].includes(String(row.purchaseStatus ?? ""))).length;
    return `There are ${count} shopping items in total, with ${pending} still open to buy.`;
  }

  if (sheetKey === "servers") {
    const healthy = sheet.rows.filter((row) => String(row.status ?? "") === "Healthy").length;
    const alerts = sheet.rows.filter((row) => ["Warning", "Down"].includes(String(row.status ?? ""))).length;
    return `You're tracking ${count} servers right now: ${healthy} healthy and ${alerts} needing attention.`;
  }

  if (sheetKey === "databases") {
    const engines = new Set(sheet.rows.map((row) => String(row.engine ?? "")).filter(Boolean));
    return `There are ${count} databases in the workspace across ${engines.size || 1} engine type${engines.size === 1 ? "" : "s"}.`;
  }

  if (sheetKey === "timetable") {
    const filled = sheet.rows.reduce(
      (sum, row) =>
        sum +
        assistantWeekdayKeys.filter((dayKey) => String(row[dayKey] ?? "").trim() !== "").length,
      0
    );
    return `The timetable has ${count} time slots with ${filled} filled plan cells across the week.`;
  }

  const noun = count === 1 ? singularLabel[sheetKey] : `${singularLabel[sheetKey]}s`;
  return `I found ${count} ${noun}${count === 1 ? "" : "s"} in ${sheetKey}.`;
}

function formatSummaryReply(sheetKey: SheetKey, sheet: SheetData, prompt?: string) {
  const count = sheet.rows.length;
  if (count === 0) {
    return `I don't see any ${sheetKey} data yet.`;
  }

  if (sheetKey === "shopping") {
    const pending = sheet.rows.filter((row) => ["To Buy", "Ordered"].includes(String(row.purchaseStatus ?? "")));
    const company = sheet.rows.filter((row) => String(row.listType ?? "") === "Company").length;
    const personal = sheet.rows.filter((row) => String(row.listType ?? "") === "Personal").length;
    const urgent = pending
      .filter((row) => String(row.priority ?? "") === "High")
      .slice(0, 3)
      .map((row) => String(row.itemName ?? "Item"));

    return [
      `Shopping is tracking ${count} items in total.`,
      `${pending.length} items are still open, split as ${company} company and ${personal} personal entries.`,
      urgent.length > 0 ? `High-priority items waiting now: ${urgent.join(", ")}.` : "No high-priority shopping items are waiting right now."
    ].join(" ");
  }

  if (sheetKey === "timetable") {
    return formatTimetablePlan(sheet.rows, prompt);
  }

  if (sheetKey === "servers") {
    const healthy = sheet.rows.filter((row) => String(row.status ?? "") === "Healthy").length;
    const warnings = sheet.rows.filter((row) => ["Warning", "Down"].includes(String(row.status ?? "")));
    const production = sheet.rows.filter((row) => String(row.environment ?? "") === "Production").length;

    return [
      `Infrastructure is tracking ${count} servers with ${healthy} healthy and ${warnings.length} in warning or down state.`,
      `${production} of them are marked as production.`,
      warnings.length > 0
        ? `Servers needing attention: ${warnings.slice(0, 3).map((row) => String(row.serverName ?? "Server")).join(", ")}.`
        : "No server alerts are active right now."
    ].join(" ");
  }

  if (sheetKey === "databases") {
    const engineCounts = new Map<string, number>();
    sheet.rows.forEach((row) => {
      const engine = String(row.engine ?? "Unknown");
      engineCounts.set(engine, (engineCounts.get(engine) ?? 0) + 1);
    });
    const engineSummary = Array.from(engineCounts.entries())
      .slice(0, 4)
      .map(([engine, total]) => `${engine}: ${total}`)
      .join(", ");
    const hosts = new Set(sheet.rows.map((row) => String(row.host ?? "")).filter(Boolean)).size;

    return `Database inventory has ${count} entries across ${hosts} host${hosts === 1 ? "" : "s"}. Engine mix: ${engineSummary || "not filled yet"}.`;
  }

  const primaryColumnId = getPrimaryColumn(sheetKey);
  const preview = sheet.rows
    .slice(0, 3)
    .map((row) => String(row[primaryColumnId] ?? singularLabel[sheetKey]))
    .filter(Boolean)
    .join(", ");

  const noun = count === 1 ? singularLabel[sheetKey] : `${singularLabel[sheetKey]}s`;
  return `Here's a quick look at ${sheetKey}: ${count} ${noun}${count === 1 ? "" : "s"}, with ${preview} near the top.`;
}

function formatPendingAmountReply(sheetKey: SheetKey, sheet: SheetData) {
  if (sheetKey !== "projects") {
    return `That one lives in projects. Ask me about projects and I'll show the outstanding total.`;
  }

  const projectRows = sheet.rows;
  if (projectRows.length === 0) {
    return "There are no projects yet, so nothing is pending right now.";
  }

  const totalPending = projectRows.reduce((sum, row) => sum + Number(row.pendingAmount ?? 0), 0);
  const openProjects = projectRows.filter((row) => Number(row.pendingAmount ?? 0) > 0).length;

  return `You still have ${formatCurrency(totalPending)} left to collect across ${openProjects} project${openProjects === 1 ? "" : "s"}.`;
}

function formatPendingProjectsReply(sheets: Record<SheetKey, SheetData>) {
  const projects = sheets.projects?.rows ?? [];
  const pendingProjects = projects
    .filter((row) => Number(row.pendingAmount ?? 0) > 0)
    .sort((left, right) => Number(right.pendingAmount ?? 0) - Number(left.pendingAmount ?? 0));

  if (pendingProjects.length === 0) {
    return "Nothing is pending in projects right now.";
  }

  const breakdown = pendingProjects.slice(0, 5).map((project, index) => {
    const projectName = String(project.projectName ?? `Project ${index + 1}`);
    const clientName = String(project.clientName ?? "");
    const pendingAmount = Number(project.pendingAmount ?? 0);
    const projectValue = Number(project.projectValue ?? 0);
    const suffix = clientName ? ` (${clientName})` : "";
    return `${index + 1}. ${projectName}${suffix} — ${formatCurrency(pendingAmount)} pending out of ${formatCurrency(projectValue)}`;
  }).join("\n");

  return [
    "Yep — these are the projects still waiting on payment:",
    breakdown,
    "If you want, I can also tell you which one is the biggest blocker first."
  ].join("\n\n");
}

function formatFinancialReply(sheets: Record<SheetKey, SheetData>) {
  const revenueRows = sheets.revenue?.rows ?? [];
  const projectRows = sheets.projects?.rows ?? [];

  const collectedRevenue = revenueRows
    .filter((row) => String(row.entryType ?? "").toLowerCase() === "income")
    .reduce((sum, row) => sum + Number(row.amount ?? 0), 0);

  const expenses = revenueRows
    .filter((row) => ["expense", "payroll", "personal use"].includes(String(row.entryType ?? "").toLowerCase()))
    .reduce((sum, row) => sum + Number(row.amount ?? 0), 0);

  const pendingCollection = projectRows.reduce((sum, row) => sum + Number(row.pendingAmount ?? 0), 0);
  const openProjects = projectRows
    .filter((row) => Number(row.pendingAmount ?? 0) > 0)
    .sort((left, right) => Number(right.pendingAmount ?? 0) - Number(left.pendingAmount ?? 0))
    .slice(0, 5);

  const netProfit = collectedRevenue - expenses;

  const breakdown = openProjects.length
    ? openProjects
        .map((project, index) => {
          const projectName = String(project.projectName ?? project.clientName ?? `Project ${index + 1}`);
          const clientName = String(project.clientName ?? "");
          const projectValue = Number(project.projectValue ?? 0);
          const pendingAmount = Number(project.pendingAmount ?? 0);
          const suffix = clientName ? ` (${clientName})` : "";
          return `${index + 1}. ${projectName}${suffix} — pending ${formatCurrency(pendingAmount)} of ${formatCurrency(projectValue)}`;
        })
        .join("\n")
    : "No projects are waiting on payment right now.";

  return [
    "Here’s the money picture from your live data:",
    `Income in: ${formatCurrency(collectedRevenue)}`,
    `Outflow: ${formatCurrency(expenses)}`,
    `Net profit: ${formatCurrency(netProfit)}`,
    `Still to collect: ${formatCurrency(pendingCollection)} across ${openProjects.length} project${openProjects.length === 1 ? "" : "s"}.`,
    `Project breakdown:\n${breakdown}`
  ].join("\n");
}

function getStartOfWeek(date = new Date()) {
  const start = new Date(date);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

function formatAttentionReply(sheets: Record<SheetKey, SheetData>, alerts: OperationAlert[]) {
  const leads = sheets.leads?.rows ?? [];
  const projects = sheets.projects?.rows ?? [];
  const shopping = sheets.shopping?.rows ?? [];
  const servers = sheets.servers?.rows ?? [];
  const timetable = sheets.timetable?.rows ?? [];
  const today = new Date();

  const todaysFollowUps = leads.filter((row) => {
    if (!row.followUpDate) return false;
    const date = new Date(String(row.followUpDate));
    return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate();
  });

  const overdueProjects = projects
    .filter((row) => String(row.projectStatus ?? "") !== "Completed" && row.deliveryDate && new Date(String(row.deliveryDate)) < today)
    .slice(0, 5);

  const unreadAlerts = alerts.slice(0, 5);
  const openShopping = shopping.filter((row) => ["To Buy", "Ordered"].includes(String(row.purchaseStatus ?? ""))).slice(0, 3);
  const infraWarnings = servers.filter((row) => ["Warning", "Down"].includes(String(row.status ?? ""))).slice(0, 3);

  const followUpText = todaysFollowUps.length
    ? todaysFollowUps
        .map((lead, index) => `${index + 1}. ${String(lead.businessName ?? lead.contactName ?? "Lead")} — ${String(lead.leadStatus ?? lead.callStatus ?? "Follow up")}`)
        .join("\n")
    : "Nothing is due today. Nice and clear.";

  const projectText = overdueProjects.length
    ? overdueProjects
        .map((project, index) => `${index + 1}. ${String(project.projectName ?? "Project")} — due ${String(project.deliveryDate ?? "unknown")}`)
        .join("\n")
    : "No overdue projects are slowing you down today.";

  const alertText = unreadAlerts.length
    ? unreadAlerts.map((alert, index) => `${index + 1}. ${alert.title} — ${alert.message}`).join("\n")
    : "No urgent alerts right now.";
  const shoppingText = openShopping.length
    ? openShopping.map((item, index) => `${index + 1}. ${String(item.itemName ?? "Item")} - ${String(item.purchaseStatus ?? "Open")}`).join("\n")
    : "No pending shopping items right now.";
  const infraText = infraWarnings.length
    ? infraWarnings.map((server, index) => `${index + 1}. ${String(server.serverName ?? "Server")} - ${String(server.status ?? "Alert")}`).join("\n")
    : "Infrastructure looks stable right now.";
  const timetableText = formatTimetablePlan(timetable, "today");

  return [
    "Here’s what I’d tackle first today:",
    `Follow-ups today:\n${followUpText}`,
    `Projects that need attention:\n${projectText}`,
    `Operational alerts:\n${alertText}`,
    `Shopping queue:\n${shoppingText}`,
    `Infrastructure watch:\n${infraText}`,
    `Timetable focus:\n${timetableText}`
  ].join("\n\n");
}

function formatWeeklyEarningsReply(sheets: Record<SheetKey, SheetData>) {
  const revenueRows = sheets.revenue?.rows ?? [];
  const projectRows = sheets.projects?.rows ?? [];
  const startOfWeek = getStartOfWeek();
  const endOfWeek = new Date();

  const weekIncomeRows = revenueRows.filter((row) => {
    const entryType = String(row.entryType ?? "").toLowerCase();
    const dateText = String(row.entryDate ?? "");
    if (entryType !== "income" || !dateText) return false;
    const date = new Date(dateText);
    return date >= startOfWeek && date <= endOfWeek;
  });

  const weeklyIncome = weekIncomeRows.reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
  const weeklyProjectReceipts = projectRows.reduce((sum, row) => sum + Number(row.amountReceived ?? 0), 0);

  const topEntries = weekIncomeRows
    .slice()
    .sort((left, right) => Number(right.amount ?? 0) - Number(left.amount ?? 0))
    .slice(0, 5)
    .map((row, index) => `${index + 1}. ${String(row.sourceName ?? row.entryDate ?? "Income")} — ${formatCurrency(Number(row.amount ?? 0))}`)
    .join("\n");

  return [
    `So far this week, revenue in is ${formatCurrency(weeklyIncome)}.`,
    `Projects have brought in ${formatCurrency(weeklyProjectReceipts)} overall.`,
    topEntries ? `Top income entries this week:\n${topEntries}` : "No income entries were recorded this week yet."
  ].join("\n\n");
}

function formatCashFlowBlockersReply(sheets: Record<SheetKey, SheetData>) {
  const projects = sheets.projects?.rows ?? [];

  const blockers = projects
    .filter((row) => Number(row.pendingAmount ?? 0) > 0 || String(row.projectStatus ?? "") !== "Completed")
    .sort((left, right) => Number(right.pendingAmount ?? 0) - Number(left.pendingAmount ?? 0))
    .slice(0, 6);

  if (blockers.length === 0) {
    return "Nothing is blocking cash flow right now.";
  }

  const blockerText = blockers
    .map((project, index) => {
      const projectName = String(project.projectName ?? "Project");
      const clientName = String(project.clientName ?? "");
      const pendingAmount = Number(project.pendingAmount ?? 0);
      const projectValue = Number(project.projectValue ?? 0);
      const dueDate = String(project.deliveryDate ?? "");
      const suffix = clientName ? ` (${clientName})` : "";
      const dateSuffix = dueDate ? ` | due ${dueDate}` : "";
      return `${index + 1}. ${projectName}${suffix} — pending ${formatCurrency(pendingAmount)} of ${formatCurrency(projectValue)}${dateSuffix}`;
    })
    .join("\n");

  return [
    "These are the main cash-flow blockers right now:",
    blockerText,
    "If you want the fastest win, collect the pending amounts and close the overdue deliveries first."
  ].join("\n\n");
}

function formatOverdueDate(value: unknown) {
  const text = String(value ?? "").trim();
  return text || "No date";
}

export function SmartAssistant() {
  const pathname = usePathname();
  const sheets = useBusinessStore((state) => state.sheets);
  const alerts = useBusinessStore((state) => state.alerts);
  const addRowWithValues = useBusinessStore((state) => state.addRowWithValues);
  const addColumn = useBusinessStore((state) => state.addColumn);
  const deleteRow = useBusinessStore((state) => state.deleteRow);
  const updateCell = useBusinessStore((state) => state.updateCell);

  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [draft, setDraft] = useState<Record<string, CellValue>>({});
  const [activeSheetKey, setActiveSheetKey] = useState<SheetKey | null>(inferSheetKey(pathname) ?? "projects");
  const [messages, setMessages] = useState<ChatMessage[]>([
    buildMessage(
      "assistant",
      "I'm your voice-enabled operations assistant. Ask me normal questions like a chat, and I'll answer directly or execute commands when needed."
    )
  ]);
  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [voiceRepliesEnabled, setVoiceRepliesEnabled] = useState(readStoredVoiceEnabled);
  const [availableVoices] = useState<VoiceOption[]>(EXTERNAL_VOICE_OPTIONS);
  const [selectedVoiceName, setSelectedVoiceName] = useState(readStoredVoiceName() || EXTERNAL_VOICE_OPTIONS[0]?.name || "cedar");
  const [voiceRate, setVoiceRate] = useState(readStoredVoiceRate);
  const [aiStatus, setAiStatus] = useState<{ configured: boolean; provider: string; model: string } | null>(null);
  const [voiceMode, setVoiceMode] = useState<"external" | "browser">("external");

  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      if (!voiceRepliesEnabled) {
        window.speechSynthesis.cancel();
      }
      if (!voiceRepliesEnabled && currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      if (!voiceRepliesEnabled && currentAudioUrlRef.current) {
        URL.revokeObjectURL(currentAudioUrlRef.current);
        currentAudioUrlRef.current = null;
      }
    }
  }, [voiceRepliesEnabled]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      window.localStorage.setItem(VOICE_ENABLED_STORAGE_KEY, String(voiceRepliesEnabled));
    } catch {
      // Ignore storage write failures for non-critical preferences.
    }
  }, [voiceRepliesEnabled]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      window.localStorage.setItem(VOICE_NAME_STORAGE_KEY, selectedVoiceName);
    } catch {
      // Ignore storage write failures for non-critical preferences.
    }
  }, [selectedVoiceName]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      window.localStorage.setItem(VOICE_RATE_STORAGE_KEY, String(voiceRate));
    } catch {
      // Ignore storage write failures for non-critical preferences.
    }
  }, [voiceRate]);

  useEffect(() => {
    if (voiceRepliesEnabled) {
      setVoiceMode("external");
    }
  }, [selectedVoiceName, voiceRate, voiceRepliesEnabled]);

  useEffect(() => {
    if (!open) return;
    if (aiStatusLoadedRef.current) return;

    const loadAiStatus = async () => {
      try {
        const response = await fetch("/api/ai/status", { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as { configured?: boolean; provider?: string; model?: string };
        setAiStatus({
          configured: Boolean(payload.configured),
          provider: payload.provider ?? "AI",
          model: payload.model ?? ""
        });
      } catch {
        setAiStatus(null);
      } finally {
        aiStatusLoadedRef.current = true;
      }
    };

    void loadAiStatus();
  }, [open]);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const acceptVoiceTranscriptRef = useRef(false);
  const isRecognitionActiveRef = useRef(false);
  const isRecognitionStartingRef = useRef(false);
  const latestTranscriptRef = useRef("");
  const silenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSubmittingVoiceRef = useRef(false);
  const suppressVoiceOnEndSubmitRef = useRef(false);
  const lastSubmittedPromptRef = useRef<{ text: string; time: number } | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const currentAudioUrlRef = useRef<string | null>(null);
  const aiStatusLoadedRef = useRef(false);

  const currentSheetKey = activeSheetKey ?? inferSheetKey(pathname) ?? "projects";
  const currentSheet = sheets[currentSheetKey];

  const previewColumns = useMemo(
    () => (currentSheet ? currentSheet.columns.filter((column) => draft[column.id] !== undefined && draft[column.id] !== "") : []),
    [currentSheet, draft]
  );

  function pushMessage(role: ChatMessage["role"], content: string) {
    setMessages((current) => [...current, buildMessage(role, content)]);
  }

  function stopCurrentSpeech() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }

    if (currentAudioUrlRef.current) {
      URL.revokeObjectURL(currentAudioUrlRef.current);
      currentAudioUrlRef.current = null;
    }
  }

  function speakWithBrowser(text: string) {
    if (!voiceRepliesEnabled || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-IN";
    utterance.rate = voiceRate;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }

  async function speakWithExternal(text: string) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2200);
    let response: Response;

    try {
      response = await fetch("/api/ai/speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        signal: controller.signal,
        body: JSON.stringify({
          text,
          voice: selectedVoiceName,
          rate: voiceRate
        })
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(payload.error ?? `Speech failed (${response.status})`);
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    currentAudioRef.current = audio;
    currentAudioUrlRef.current = audioUrl;
    audio.onended = () => {
      if (currentAudioUrlRef.current === audioUrl) {
        URL.revokeObjectURL(audioUrl);
        currentAudioUrlRef.current = null;
      }
      if (currentAudioRef.current === audio) {
        currentAudioRef.current = null;
      }
    };
    await audio.play();
  }

  async function speak(text: string) {
    const spokenText = buildSpokenSummary(text);
    if (!voiceRepliesEnabled || !spokenText) return;

    stopCurrentSpeech();

    if (voiceMode === "external") {
      try {
        await speakWithExternal(spokenText);
        return;
      } catch (error) {
        console.error("External voice playback failed", error);
        setVoiceMode("browser");
      }
    }

    speakWithBrowser(spokenText);
  }

  function reply(text: string) {
    pushMessage("assistant", text);
    void speak(text);
  }

  async function requestAIReply(userPrompt: string) {
    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prompt: userPrompt,
          messages: messages.slice(-8).map((message) => ({
            role: message.role,
            content: message.content
          })),
          currentSheetKey,
          pathname,
          meetHistory: readMeetHistory()
        })
      });

      const payload = (await response.json()) as {
        configured?: boolean;
        error?: string;
        message?: string;
      };

      if (!response.ok || !payload.message) {
        return {
          ok: false as const,
          error: payload.error ?? "AI did not return a response."
        };
      }

      return {
        ok: true as const,
        message: payload.message
      };
    } catch (error) {
      return {
        ok: false as const,
        error: error instanceof Error ? error.message : "AI request failed."
      };
    }
  }

  function startListening() {
    if (typeof window === "undefined") return;
    if (isRecognitionActiveRef.current || isRecognitionStartingRef.current) return;
    stopCurrentSpeech();
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;

    if (!Recognition) {
      reply("Speech recognition is not available in this browser. You can still type here, or we can wire this to external speech APIs next.");
      return;
    }

    if (!recognitionRef.current) {
      const recognition = new Recognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-IN";
      recognition.onresult = (event) => {
        if (!acceptVoiceTranscriptRef.current) return;
        const transcript =
          Array.from(event.results)
            .map((result) => result[0]?.transcript ?? "")
            .filter(Boolean)
            .at(-1)
            ?.trim() ?? "";
        if (!transcript) return;
        latestTranscriptRef.current = transcript;
        setLiveTranscript(transcript);
        setPrompt(transcript);
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
        }
        silenceTimeoutRef.current = setTimeout(() => {
          if (acceptVoiceTranscriptRef.current) {
            stopListening();
          }
        }, 150);
      };
      recognition.onerror = (event) => {
        isRecognitionActiveRef.current = false;
        isRecognitionStartingRef.current = false;
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
          silenceTimeoutRef.current = null;
        }
        setIsListening(false);
        reply(`I hit a voice input issue${event.error ? `: ${event.error}` : ""}. Try again or type your message.`);
      };
      recognition.onend = () => {
        isRecognitionActiveRef.current = false;
        isRecognitionStartingRef.current = false;
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
          silenceTimeoutRef.current = null;
        }
        setIsListening(false);
        acceptVoiceTranscriptRef.current = false;
        if (suppressVoiceOnEndSubmitRef.current) {
          suppressVoiceOnEndSubmitRef.current = false;
          latestTranscriptRef.current = "";
          return;
        }
        const finalTranscript = latestTranscriptRef.current.trim();
        if (finalTranscript && !isSubmittingVoiceRef.current) {
          isSubmittingVoiceRef.current = true;
          void submitPrompt(finalTranscript).finally(() => {
            isSubmittingVoiceRef.current = false;
            latestTranscriptRef.current = "";
          });
        } else if (!finalTranscript) {
          setPrompt("");
          setLiveTranscript("");
        }
      };
      recognition.onstart = () => {
        isRecognitionActiveRef.current = true;
        isRecognitionStartingRef.current = false;
      };
      recognitionRef.current = recognition;
    }

    setLiveTranscript("");
    latestTranscriptRef.current = "";
    acceptVoiceTranscriptRef.current = true;
    setIsListening(true);
    isRecognitionStartingRef.current = true;
    try {
      recognitionRef.current.start();
    } catch (error) {
      isRecognitionStartingRef.current = false;
      if (error instanceof DOMException && error.name === "InvalidStateError") {
        isRecognitionActiveRef.current = true;
        return;
      }
      setIsListening(false);
      acceptVoiceTranscriptRef.current = false;
      reply("Voice input could not start right now. Please try again.");
    }
  }

  function stopListening() {
    acceptVoiceTranscriptRef.current = false;
    isRecognitionStartingRef.current = false;
    isRecognitionActiveRef.current = false;
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    recognitionRef.current?.stop();
    setIsListening(false);
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
  }, [liveTranscript]);

  useEffect(() => {
    const handleAssistantPrompt = (event: Event) => {
      const customEvent = event as CustomEvent<{ prompt?: string; run?: boolean }>;
      if (!customEvent.detail?.prompt) return;
      setOpen(true);
      setPrompt(customEvent.detail.prompt);
      if (customEvent.detail.run) {
        void submitPrompt(customEvent.detail.prompt);
      }
    };

    const handleAssistantOpen = () => {
      setOpen(true);
      setTimeout(() => inputRef.current?.focus(), 0);
    };

    const handleAssistantVoice = () => {
      setOpen(true);
      startListening();
    };

    window.addEventListener("ops-assistant:prompt", handleAssistantPrompt as EventListener);
    window.addEventListener("ops-assistant:open", handleAssistantOpen);
    window.addEventListener("ops-assistant:voice", handleAssistantVoice);
    return () => {
      window.removeEventListener("ops-assistant:prompt", handleAssistantPrompt as EventListener);
      window.removeEventListener("ops-assistant:open", handleAssistantOpen);
      window.removeEventListener("ops-assistant:voice", handleAssistantVoice);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      stopCurrentSpeech();
    };
  }, []);

  const submitPrompt = async (incomingPrompt?: string) => {
    const trimmed = (incomingPrompt ?? prompt).trim();
    if (!trimmed) return;

    const lastSubmitted = lastSubmittedPromptRef.current;
    const normalizedPrompt = normalizePromptForDedup(trimmed);
    if (lastSubmitted && normalizePromptForDedup(lastSubmitted.text) === normalizedPrompt && Date.now() - lastSubmitted.time < 1800) {
      return;
    }
    lastSubmittedPromptRef.current = { text: trimmed, time: Date.now() };

    if (isListening) {
      suppressVoiceOnEndSubmitRef.current = true;
      latestTranscriptRef.current = "";
      stopListening();
    }

    acceptVoiceTranscriptRef.current = false;
    pushMessage("user", trimmed);
    setPrompt("");
    setLiveTranscript("");
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);

    const targetSheetKey = detectSheetKey(trimmed, pathname) ?? activeSheetKey ?? inferSheetKey(pathname) ?? "projects";
    const targetSheet = sheets[targetSheetKey];

    if (!targetSheet) {
      reply("I couldn't find that section. Try projects, leads, revenue, team, content, services, shopping, timetable, servers, or databases.");
      return;
    }

    setActiveSheetKey(targetSheetKey);


    const intent = detectIntent(trimmed);
    const aiPreferredIntents = new Set<AssistantIntent | "today-followups">([
      "greeting",
      "smalltalk",
      "generate-ideas",
      "summary",
      "pending-amount",
      "pending-projects",
      "attention-today",
      "weekly-earnings",
      "cash-flow-blockers",
      "financial-query",
      "show-overdue",
      "today-followups"
    ]);
    const isQuestionLike = /[?]$|\b(what|which|who|why|how|show|tell|can you|could you|would you|should i|suggest|advice|idea|ideas|strategy|help me|guide me|give me)\b/i.test(
      trimmed
    );
    const looksLikeExplicitMutation = /\b(add|create|delete|remove|edit|update|change|set|mark|convert|move)\b/i.test(trimmed);

    if (isQuestionLike && !looksLikeExplicitMutation) {
      const aiResult = await requestAIReply(trimmed);
      if (aiResult.ok) {
        reply(aiResult.message);
        return;
      }
      reply(`Gemini could not answer right now: ${aiResult.error}`);
      return;
    }

    if (aiPreferredIntents.has(intent)) {
      const aiResult = await requestAIReply(trimmed);
      if (aiResult.ok) {
        reply(aiResult.message);
        return;
      }
      if (isQuestionLike) {
        reply(`AI could not answer right now: ${aiResult.error}`);
        return;
      }
    }

    if (intent === "convert-lead") {
      const leadsSheet = sheets.leads;
      const projectsSheet = sheets.projects;

      if (!leadsSheet || leadsSheet.rows.length === 0) {
        reply("There are no leads available to convert right now.");
        return;
      }

      const leadMatch = findBestRowMatch(trimmed, "leads", leadsSheet);
      if (!leadMatch) {
        reply('Tell me which lead to convert, like "convert lead Acme Dental to project".');
        return;
      }

      const statusColumn = leadsSheet.columns.find((column) => column.id === "leadStatus");
      if (!statusColumn) {
        reply("I could not find the lead status column to complete the conversion.");
        return;
      }

      updateCell("leads", leadMatch.rowIndex, "leadStatus", "Converted");
      const leadName = String(
        leadMatch.row.businessName ??
          leadMatch.row.contactName ??
          leadMatch.primaryValue ??
          "Lead"
      );
      const currentProjectCount = projectsSheet?.rows.length ?? 0;

      setDraft({});
      reply(
        `${leadName} is now marked as Converted. The automation will move it into Projects automatically, and you should see the project list grow from ${currentProjectCount} if this was a new conversion.`
      );
      return;
    }

    if (intent === "draft-collections") {
      const aiResult = await requestAIReply(
        `Using the live workspace data, show all pending collections and draft concise follow-up messages for each project with pending payment. Include project name, client name, pending amount, and a WhatsApp-style payment reminder. Original user request: ${trimmed}`
      );
      reply(
        aiResult.ok
          ? aiResult.message
          : "I couldn't draft the collection follow-up messages right now. Please check that the AI API key is configured."
      );
      return;
    }

    if (intent === "content-plan") {
      const aiResult = await requestAIReply(
        `Create a practical content plan using the services sheet, leads sheet, content sheet, and revenue direction from the workspace. Suggest platform, topic angle, business goal, and why each idea supports conversion. Original user request: ${trimmed}`
      );
      reply(
        aiResult.ok
          ? aiResult.message
          : "I couldn't generate the content plan right now. Please check that the AI API key is configured."
      );
      return;
    }

    if (intent === "ceo-report") {
      const aiResult = await requestAIReply(
        `Write a weekly CEO report from the entire workspace. Cover projects, leads, revenue, received amount, pending amount, services, content, team, shopping list, timetable, meetings, servers, and databases. Use a crisp executive tone with wins, risks, and next priorities. Original user request: ${trimmed}`
      );
      reply(
        aiResult.ok
          ? aiResult.message
          : "I couldn't generate the CEO report right now. Please check that the AI API key is configured."
      );
      return;
    }

    if (intent === "greeting") {
      reply("Hey, what are we looking at today?");
      return;
    }

    if (intent === "smalltalk") {
      reply("I'm here with you. Ask me about your business data, tasks, or just chat naturally and I'll help if I can.");
      return;
    }

    if (intent === "today-followups") {
      // Find today's follow-ups in leads
      const leads = sheets.leads?.rows ?? [];
      const today = new Date();
      const todaysFollowUps = leads.filter((row) => {
        if (!row.followUpDate) return false;
        const date = new Date(String(row.followUpDate));
        return (
          date.getFullYear() === today.getFullYear() &&
          date.getMonth() === today.getMonth() &&
          date.getDate() === today.getDate()
        );
      });
      if (todaysFollowUps.length === 0) {
        reply("You're clear on follow-ups today.");
      } else {
        reply(
          `Here are today's follow-ups:\n` +
          todaysFollowUps.map((lead, idx) =>
            `${idx + 1}. ${lead.businessName || lead.contactName || 'Lead'}${lead.notes ? ` - ${lead.notes}` : ''}`
          ).join("\n")
        );
      }
      return;
    }

    if (intent === "generate-ideas") {
      const contentRows = sheets.content?.rows ?? [];
      const seeds = contentRows.map((r) => String(r.contentTitle ?? "")).filter(Boolean).slice(0, 6);
      const ideas: string[] = [];

      if (seeds.length > 0) {
        seeds.forEach((seed, idx) => {
          ideas.push(`${seed} — A short how-to or case-study style post about ${seed}`);
          ideas.push(`${seed} — Top tips and common mistakes related to ${seed}`);
        });
      } else {
        ideas.push("5 Tips to improve your service delivery");
        ideas.push("Case study: How we helped a client increase revenue");
        ideas.push("Behind the scenes: Building a project from start to finish");
        ideas.push("Top tools we use for project management and why");
        ideas.push("Customer success story template for social posts");
      }

      const replyText = `Here are some content ideas:\n${ideas.slice(0, 6).map((it, i) => `${i + 1}. ${it}`).join("\n")}`;
      reply(replyText);
      return;
    }

    if (intent === "create-meet") {
      const request = extractMeetRequest(trimmed);
      if (request.mode === "scheduled" && (!request.scheduledDate || !request.scheduledTime)) {
        reply("I can schedule that meet, but I still need the exact date and time. Example: schedule a meet tomorrow at 3 pm with title Client Review.");
        return;
      }

      try {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";
        const response = await fetch("/api/google/meet/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            attendeeEmail: request.attendeeEmail || undefined,
            durationMinutes: request.durationMinutes,
            mode: request.mode,
            scheduledDate: request.scheduledDate || undefined,
            scheduledTime: request.scheduledTime || undefined,
            timezone,
            title: request.title
          })
        });

        const payload = (await response.json()) as {
          error?: string;
          meeting?: { meetLink: string; attendeeEmail: string | null; hostEmail: string | null };
        };

        if (!response.ok || !payload.meeting) {
          throw new Error(payload.error ?? "I couldn't create the Google Meet yet.");
        }

        reply(
          `${request.mode === "instant" ? "Instant" : "Scheduled"} meet created.\n` +
          `Title: ${request.title}\n` +
          `Invite: ${payload.meeting.attendeeEmail ?? "No attendee email"}\n` +
          `Meet link: ${payload.meeting.meetLink}`
        );
      } catch (nextError) {
        reply(nextError instanceof Error ? nextError.message : "I couldn't create the meet right now.");
      }
      return;
    }

    if (intent === "count") {
      reply(formatCountReply(targetSheetKey, targetSheet));
      return;
    }

    if (intent === "summary") {
      reply(formatSummaryReply(targetSheetKey, targetSheet, trimmed));
      return;
    }

    if (intent === "pending-amount") {
      reply(formatPendingAmountReply(targetSheetKey, targetSheet));
      return;
    }

    if (intent === "pending-projects") {
      reply(formatPendingProjectsReply(sheets));
      return;
    }

    if (intent === "financial-query") {
      reply(formatFinancialReply(sheets));
      return;
    }

    if (intent === "attention-today") {
      reply(formatAttentionReply(sheets, alerts));
      return;
    }

    if (intent === "weekly-earnings") {
      reply(formatWeeklyEarningsReply(sheets));
      return;
    }

    if (intent === "cash-flow-blockers") {
      reply(formatCashFlowBlockersReply(sheets));
      return;
    }

    if (intent === "show-overdue") {
      const overdueAlerts = alerts.filter((alert) => alert.severity === "high" || alert.severity === "medium").slice(0, 5);
      if (overdueAlerts.length === 0) {
        reply("There are no urgent overdue operational items right now.");
        return;
      }

      reply(
        overdueAlerts
          .map((alert) => `${alert.title}. ${alert.message}${alert.dueDate ? ` Due: ${formatOverdueDate(alert.dueDate)}.` : ""}`)
          .join(" ")
      );
      return;
    }

    if (intent === "search") {
      const query = trimmed.replace(/search records?/i, "").replace(/^search/i, "").trim().toLowerCase();
      const matches = targetSheet.rows
        .filter((row) => targetSheet.columns.some((column) => String(row[column.id] ?? "").toLowerCase().includes(query)))
        .slice(0, 5);

      if (matches.length === 0) {
        reply(`I could not find anything matching "${query}" in ${targetSheetKey}.`);
        return;
      }

      const primaryColumnId = getPrimaryColumn(targetSheetKey);
      reply(
        matches
          .map((row) => {
            const title = String(row[primaryColumnId] ?? singularLabel[targetSheetKey]);
            const summary = targetSheet.columns
              .slice(1, 3)
              .map((column) => `${column.label}: ${String(row[column.id] ?? "")}`)
              .join(", ");
            return `${title}. ${summary}`;
          })
          .join(" ")
      );
      return;
    }

    if (intent === "add-column") {
      const columnLabel = (trimmed.match(/(?:add|create)\s+(?:a\s+)?column(?:\s+called|\s+named)?\s+([a-z0-9 _-]+)/i)?.[1] ?? "").trim();
      if (!columnLabel) {
        reply(`What's the new column called for ${targetSheetKey}? For example: add column called priority type text.`);
        return;
      }

      addColumn(targetSheetKey, {
        id: columnLabel.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, ""),
        label: columnLabel,
        type: detectColumnType(trimmed),
        width: "180px"
      });
      setDraft({});
      reply(`Added "${columnLabel}" to ${targetSheetKey}.`);
      return;
    }

    if (intent === "delete-row") {
      const deleteCount = extractDeleteCount(trimmed);
      if (deleteCount !== null) {
        if (targetSheet.rows.length === 0) {
          reply(`There isn't anything to delete in ${targetSheetKey} right now.`);
          return;
        }

        const safeCount = Math.min(deleteCount, targetSheet.rows.length);
        for (let index = 0; index < safeCount; index += 1) {
          deleteRow(targetSheetKey, targetSheet.rows.length - 1 - index);
        }

        setDraft({});
        reply(`Done. I removed the last ${safeCount} row${safeCount === 1 ? "" : "s"} from ${targetSheetKey}.`);
        return;
      }

      const rowMatch = findBestRowMatch(trimmed, targetSheetKey, targetSheet);
      if (!rowMatch) {
        reply(`I couldn't spot the exact ${singularLabel[targetSheetKey]}. Try the name again, or say "delete the last 2 rows".`);
        return;
      }

      deleteRow(targetSheetKey, rowMatch.rowIndex);
      setDraft({});
      reply(`Removed ${rowMatch.primaryValue || singularLabel[targetSheetKey]} from ${targetSheetKey}.`);
      return;
    }

    if (intent === "edit-row") {
      const literalMode = shouldUseLiteralMode(trimmed);
      const rowMatch = findBestRowMatch(trimmed, targetSheetKey, targetSheet);
      if (!rowMatch) {
        reply(`I couldn't spot that ${singularLabel[targetSheetKey]}. Try using its current name and I'll follow it.`);
        return;
      }

      const nextValues = extractFromPrompt(trimmed, targetSheetKey, targetSheet.columns, {}, { explicitOnly: literalMode });
      const likelyStatus = inferLikelyStatusColumn(targetSheetKey, targetSheet.columns, trimmed);
      if (!literalMode && likelyStatus && nextValues[likelyStatus.column.id] === undefined) {
        nextValues[likelyStatus.column.id] = likelyStatus.value;
      }

      const changedColumns = targetSheet.columns.filter(
        (column) => nextValues[column.id] !== undefined && String(nextValues[column.id]) !== String(rowMatch.row[column.id] ?? "")
      );

      if (changedColumns.length === 0) {
        reply(`I found "${rowMatch.primaryValue || singularLabel[targetSheetKey]}". Tell me what to change, like "set status to Completed".`);
        return;
      }

      changedColumns.forEach((column) => {
        updateCell(targetSheetKey, rowMatch.rowIndex, column.id, nextValues[column.id] as CellValue);
      });

      setDraft({});
      reply(`Done. I updated ${rowMatch.primaryValue || singularLabel[targetSheetKey]} in ${targetSheetKey}: ${changedColumns.map((column) => column.label).join(", ")}.`);
      return;
    }

    const literalMode = shouldUseLiteralMode(trimmed);
    const nextDraft = extractFromPrompt(trimmed, targetSheetKey, targetSheet.columns, {}, { explicitOnly: literalMode });
    const primaryColumnId = getPrimaryColumn(targetSheetKey);
    const primaryColumn = targetSheet.columns.find((column) => column.id === primaryColumnId);
    const nextMissing = missingColumns(targetSheetKey, targetSheet.columns, nextDraft).filter((column) => column.id !== primaryColumnId);

    if (!nextDraft[primaryColumnId]) {
      setDraft(nextDraft);
      if (isQuestionLike) {
        const aiResult = await requestAIReply(trimmed);
        if (aiResult.ok) {
          reply(aiResult.message);
          return;
        }
        reply(`Gemini could not answer right now: ${aiResult.error}`);
        return;
      }
      reply(`Tell me the ${primaryColumn?.label ?? "main name"} and I'll build the rest around it. Example: add project named Website Revamp.`);
      return;
    }

    addRowWithValues(targetSheetKey, nextDraft, shouldKeepRemainingFieldsEmpty(trimmed) || literalMode);
    setDraft({});
    reply(
      nextMissing.length > 0
        ? `Done. I added a new ${singularLabel[targetSheetKey]} to ${targetSheetKey}. You can still fill: ${nextMissing.map((column) => column.label).join(", ")}.`
        : `Done. I added a new ${singularLabel[targetSheetKey]} to ${targetSheetKey}.`
    );
  };

  return (
    <div className="pointer-events-none fixed inset-y-0 right-0 z-40 flex items-end justify-end">
      {open ? (
        <>
          <button
            type="button"
            aria-label="Close assistant overlay"
            onClick={() => setOpen(false)}
            className="pointer-events-auto absolute inset-0 bg-[linear-gradient(90deg,rgba(15,23,42,0.02),rgba(15,23,42,0.16))] backdrop-blur-[2px]"
          />
          <Card className="pointer-events-auto relative mr-2 mt-2 flex h-[calc(100vh-1rem)] w-[min(96vw,760px)] max-w-[760px] flex-col overflow-hidden rounded-[32px] border border-slate-200/80 bg-white/96 p-0 shadow-[0_40px_120px_rgba(15,23,42,0.24)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/96 sm:mr-4 sm:mt-4 sm:h-[calc(100vh-2rem)] sm:rounded-[36px]">
          <div className="border-b border-slate-200/80 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.18),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(56,189,248,0.16),_transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] px-4 py-4 dark:border-white/10 dark:bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.14),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(56,189,248,0.12),_transparent_28%),linear-gradient(180deg,rgba(9,9,11,0.98),rgba(24,24,27,0.96))] sm:px-5 sm:py-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 via-orange-400 to-sky-500 text-white shadow-lg">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-base font-semibold text-slate-900 dark:text-white">Pixelkode Voice Assistant</p>
                  <p className="text-xs text-slate-600 dark:text-zinc-400">Ask questions naturally, use voice, and get direct answers in chat</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close assistant">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setVoiceRepliesEnabled((value) => !value)}
                className={cn(
                  "rounded-full border px-3 py-2 text-xs font-semibold transition",
                  voiceRepliesEnabled ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300" : "border-slate-200 bg-white text-slate-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-300"
                )}
              >
                {voiceRepliesEnabled ? <Volume2 className="mr-2 inline h-3.5 w-3.5" /> : <VolumeX className="mr-2 inline h-3.5 w-3.5" />}
                {voiceRepliesEnabled ? "Voice replies on" : "Voice replies off"}
              </button>

              <label className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-300">
                AI voice
                <select
                  value={selectedVoiceName}
                  onChange={(event) => setSelectedVoiceName(event.target.value)}
                  className="min-w-[120px] bg-transparent text-xs outline-none"
                >
                  {availableVoices.map((voice) => (
                    <option key={voice.name} value={voice.name}>
                      {voice.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-300">
                Speed
                <select
                  value={String(voiceRate)}
                  onChange={(event) => setVoiceRate(Number(event.target.value))}
                  className="bg-transparent text-xs outline-none"
                >
                  <option value="0.95">Relaxed</option>
                  <option value="1.18">Balanced</option>
                  <option value="1.32">Fast</option>
                  <option value="1.48">Very Fast</option>
                </select>
              </label>

              <span className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-300">
                Active target: {currentSheetKey}
              </span>
              <span
                className={cn(
                  "rounded-full border px-3 py-2 text-xs font-semibold",
                  aiStatus?.configured
                    ? "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300"
                    : "border-slate-200 bg-white text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400"
                )}
              >
	                {aiStatus?.configured ? `${aiStatus.provider} connected${aiStatus.model ? ` | ${aiStatus.model}` : ""}` : "AI not connected"}
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-300">
                Voice engine: {voiceMode === "external" ? "External TTS" : "Browser fallback"}
              </span>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-4 p-3 sm:p-5">
	            <div className="flex min-h-0 flex-1 flex-col rounded-[28px] border border-slate-200 bg-white p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:border-white/10 dark:bg-white/[0.03] dark:shadow-none sm:p-4">
	              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-zinc-500">
                <Sparkles className="h-3.5 w-3.5" />
                Conversation
              </div>
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-1 pb-1">
                {messages.map((message) => (
                  <div key={message.id} className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}>
                    <div className={cn("flex w-full max-w-[96%] items-end gap-2 sm:gap-3", message.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto flex-row")}>
                      <div
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold uppercase tracking-[0.16em] sm:h-9 sm:w-9",
                          message.role === "user"
                            ? "bg-slate-900 text-white shadow-sm shadow-slate-300"
                            : "bg-gradient-to-br from-fuchsia-100 to-sky-100 text-slate-600"
                        )}
                      >
                        {message.role === "user" ? "You" : "AI"}
                      </div>
                      <div
                        className={cn(
                          "min-w-0 max-w-[calc(100%-2.75rem)] flex-1 break-words rounded-[22px] px-4 py-3 text-sm leading-7 whitespace-pre-wrap shadow-sm sm:rounded-[24px]",
                          message.role === "user"
                            ? "bg-slate-900 text-white shadow-[0_12px_30px_rgba(15,23,42,0.18)]"
	                            : "border border-slate-200 bg-white text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200 dark:shadow-none"
                        )}
                      >
                        {message.content}
                      </div>
                    </div>
                  </div>
                ))}

                {isListening || liveTranscript ? (
                  <div className="flex justify-end">
	                    <div className="w-full max-w-[calc(100%-1rem)] rounded-[22px] border border-sky-200 bg-sky-50 px-4 py-3 text-sm leading-6 text-sky-800 shadow-sm dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-200 sm:max-w-[calc(100%-3rem)] sm:rounded-[24px]">
                      <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em]">
                        <WandSparkles className="h-3.5 w-3.5" />
                        Live transcript
                      </div>
                      {liveTranscript || "Listening..."}
                    </div>
                  </div>
                ) : null}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {previewColumns.length > 0 ? (
	              <div className="rounded-[26px] border border-emerald-100 bg-emerald-50/75 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
	                <div className="flex items-center gap-2 text-sm font-medium text-emerald-900 dark:text-emerald-200">
                  <CheckCircle2 className="h-4 w-4" />
                  Draft context for {currentSheetKey}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {previewColumns.map((column) => (
	                    <span key={column.id} className="rounded-full border border-white/80 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-200">
                      {column.label}: {String(draft[column.id])}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

	            <div className="flex gap-2 rounded-[22px] border border-violet-100 bg-white p-2 shadow-[0_12px_30px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-white/[0.03] dark:shadow-none sm:gap-3 sm:rounded-[24px]">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={isListening ? stopListening : startListening}
                aria-label={isListening ? "Stop listening" : "Start listening"}
                className={cn(
                  "h-12 w-12 shrink-0 rounded-2xl border shadow-sm",
                  isListening
                    ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20"
                    : "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300 dark:hover:bg-sky-500/20"
                )}
              >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
              <Input
                ref={inputRef}
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Ask anything about your current data..."
	                className="h-12 border-slate-200 bg-slate-50/70 text-slate-800 placeholder:text-slate-400 focus-visible:ring-fuchsia-200 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus-visible:ring-cyan-500/40"
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void submitPrompt();
                  }
                }}
              />
              <Button size="icon" className="h-12 w-12 shrink-0 rounded-2xl bg-slate-900 text-white shadow-[0_16px_40px_rgba(15,23,42,0.2)] hover:bg-slate-800" onClick={() => void submitPrompt()} aria-label="Run assistant command">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
          </Card>
        </>
      ) : null}

      <Button
        size="lg"
        className="pointer-events-auto mb-5 mr-5 rounded-full px-5 shadow-[0_24px_60px_rgba(245,158,11,0.26)]"
        onClick={() => setOpen((value) => !value)}
      >
        <MessageSquare className="mr-2 h-5 w-5" />
        Voice Assistant
      </Button>
    </div>
  );
}

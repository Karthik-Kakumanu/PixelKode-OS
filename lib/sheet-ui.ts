import {
  BadgeCheck,
  BriefcaseBusiness,
  CalendarDays,
  CircleDollarSign,
  Clock3,
  FileStack,
  FileText,
  Globe,
  HandCoins,
  Landmark,
  LayoutGrid,
  MessageSquareQuote,
  PhoneCall,
  Sparkles,
  Target,
  UserRound,
  Users
} from "lucide-react";

import type { SheetColumn, SheetKey } from "@/lib/types";

const optionPresets: Partial<Record<SheetKey, Partial<Record<string, string[]>>>> = {
  projects: {
    sector: ["Food", "Retail", "Healthcare", "Education", "Real Estate", "Creative", "Technology"],
    category: ["Website", "CRM", "Branding", "Automation", "Marketing", "E-commerce"],
    domain: ["Restaurant", "Clinic", "Studio", "Agency", "Consulting", "Salon", "Builder"],
    completionPercent: ["0", "50", "100"]
  },
  leads: {
    category: ["Legal", "Fashion", "Healthcare", "Education", "Retail", "Hospitality", "Technology"]
  },
  revenue: {
    sector: ["Operations", "Creative", "Retail", "Technology", "Personal", "Marketing"],
    category: ["Software", "Website", "Automation", "Payroll", "Ads", "Drawings"]
  },
  content: {
    owner: ["Karthik", "Partner", "Designer", "Content Team", "Marketing Team"]
  },
  team: {
    role: ["Founder", "Operations", "Designer", "Developer", "Sales", "Content Strategist"]
  },
  services: {
    serviceName: ["Business Website", "CRM Automation", "Content Growth System", "Brand Refresh", "Lead Funnel Setup"]
  }
};

const statusClassMap: Record<string, string> = {
  completed: "border-emerald-300 bg-emerald-100 text-emerald-800 shadow-emerald-100/70",
  paid: "border-emerald-300 bg-emerald-100 text-emerald-800 shadow-emerald-100/70",
  converted: "border-emerald-300 bg-emerald-100 text-emerald-800 shadow-emerald-100/70",
  available: "border-emerald-300 bg-emerald-100 text-emerald-800 shadow-emerald-100/70",
  coreoffer: "border-emerald-300 bg-emerald-100 text-emerald-800 shadow-emerald-100/70",
  inprogress: "border-sky-300 bg-sky-100 text-sky-800 shadow-sky-100/70",
  connected: "border-sky-300 bg-sky-100 text-sky-800 shadow-sky-100/70",
  scheduled: "border-sky-300 bg-sky-100 text-sky-800 shadow-sky-100/70",
  partiallypaid: "border-orange-300 bg-orange-100 text-orange-800 shadow-orange-100/70",
  partiallycompleted: "border-orange-300 bg-orange-100 text-orange-800 shadow-orange-100/70",
  followup: "border-orange-300 bg-orange-100 text-orange-800 shadow-orange-100/70",
  proposalsent: "border-orange-300 bg-orange-100 text-orange-800 shadow-orange-100/70",
  busy: "border-amber-300 bg-amber-100 text-amber-800 shadow-amber-100/70",
  interested: "border-fuchsia-300 bg-fuchsia-100 text-fuchsia-800 shadow-fuchsia-100/70",
  highdemand: "border-fuchsia-300 bg-fuchsia-100 text-fuchsia-800 shadow-fuchsia-100/70",
  designing: "border-fuchsia-300 bg-fuchsia-100 text-fuchsia-800 shadow-fuchsia-100/70",
  pending: "border-rose-300 bg-rose-100 text-rose-800 shadow-rose-100/70",
  rejected: "border-rose-300 bg-rose-100 text-rose-800 shadow-rose-100/70",
  dropped: "border-rose-300 bg-rose-100 text-rose-800 shadow-rose-100/70",
  notstarted: "border-slate-300 bg-slate-100 text-slate-700 shadow-slate-100/70",
  notcalled: "border-slate-300 bg-slate-100 text-slate-700 shadow-slate-100/70",
  noresponse: "border-slate-300 bg-slate-100 text-slate-700 shadow-slate-100/70",
  fresh: "border-violet-300 bg-violet-100 text-violet-800 shadow-violet-100/70",
  idea: "border-violet-300 bg-violet-100 text-violet-800 shadow-violet-100/70",
  draft: "border-violet-300 bg-violet-100 text-violet-800 shadow-violet-100/70",
  seasonal: "border-indigo-300 bg-indigo-100 text-indigo-800 shadow-indigo-100/70",
  payroll: "border-indigo-300 bg-indigo-100 text-indigo-800 shadow-indigo-100/70",
  income: "border-emerald-300 bg-emerald-100 text-emerald-800 shadow-emerald-100/70",
  expense: "border-rose-300 bg-rose-100 text-rose-800 shadow-rose-100/70",
  personaluse: "border-amber-300 bg-amber-100 text-amber-800 shadow-amber-100/70",
  posted: "border-emerald-300 bg-emerald-100 text-emerald-800 shadow-emerald-100/70",
  paused: "border-rose-300 bg-rose-100 text-rose-800 shadow-rose-100/70",
  onhold: "border-amber-300 bg-amber-100 text-amber-800 shadow-amber-100/70"
};

export function getStatusClasses(value: string) {
  const key = normalizeToken(value);
  return (
    statusClassMap[key] ??
    "border-violet-200 bg-white/85 text-slate-700 shadow-[0_10px_30px_rgba(157,114,255,0.08)]"
  );
}

const optionToneClasses = [
  "border-fuchsia-300 bg-fuchsia-100 text-fuchsia-800 shadow-fuchsia-100/70",
  "border-sky-300 bg-sky-100 text-sky-800 shadow-sky-100/70",
  "border-emerald-300 bg-emerald-100 text-emerald-800 shadow-emerald-100/70",
  "border-orange-300 bg-orange-100 text-orange-800 shadow-orange-100/70",
  "border-violet-300 bg-violet-100 text-violet-800 shadow-violet-100/70",
  "border-rose-300 bg-rose-100 text-rose-800 shadow-rose-100/70",
  "border-amber-300 bg-amber-100 text-amber-800 shadow-amber-100/70",
  "border-cyan-300 bg-cyan-100 text-cyan-800 shadow-cyan-100/70"
];

export function getOptionClasses(value: string) {
  const key = normalizeToken(value);
  if (!key) {
    return "border-white/80 bg-white/90 text-slate-700 shadow-[0_10px_30px_rgba(157,114,255,0.08)]";
  }

  if (statusClassMap[key]) {
    return statusClassMap[key];
  }

  const hash = Array.from(key).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return optionToneClasses[hash % optionToneClasses.length];
}

export function normalizeToken(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function getColumnOptions(sheetKey: SheetKey, column: SheetColumn) {
  const preset = optionPresets[sheetKey]?.[column.id] ?? [];
  const existing = column.options ?? [];
  return Array.from(new Set([...existing, ...preset]));
}

export function getColumnIcon(columnId: string) {
  const map: Record<string, typeof BriefcaseBusiness> = {
    projectName: BriefcaseBusiness,
    clientName: UserRound,
    businessName: BriefcaseBusiness,
    contactName: UserRound,
    sector: LayoutGrid,
    category: Sparkles,
    domain: Globe,
    address: Landmark,
    projectStatus: BadgeCheck,
    paymentStatus: HandCoins,
    projectValue: CircleDollarSign,
    amount: CircleDollarSign,
    amountReceived: CircleDollarSign,
    pendingAmount: CircleDollarSign,
    completionPercent: Target,
    startDate: CalendarDays,
    deliveryDate: CalendarDays,
    followUpDate: CalendarDays,
    publishDate: CalendarDays,
    callStatus: PhoneCall,
    leadStatus: Sparkles,
    entryDate: CalendarDays,
    entryType: CircleDollarSign,
    sourceName: BriefcaseBusiness,
    paymentMode: CircleDollarSign,
    memberName: Users,
    role: BadgeCheck,
    availability: Clock3,
    contentTitle: FileText,
    platform: FileStack,
    stage: Sparkles,
    owner: UserRound,
    goal: Target,
    serviceName: Sparkles,
    price: CircleDollarSign,
    estimatedTimeline: Clock3,
    status: BadgeCheck,
    notes: MessageSquareQuote,
    remarks: MessageSquareQuote
  };

  return map[columnId] ?? LayoutGrid;
}

export function getRequiredColumns(sheetKey: SheetKey) {
  const required: Record<SheetKey, string[]> = {
    projects: ["projectName", "clientName", "projectStatus", "projectValue"],
    leads: ["businessName", "contactName", "leadStatus"],
    revenue: ["entryType", "sourceName", "amount"],
    team: ["memberName", "role", "availability"],
    content: ["contentTitle", "platform", "stage"],
    services: ["serviceName", "price", "status"],
    servers: ["serverName", "serverRole", "projectName"],
    databases: ["databaseName", "projectName", "adminEmail"]
  };

  return required[sheetKey];
}

export function getPrimaryColumn(sheetKey: SheetKey) {
  return getRequiredColumns(sheetKey)[0];
}

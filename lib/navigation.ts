import type { ComponentType } from "react";
import {
  Activity,
  CalendarRange,
  ClipboardList,
  CircleDollarSign,
  Database,
  FileText,
  KanbanSquare,
  LayoutDashboard,
  ListChecks,
  Radar,
  Package,
  ScrollText,
  Server,
  ShieldCheck,
  Users,
  Wrench
} from "lucide-react";

import { sheetTitles } from "@/lib/data";
import type { SheetKey } from "@/lib/types";

type NavIcon = ComponentType<{ className?: string }>;

export type AppRoute = {
  href: string;
  label: string;
  description: string;
  icon: NavIcon;
  group: string;
  sheetKey?: SheetKey;
};

const appRoutes: AppRoute[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    description: "Realtime business overview and operating signals.",
    icon: LayoutDashboard,
    group: "Overview"
  },
  {
    href: "/projects",
    label: sheetTitles.projects.title,
    description: sheetTitles.projects.description,
    icon: Activity,
    group: "Business"
  },
  {
    href: "/leads",
    label: sheetTitles.leads.title,
    description: sheetTitles.leads.description,
    icon: Users,
    group: "Business"
  },
  {
    href: "/revenue",
    label: sheetTitles.revenue.title,
    description: sheetTitles.revenue.description,
    icon: CircleDollarSign,
    group: "Business"
  },
  {
    href: "/documents",
    label: "Documents",
    description: "Generate proposal, quotation, agreement, contract, invoice, onboarding, and project brief PDFs.",
    icon: ScrollText,
    group: "Business"
  },
  {
    href: "/collections",
    label: "Collections Center",
    description: "Track pending payments, overdue cash, and reminder actions.",
    icon: ClipboardList,
    group: "Business"
  },
  {
    href: "/operations-hub",
    label: "Operations Hub",
    description: "Live search, restore points, cash-flow forecasting, recurring reminders, and exports.",
    icon: Radar,
    group: "Business"
  },
  {
    href: "/lead-pipeline",
    label: "Lead Pipeline",
    description: "Kanban view for fresh, follow-up, proposal, converted, and dropped leads.",
    icon: KanbanSquare,
    group: "Business"
  },
  {
    href: "/content",
    label: sheetTitles.content.title,
    description: sheetTitles.content.description,
    icon: FileText,
    group: "Execution"
  },
  {
    href: "/services",
    label: sheetTitles.services.title,
    description: sheetTitles.services.description,
    icon: Wrench,
    group: "Execution"
  },
  {
    href: "/shopping",
    label: sheetTitles.shopping.title,
    description: sheetTitles.shopping.description,
    icon: Package,
    group: "Execution"
  },
  {
    href: "/timetable",
    label: sheetTitles.timetable.title,
    description: sheetTitles.timetable.description,
    icon: CalendarRange,
    group: "Execution"
  },
  {
    href: "/team",
    label: sheetTitles.team.title,
    description: sheetTitles.team.description,
    icon: Users,
    group: "Operations"
  },
  {
    href: "/meet-session",
    label: "Meet Session",
    description: "Launch and review AI-assisted meeting rooms.",
    icon: ListChecks,
    group: "Operations"
  },
  {
    href: "/servers",
    label: sheetTitles.servers.title,
    description: sheetTitles.servers.description,
    icon: ShieldCheck,
    group: "Systems"
  },
  {
    href: "/databases",
    label: sheetTitles.databases.title,
    description: sheetTitles.databases.description,
    icon: Database,
    group: "Systems"
  }
];

export const primaryRoutes = appRoutes;

export const routesByGroup = appRoutes.reduce<Record<string, AppRoute[]>>((result, route) => {
  result[route.group] ??= [];
  result[route.group].push(route);
  return result;
}, {});

export function getRouteMeta(pathname: string) {
  return appRoutes.find((route) => pathname === route.href || pathname.startsWith(`${route.href}/`)) ?? appRoutes[0];
}

"use client";

import dynamic from "next/dynamic";

const DashboardView = dynamic(
  () => import("@/components/business/dashboard-view").then((module) => module.DashboardView),
  { ssr: false }
);

export function DashboardClient() {
  return <DashboardView />;
}

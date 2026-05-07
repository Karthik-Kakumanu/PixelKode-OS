"use client";

import { useState } from "react";
import { PanelRightClose, PanelRightOpen } from "lucide-react";
import { usePathname } from "next/navigation";

import { MobileNav } from "@/components/layout/mobile-nav";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { Button } from "@/components/ui/button";

export function PageShell({
  children,
  rightRail
}: {
  children: React.ReactNode;
  rightRail?: React.ReactNode;
}) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [dashboardRailOpen, setDashboardRailOpen] = useState(true);
  const pathname = usePathname();
  const showRightRail = pathname === "/dashboard" && Boolean(rightRail);

  return (
    <div className="flex min-h-screen w-full gap-4 px-3 py-3 lg:px-4 lg:py-4">
      <Sidebar mobileOpen={mobileSidebarOpen} onClose={() => setMobileSidebarOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <Topbar onMenuClick={() => setMobileSidebarOpen(true)} />
        <MobileNav />
        <div className="flex min-h-0 flex-1 gap-4">
          <main className="min-w-0 flex-1 pb-24">{children}</main>
          {showRightRail && dashboardRailOpen ? (
            <aside className="relative hidden w-[340px] shrink-0 xl:block">
              <Button
                variant="outline"
                size="icon"
                className="absolute right-3 top-3 z-10 h-9 w-9 rounded-full border-slate-200 bg-white shadow-sm"
                onClick={() => setDashboardRailOpen(false)}
                aria-label="Close dashboard side panel"
              >
                <PanelRightClose className="h-4 w-4" />
              </Button>
              {rightRail}
            </aside>
          ) : null}
        </div>
      </div>

      {showRightRail && !dashboardRailOpen ? (
        <div className="fixed bottom-28 right-6 z-30 hidden xl:block">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full border-slate-200 bg-white px-4 shadow-[0_16px_40px_rgba(15,23,42,0.12)]"
            onClick={() => setDashboardRailOpen(true)}
          >
            <PanelRightOpen className="mr-2 h-4 w-4" />
            Open panel
          </Button>
        </div>
      ) : null}
    </div>
  );
}

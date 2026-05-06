"use client";

import { useState } from "react";

import { MobileNav } from "@/components/layout/mobile-nav";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export function PageShell({
  children,
  rightRail
}: {
  children: React.ReactNode;
  rightRail?: React.ReactNode;
}) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="mx-auto flex min-h-screen max-w-[1800px] gap-4 p-3 sm:p-4">
      <Sidebar mobileOpen={mobileSidebarOpen} onClose={() => setMobileSidebarOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <Topbar onMenuClick={() => setMobileSidebarOpen(true)} />
        <MobileNav />
        <div className="flex min-h-0 flex-1 gap-4">
          <main className="min-w-0 flex-1">{children}</main>
          {rightRail ? <aside className="hidden w-[320px] shrink-0 xl:block">{rightRail}</aside> : null}
        </div>
      </div>
    </div>
  );
}

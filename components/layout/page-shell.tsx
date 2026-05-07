"use client";

import { useState } from "react";

import { MobileNav } from "@/components/layout/mobile-nav";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export function PageShell({
  children
}: {
  children: React.ReactNode;
}) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full gap-4 px-3 py-3 lg:px-4 lg:py-4">
      <Sidebar mobileOpen={mobileSidebarOpen} onClose={() => setMobileSidebarOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <Topbar onMenuClick={() => setMobileSidebarOpen(true)} />
        <MobileNav />
        <main className="min-w-0 flex-1 pb-24">{children}</main>
      </div>
    </div>
  );
}

"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

const Sidebar = dynamic(
  () => import("@/components/layout/sidebar").then((mod) => mod.Sidebar),
  { ssr: false }
);

const Topbar = dynamic(
  () => import("@/components/layout/topbar").then((mod) => mod.Topbar),
  { ssr: false }
);

const MobileNav = dynamic(
  () => import("@/components/layout/mobile-nav").then((mod) => mod.MobileNav),
  { ssr: false }
);

export function PageShell({
  children
}: {
  children: React.ReactNode;
}) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full gap-3 px-3 py-3 lg:gap-4 lg:px-4 lg:py-4" suppressHydrationWarning>
      <Sidebar mobileOpen={mobileSidebarOpen} onClose={() => setMobileSidebarOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col gap-3" suppressHydrationWarning>
        <Topbar onMenuClick={() => setMobileSidebarOpen(true)} />
        <MobileNav />

        <main className="min-h-0 min-w-0 flex-1" suppressHydrationWarning>
          <div className="glass-panel flex h-full overflow-hidden rounded-[32px] border-white/55 px-4 py-4 lg:px-5 lg:py-5 dark:border-white/10 dark:bg-slate-950/98">
            <div className="mx-auto flex h-full w-full max-w-[1720px] min-w-0 flex-col">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}

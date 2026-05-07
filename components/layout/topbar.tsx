"use client";

import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";

import { logoutAction } from "@/app/(app)/actions";
import { Button } from "@/components/ui/button";

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();
  const section = pathname.split("/")[1] || "dashboard";

  return (
    <div className="glass-panel sticky top-3 z-30 flex items-center justify-between rounded-[24px] border-white/80 px-4 py-3">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onMenuClick} className="md:hidden" aria-label="Open menu">
          <Menu className="h-4 w-4" />
        </Button>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-slate-400">Workspace</p>
          <p className="text-base font-semibold capitalize text-slate-900">{section}</p>
        </div>
      </div>

      <div className="flex items-center">
        <form action={logoutAction}>
          <Button variant="outline" size="sm">Logout</Button>
        </form>
      </div>
    </div>
  );
}

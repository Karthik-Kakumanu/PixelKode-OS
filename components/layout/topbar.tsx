"use client";

import { Bell, Menu, Search } from "lucide-react";

import { logoutAction } from "@/app/(app)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <div className="glass-panel sticky top-4 z-30 flex flex-col gap-3 rounded-[28px] p-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-1 items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onMenuClick} className="md:hidden" aria-label="Open menu">
          <Menu className="h-4 w-4" />
        </Button>
        <div className="relative w-full max-w-md">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input className="pl-11" placeholder="Search projects, leads, revenue entries..." />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon">
          <Bell className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-3 rounded-2xl border border-violet-100 bg-white/60 px-3 py-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-gradient font-semibold text-slate-900">PK</div>
          <div>
            <p className="text-sm font-medium text-slate-900">Pixelkode</p>
            <p className="text-xs text-slate-500">Owner Login</p>
          </div>
        </div>
        <form action={logoutAction}>
          <Button variant="outline">Logout</Button>
        </form>
      </div>
    </div>
  );
}

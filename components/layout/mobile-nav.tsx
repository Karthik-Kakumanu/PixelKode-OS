"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { primaryRoutes } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const pathname = usePathname();

  return (
    // Added suppressHydrationWarning here to block extension interference!
    <div 
      className="glass-panel overflow-x-auto rounded-[24px] p-2 xl:hidden"
      suppressHydrationWarning
    >
      <div className="flex min-w-max gap-2" suppressHydrationWarning>
        {primaryRoutes.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            suppressHydrationWarning
            className={cn(
              "rounded-2xl px-4 py-2 text-sm transition font-medium",
              pathname === item.href || pathname.startsWith(`${item.href}/`)
                ? "bg-slate-900 text-white dark:bg-white/10 dark:text-white shadow-sm" 
                : "text-slate-500 hover:bg-white/50 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white"
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

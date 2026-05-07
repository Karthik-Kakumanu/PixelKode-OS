"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/projects", label: "Projects" },
  { href: "/leads", label: "Leads" },
  { href: "/revenue", label: "Revenue" },
  { href: "/team", label: "Team" },
  { href: "/content", label: "Content" },
  { href: "/services", label: "Services" }
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <div className="glass-panel overflow-x-auto rounded-[24px] p-2 xl:hidden">
      <div className="flex min-w-max gap-2">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            suppressHydrationWarning
            className={cn(
              "rounded-2xl px-4 py-2 text-sm transition",
              pathname === item.href ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white"
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { useBusinessStore } from "@/lib/store";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const loadSheets = useBusinessStore((state) => state.loadSheets);

  useEffect(() => {
    if (pathname === "/login") return;
    void loadSheets();
  }, [loadSheets, pathname]);

  return <>{children}</>;
}

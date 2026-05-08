"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { SmartAssistant } from "@/components/business/smart-assistant";
import { useBusinessStore } from "@/lib/store";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const loadSheets = useBusinessStore((state) => state.loadSheets);
  const syncPendingChanges = useBusinessStore((state) => state.syncPendingChanges);
  const theme = useBusinessStore((state) => state.theme);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    void navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("Service worker registration failed", error);
    });
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;
  }, [theme]);

  useEffect(() => {
    if (pathname === "/login") return;
    void loadSheets();
  }, [loadSheets, pathname]);

  useEffect(() => {
    if (pathname === "/login") return;

    const handleOnline = () => {
      void syncPendingChanges();
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [pathname, syncPendingChanges]);

  return (
    <>
      {children}
      {pathname === "/login" ? null : <SmartAssistant />}
    </>
  );
}

"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { useBusinessStore } from "@/lib/store";

const CommandPalette = dynamic(
  () => import("@/components/ai-core/command-palette").then((mod) => mod.CommandPalette),
  { ssr: false }
);

const SmartAssistant = dynamic(
  () => import("@/components/business/smart-assistant").then((mod) => mod.SmartAssistant),
  { ssr: false }
);

export function AppProviders({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const loadSheets = useBusinessStore((state) => state.loadSheets);
  const syncPendingChanges = useBusinessStore((state) => state.syncPendingChanges);
  const theme = useBusinessStore((state) => state.theme);
  const [interactiveToolsReady, setInteractiveToolsReady] = useState(false);

  useEffect(() => {
    if (pathname === "/login") return;
    if (typeof window === "undefined") return;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let idleId: number | null = null;

    if ("requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(() => setInteractiveToolsReady(true), { timeout: 1200 });
    } else {
      timeoutId = globalThis.setTimeout(() => setInteractiveToolsReady(true), 600);
    }

    return () => {
      if (idleId !== null && "cancelIdleCallback" in window) window.cancelIdleCallback(idleId);
      if (timeoutId !== null) globalThis.clearTimeout(timeoutId);
    };
  }, [pathname]);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    void navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("Service worker registration failed", error);
    });
  }, []);

  // Securely toggles the .dark class on the <html> tag for Tailwind CSS
  useEffect(() => {
    if (typeof document === "undefined") return;

    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
      root.style.colorScheme = "dark";
    } else {
      root.classList.remove("dark");
      root.style.colorScheme = "light";
    }
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
      {pathname === "/login" || !interactiveToolsReady ? null : (
        <>
          <CommandPalette />
          <SmartAssistant />
        </>
      )}
    </>
  );
}

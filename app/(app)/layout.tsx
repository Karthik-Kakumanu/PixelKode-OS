import { redirect } from "next/navigation";

import { PageShell } from "@/components/layout/page-shell";
import { isAuthenticated } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    redirect("/login");
  }

  return <PageShell>{children}</PageShell>;
}

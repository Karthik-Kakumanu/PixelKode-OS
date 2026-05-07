import { redirect } from "next/navigation";

import { RightRail } from "@/components/app/right-rail";
import { PageShell } from "@/components/layout/page-shell";
import { isAuthenticated } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    redirect("/login");
  }

  return <PageShell rightRail={<RightRail />}>{children}</PageShell>;
}

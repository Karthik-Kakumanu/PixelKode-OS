import { redirect } from "next/navigation";

import { isAuthenticated } from "@/lib/session";

export default async function HomePage() {
  const authenticated = await isAuthenticated();
  redirect(authenticated ? "/dashboard" : "/login");
}

"use server";

import { redirect } from "next/navigation";

import { createSession, getLoginCredentials } from "@/lib/session";

export async function loginAction(_prevState: { error?: string } | undefined, formData: FormData) {
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");
  const credentials = getLoginCredentials();

  if (username !== credentials.username || password !== credentials.password) {
    return { error: "Wrong username or password." };
  }

  await createSession();
  redirect("/dashboard");
}

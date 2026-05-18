import { NextResponse } from "next/server";

import { createSession, getLoginCredentials } from "@/lib/session";

export async function POST(request: Request) {
  try {
    if (!request.headers.get("content-type")?.includes("application/json")) {
      return NextResponse.json({ error: "Invalid content type." }, { status: 415 });
    }

    const body = (await request.json()) as {
      username?: string;
      password?: string;
    };

    const username = String(body.username ?? "");
    const password = String(body.password ?? "");
    const credentials = getLoginCredentials();

    if (username !== credentials.username || password !== credentials.password) {
      return NextResponse.json({ error: "Wrong username or password." }, { status: 401 });
    }

    await createSession();

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Login failed", error);
    return NextResponse.json({ error: "Login failed." }, { status: 500 });
  }
}

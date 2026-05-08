import { NextResponse } from "next/server";

import { exchangeGoogleCode } from "@/lib/google-meet";
import { isAuthenticated } from "@/lib/session";

function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
}

export async function GET(request: Request) {
  try {
    if (!(await isAuthenticated())) {
      return unauthorizedResponse();
    }

    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (!code) {
      return NextResponse.redirect(new URL("/meet-session?error=google-code", request.url));
    }

    await exchangeGoogleCode(code, state);
    return NextResponse.redirect(new URL("/meet-session?connected=1", request.url));
  } catch (error) {
    console.error("Failed to complete Google OAuth", error);
    return NextResponse.redirect(new URL("/meet-session?error=google-auth", request.url));
  }
}

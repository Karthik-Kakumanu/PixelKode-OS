import { NextResponse } from "next/server";

import { exchangeGoogleCode } from "@/lib/google-meet";
import { isAuthenticated } from "@/lib/session";

function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
}

function getAppOrigin(request: Request) {
  const configuredRedirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (configuredRedirectUri) {
    try {
      return new URL(configuredRedirectUri).origin;
    } catch {
      // Fall through to forwarded headers / request URL.
    }
  }

  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");
  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  return new URL(request.url).origin;
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
      return NextResponse.redirect(new URL("/meet-session?error=google-code", getAppOrigin(request)));
    }

    await exchangeGoogleCode(code, state);
    return NextResponse.redirect(new URL("/meet-session?connected=1", getAppOrigin(request)));
  } catch (error) {
    console.error("Failed to complete Google OAuth", error);
    return NextResponse.redirect(new URL("/meet-session?error=google-auth", getAppOrigin(request)));
  }
}

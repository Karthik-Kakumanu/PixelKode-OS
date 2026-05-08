import { NextResponse } from "next/server";

import { createGoogleAuthUrl } from "@/lib/google-meet";
import { isAuthenticated } from "@/lib/session";

function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
}

export async function GET(request: Request) {
  try {
    if (!(await isAuthenticated())) {
      return unauthorizedResponse();
    }

    const url = await createGoogleAuthUrl();
    return NextResponse.redirect(url);
  } catch (error) {
    console.error("Failed to start Google OAuth", error);
    return NextResponse.redirect(new URL("/meet-session?error=google-config", request.url));
  }
}

import { NextResponse } from "next/server";

import { getGoogleMeetConnectionStatus } from "@/lib/google-meet";
import { isAuthenticated } from "@/lib/session";

function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
}

export async function GET() {
  try {
    if (!(await isAuthenticated())) {
      return unauthorizedResponse();
    }

    const status = await getGoogleMeetConnectionStatus();
    return NextResponse.json(status, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Failed to read Google Meet status", error);
    return NextResponse.json({ configured: false, connected: false, email: null }, { status: 500 });
  }
}

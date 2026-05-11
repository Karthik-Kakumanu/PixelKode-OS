import { NextResponse } from "next/server";

import { createGoogleMeetEvent, getGoogleMeetConnectionStatus } from "@/lib/google-meet";
import { isAuthenticated } from "@/lib/session";

function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
}

export async function POST(request: Request) {
  try {
    if (!(await isAuthenticated())) {
      return unauthorizedResponse();
    }

    if (!request.headers.get("content-type")?.includes("application/json")) {
      return NextResponse.json({ error: "Invalid content type." }, { status: 415 });
    }

    const status = await getGoogleMeetConnectionStatus();
    if (!status.configured) {
      return NextResponse.json({ error: "Google Meet is not configured on the server yet." }, { status: 400 });
    }

    if (!status.connected) {
      return NextResponse.json({ error: "Google Meet is not connected yet." }, { status: 401 });
    }

    const body = (await request.json()) as {
      attendeeEmail?: string;
      durationMinutes?: number;
      mode?: "instant" | "scheduled";
      scheduledDate?: string;
      scheduledTime?: string;
      timezone?: string;
      title?: string;
    };

    const mode = body.mode === "scheduled" ? "scheduled" : "instant";
    const attendeeEmail = body.attendeeEmail?.trim() || undefined;
    const durationMinutes = Math.max(15, Math.min(240, Number(body.durationMinutes ?? 30) || 30));
    const timezone = body.timezone?.trim() || "Asia/Kolkata";
    const title = body.title?.trim() || (mode === "instant" ? "Instant Google Meet" : "Scheduled Google Meet");

    const scheduledAt =
      mode === "scheduled" && body.scheduledDate && body.scheduledTime
        ? `${body.scheduledDate}T${body.scheduledTime}:00`
        : undefined;

    if (mode === "scheduled" && !scheduledAt) {
      return NextResponse.json({ error: "Scheduled date and time are required." }, { status: 400 });
    }

    const meeting = await createGoogleMeetEvent({
      attendeeEmail,
      durationMinutes,
      isInstant: mode === "instant",
      scheduledAt,
      timezone,
      title
    });

    return NextResponse.json({ meeting }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Failed to create Google Meet", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create Google Meet." },
      { status: 500 }
    );
  }
}

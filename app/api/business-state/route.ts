import { NextResponse } from "next/server";

import {
  getBusinessState,
  saveBusinessState,
  validateSheetPayload
} from "@/lib/business-db";
import { isAuthenticated } from "@/lib/session";

function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
}

export async function GET() {
  try {
    if (!(await isAuthenticated())) {
      return unauthorizedResponse();
    }

    const state = await getBusinessState();
    return NextResponse.json(state, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Failed to load business state", error);
    return NextResponse.json({ error: "Failed to load business state." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    if (!(await isAuthenticated())) {
      return unauthorizedResponse();
    }

    if (!request.headers.get("content-type")?.includes("application/json")) {
      return NextResponse.json({ error: "Invalid content type." }, { status: 415 });
    }

    const body = await request.json();
    validateSheetPayload(body);
    const state = await saveBusinessState(body?.sheets);
    return NextResponse.json(state, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Failed to save business state", error);
    return NextResponse.json({ error: "Failed to save business state." }, { status: 500 });
  }
}

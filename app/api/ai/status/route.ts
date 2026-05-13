import { NextResponse } from "next/server";

import { isAuthenticated } from "@/lib/session";

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? "";
  const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

  return NextResponse.json(
    {
      configured: Boolean(apiKey),
      provider: "Gemini",
      model
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

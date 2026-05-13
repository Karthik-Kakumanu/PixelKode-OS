import { NextResponse } from "next/server";

import { isAuthenticated } from "@/lib/session";

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const openRouterApiKey = process.env.OPENROUTER_API_KEY ?? "";
  const geminiApiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? "";
  const configured = Boolean(openRouterApiKey || geminiApiKey);
  const provider = openRouterApiKey ? "OpenRouter" : geminiApiKey ? "Gemini" : "";
  const model = openRouterApiKey
    ? process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini"
    : process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

  return NextResponse.json(
    {
      configured,
      provider,
      model
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

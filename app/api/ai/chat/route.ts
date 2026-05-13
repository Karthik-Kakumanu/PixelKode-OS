import { NextResponse } from "next/server";

import { buildAIWorkspaceContext, buildAssistantSystemPrompt } from "@/lib/ai-context";
import { getBusinessState } from "@/lib/business-db";
import { isAuthenticated } from "@/lib/session";
import type { SheetKey } from "@/lib/types";

type ChatMessageInput = {
  role: "user" | "assistant";
  content: string;
};

type MeetHistoryRecord = {
  id: string;
  title: string;
  mode: "instant" | "scheduled";
  attendeeEmail: string | null;
  hostEmail: string | null;
  meetLink: string;
  calendarLink: string | null;
  createdAt: string;
  scheduledAt: string | null;
};

function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
}

function getGeminiConfig() {
  return {
    apiKey: process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? "",
    model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash"
  };
}

function extractOutputText(payload: unknown) {
  const candidate = payload as
    | {
        candidates?: Array<{
          content?: {
            parts?: Array<{
              text?: string;
            }>;
          };
        }>;
      }
    | undefined;

  return (
    candidate?.candidates
      ?.flatMap((item) => item.content?.parts ?? [])
      .map((item) => item.text ?? "")
      .join("\n")
      .trim() ?? ""
  );
}

export async function POST(request: Request) {
  try {
    if (!(await isAuthenticated())) {
      return unauthorizedResponse();
    }

    const { apiKey, model } = getGeminiConfig();
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI is not configured yet. Add GEMINI_API_KEY to .env.local.", configured: false },
        { status: 503 }
      );
    }

    if (!request.headers.get("content-type")?.includes("application/json")) {
      return NextResponse.json({ error: "Invalid content type." }, { status: 415 });
    }

    const body = (await request.json()) as {
      prompt?: string;
      messages?: ChatMessageInput[];
      currentSheetKey?: SheetKey;
      pathname?: string;
      meetHistory?: MeetHistoryRecord[];
    };

    const prompt = body.prompt?.trim();
    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
    }

    const sheets = await getBusinessState();
    const workspaceContext = buildAIWorkspaceContext(sheets, body.meetHistory ?? []);
    const currentScope = body.currentSheetKey
      ? `Current sheet focus: ${body.currentSheetKey}.`
      : body.pathname
        ? `Current path: ${body.pathname}.`
        : "Current scope: full workspace.";

    const recentMessages = (body.messages ?? [])
      .filter((message) => message?.content?.trim())
      .slice(-8)
      .map((message) => ({
        role: message.role === "assistant" ? "model" : "user",
        parts: [{ text: message.content }]
      }));

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: buildAssistantSystemPrompt() }]
        },
        contents: [
          ...recentMessages,
          {
            role: "user",
            parts: [
              {
                text: [
                  currentScope,
                  "Use this workspace context for your answer:",
                  JSON.stringify(workspaceContext),
                  `User request: ${prompt}`
                ].join("\n\n")
              }
            ]
          }
        ],
        generationConfig: {
          maxOutputTokens: 900,
          temperature: 0.7
        }
      }),
      cache: "no-store"
    });

    const payload = await response.json();
    if (!response.ok) {
      const errorMessage =
        payload && typeof payload === "object" && "error" in payload
          ? String((payload as { error?: { message?: string } }).error?.message ?? "Gemini request failed.")
          : "Gemini request failed.";

      return NextResponse.json({ error: errorMessage, configured: true }, { status: 500 });
    }

    const text = extractOutputText(payload);
    if (!text) {
      return NextResponse.json({ error: "AI returned an empty response.", configured: true }, { status: 502 });
    }

    return NextResponse.json({ message: text, configured: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("AI chat failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI chat failed.", configured: true },
      { status: 500 }
    );
  }
}

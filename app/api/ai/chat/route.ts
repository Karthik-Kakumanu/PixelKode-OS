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

type AIProviderConfig =
  | {
      provider: "OpenRouter";
      apiKey: string;
      model: string;
      baseUrl: string;
      siteUrl: string;
      appName: string;
    }
  | {
      provider: "Gemini";
      apiKey: string;
      model: string;
    };

function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
}

function getAIConfig(): AIProviderConfig | null {
  const openRouterApiKey = process.env.OPENROUTER_API_KEY ?? "";
  if (openRouterApiKey) {
    return {
      provider: "OpenRouter",
      apiKey: openRouterApiKey,
      model: process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini",
      baseUrl: process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
      siteUrl: process.env.OPENROUTER_SITE_URL ?? "http://localhost:3000",
      appName: process.env.OPENROUTER_APP_NAME ?? "PixelKode OS"
    };
  }

  const geminiApiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? "";
  if (geminiApiKey) {
    return {
      provider: "Gemini",
      apiKey: geminiApiKey,
      model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash"
    };
  }

  return null;
}

function extractGeminiOutputText(payload: unknown) {
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

  return candidate?.candidates?.flatMap((item) => item.content?.parts ?? []).map((item) => item.text ?? "").join("\n").trim() ?? "";
}

function extractOpenRouterOutputText(payload: unknown) {
  const candidate = payload as
    | {
      choices?: Array<{
        message?: {
          content?: string | Array<{ type?: string; text?: string }>;
        };
      }>;
    }
    | undefined;

  const content = candidate?.choices?.[0]?.message?.content;
  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content.map((part) => part.text ?? "").join("\n").trim();
  }

  return "";
}

async function requestGeminiReply(config: Extract<AIProviderConfig, { provider: "Gemini" }>, payload: {
  systemPrompt: string;
  currentScope: string;
  workspaceContext: unknown;
  prompt: string;
  recentMessages: Array<{ role: "model" | "user"; parts: Array<{ text: string }> }>;
}) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${encodeURIComponent(config.apiKey)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: payload.systemPrompt }]
      },
      contents: [
        ...payload.recentMessages,
        {
          role: "user",
          parts: [
            {
              text: [
                payload.currentScope,
                "Use this workspace context for your answer:",
                JSON.stringify(payload.workspaceContext),
                `User request: ${payload.prompt}`
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

  const responsePayload = await response.json();
  if (!response.ok) {
    const errorMessage =
      responsePayload && typeof responsePayload === "object" && "error" in responsePayload
        ? String((responsePayload as { error?: { message?: string } }).error?.message ?? "Gemini request failed.")
        : "Gemini request failed.";

    throw new Error(errorMessage);
  }

  return extractGeminiOutputText(responsePayload);
}

async function requestOpenRouterReply(config: Extract<AIProviderConfig, { provider: "OpenRouter" }>, payload: {
  systemPrompt: string;
  currentScope: string;
  workspaceContext: unknown;
  prompt: string;
  recentMessages: ChatMessageInput[];
}) {
  const response = await fetch(`${config.baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
      "HTTP-Referer": config.siteUrl,
      "X-Title": config.appName
    },
    body: JSON.stringify({
      model: config.model,
      temperature: 0.7,
      max_tokens: 900,
      messages: [
        {
          role: "system",
          content: payload.systemPrompt
        },
        ...payload.recentMessages.map((message) => ({
          role: message.role,
          content: message.content
        })),
        {
          role: "user",
          content: [
            payload.currentScope,
            "Use this workspace context for your answer:",
            JSON.stringify(payload.workspaceContext),
            `User request: ${payload.prompt}`
          ].join("\n\n")
        }
      ]
    }),
    cache: "no-store"
  });

  const responsePayload = await response.json();
  if (!response.ok) {
    const errorMessage =
      responsePayload && typeof responsePayload === "object" && "error" in responsePayload
        ? String((responsePayload as { error?: { message?: string } }).error?.message ?? "OpenRouter request failed.")
        : "OpenRouter request failed.";

    throw new Error(errorMessage);
  }

  return extractOpenRouterOutputText(responsePayload);
}

export async function POST(request: Request) {
  try {
    if (!(await isAuthenticated())) {
      return unauthorizedResponse();
    }

    const aiConfig = getAIConfig();
    if (!aiConfig) {
      return NextResponse.json(
        { error: "AI is not configured yet. Add OPENROUTER_API_KEY or GEMINI_API_KEY to .env.local.", configured: false },
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

    const recentMessages: Array<{ role: "model" | "user"; parts: Array<{ text: string }> }> = (body.messages ?? [])
      .filter((message) => message?.content?.trim())
      .slice(-8)
      .map((message) => ({
        role: message.role === "assistant" ? "model" : "user",
        parts: [{ text: message.content }]
      }));
    const systemPrompt = buildAssistantSystemPrompt();
    const text =
      aiConfig.provider === "OpenRouter"
        ? await requestOpenRouterReply(aiConfig, {
          systemPrompt,
          currentScope,
          workspaceContext,
          prompt,
          recentMessages: (body.messages ?? []).filter((message) => message?.content?.trim()).slice(-8)
        })
        : await requestGeminiReply(aiConfig, {
          systemPrompt,
          currentScope,
          workspaceContext,
          prompt,
          recentMessages
        });

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

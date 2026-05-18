import { NextResponse } from "next/server";

import { isAuthenticated } from "@/lib/session";

const DEFAULT_OPENROUTER_TTS_MODEL =
  process.env.OPENROUTER_TTS_MODEL ?? "openai/gpt-4o-mini-tts-2025-12-15";
const DEFAULT_OPENROUTER_TTS_VOICE = process.env.OPENROUTER_TTS_VOICE ?? "cedar";
const DEFAULT_GEMINI_TTS_MODEL = process.env.GEMINI_TTS_MODEL ?? "gemini-3.1-flash-tts-preview";
const DEFAULT_GEMINI_TTS_VOICE = process.env.GEMINI_TTS_VOICE ?? "Kore";

function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
}

function pcmToWavBuffer(pcmBuffer: Buffer, sampleRate = 24000, channels = 1, bitsPerSample = 16) {
  const byteRate = sampleRate * channels * (bitsPerSample / 8);
  const blockAlign = channels * (bitsPerSample / 8);
  const wavHeader = Buffer.alloc(44);

  wavHeader.write("RIFF", 0);
  wavHeader.writeUInt32LE(36 + pcmBuffer.length, 4);
  wavHeader.write("WAVE", 8);
  wavHeader.write("fmt ", 12);
  wavHeader.writeUInt32LE(16, 16);
  wavHeader.writeUInt16LE(1, 20);
  wavHeader.writeUInt16LE(channels, 22);
  wavHeader.writeUInt32LE(sampleRate, 24);
  wavHeader.writeUInt32LE(byteRate, 28);
  wavHeader.writeUInt16LE(blockAlign, 32);
  wavHeader.writeUInt16LE(bitsPerSample, 34);
  wavHeader.write("data", 36);
  wavHeader.writeUInt32LE(pcmBuffer.length, 40);

  return Buffer.concat([wavHeader, pcmBuffer]);
}

function buildGeminiSpeechPrompt(text: string, rate: number) {
  const pace =
    rate >= 1.4 ? "[very fast]" :
    rate >= 1.2 ? "[fast]" :
    rate <= 0.95 ? "[calm and steady]" :
    "[clear and natural]";

  return `${pace} Keep this brief, warm, and conversational. ${text}`;
}

async function requestOpenRouterSpeech(text: string, voice: string, rate: number) {
  const openRouterApiKey = process.env.OPENROUTER_API_KEY ?? "";
  if (!openRouterApiKey) {
    return null;
  }

  const response = await fetch("https://openrouter.ai/api/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openRouterApiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.OPENROUTER_SITE_URL ?? "http://localhost:3000",
      "X-Title": process.env.OPENROUTER_APP_NAME ?? "PixelKode OS"
    },
    body: JSON.stringify({
      model: DEFAULT_OPENROUTER_TTS_MODEL,
      input: text,
      voice: voice || DEFAULT_OPENROUTER_TTS_VOICE,
      response_format: "wav",
      speed: rate
    }),
    cache: "no-store"
  });

  if (!response.ok) {
    const payload = await response.text().catch(() => "");
    throw new Error(payload || `OpenRouter TTS failed (${response.status})`);
  }

  const arrayBuffer = await response.arrayBuffer();

  return new NextResponse(arrayBuffer, {
    headers: {
      "Content-Type": "audio/wav",
      "Cache-Control": "no-store"
    }
  });
}

async function requestGeminiSpeech(text: string, voice: string, rate: number) {
  const geminiApiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? "";
  if (!geminiApiKey) {
    return null;
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(DEFAULT_GEMINI_TTS_MODEL)}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": geminiApiKey
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: buildGeminiSpeechPrompt(text, rate)
              }
            ]
          }
        ],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: voice || DEFAULT_GEMINI_TTS_VOICE
              }
            }
          }
        },
        model: DEFAULT_GEMINI_TTS_MODEL
      }),
      cache: "no-store"
    }
  );

  const payload = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          inlineData?: {
            data?: string;
          };
        }>;
      };
    }>;
    error?: {
      message?: string;
    };
  };

  if (!response.ok) {
    throw new Error(payload.error?.message ?? `Gemini TTS failed (${response.status})`);
  }

  const base64Audio = payload.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) {
    throw new Error("Gemini TTS returned empty audio.");
  }

  const pcmBuffer = Buffer.from(base64Audio, "base64");
  const wavBuffer = pcmToWavBuffer(pcmBuffer);

  return new NextResponse(wavBuffer, {
    headers: {
      "Content-Type": "audio/wav",
      "Cache-Control": "no-store"
    }
  });
}

export async function POST(request: Request) {
  try {
    if (!(await isAuthenticated())) {
      return unauthorizedResponse();
    }

    if (!request.headers.get("content-type")?.includes("application/json")) {
      return NextResponse.json({ error: "Invalid content type." }, { status: 415 });
    }

    const body = (await request.json()) as {
      text?: string;
      voice?: string;
      rate?: number;
    };

    const text = String(body.text ?? "").trim();
    const voice = String(body.voice ?? "").trim();
    const rate = Number.isFinite(body.rate) ? Number(body.rate) : 1.18;

    if (!text) {
      return NextResponse.json({ error: "Text is required." }, { status: 400 });
    }

    const openRouterResponse = await requestOpenRouterSpeech(text, voice, rate);
    if (openRouterResponse) {
      return openRouterResponse;
    }

    const geminiResponse = await requestGeminiSpeech(text, voice, rate);
    if (geminiResponse) {
      return geminiResponse;
    }

    return NextResponse.json({ error: "No speech provider is configured." }, { status: 503 });
  } catch (error) {
    console.error("AI speech failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI speech failed." },
      { status: 500 }
    );
  }
}

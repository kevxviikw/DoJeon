// Thin Gemini API client for the two AI-backed steps -- Forge's plan
// decomposition and Adjust's tradeoff narration. Raw `fetch` against
// Google's Generative Language REST API. Chosen specifically to keep
// DoJeon on Gemini's free tier for as long as possible post-launch -- a
// club MVP with no revenue yet (proposal §10, Addendum D) shouldn't be on
// a provider that bills from the very first token the way Claude does.
// The API key lives only in this function's environment, never in the
// app -- same key-proxy pattern as every other design decision here.
//
// Model id is deliberately NOT hardcoded with false confidence. Google's
// free-tier-eligible Flash lineup (which model, what RPM/RPD cap) shifts
// every few months -- independent lookups done while wiring this up even
// disagreed with each other on the current name. Before deploying, check
// https://ai.google.dev/gemini-api/docs/models and
// https://ai.google.dev/gemini-api/docs/pricing for whichever Flash model
// currently has a live free tier, then set it explicitly:
//   supabase secrets set GEMINI_MODEL=<current-free-tier-flash-model>
// There's no fallback default here on purpose, so a stale guess can't
// silently start billing after a model's free tier is discontinued.

import { requireEnv } from "./env.ts";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export interface GeminiJSONCallOptions {
  system: string;
  userMessage: string;
  maxOutputTokens?: number;
}

/**
 * Calls Gemini with responseMimeType: "application/json" so the model
 * returns a bare JSON object (no markdown fence to strip), then parses it.
 * Throws with the raw text on parse failure so the caller can log/retry
 * rather than silently proceed on garbage.
 */
export async function callGeminiForJSON<T>(options: GeminiJSONCallOptions): Promise<T> {
  const apiKey = requireEnv("GEMINI_API_KEY");
  const model = requireEnv("GEMINI_MODEL"); // see the note above -- no silent default

  const response = await fetch(`${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: options.system }] },
      contents: [{ role: "user", parts: [{ text: options.userMessage }] }],
      generationConfig: {
        responseMimeType: "application/json",
        maxOutputTokens: options.maxOutputTokens ?? 2048,
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${body}`);
  }

  const data = await response.json();
  const text: string | undefined = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    const finishReason = data.candidates?.[0]?.finishReason;
    throw new Error(`Gemini response had no text back (finishReason: ${finishReason ?? "unknown"}).`);
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Gemini did not return valid JSON. Raw response: ${text}`);
  }
}

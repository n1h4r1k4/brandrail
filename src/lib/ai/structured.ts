import "server-only";
import { z } from "zod";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { activeProvider, claude, describeClaudeError, modelFor } from "./client";

export interface StructuredResult<T> {
  status: "ok" | "error" | "refused" | "off";
  data?: T;
  message?: string;
  model?: string;
  latencyMs: number;
  usage?: { input: number; cacheRead: number; output: number };
}

interface Request<T> {
  tier: "review" | "fast";
  system?: string;
  cacheSystem?: boolean;
  user: string;
  schema: z.ZodType<T>;
  effort?: "low" | "medium" | "high";
}

/** One structured (schema-bound JSON) completion from whichever provider is configured. */
export async function generateStructured<T>(req: Request<T>): Promise<StructuredResult<T>> {
  const provider = activeProvider();
  if (provider === "claude") return viaClaude(req);
  if (provider === "gemini") return viaGemini(req);
  return { status: "off", message: "No AI provider is configured.", latencyMs: 0 };
}

async function viaClaude<T>(req: Request<T>): Promise<StructuredResult<T>> {
  const started = Date.now();
  const model = modelFor(req.tier);
  const system = req.system
    ? [{ type: "text" as const, text: req.system, ...(req.cacheSystem ? { cache_control: { type: "ephemeral" as const } } : {}) }]
    : undefined;
  try {
    // The review tier uses Sonnet with a server-side refusal fallback; the fast tier (Haiku) has none.
    const res = req.tier === "review"
      ? await claude().beta.messages.parse({
          model, max_tokens: 16000, betas: ["server-side-fallback-2026-07-01"], fallbacks: "default",
          output_config: { effort: req.effort ?? "medium", format: betaZodOutputFormat(req.schema) },
          system, messages: [{ role: "user", content: req.user }],
        })
      : await claude().messages.parse({
          model, max_tokens: 4000, output_config: { effort: req.effort ?? "low", format: zodOutputFormat(req.schema) },
          system, messages: [{ role: "user", content: req.user }],
        });
    const usage = { input: res.usage.input_tokens, cacheRead: res.usage.cache_read_input_tokens ?? 0, output: res.usage.output_tokens };
    const latencyMs = Date.now() - started;
    if (res.stop_reason === "refusal") return { status: "refused", message: "The model declined this request.", latencyMs, usage, model: res.model };
    if (!res.parsed_output) return { status: "error", message: "The model returned an unreadable response.", latencyMs, usage, model: res.model };
    return { status: "ok", data: res.parsed_output as T, latencyMs, usage, model: res.model };
  } catch (err) {
    return { status: "error", message: describeClaudeError(err), latencyMs: Date.now() - started };
  }
}

// ---------------------------------------------------------------- Gemini (free tier)

type GeminiClient = { models: { generateContent: (p: unknown) => Promise<{ text?: string; usageMetadata?: { promptTokenCount?: number; cachedContentTokenCount?: number; candidatesTokenCount?: number }; modelVersion?: string; promptFeedback?: { blockReason?: string } }> } };
let gemini: GeminiClient | null = null;

async function geminiClient(): Promise<GeminiClient> {
  if (gemini) return gemini;
  const { GoogleGenAI } = await import("@google/genai");
  gemini = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
    httpOptions: { timeout: 100_000, retryOptions: { attempts: 2 } },
  }) as unknown as GeminiClient;
  return gemini;
}

/** JSON Schema for Gemini's responseJsonSchema (drops keys it doesn't accept). */
function toGeminiSchema(schema: z.ZodType): unknown {
  const json = z.toJSONSchema(schema) as Record<string, unknown>;
  const strip = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(strip);
    if (node && typeof node === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(node)) {
        if (k === "$schema") continue;
        out[k] = strip(v);
      }
      return out;
    }
    return node;
  };
  return strip(json);
}

function describeGeminiError(err: unknown): string {
  const status = (err as { status?: number })?.status;
  if (status === 429) return "Gemini free-tier rate limit reached. Wait a minute and run the check again.";
  if (status === 401 || status === 403) return "The Gemini API key was rejected.";
  if (status === 404) return "The configured Gemini model was not found. Set BRANDRAIL_GEMINI_MODEL to an available model.";
  if (status === 400) return `Gemini rejected the request (${String((err as Error).message ?? "").slice(0, 160)}).`;
  if (status && status >= 500) return "Gemini is temporarily unavailable. Try again shortly.";
  return "Could not reach the Gemini API.";
}

async function viaGemini<T>(req: Request<T>): Promise<StructuredResult<T>> {
  const started = Date.now();
  const model = modelFor(req.tier);
  try {
    const client = await geminiClient();
    const res = await client.models.generateContent({
      model,
      contents: req.user,
      config: {
        ...(req.system ? { systemInstruction: req.system } : {}),
        responseMimeType: "application/json",
        responseJsonSchema: toGeminiSchema(req.schema),
        temperature: 0.2,
      },
    });
    const latencyMs = Date.now() - started;
    const usage = {
      input: res.usageMetadata?.promptTokenCount ?? 0,
      cacheRead: res.usageMetadata?.cachedContentTokenCount ?? 0,
      output: res.usageMetadata?.candidatesTokenCount ?? 0,
    };
    if (res.promptFeedback?.blockReason) return { status: "refused", message: "Gemini declined this request.", latencyMs, usage, model };
    const text = res.text;
    if (!text) return { status: "error", message: "Gemini returned an empty response.", latencyMs, usage, model };
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      return { status: "error", message: "Gemini returned malformed JSON.", latencyMs, usage, model };
    }
    const parsed = req.schema.safeParse(raw);
    if (!parsed.success) return { status: "error", message: "Gemini's response did not match the expected schema.", latencyMs, usage, model };
    return { status: "ok", data: parsed.data, latencyMs, usage, model: res.modelVersion ?? model };
  } catch (err) {
    return { status: "error", message: describeGeminiError(err), latencyMs: Date.now() - started };
  }
}

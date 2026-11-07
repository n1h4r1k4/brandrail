import "server-only";
import Anthropic from "@anthropic-ai/sdk";

// Provider selection: Claude if an Anthropic key is configured, otherwise Google Gemini
// (free tier) if a Gemini key is configured, otherwise AI checks are off and only the
// rule-based engine runs.
export type Provider = "claude" | "gemini" | "none";

export const CLAUDE_REVIEW_MODEL = process.env.BRANDRAIL_REVIEW_MODEL || "claude-sonnet-5-5";
export const CLAUDE_FAST_MODEL = process.env.BRANDRAIL_FAST_MODEL || "claude-haiku-5-5";
export const GEMINI_REVIEW_MODEL = process.env.BRANDRAIL_GEMINI_MODEL || "gemini-3.5-flash";
export const GEMINI_FAST_MODEL = process.env.BRANDRAIL_GEMINI_FAST_MODEL || "gemini-3.5-flash-lite";

export function activeProvider(): Provider {
  if (process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN) return "claude";
  if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) return "gemini";
  return "none";
}

export const aiEnabled = () => activeProvider() !== "none";

export function modelFor(tier: "review" | "fast") {
  const p = activeProvider();
  if (p === "claude") return tier === "review" ? CLAUDE_REVIEW_MODEL : CLAUDE_FAST_MODEL;
  if (p === "gemini") return tier === "review" ? GEMINI_REVIEW_MODEL : GEMINI_FAST_MODEL;
  return "none";
}

/** Short label for the UI, e.g. "Claude · claude-sonnet-5-5" or "Gemini (free tier) · gemini-3.5-flash". */
export function providerLabel() {
  const p = activeProvider();
  if (p === "claude") return `Claude · ${CLAUDE_REVIEW_MODEL}`;
  if (p === "gemini") return `Gemini (free tier) · ${GEMINI_REVIEW_MODEL}`;
  return "off";
}

export function providerName() {
  const p = activeProvider();
  return p === "claude" ? "Anthropic Claude API" : p === "gemini" ? "Google Gemini API" : "none";
}

let anthropic: Anthropic | null = null;
export function claude() {
  anthropic ??= new Anthropic({ timeout: 110_000, maxRetries: 2 });
  return anthropic;
}

/** Human-readable reason for a Claude API failure, without leaking secrets. */
export function describeClaudeError(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) return "The Claude API key was rejected.";
  if (err instanceof Anthropic.PermissionDeniedError) return "The Claude API key lacks permission for this model.";
  if (err instanceof Anthropic.RateLimitError) return "Claude API rate limit reached. Try again in a minute.";
  if (err instanceof Anthropic.BadRequestError) return `Claude API rejected the request (${err.message.slice(0, 160)}).`;
  if (err instanceof Anthropic.APIConnectionTimeoutError) return "The Claude API timed out.";
  if (err instanceof Anthropic.APIConnectionError) return "Could not reach the Claude API.";
  if (err instanceof Anthropic.APIError) return `Claude API error ${err.status ?? ""}.`.trim();
  return "Unexpected error while calling the Claude API.";
}

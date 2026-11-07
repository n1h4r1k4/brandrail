import "server-only";
import Anthropic from "@anthropic-ai/sdk";

export const REVIEW_MODEL = process.env.BRANDRAIL_REVIEW_MODEL || "claude-sonnet-5-5";
export const FAST_MODEL = process.env.BRANDRAIL_FAST_MODEL || "claude-haiku-5-5";

export function aiEnabled() {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

let client: Anthropic | null = null;
export function claude() {
  client ??= new Anthropic({ timeout: 110_000, maxRetries: 2 });
  return client;
}

/** Human-readable reason for an API failure, without leaking secrets. */
export function describeAiError(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) return "The Claude API key was rejected.";
  if (err instanceof Anthropic.PermissionDeniedError) return "The Claude API key lacks permission for this model.";
  if (err instanceof Anthropic.RateLimitError) return "Claude API rate limit reached. Try again in a minute.";
  if (err instanceof Anthropic.BadRequestError) return `Claude API rejected the request (${err.message.slice(0, 160)}).`;
  if (err instanceof Anthropic.APIConnectionTimeoutError) return "The Claude API timed out.";
  if (err instanceof Anthropic.APIConnectionError) return "Could not reach the Claude API.";
  if (err instanceof Anthropic.APIError) return `Claude API error ${err.status ?? ""}.`.trim();
  return "Unexpected error while calling the Claude API.";
}

import "server-only";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { aiEnabled, claude, FAST_MODEL } from "./client";
import { createMask } from "./privacy";
import type { Intent } from "../db/schema";

const IntentSchema = z.object({
  goal: z.string().describe("What the piece is trying to achieve, in under 12 words."),
  audience: z.string().describe("Who it is written for, in under 8 words."),
  key_message: z.string().describe("The single main message, in under 12 words."),
  cta: z.string().describe("The call to action, quoted or closely paraphrased from the text. Empty if none."),
});

/** Extracts the creator's intent so suggested fixes can preserve it. Returns null when AI is off or fails. */
export async function extractIntent(text: string, channel: string, audience: string, watch: string[]): Promise<Intent | null> {
  if (!aiEnabled() || !text.trim()) return null;
  const mask = createMask(watch);
  try {
    const res = await claude().messages.parse({
      model: FAST_MODEL,
      max_tokens: 4000,
      output_config: { effort: "low", format: zodOutputFormat(IntentSchema) },
      messages: [
        {
          role: "user",
          content: `Summarise the intent of this ${channel} content (stated audience: ${audience}). Describe what the creator wants, not whether it is good.\n\n<content>\n${mask.mask(text)}\n</content>`,
        },
      ],
    });
    const p = res.parsed_output;
    if (!p) return null;
    return {
      goal: mask.unmask(p.goal),
      audience: mask.unmask(p.audience),
      keyMessage: mask.unmask(p.key_message),
      cta: mask.unmask(p.cta),
    };
  } catch {
    return null;
  }
}

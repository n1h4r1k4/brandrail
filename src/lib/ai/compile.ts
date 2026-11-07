import "server-only";
import { z } from "zod";
import { generateStructured } from "./structured";
import { locateQuote } from "../engine/text";
import type { Category, Severity } from "../db/schema";

const Draft = z.object({
  category: z.enum(["tone", "terminology", "messaging", "claims", "legal", "confidentiality", "accessibility", "visual"]),
  title: z.string().describe("Short rule title, under 8 words."),
  statement: z.string().describe("The rule as one or two clear, testable sentences, faithful to the source."),
  severity: z.enum(["blocker", "major", "minor"]).describe("blocker = legal/factual risk; major = clearly off-brand; minor = style polish."),
  banned_terms: z.array(z.object({ term: z.string(), replacement: z.string() })).describe("Exact words or phrases the rule forbids, with the replacement it gives (empty string if none). Empty array if the rule is not about specific words."),
  do_examples: z.array(z.string()),
  dont_examples: z.array(z.string()),
  source_page: z.number().describe("Page number the rule comes from."),
  source_quote: z.string().describe("A verbatim sentence copied from that page that states the rule."),
});

export interface RuleDraft {
  category: Category;
  title: string;
  statement: string;
  severity: Severity;
  bannedTerms: { term: string; replacement: string }[];
  examplesDo: string[];
  examplesDont: string[];
  sourcePage: number;
  sourceQuote: string;
  verified: boolean;
}

/**
 * Rule Compiler: turns brand-guideline pages into atomic rule drafts.
 * Every draft must quote its source page verbatim; drafts whose quote cannot be
 * found on the cited page are marked unverified and are not selectable.
 */
export async function compileRules(pages: string[], existingTitles: string[]) {
  const doc = pages.map((p, i) => `<page number="${i + 1}">\n${p}\n</page>`).join("\n");
  const res = await generateStructured({
    tier: "review",
    user: `Extract the brand rules from these brand-guideline pages. One draft per atomic, checkable rule. Ignore background, history and decoration. Do not duplicate rules the brand already has: ${existingTitles.join("; ")}.\n\n${doc}`,
    schema: z.object({ rules: z.array(Draft) }),
    effort: "medium",
  });
  if (res.status !== "ok" || !res.data) return { ok: false as const, error: res.message ?? "The model could not read this document." };
  const drafts: RuleDraft[] = res.data.rules.map((r) => {
    const page = pages[r.source_page - 1] ?? "";
    return {
      category: r.category,
      title: r.title,
      statement: r.statement,
      severity: r.severity,
      bannedTerms: r.banned_terms.filter((t) => t.term.trim()),
      examplesDo: r.do_examples,
      examplesDont: r.dont_examples,
      sourcePage: r.source_page,
      sourceQuote: r.source_quote,
      verified: Boolean(page && locateQuote(page, r.source_quote)),
    };
  });
  return { ok: true as const, drafts };
}

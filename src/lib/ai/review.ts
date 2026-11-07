import "server-only";
import { z } from "zod";
import { generateStructured } from "./structured";
import { createMask } from "./privacy";
import { factStatus, type DraftFinding, type EngineContent, type Kit } from "../engine/types";

const AiFinding = z.object({
  rule_code: z.string().describe("Code of the rule that is violated, e.g. TON-01. Must exist in the rulebook."),
  field: z.enum(["body", "image_text"]).describe("Which content field the quote comes from."),
  quote: z.string().describe("Exact, verbatim span copied from that field. The shortest span that shows the problem."),
  explanation: z.string().describe("One or two plain sentences: what is wrong and why, referring to the rule (and fact, if any)."),
  fact_codes: z.array(z.string()).describe("Facts Ledger codes relevant to this finding (may be empty)."),
  suggestion: z
    .string()
    .describe('Replacement text for exactly the quoted span that fixes the issue and keeps the creator\'s intent. Use "" to delete the span. Use "NO_FIX" if no safe rewrite exists.'),
  confidence: z.number().describe("0 to 1. How sure you are that this is a real violation a brand reviewer would agree with."),
});

const AiReview = z.object({ findings: z.array(AiFinding) });
export type AiFindingT = Omit<z.infer<typeof AiFinding>, "suggestion"> & { suggestion: string | null };

function renderKit(kit: Kit, brand: string, rulebookVersion: number) {
  const rules = kit.rules
    .filter((r) => r.checkType !== "visual")
    .map((r) => {
      const ex = [
        ...r.examplesDo.map((e) => `Do: "${e}"`),
        ...r.examplesDont.map((e) => `Don't: "${e}"`),
      ].join(" ");
      return `[${r.code}] (${r.category}, ${r.severity}) ${r.title}: ${r.statement}${ex ? ` ${ex}` : ""}${r.sourcePage ? ` (brand book p.${r.sourcePage})` : ""}`;
    })
    .join("\n");
  const facts = kit.facts
    .map((f) => {
      const s = factStatus(f, kit.today);
      const state = s === "superseded" ? `SUPERSEDED by ${f.supersededBy}` : s === "expired" ? `EXPIRED on ${f.validUntil}` : `IN DATE until ${f.validUntil}`;
      return `[${f.code}] ${state}: ${f.statement}`;
    })
    .join("\n");
  return `You are Brandrail, the pre-publication brand reviewer for ${brand}. You check marketing content against the brand's approved rulebook and Facts Ledger below, and nothing else.

Rule-based checks have already run (terminology, banned words, exact phrase patterns, expired figures, disclaimers, personal data). Their findings are listed with each request. Your job is the part that needs judgement:
- tone and voice (calm, reassuring, plain language, no pressure),
- messaging and positioning, and fit for the stated audience,
- claims that are implied, paraphrased or exaggerated in ways a pattern would miss (unsupported promises, guarantees, absolute security, comparisons, figures not entailed by an in-date fact).

Rules for every finding (findings that break them are discarded automatically):
1. "quote" is copied exactly, character for character, from the field you name. Quote the shortest span that shows the problem: a phrase or a single sentence.
2. "rule_code" is one of the codes below. Never invent a rule. If no rule covers a concern, do not report it.
3. Cite only fact codes that exist below. A claim counts as supported only by an IN DATE fact whose statement actually entails it. EXPIRED or SUPERSEDED facts support nothing.
4. "suggestion" replaces exactly the quoted span. It must fix the issue, keep the creator's intent (goal, audience, key message, call to action) and read naturally in the surrounding sentence. It must not add new numbers, claims, names or promises unless copied from an in-date fact.
5. Do not repeat anything already flagged by the rule-based checks.
6. Prefer silence over guessing. Clean content should get zero findings. Skip anything below 0.5 confidence.
7. Placeholders such as [CONFIDENTIAL_1] or [EMAIL_1] are masked sensitive values. Leave them unchanged and never guess what they hide.

## Rulebook v${rulebookVersion}
${rules}

## Facts Ledger (today is ${kit.today})
${facts}`;
}

export interface AiReviewResult {
  status: "ok" | "error" | "refused";
  message?: string;
  findings: AiFindingT[];
  model?: string;
  latencyMs: number;
  usage?: { input: number; cacheRead: number; output: number };
  masked: number;
  unmask: (s: string) => string;
}

export async function aiReview(
  kit: Kit,
  brand: string,
  rulebookVersion: number,
  content: EngineContent,
  alreadyFlagged: DraftFinding[],
): Promise<AiReviewResult> {
  const watch = kit.terms.filter((t) => t.kind === "watch").map((t) => t.term);
  const mask = createMask(watch);
  const body = mask.mask(content.body);
  const imageText = mask.mask(content.imageText);
  const intent = content.intent;
  const flagged = alreadyFlagged.length
    ? alreadyFlagged.map((f) => `- ${f.ruleCode} [${f.field}] "${mask.mask(f.quote)}"`).join("\n")
    : "- (none)";
  const user = [
    `Channel: ${content.channel} | Audience: ${content.audience} | Written by: ${content.source === "ai" ? "an AI tool (reviewed by a person)" : content.source === "agency" ? "an agency" : "an employee"}`,
    intent
      ? `Creator's intent: goal: ${intent.goal}; audience: ${intent.audience}; key message: ${intent.keyMessage}; call to action: ${intent.cta}`
      : "Creator's intent: not stated.",
    "",
    `<field name="body">\n${body}\n</field>`,
    imageText.trim() ? `<field name="image_text">\n${imageText}\n</field>` : "",
    "",
    `Already flagged by rule-based checks (do not repeat):\n${flagged}`,
    "",
    "Review the content and return your findings.",
  ].join("\n");

  const res = await generateStructured({
    tier: "review",
    system: renderKit(kit, brand, rulebookVersion),
    cacheSystem: true,
    user,
    schema: AiReview,
    effort: "medium",
  });
  const base = { latencyMs: res.latencyMs, usage: res.usage, masked: mask.map.size, unmask: mask.unmask, model: res.model };
  if (res.status !== "ok" || !res.data) {
    return { ...base, status: res.status === "refused" ? "refused" : "error", message: res.message, findings: [] };
  }
  const findings = res.data.findings.map((f) => ({ ...f, suggestion: f.suggestion.trim() === "NO_FIX" ? null : f.suggestion }));
  return { ...base, status: "ok", findings };
}

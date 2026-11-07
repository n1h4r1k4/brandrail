// Evidence-or-silence verifier. An AI finding survives only if:
//  - it cites a rule that exists in the active rulebook version,
//  - its quote exists verbatim (or near-verbatim) in the content,
//  - its fact codes exist,
//  - it is not a duplicate of a rule-based finding,
//  - its confidence is at least 0.5.
// Suggested rewrites are re-checked: a rewrite that introduces a new rule-based
// violation, an unapproved figure, or drops the call to action is withheld.
import type { Field } from "../db/schema";
import { runDeterministic } from "./deterministic";
import { applyReplacement, findAll, locateQuote, normaliseClaim, overlaps } from "./text";
import { isActive, type DraftFinding, type EngineContent, type Kit } from "./types";

export interface AiCandidate {
  rule_code: string;
  field: "body" | "image_text";
  quote: string;
  explanation: string;
  fact_codes: string[];
  suggestion: string | null;
  confidence: number;
}

export interface Dropped {
  ruleCode: string;
  quote: string;
  reason: string;
}

const NUM = /\d[\d,]*(?:\.\d+)?\s?(?:%|x\b|lakh|crore|million|seconds?)?/gi;

export function validateSuggestion(
  kit: Kit,
  content: EngineContent,
  field: Field,
  span: { start: number; end: number },
  quote: string,
  suggestion: string,
): { ok: true } | { ok: false; reason: string } {
  if (suggestion.trim() === quote.trim()) return { ok: false, reason: "it does not change anything" };
  // No new figures unless they come from an in-date fact.
  const factText = normaliseClaim(kit.facts.filter((f) => isActive(f, kit.today)).map((f) => f.statement + " " + f.keywords.join(" ")).join(" "));
  const quoteNums = new Set(findAll(NUM, quote).map((m) => normaliseClaim(m.text)));
  for (const m of findAll(NUM, suggestion)) {
    const n = normaliseClaim(m.text);
    if (!quoteNums.has(n) && !factText.includes(n)) return { ok: false, reason: `it adds a figure ("${m.text.trim()}") that is not in the Facts Ledger` };
  }
  // Keep the call to action.
  const cta = content.intent?.cta?.toLowerCase().replace(/["'.!]/g, "").trim();
  if (cta && cta.length > 3 && quote.toLowerCase().includes(cta) && !suggestion.toLowerCase().includes(cta)) {
    return { ok: false, reason: "it would remove the call to action" };
  }
  if (field !== "body") return { ok: true };
  // Re-run the rule-based checks on the rewritten text.
  const before = runDeterministic(kit, content).findings;
  const nextBody = applyReplacement(content.body, span.start, span.end, suggestion);
  const after = runDeterministic(kit, { ...content, body: nextBody }).findings;
  const inserted = { start: span.start, end: span.start + suggestion.length };
  const fresh = after.find(
    (a) => a.field === "body" && overlaps(a, inserted) && !before.some((b) => b.ruleCode === a.ruleCode && b.quote === a.quote),
  );
  if (fresh) return { ok: false, reason: `it would introduce a new issue (${fresh.ruleCode}: "${fresh.quote}")` };
  return { ok: true };
}

export function verifyAiFindings(
  kit: Kit,
  content: EngineContent,
  deterministic: DraftFinding[],
  candidates: AiCandidate[],
  unmask: (s: string) => string = (s) => s,
) {
  const kept: DraftFinding[] = [];
  const dropped: Dropped[] = [];
  const ruleByCode = new Map(kit.rules.map((r) => [r.code, r]));
  const factCodes = new Set(kit.facts.map((f) => f.code));
  const fieldText = (f: Field) => (f === "body" ? content.body : f === "image_text" ? content.imageText : "");

  for (const c of candidates) {
    const quote = unmask(c.quote);
    const code = c.rule_code.trim().toUpperCase();
    const rule = ruleByCode.get(code);
    if (!rule) {
      dropped.push({ ruleCode: code, quote, reason: "cites a rule that is not in the active rulebook" });
      continue;
    }
    if (rule.checkType === "visual") {
      dropped.push({ ruleCode: code, quote, reason: "visual rules are checked from the image itself" });
      continue;
    }
    let field: Field = c.field;
    let loc = locateQuote(fieldText(field), quote);
    if (!loc) {
      const other: Field = field === "body" ? "image_text" : "body";
      const alt = locateQuote(fieldText(other), quote);
      if (alt) {
        field = other;
        loc = alt;
      }
    }
    if (!loc) {
      dropped.push({ ruleCode: code, quote, reason: "quote not found in the content" });
      continue;
    }
    const confidence = Math.max(0, Math.min(1, Number(c.confidence) || 0));
    if (confidence < 0.5) {
      dropped.push({ ruleCode: code, quote, reason: `confidence ${confidence.toFixed(2)} is below 0.5` });
      continue;
    }
    const exactQuote = fieldText(field).slice(loc.start, loc.end);
    const span = { start: loc.start, end: loc.end };
    let suggestion = c.suggestion === null ? null : unmask(c.suggestion);
    let note = "";
    if (suggestion !== null) {
      const v = validateSuggestion(kit, content, field, span, exactQuote, suggestion);
      if (!v.ok) {
        note = ` Suggested rewrite withheld because ${v.reason}.`;
        suggestion = null;
      }
    }
    const dup = deterministic.find((d) => d.ruleCode === code && d.field === field && overlaps(d, span));
    if (dup) {
      if (dup.suggestion === null && suggestion !== null) {
        dup.suggestion = suggestion;
        dup.suggestionByAi = true;
        dropped.push({ ruleCode: code, quote: exactQuote, reason: "duplicate of a rule-based finding (its rewrite was kept)" });
      } else {
        dropped.push({ ruleCode: code, quote: exactQuote, reason: "duplicate of a rule-based finding" });
      }
      continue;
    }
    if (kept.some((k) => k.ruleCode === code && k.field === field && overlaps(k, span))) {
      dropped.push({ ruleCode: code, quote: exactQuote, reason: "duplicate of another AI finding" });
      continue;
    }
    const facts = c.fact_codes.map((x) => x.trim().toUpperCase()).filter((x) => factCodes.has(x));
    kept.push({
      ruleCode: code,
      field,
      quote: exactQuote,
      start: span.start,
      end: span.end,
      message: unmask(c.explanation).trim() + note,
      suggestion,
      factCodes: facts,
      method: "ai",
      confidence,
    });
  }
  return { kept, dropped };
}

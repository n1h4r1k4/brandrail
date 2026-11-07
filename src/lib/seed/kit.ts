import { SEED_FACTS, SEED_RULES, SEED_TERMS, overrideRoleFor } from "./nimbus";
import type { Kit } from "../engine/types";

/** The seed brand kit as an in-memory Kit (used by seeding and the eval harness). */
export function seedKit(today: string): Kit {
  return {
    today,
    rules: SEED_RULES.map((r) => ({
      code: r.code,
      category: r.category,
      severity: r.severity,
      title: r.title,
      statement: r.statement,
      checkType: r.checkType,
      params: r.params ?? {},
      sourcePage: r.sourcePage,
      overrideRole: overrideRoleFor(r.category),
      examplesDo: r.examplesDo ?? [],
      examplesDont: r.examplesDont ?? [],
    })),
    facts: SEED_FACTS.map((f) => ({
      code: f.code,
      statement: f.statement,
      keywords: f.keywords,
      supports: f.supports ?? [],
      evidence: f.evidence,
      owner: f.owner,
      validUntil: f.validUntil,
      supersededBy: f.supersededBy ?? null,
    })),
    terms: SEED_TERMS.map((t) => ({
      kind: t.kind,
      term: t.term,
      replacement: t.replacement ?? null,
      ruleCode: t.ruleCode,
      note: t.note ?? null,
    })),
  };
}

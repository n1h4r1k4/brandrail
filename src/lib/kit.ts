import "server-only";
import { and, asc, eq } from "drizzle-orm";
import type { DB } from "./db";
import { facts, rules, terms, workspaces } from "./db/schema";
import type { Kit } from "./engine/types";
import { todayIST } from "./engine/text";

/** Load the brand kit (active or a specific rulebook version) for a workspace. */
export async function loadKit(db: DB, workspaceId: string, version?: number): Promise<Kit & { version: number }> {
  let v = version;
  if (v === undefined) {
    const [ws] = await db.select({ v: workspaces.activeRulebookVersion }).from(workspaces).where(eq(workspaces.id, workspaceId));
    v = ws?.v ?? 1;
  }
  const [ruleRows, factRows, termRows] = await Promise.all([
    db.select().from(rules).where(and(eq(rules.workspaceId, workspaceId), eq(rules.version, v))).orderBy(asc(rules.code)),
    db.select().from(facts).where(eq(facts.workspaceId, workspaceId)).orderBy(asc(facts.code)),
    db.select().from(terms).where(eq(terms.workspaceId, workspaceId)).orderBy(asc(terms.id)),
  ]);
  return {
    version: v,
    today: todayIST(),
    rules: ruleRows.map((r) => ({
      code: r.code,
      category: r.category,
      severity: r.severity,
      title: r.title,
      statement: r.statement,
      checkType: r.checkType,
      params: r.params,
      sourcePage: r.sourcePage,
      overrideRole: r.overrideRole,
      examplesDo: r.examplesDo,
      examplesDont: r.examplesDont,
    })),
    facts: factRows.map((f) => ({
      code: f.code,
      statement: f.statement,
      keywords: f.keywords,
      supports: f.supports,
      evidence: f.evidence,
      owner: f.owner,
      validUntil: f.validUntil,
      supersededBy: f.supersededBy,
    })),
    terms: termRows.map((t) => ({ kind: t.kind, term: t.term, replacement: t.replacement, ruleCode: t.ruleCode, note: t.note })),
  };
}

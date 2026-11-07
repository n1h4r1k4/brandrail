import { and, asc, desc, eq } from "drizzle-orm";
import { requireSession } from "@/lib/session";
import { rulebookVersions, rules, terms } from "@/lib/db/schema";
import { aiEnabled } from "@/lib/ai/client";
import { PageHeader } from "@/components/ui";
import { RulebookView } from "./view";

export const maxDuration = 120;

export default async function RulebookPage({ searchParams }: { searchParams: Promise<{ v?: string }> }) {
  const s = await requireSession();
  const sp = await searchParams;
  const active = s.workspace.activeRulebookVersion;
  const v = Math.min(active, Math.max(1, Number(sp.v) || active));
  const [ruleRows, versions, termRows] = await Promise.all([
    s.db.select().from(rules).where(and(eq(rules.workspaceId, s.workspace.id), eq(rules.version, v))).orderBy(asc(rules.code)),
    s.db.select().from(rulebookVersions).where(eq(rulebookVersions.workspaceId, s.workspace.id)).orderBy(desc(rulebookVersions.version)),
    s.db.select().from(terms).where(eq(terms.workspaceId, s.workspace.id)),
  ]);
  return (
    <>
      <PageHeader
        title="Brand Rulebook"
        sub="Your brand guidelines as atomic, versioned rules. Each rule cites the page it came from, and every check and approval is pinned to the rulebook version it used."
      />
      <RulebookView
        isAdmin={s.user.role === "admin"}
        ai={aiEnabled()}
        version={v}
        active={active}
        versions={versions.map((x) => ({ version: x.version, note: x.note, createdBy: x.createdBy, createdAt: x.createdAt.toISOString() }))}
        rules={ruleRows.map((r) => ({
          code: r.code, category: r.category, title: r.title, statement: r.statement, severity: r.severity, checkType: r.checkType,
          sourceDoc: r.sourceDoc, sourcePage: r.sourcePage, overrideRole: r.overrideRole, examplesDo: r.examplesDo, examplesDont: r.examplesDont,
          terms: termRows.filter((t) => t.ruleCode === r.code).map((t) => ({ kind: t.kind, term: t.term, replacement: t.replacement })),
        }))}
      />
    </>
  );
}

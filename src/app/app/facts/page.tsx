import { asc, eq } from "drizzle-orm";
import { requireSession } from "@/lib/session";
import { facts, terms } from "@/lib/db/schema";
import { factStatus } from "@/lib/engine/types";
import { todayIST } from "@/lib/engine/text";
import { PageHeader } from "@/components/ui";
import { FactsView } from "./view";

export default async function FactsPage() {
  const s = await requireSession();
  const today = todayIST();
  const [rows, termRows] = await Promise.all([
    s.db.select().from(facts).where(eq(facts.workspaceId, s.workspace.id)).orderBy(asc(facts.code)),
    s.db.select().from(terms).where(eq(terms.workspaceId, s.workspace.id)).orderBy(asc(terms.id)),
  ]);
  return (
    <>
      <PageHeader
        title="Facts Ledger"
        sub={`Approved claims, figures and offers. Each has evidence, an owner and a valid-until date. Content may only use in-date facts. Expired or superseded ones are flagged automatically. Today is ${today}.`}
      />
      <FactsView
        canEdit={s.user.role === "compliance" || s.user.role === "admin"}
        facts={rows.map((f) => ({
          code: f.code, statement: f.statement, keywords: f.keywords, supports: f.supports, evidence: f.evidence, owner: f.owner,
          validUntil: f.validUntil, supersededBy: f.supersededBy,
          status: factStatus({ ...f, supersededBy: f.supersededBy }, today),
        }))}
        terms={termRows.map((t) => ({ kind: t.kind, term: t.term, replacement: t.replacement, ruleCode: t.ruleCode, note: t.note }))}
      />
    </>
  );
}

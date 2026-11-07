import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { ShieldCheck, ShieldX } from "lucide-react";
import { requireSession } from "@/lib/session";
import { auditEvents, contents } from "@/lib/db/schema";
import { verifyChain } from "@/lib/audit";
import { Card, PageHeader } from "@/components/ui";

export default async function AuditPage() {
  const s = await requireSession();
  const [events, chain, titles] = await Promise.all([
    s.db.select().from(auditEvents).where(eq(auditEvents.workspaceId, s.workspace.id)).orderBy(desc(auditEvents.seq)).limit(300),
    verifyChain(s.db, s.workspace.id),
    s.db.select({ id: contents.id, title: contents.title }).from(contents).where(eq(contents.workspaceId, s.workspace.id)),
  ]);
  const title = new Map(titles.map((t) => [t.id, t.title]));
  return (
    <>
      <PageHeader
        title="Audit log"
        sub="Append-only and hash-chained. Each event stores the SHA-256 of its contents plus the previous event's hash, so editing or deleting any event breaks the chain from that point on."
      />
      <Card className={`mb-5 flex items-center gap-3 p-4 ${chain.ok ? "border-ok/30 bg-ok-soft/60" : "border-blocker/30 bg-blocker-soft/60"}`}>
        {chain.ok ? <ShieldCheck className="text-ok" /> : <ShieldX className="text-blocker" />}
        <div className="text-sm">
          {chain.ok ? (
            <><b className="text-ink">Chain verified just now.</b> {chain.events} events, all hashes recomputed and matching. Head: <span className="font-mono text-xs">{chain.head.slice(0, 24)}…</span></>
          ) : (
            <><b className="text-ink">Chain broken at event #{chain.brokenAt}.</b> A record was altered or removed.</>
          )}
        </div>
      </Card>
      <Card className="divide-y divide-line">
        {events.map((e) => (
          <div key={e.seq} className="grid gap-1 px-4 py-3 text-sm sm:grid-cols-[60px_160px_1fr]">
            <div className="font-mono text-xs text-muted">#{e.seq}</div>
            <div className="text-xs text-muted">{new Date(e.at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</div>
            <div>
              <b className="text-ink">{e.actorName}</b> <span className="text-xs text-muted">({e.actorRole})</span>{" "}
              {e.entityType === "content" && title.has(e.entityId) ? (
                <Link href={`/app/content/${e.entityId}`} className="text-accent hover:underline">{title.get(e.entityId)}</Link>
              ) : null}{" "}
              <span className="text-ink-2">{e.summary}</span>
              <div className="mt-0.5 font-mono text-[10px] text-muted">{e.action} · hash {e.hash.slice(0, 20)}… · prev {e.prevHash.slice(0, 12)}…</div>
            </div>
          </div>
        ))}
      </Card>
    </>
  );
}

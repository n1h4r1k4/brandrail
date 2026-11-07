import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { requireSession } from "@/lib/session";
import { listContents } from "@/lib/queries";
import { approvals, type Role } from "@/lib/db/schema";
import { Card, PageHeader, StatusTag, Tag, timeAgo } from "@/components/ui";
import { ROLE_LABEL, SOURCE_LABEL } from "@/lib/workflow";

export default async function ReviewQueue() {
  const s = await requireSession();
  const items = await listContents(s.db, s.workspace.id);
  const role = s.user.role === "admin" ? "reviewer" : s.user.role;
  const inReview = items.filter((c) => c.status === "in_review");
  const done = await Promise.all(
    inReview.map(async (c) => {
      const rows = await s.db.select({ role: approvals.role }).from(approvals)
        .where(and(eq(approvals.contentId, c.id), eq(approvals.round, c.reviewRound), eq(approvals.decision, "approved")));
      return { id: c.id, roles: rows.map((r): Role => (r.role === "admin" ? "reviewer" : r.role)) };
    }),
  );
  const approvedBy = new Map(done.map((d) => [d.id, d.roles]));
  const mine = inReview.filter((c) => c.requiredRoles.includes(role) && !approvedBy.get(c.id)?.includes(role));
  const others = inReview.filter((c) => !mine.includes(c));
  const sentBack = items.filter((c) => c.status === "changes_requested");

  const Row = ({ c }: { c: (typeof items)[number] }) => (
    <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div>
        <Link href={`/app/content/${c.id}`} className="font-medium text-ink hover:text-accent">{c.title}</Link>
        <div className="mt-0.5 text-xs text-muted">
          {c.channel} · {SOURCE_LABEL[c.source]} · round {Math.max(1, c.reviewRound)} · {timeAgo(c.updatedAt)}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {c.requiredRoles.map((r) => (
          <Tag key={r} tone={approvedBy.get(c.id)?.includes(r) ? "ok" : "grey"}>{approvedBy.get(c.id)?.includes(r) ? "✓ " : ""}{ROLE_LABEL[r]}</Tag>
        ))}
        {c.disputed > 0 && <Tag tone="major">{c.disputed} disputed</Tag>}
        {c.open.blocker > 0 && <Tag tone="blocker">{c.open.blocker} blocker</Tag>}
        <StatusTag status={c.status} />
      </div>
    </li>
  );

  return (
    <>
      <PageHeader
        title="Review queue"
        sub={s.user.role === "creator"
          ? "Creators don't review. Switch persona (top right) to Meera (brand reviewer) or Kabir (Compliance) to act on these."
          : `Pieces waiting for ${ROLE_LABEL[s.user.role]} approval. Claims, legal and confidentiality findings automatically add Compliance as a required reviewer.`}
      />
      <h2 className="mb-2 text-sm font-semibold text-ink">Waiting for you ({s.user.role === "creator" ? 0 : mine.length})</h2>
      <Card className="mb-6">
        <ul className="divide-y divide-line">
          {s.user.role !== "creator" && mine.map((c) => <Row key={c.id} c={c} />)}
          {(s.user.role === "creator" || mine.length === 0) && <li className="px-4 py-6 text-center text-sm text-muted">Nothing waiting for your role.</li>}
        </ul>
      </Card>
      <h2 className="mb-2 text-sm font-semibold text-ink">Other pieces in review ({s.user.role === "creator" ? inReview.length : others.length})</h2>
      <Card className="mb-6">
        <ul className="divide-y divide-line">
          {(s.user.role === "creator" ? inReview : others).map((c) => <Row key={c.id} c={c} />)}
          {(s.user.role === "creator" ? inReview : others).length === 0 && <li className="px-4 py-6 text-center text-sm text-muted">None.</li>}
        </ul>
      </Card>
      <h2 className="mb-2 text-sm font-semibold text-ink">Sent back to creators ({sentBack.length})</h2>
      <Card>
        <ul className="divide-y divide-line">
          {sentBack.map((c) => <Row key={c.id} c={c} />)}
          {sentBack.length === 0 && <li className="px-4 py-6 text-center text-sm text-muted">None.</li>}
        </ul>
      </Card>
    </>
  );
}

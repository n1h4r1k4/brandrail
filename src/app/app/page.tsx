import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { requireSession } from "@/lib/session";
import { listContents } from "@/lib/queries";
import { Card, Kpi, PageHeader, StatusTag, Tag, timeAgo } from "@/components/ui";
import { ROLE_LABEL, SOURCE_LABEL } from "@/lib/workflow";
import { ContentTable } from "./content-table";

export default async function Dashboard() {
  const s = await requireSession();
  const items = await listContents(s.db, s.workspace.id);
  const role = s.user.role === "admin" ? "reviewer" : s.user.role;
  const waiting = items.filter((c) => c.status === "in_review" && c.requiredRoles.includes(role));
  const mine = items.filter((c) => c.status === "draft" || c.status === "changes_requested");
  const approved = items.filter((c) => c.status === "approved");
  const reviewed = items.filter((c) => c.status === "approved" && c.reviewRound > 0);
  const firstPass = reviewed.length ? Math.round((reviewed.filter((c) => c.reviewRound === 1).length / reviewed.length) * 100) : 0;

  const next =
    s.user.role === "creator"
      ? mine.length
        ? `You have ${mine.length} piece${mine.length > 1 ? "s" : ""} to fix or submit.`
        : "Nothing waiting on you. Create a new piece to check."
      : waiting.length
        ? `${waiting.length} piece${waiting.length > 1 ? "s" : ""} waiting for your ${ROLE_LABEL[s.user.role].toLowerCase()} review.`
        : "Your review queue is empty.";

  return (
    <>
      <PageHeader
        title={`Good to see you, ${s.user.name.split(" ")[0]}`}
        sub={next}
        actions={
          <Link href="/app/new" className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-white hover:bg-accent-2">
            <PlusCircle size={16} /> New content
          </Link>
        }
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Waiting for review" value={items.filter((c) => c.status === "in_review").length} />
        <Kpi label="Changes requested" value={items.filter((c) => c.status === "changes_requested").length} tone="major" />
        <Kpi label="Approved & verified" value={approved.length} tone="ok" />
        <Kpi label="Approved in first round" value={`${firstPass}%`} hint="North-star: brand-safe first-pass rate" />
      </div>

      {waiting.length > 0 && s.user.role !== "creator" && (
        <Card className="mt-6 p-4">
          <h2 className="text-base font-semibold">Needs your review</h2>
          <ul className="mt-3 divide-y divide-line">
            {waiting.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <Link href={`/app/content/${c.id}`} className="font-medium text-ink hover:text-accent">{c.title}</Link>
                <span className="flex items-center gap-2 text-xs text-muted">
                  {c.disputed > 0 && <Tag tone="major">{c.disputed} disputed</Tag>}
                  <Tag>{SOURCE_LABEL[c.source]}</Tag> {c.channel} · {timeAgo(c.updatedAt)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <h2 className="mt-8 mb-3 text-base font-semibold">All content</h2>
      <ContentTable items={items.map((c) => ({ ...c, createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt.toISOString() }))} />
      <p className="mt-3 text-xs text-muted">
        Items marked <StatusTag status="approved" /> are locked with a verified record. Older items tagged “seeded” are demo history so Insights has data on day one.
      </p>
    </>
  );
}

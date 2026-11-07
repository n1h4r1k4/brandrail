import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { ArrowRight, CheckCircle2, ClipboardCheck, PlusCircle, RotateCcw, ShieldCheck, Timer } from "lucide-react";
import { requireSession } from "@/lib/session";
import { listContents } from "@/lib/queries";
import { auditEvents } from "@/lib/db/schema";
import { Avatar, Card, Kpi, Tag, timeAgo } from "@/components/ui";
import { ROLE_LABEL, SOURCE_LABEL } from "@/lib/workflow";
import { ContentTable } from "./content-table";
import { ShieldOrbit } from "@/components/graphics";

export default async function Dashboard() {
  const s = await requireSession();
  const [items, events] = await Promise.all([
    listContents(s.db, s.workspace.id),
    s.db.select().from(auditEvents).where(eq(auditEvents.workspaceId, s.workspace.id)).orderBy(desc(auditEvents.seq)).limit(7),
  ]);
  const role = s.user.role === "admin" ? "reviewer" : s.user.role;
  const waiting = items.filter((c) => c.status === "in_review" && c.requiredRoles.includes(role));
  const mine = items.filter((c) => c.status === "draft" || c.status === "changes_requested");
  const approved = items.filter((c) => c.status === "approved");
  const firstPass = approved.length ? Math.round((approved.filter((c) => c.reviewRound === 1).length / approved.length) * 100) : 0;
  const isCreator = s.user.role === "creator";
  const focus = isCreator ? mine : waiting;

  const headline = isCreator
    ? mine.length ? `You have ${mine.length} piece${mine.length > 1 ? "s" : ""} to fix or submit.` : "Nothing is waiting on you."
    : waiting.length ? `${waiting.length} piece${waiting.length > 1 ? "s" : ""} need${waiting.length === 1 ? "s" : ""} your ${ROLE_LABEL[s.user.role].toLowerCase()} review.` : "Your review queue is clear.";

  return (
    <>
      <section className="fade-up relative overflow-hidden rounded-3xl bg-hero p-6 text-white shadow-lift sm:p-8">
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-40" />
        <ShieldOrbit className="pointer-events-none absolute -right-16 -top-20 hidden h-[360px] w-[360px] opacity-70 lg:block" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 text-sm text-indigo-100">
              <Avatar name={s.user.name} role={s.user.role} size={26} />
              {s.user.name} · {ROLE_LABEL[s.user.role]}
            </div>
            <h1 className="mt-3 font-display text-3xl font-bold leading-tight text-white sm:text-4xl">{headline}</h1>
            <p className="mt-2 text-sm text-indigo-100/90">
              {isCreator
                ? "Check a draft before anyone else sees it. Every flag cites the rule or fact behind it, and most come with a one-click fix."
                : "Review only what needs judgement. Rule-based checks and the verified AI review have already done the mechanical work."}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/app/new" className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-accent shadow-sm hover:bg-indigo-50">
                <PlusCircle size={16} /> Check new content
              </Link>
              {!isCreator && (
                <Link href="/app/review" className="inline-flex items-center gap-1.5 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur hover:bg-white/20">
                  <ClipboardCheck size={16} /> Open review queue
                </Link>
              )}
            </div>
          </div>
          <div className="relative grid grid-cols-3 gap-3 text-center lg:mr-56">
            {[
              ["In review", items.filter((c) => c.status === "in_review").length],
              ["Sent back", items.filter((c) => c.status === "changes_requested").length],
              ["Verified", approved.length],
            ].map(([l, n]) => (
              <div key={l} className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
                <div className="font-display text-3xl font-bold">{n}</div>
                <div className="text-[11px] uppercase tracking-wider text-indigo-100/80">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Pieces checked" value={items.length} hint="Including seeded demo history" icon={<ShieldCheck size={16} />} />
        <Kpi label="Approved in first round" value={`${firstPass}%`} hint="North-star: brand-safe first-pass rate" tone="ok" icon={<CheckCircle2 size={16} />} />
        <Kpi label="Waiting for review" value={items.filter((c) => c.status === "in_review").length} icon={<Timer size={16} />} />
        <Kpi label="Changes requested" value={items.filter((c) => c.status === "changes_requested").length} tone="major" icon={<RotateCcw size={16} />} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">{isCreator ? "Your drafts" : "Needs your review"}</h2>
            <Link href={isCreator ? "/app/new" : "/app/review"} className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline">
              {isCreator ? "New content" : "Review queue"} <ArrowRight size={13} />
            </Link>
          </div>
          <ul className="mt-3 space-y-2">
            {focus.slice(0, 5).map((c) => (
              <li key={c.id}>
                <Link href={`/app/content/${c.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line/80 px-3.5 py-3 transition hover:border-accent/40 hover:bg-accent-soft/30">
                  <span>
                    <span className="block font-medium text-ink">{c.title}</span>
                    <span className="text-xs text-muted">{c.channel} · {SOURCE_LABEL[c.source]} · {timeAgo(c.updatedAt)}</span>
                  </span>
                  <span className="flex gap-1">
                    {c.open.blocker > 0 && <Tag tone="blocker">{c.open.blocker} blocker</Tag>}
                    {c.open.major > 0 && <Tag tone="major">{c.open.major} major</Tag>}
                    {c.disputed > 0 && <Tag tone="major">{c.disputed} disputed</Tag>}
                    {c.status === "changes_requested" && <Tag tone="major">changes requested</Tag>}
                  </span>
                </Link>
              </li>
            ))}
            {focus.length === 0 && (
              <li className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
                {isCreator ? "No drafts. Load a sample on the New content page to see Brandrail at work." : "Nothing waiting. Switch to Aarav (creator) to submit something."}
              </li>
            )}
          </ul>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Recent activity</h2>
            <Link href="/app/audit" className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline">Audit log <ArrowRight size={13} /></Link>
          </div>
          <ol className="relative mt-4 space-y-4 border-l border-line pl-5">
            {events.map((e) => (
              <li key={e.seq} className="relative">
                <span className="absolute -left-[26px] top-1 h-2.5 w-2.5 rounded-full bg-accent ring-4 ring-accent-soft" />
                <div className="text-sm text-ink-2"><b className="text-ink">{e.actorName}</b> {e.summary.length > 90 ? e.summary.slice(0, 90) + "…" : e.summary}</div>
                <div className="text-xs text-muted">{timeAgo(e.at)}</div>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      <h2 className="mb-3 mt-8 text-base font-semibold">All content</h2>
      <ContentTable items={items.map((c) => ({ ...c, createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt.toISOString() }))} />
    </>
  );
}

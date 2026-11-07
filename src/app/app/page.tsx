import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import {
  ArrowRight, BadgeCheck, BookMarked, CheckCircle2, ChevronRight, ClipboardCheck, Database, FilePlus2, Flag, PenLine,
  PlusCircle, RotateCcw, Send, ShieldAlert, ShieldCheck, Sparkles, Timer,
} from "lucide-react";
import { requireSession } from "@/lib/session";
import { listContents } from "@/lib/queries";
import { auditEvents } from "@/lib/db/schema";
import { Avatar, Card, Kpi, LogoMark, ScoreRing, Tag, timeAgo } from "@/components/ui";
import { ROLE_LABEL, SOURCE_LABEL } from "@/lib/workflow";
import { ContentTable } from "./content-table";
import { ShieldOrbit } from "@/components/graphics";
import { HeroShield3D } from "@/components/hero-shield";
import { MiniRing, SparkBars, SparkLine } from "@/components/spark";

const DAY = 86_400_000;

/** Counts per day for the last `days` days, oldest first. */
function perDay(dates: Date[], days = 7) {
  const out = Array(days).fill(0);
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  for (const d of dates) {
    const age = Math.floor((today.getTime() - d.getTime()) / DAY);
    if (age >= 0 && age < days) out[days - 1 - age]++;
  }
  return out;
}

const ACTION: Record<string, { icon: React.ElementType; tone: string }> = {
  "content.created": { icon: FilePlus2, tone: "bg-accent-soft text-accent" },
  "content.submitted": { icon: Send, tone: "bg-accent-soft text-accent" },
  "content.revised": { icon: PenLine, tone: "bg-accent-soft text-accent" },
  "content.verified": { icon: BadgeCheck, tone: "bg-ok-soft text-ok" },
  "review.approved": { icon: CheckCircle2, tone: "bg-ok-soft text-ok" },
  "review.changes_requested": { icon: RotateCcw, tone: "bg-major-soft text-major" },
  "finding.accepted": { icon: CheckCircle2, tone: "bg-ok-soft text-ok" },
  "finding.disputed": { icon: Flag, tone: "bg-major-soft text-major" },
  "finding.overridden": { icon: ShieldAlert, tone: "bg-major-soft text-major" },
  "finding.reopened": { icon: Flag, tone: "bg-major-soft text-major" },
  "rulebook.published": { icon: BookMarked, tone: "bg-teal-soft text-teal" },
  "rulebook.compiled": { icon: BookMarked, tone: "bg-teal-soft text-teal" },
  "workspace.opened": { icon: Sparkles, tone: "bg-teal-soft text-teal" },
};
const actionStyle = (a: string) => ACTION[a] ?? (a.startsWith("fact.") ? { icon: Database, tone: "bg-teal-soft text-teal" } : { icon: Sparkles, tone: "bg-soft text-muted" });

const SHORTCUTS = [
  { href: "/app/new", title: "Try a sample", body: "Load the Diwali cashback post and watch every check run.", icon: FilePlus2, tone: "bg-accent-soft text-accent" },
  { href: "/app/facts", title: "Facts ledger", body: "Approved claims, their sources and when they expire.", icon: Database, tone: "bg-teal-soft text-teal" },
  { href: "/app/rulebook", title: "Rulebook", body: "Every rule with its page citation and examples.", icon: BookMarked, tone: "bg-major-soft text-major" },
];

function greeting() {
  const h = Number(new Intl.DateTimeFormat("en-IN", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }).format(new Date()));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default async function Dashboard() {
  const s = await requireSession();
  const [items, events] = await Promise.all([
    listContents(s.db, s.workspace.id),
    s.db.select().from(auditEvents).where(eq(auditEvents.workspaceId, s.workspace.id)).orderBy(desc(auditEvents.seq)).limit(7),
  ]);
  const role = s.user.role === "admin" ? "reviewer" : s.user.role;
  const waiting = items.filter((c) => c.status === "in_review" && c.requiredRoles.includes(role));
  const inReview = items.filter((c) => c.status === "in_review");
  const sentBack = items.filter((c) => c.status === "changes_requested");
  const mine = items.filter((c) => c.status === "draft" || c.status === "changes_requested");
  const approved = items.filter((c) => c.status === "approved");
  const firstPass = approved.length ? Math.round((approved.filter((c) => c.reviewRound === 1).length / approved.length) * 100) : 0;
  const isCreator = s.user.role === "creator";
  const focus = isCreator ? mine : waiting;
  const oldestWait = inReview.length ? timeAgo(new Date(Math.min(...inReview.map((c) => c.updatedAt.getTime())))) : null;

  const headline = isCreator
    ? mine.length ? `You have ${mine.length} piece${mine.length > 1 ? "s" : ""} to fix or submit.` : "Nothing is waiting on you."
    : waiting.length ? `${waiting.length} piece${waiting.length > 1 ? "s" : ""} need${waiting.length === 1 ? "s" : ""} your ${ROLE_LABEL[s.user.role].toLowerCase()} review.` : "Your review queue is clear.";

  const tiles: [string, number, React.ElementType][] = [["In review", inReview.length, Timer], ["Sent back", sentBack.length, RotateCcw], ["Verified", approved.length, BadgeCheck]];

  return (
    <>
      <section className="fade-up relative overflow-hidden rounded-3xl bg-hero p-6 text-white shadow-lift sm:p-8">
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-40" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-teal-300/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-6 -top-10 hidden h-[340px] w-[340px] lg:block">
          <ShieldOrbit className="absolute inset-0 h-full w-full opacity-40" />
          <HeroShield3D className="absolute inset-0 h-full w-full" />
        </div>
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 text-sm text-indigo-100">
              <Avatar name={s.user.name} role={s.user.role} size={26} />
              {greeting()}, {s.user.name.split(" ")[0]} · {ROLE_LABEL[s.user.role]}
            </div>
            <h1 className="mt-3 font-display text-3xl font-bold leading-tight text-white sm:text-4xl">{headline}</h1>
            <p className="mt-2 text-sm text-indigo-100/90">
              {isCreator
                ? "Check a draft before anyone else sees it. Every flag cites the rule or fact behind it, and most come with a one-click fix."
                : "Review only what needs judgement. Rule-based checks and the verified AI review have already done the mechanical work."}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/app/new" className="group inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-accent shadow-sm transition hover:-translate-y-0.5 hover:bg-indigo-50 hover:shadow-md">
                <PlusCircle size={16} /> Check new content
                <ArrowRight size={14} className="-ml-1 w-0 opacity-0 transition-all group-hover:ml-0 group-hover:w-3.5 group-hover:opacity-100" />
              </Link>
              {!isCreator && (
                <Link href="/app/review" className="inline-flex items-center gap-1.5 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20">
                  <ClipboardCheck size={16} /> Open review queue
                </Link>
              )}
            </div>
          </div>
          <div className="relative grid grid-cols-3 gap-3 text-center lg:mr-80">
            {tiles.map(([l, n, Icon]) => (
              <div key={l} className="group rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/15">
                <Icon size={15} className="mx-auto text-indigo-100/80" />
                <div className="mt-1 font-display text-3xl font-bold">{n}</div>
                <div className="text-[11px] uppercase tracking-wider text-indigo-100/80">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Pieces checked" value={items.length} hint="Last 7 days, including demo history" icon={<ShieldCheck size={16} />}
          chart={<SparkBars values={perDay(items.map((c) => c.createdAt))} color="#4338ca" />} />
        <Kpi label="Approved in first round" value={`${firstPass}%`} hint="North-star: brand-safe first-pass rate" tone="ok" icon={<CheckCircle2 size={16} />}
          chart={<MiniRing value={firstPass} color="#047857" />} />
        <Kpi label="Waiting for review" value={inReview.length} hint={oldestWait ? `Oldest waiting since ${oldestWait}` : "Nothing waiting"} icon={<Timer size={16} />}
          chart={<SparkLine values={perDay(inReview.map((c) => c.updatedAt))} color="#6366f1" width={72} />} />
        <Kpi label="Changes requested" value={sentBack.length} hint="Sent back with reasons" tone="major" icon={<RotateCcw size={16} />}
          chart={<SparkLine values={perDay(sentBack.map((c) => c.updatedAt))} color="#b45309" width={72} />} />
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
            {focus.slice(0, 5).map((c) => {
              const score = Math.max(0, 100 - c.open.blocker * 15 - c.open.major * 6 - c.open.minor * 2);
              return (
                <li key={c.id}>
                  <Link href={`/app/content/${c.id}`} className="group flex items-center gap-4 rounded-xl border border-line/80 bg-white px-3.5 py-3 transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-soft">
                    <ScoreRing value={score} size={46} label={`${c.title} brand safety score`} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-ink">{c.title}</span>
                      <span className="text-xs text-muted">{c.channel} · {SOURCE_LABEL[c.source]} · {timeAgo(c.updatedAt)}</span>
                      <span className="mt-1.5 flex flex-wrap gap-1">
                        {c.open.blocker > 0 && <Tag tone="blocker">{c.open.blocker} blocker</Tag>}
                        {c.open.major > 0 && <Tag tone="major">{c.open.major} major</Tag>}
                        {c.open.minor > 0 && <Tag tone="minor">{c.open.minor} minor</Tag>}
                        {c.disputed > 0 && <Tag tone="major">{c.disputed} disputed</Tag>}
                        {c.status === "changes_requested" && <Tag tone="major">changes requested</Tag>}
                        {c.status === "draft" && c.total === 0 && <Tag tone="grey">not checked yet</Tag>}
                      </span>
                    </span>
                    <ChevronRight size={18} className="shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-accent" />
                  </Link>
                </li>
              );
            })}
            {focus.length === 0 && (
              <li className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
                {isCreator ? "No drafts. Load a sample on the New content page to see Brandrail at work." : "Nothing waiting. Switch to Aarav (creator) to submit something."}
              </li>
            )}
          </ul>
          <div className="mt-6 border-t border-line pt-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">Shortcuts</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {SHORTCUTS.map(({ href, title, body, icon: Icon, tone }) => (
                <Link key={href} href={href} className="group rounded-xl border border-line/80 bg-white p-3.5 transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-soft">
                  <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${tone}`}><Icon size={16} /></span>
                  <span className="mt-2.5 flex items-center gap-1 text-sm font-semibold text-ink">{title} <ArrowRight size={13} className="opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" /></span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-muted">{body}</span>
                </Link>
              ))}
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Recent activity</h2>
            <Link href="/app/audit" className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline">Audit log <ArrowRight size={13} /></Link>
          </div>
          <ol className="relative mt-4 space-y-3">
            <span className="absolute bottom-3 left-[15px] top-3 w-px bg-line" aria-hidden="true" />
            {events.map((e) => {
              const { icon: Icon, tone } = actionStyle(e.action);
              return (
                <li key={e.seq} className="relative flex gap-3">
                  <span className="relative z-10">
                    {e.actorName === "Brandrail" ? <span className="block rounded-full ring-2 ring-white"><LogoMark size={30} /></span> : <Avatar name={e.actorName} role={e.actorRole} size={30} />}
                  </span>
                  <div className="min-w-0 flex-1 rounded-xl px-2 py-1 transition hover:bg-soft">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex h-5 w-5 items-center justify-center rounded-md ${tone}`}><Icon size={12} /></span>
                      <b className="text-sm text-ink">{e.actorName}</b>
                      <span className="ml-auto shrink-0 text-xs text-muted">{timeAgo(e.at)}</span>
                    </div>
                    <div className="mt-0.5 text-sm text-ink-2">{e.summary.length > 110 ? e.summary.slice(0, 110) + "…" : e.summary}</div>
                  </div>
                </li>
              );
            })}
          </ol>
        </Card>
      </div>

      <h2 className="mb-3 mt-8 text-base font-semibold">All content</h2>
      <ContentTable items={items.map((c) => ({ ...c, createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt.toISOString() }))} />
    </>
  );
}

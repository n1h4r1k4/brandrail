import Link from "next/link";
import { and, asc, desc, eq } from "drizzle-orm";
import { requireSession } from "@/lib/session";
import { checks, contents, facts, findings, rules } from "@/lib/db/schema";
import { factStatus } from "@/lib/engine/types";
import { todayIST } from "@/lib/engine/text";
import { fingerprint } from "@/lib/review";
import { Card, Kpi, Mono, PageHeader, SeverityTag, Tag } from "@/components/ui";
import { Donut } from "@/components/graphics";
import { CATEGORY_LABEL, SOURCE_LABEL } from "@/lib/workflow";
import type { Category, ContentSource } from "@/lib/db/schema";

export default async function Insights() {
  const s = await requireSession();
  const ws = s.workspace.id;
  const [contentRows, findingRows, checkRows, ruleRows, factRows] = await Promise.all([
    s.db.select().from(contents).where(eq(contents.workspaceId, ws)),
    s.db.select().from(findings).where(eq(findings.workspaceId, ws)).orderBy(asc(findings.id)),
    s.db.select({ id: checks.id, contentId: checks.contentId, stats: checks.stats, kind: checks.kind }).from(checks)
      .innerJoin(contents, eq(contents.id, checks.contentId)).where(eq(contents.workspaceId, ws)).orderBy(desc(checks.id)),
    s.db.select().from(rules).where(and(eq(rules.workspaceId, ws), eq(rules.version, s.workspace.activeRulebookVersion))),
    s.db.select().from(facts).where(eq(facts.workspaceId, ws)),
  ]);

  // One "issue" = one rule on one span of one piece, however many times it was re-checked.
  // Its final state is the latest status seen for that fingerprint.
  const groups = new Map<string, (typeof findingRows)[number][]>();
  for (const f of findingRows) {
    const k = `${f.contentId}|${fingerprint(f)}`;
    groups.set(k, [...(groups.get(k) ?? []), f]);
  }
  const latestCheck = new Map<string, number>();
  for (const c of checkRows) if (!latestCheck.has(c.contentId)) latestCheck.set(c.contentId, c.id);
  const all = [...groups.values()].map((list) => {
    const last = list[list.length - 1];
    const final = [...list].reverse().find((f) => f.status !== "open") ?? last;
    // Open in an earlier check but gone from the latest one: it was edited away.
    if (final.status === "open" && last.checkId !== latestCheck.get(last.contentId)) return { ...final, status: "resolved" as const };
    return final;
  });
  const pieces = contentRows.length;
  const approved = contentRows.filter((c) => c.status === "approved");
  const firstPass = approved.length ? Math.round((approved.filter((c) => c.reviewRound === 1).length / approved.length) * 100) : 0;
  const avgRounds = approved.length ? (approved.reduce((n, c) => n + c.reviewRound, 0) / approved.length).toFixed(1) : "–";

  const byCat = new Map<Category, number>();
  for (const f of all) byCat.set(f.category, (byCat.get(f.category) ?? 0) + 1);
  const cats = [...byCat.entries()].sort((a, b) => b[1] - a[1]);

  const bySource = (["human", "agency", "ai"] as ContentSource[]).map((src) => {
    const ids = new Set(contentRows.filter((c) => c.source === src).map((c) => c.id));
    const n = all.filter((f) => ids.has(f.contentId)).length;
    return { src, pieces: ids.size, perPiece: ids.size ? n / ids.size : 0 };
  });
  const maxSrc = Math.max(0.1, ...bySource.map((x) => x.perPiece));

  const ruleBy = new Map(ruleRows.map((r) => [r.code, r]));
  const health = [...new Set(all.map((f) => f.ruleCode))].map((code) => {
    const list = all.filter((f) => f.ruleCode === code);
    const flagged = new Set(list.map((f) => f.contentId)).size;
    const disputed = list.filter((f) => f.status === "disputed" || (f.resolutionReason ?? "").startsWith("Dispute upheld")).length;
    const overridden = list.filter((f) => f.status === "overridden").length;
    const fixed = list.filter((f) => f.status === "accepted" || f.status === "resolved").length;
    const r = ruleBy.get(code);
    let signal: { label: string; tone: "major" | "accent" | "teal" | "grey"; hint: string } = { label: "Healthy", tone: "grey", hint: "" };
    if (flagged >= 3 && disputed / list.length >= 0.5) signal = { label: "Often disputed", tone: "major", hint: "Creators keep disagreeing. The rule may be unclear or too strict for some contexts. Consider an exception or a clearer example." };
    else if (overridden >= 2 && overridden / list.length >= 0.4) signal = { label: "Often overridden", tone: "accent", hint: "Reviewers keep accepting the risk. Check whether the rule still reflects how the brand works." };
    else if (list.length >= 3 && fixed / list.length >= 0.5) signal = { label: "Clear, but repeated", tone: "teal", hint: "People accept the fix, so the rule is clear, but the mistake keeps recurring. A training or template opportunity." };
    return { code, title: r?.title ?? list[0].ruleTitle, severity: r?.severity ?? list[0].severity, total: list.length, flagged, disputed, overridden, fixed, signal, reasons: list.map((f) => f.resolutionReason).filter(Boolean).slice(0, 3) as string[] };
  }).sort((a, b) => (b.signal.tone === "major" ? 1 : 0) - (a.signal.tone === "major" ? 1 : 0) || b.total - a.total);

  const aiChecks = checkRows.filter((c) => c.kind === "full" && c.stats.ai.status === "ok");
  const proposed = aiChecks.reduce((n, c) => n + (c.stats.ai.proposed ?? 0), 0);
  const kept = aiChecks.reduce((n, c) => n + (c.stats.ai.kept ?? 0), 0);
  const today = todayIST();
  const expiring = factRows.filter((f) => factStatus(f, today) === "expiring");

  return (
    <>
      <PageHeader
        title="Governance insights"
        sub="Where problems come from, which rules are misunderstood, and what to fix in the guidelines rather than in each piece of content. Includes seeded demo history."
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Pieces checked" value={pieces} hint={`${all.length} distinct issues found`} />
        <Kpi label="Approved in first round" value={`${firstPass}%`} hint={`Avg ${avgRounds} review rounds to approval`} tone="ok" />
        <Kpi label="Issues fixed by creators" value={`${all.length ? Math.round((all.filter((f) => f.status === "accepted" || f.status === "resolved").length / all.length) * 100) : 0}%`} hint="Accepted fixes or edited away" />
        <Kpi label="AI findings kept by verifier" value={proposed ? `${Math.round((kept / proposed) * 100)}%` : "–"} hint={proposed ? `${kept} of ${proposed} across ${aiChecks.length} AI reviews` : "No AI reviews yet in this sandbox"} tone="major" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-base font-semibold">Issues by category</h2>
          <div className="mt-4">
            <Donut data={cats.map(([c, n]) => ({ label: CATEGORY_LABEL[c], value: n }))} />
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="text-base font-semibold">Issues per piece, by who wrote it</h2>
          <p className="mt-1 text-xs text-muted">Content is tagged as written by an employee, an agency or with an AI tool, so policy can follow the data.</p>
          <div className="mt-4 space-y-2.5">
            {bySource.map((x) => (
              <div key={x.src} className="grid grid-cols-[130px_1fr_70px] items-center gap-3 text-sm">
                <span className="text-ink-2">{SOURCE_LABEL[x.src]} <span className="text-xs text-muted">({x.pieces})</span></span>
                <div className="h-2.5 rounded-full bg-soft"><div className={`h-2.5 rounded-full ${x.src === "ai" ? "bg-major" : "bg-teal"}`} style={{ width: `${(x.perPiece / maxSrc) * 100}%` }} /></div>
                <span className="text-right font-mono text-xs text-muted">{x.perPiece.toFixed(1)} / piece</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="mt-6 overflow-hidden">
        <div className="border-b border-line p-5">
          <h2 className="text-base font-semibold">Guideline Health</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted">
            Every dispute and override is a signal about the <em>rulebook</em>, not only about the content. Rules people keep disputing are probably unclear or too strict.
            Rules people keep fixing are clear, but the mistake recurs. (Round 3 adds AI-drafted clarifications for the brand admin to approve.)
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-soft text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Rule</th>
                <th className="px-4 py-2 font-medium">Flagged</th>
                <th className="px-4 py-2 font-medium">Disputed</th>
                <th className="px-4 py-2 font-medium">Overridden</th>
                <th className="px-4 py-2 font-medium">Fixed</th>
                <th className="px-4 py-2 font-medium">Signal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {health.map((h) => (
                <tr key={h.code} className="align-top">
                  <td className="px-4 py-3">
                    <Link href="/app/rulebook" className="font-medium text-ink hover:text-accent"><Mono className="text-accent">{h.code}</Mono> {h.title}</Link>
                    <div className="mt-1"><SeverityTag severity={h.severity} /></div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{h.total} <span className="text-muted">in {h.flagged} piece(s)</span></td>
                  <td className="px-4 py-3 font-mono text-xs">{h.disputed}</td>
                  <td className="px-4 py-3 font-mono text-xs">{h.overridden}</td>
                  <td className="px-4 py-3 font-mono text-xs">{h.fixed}</td>
                  <td className="max-w-sm px-4 py-3">
                    <Tag tone={h.signal.tone}>{h.signal.label}</Tag>
                    {h.signal.hint && <p className="mt-1 text-xs text-muted">{h.signal.hint}</p>}
                    {h.signal.tone === "major" && h.reasons.length > 0 && (
                      <ul className="mt-1 space-y-0.5 text-xs italic text-ink-2">{h.reasons.map((r, i) => <li key={i}>“{r.replace(/^Dispute upheld: /, "")}”</li>)}</ul>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {expiring.length > 0 && (
        <Card className="mt-6 p-5">
          <h2 className="text-base font-semibold">Facts expiring in the next 30 days</h2>
          <ul className="mt-3 space-y-1.5 text-sm">
            {expiring.map((f) => (
              <li key={f.code}><Link href={`/app/facts#${f.code}`}><Mono className="text-accent">{f.code}</Mono></Link> {f.statement} <span className="text-muted">· expires {f.validUntil} · owner: {f.owner}</span></li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}

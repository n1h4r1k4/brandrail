"use client";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { diffWords } from "diff";
import {
  ArrowLeft, Check, CheckCircle2, ChevronDown, Download, FileText, Loader2, Lock, MessageSquare, Pencil, RefreshCw, Send, ShieldAlert, ShieldCheck, Sparkles, Undo2, X,
} from "lucide-react";
import { Button, Card, FindingStatusTag, Mono, ScoreRing, SeverityTag, StatusTag, Tag, timeAgo } from "@/components/ui";
import { ROLE_LABEL, SOURCE_LABEL, canOverride, canReview } from "@/lib/workflow";
import type {
  Category, CheckStats, ContentSource, ContentStatus, Field, FindingStatus, ImageAnalysis, Intent, Role, Severity,
} from "@/lib/db/schema";
import { CheckPipeline, VerifiedSeal } from "@/components/graphics";
import {
  acceptSuggestion, addComment, approveContent, confirmIntent, disputeFinding, overrideFinding, reopenFinding, requestChanges, runFullCheck, saveEdit, submitForReview,
} from "../../actions";

export interface FindingView {
  id: number; ruleCode: string; ruleTitle: string; sourcePage: number | null; category: Category; severity: Severity; field: Field;
  quote: string; start: number; end: number; message: string; suggestion: string | null; factCodes: string[]; method: "rule" | "ai";
  confidence: number; status: FindingStatus; resolutionReason: string | null; resolvedBy: string | null;
}

export interface DetailProps {
  viewer: { id: string; name: string; role: Role };
  ai: boolean;
  content: {
    id: string; title: string; channel: string; audience: string; source: ContentSource; status: ContentStatus; currentVersion: number;
    intent: Intent | null; intentConfirmed: boolean; requiredRoles: Role[]; reviewRound: number; createdBy: string; seeded: boolean;
  };
  current: { body: string; imageText: string; imageData: string | null; altText: string; analysis: ImageAnalysis | null };
  versions: { version: number; body: string; imageText: string; altText: string; note: string; createdBy: string; createdAt: string }[];
  check: { id: number; kind: "full" | "quick"; version: number; rulebookVersion: number; stats: CheckStats; createdAt: string } | null;
  lastFull: { version: number; stats: CheckStats; createdAt: string } | null;
  findings: FindingView[];
  rules: Record<string, { overrideRole: Role; statement: string; sourceDoc: string }>;
  comments: { id: number; userName: string; role: Role; body: string; quote: string | null; version: number; createdAt: string }[];
  approvals: { id: number; userName: string; role: Role; decision: "approved" | "changes_requested"; note: string; round: number; version: number; createdAt: string }[];
  verified: { version: number; hash: string; rulebookVersion: number; approvers: { name: string; role: Role; at: string }[]; openNonBlocking: number; createdAt: string } | null;
  events: { seq: number; at: string; actorName: string; actorRole: string; action: string; summary: string; hash: string }[];
}

const SEV_ORDER: Severity[] = ["blocker", "major", "minor"];
const active = (f: FindingView) => f.status === "open";

export function ContentWorkspace(p: DetailProps) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"review" | "versions" | "comments" | "activity">("review");
  const [selected, setSelected] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const { content: c, viewer } = p;

  const isCreator = viewer.role === "creator" || viewer.role === "admin";
  const editable = c.status === "draft" || c.status === "changes_requested";
  const reviewing = c.status === "in_review" && canReview(viewer.role);
  const myReviewRole: Role = viewer.role === "admin" ? "reviewer" : viewer.role;
  const roundApprovals = p.approvals.filter((a) => a.round === c.reviewRound && a.decision === "approved");
  const myTurn = reviewing && c.requiredRoles.includes(myReviewRole) && !roundApprovals.some((a) => (a.role === "admin" ? "reviewer" : a.role) === myReviewRole);

  function run(label: string, fn: () => Promise<{ ok: boolean; error?: string } | { ok: false; error: string }>) {
    setError(null);
    setBusy(label);
    start(async () => {
      const res = await fn();
      setBusy(null);
      if (!res.ok) setError("error" in res && res.error ? res.error : "Something went wrong.");
      router.refresh();
    });
  }

  const counts = useMemo(() => {
    const open = p.findings.filter(active);
    return {
      blocker: open.filter((f) => f.severity === "blocker").length,
      major: open.filter((f) => f.severity === "major").length,
      minor: open.filter((f) => f.severity === "minor").length,
      disputed: p.findings.filter((f) => f.status === "disputed").length,
      disputedBlockers: p.findings.filter((f) => f.status === "disputed" && f.severity === "blocker").length,
    };
  }, [p.findings]);

  const score = Math.max(0, 100 - counts.blocker * 15 - counts.disputedBlockers * 8 - counts.major * 6 - counts.minor * 2);
  const lastDecision = [...p.approvals].reverse().find((a) => a.decision === "changes_requested" && a.round === c.reviewRound);

  return (
    <div>
      <Link href="/app" className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><ArrowLeft size={14} /> All content</Link>
      <div className="fade-up flex flex-wrap items-start justify-between gap-4 rounded-3xl border border-line/80 bg-white p-5 shadow-soft">
        <div className="flex items-center gap-4">
          <ScoreRing value={score} size={68} label="Brand safety score" />
          <div>
          <div className="text-[11px] font-semibold uppercase tracking-widest text-muted">Brand safety score</div>
          <h1 className="text-2xl font-bold tracking-tight">{c.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
            <StatusTag status={c.status} />
            <Tag>v{c.currentVersion}</Tag>
            <Tag tone={c.source === "ai" ? "accent" : "grey"}>{SOURCE_LABEL[c.source]}</Tag>
            <span>{c.channel} · {c.audience}</span>
            <span>· by {c.createdBy}</span>
            {c.seeded && <Tag>seeded demo history</Tag>}
          </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {c.status !== "approved" && (
            <Button variant="secondary" onClick={() => run(p.ai ? "Running rule-based checks and the AI review…" : "Running checks…", () => runFullCheck(c.id))} disabled={pending}>
              <RefreshCw size={15} /> Run full check
            </Button>
          )}
          {isCreator && editable && (
            <Button onClick={() => run("Submitting…", () => submitForReview(c.id))} disabled={pending || counts.blocker > 0} title={counts.blocker ? "Fix or dispute blockers first" : ""}>
              <Send size={15} /> Submit for review
            </Button>
          )}
        </div>
      </div>

      {(busy || error) && (
        <div className={clsx("mt-4 flex items-center gap-2 rounded-lg px-3 py-2 text-sm", error ? "bg-blocker-soft text-blocker" : "bg-accent-soft text-accent")}>
          {busy ? <Loader2 size={15} className="animate-spin" /> : <ShieldAlert size={15} />} {busy ?? error}
        </div>
      )}

      <StatusBanner p={p} lastDecision={lastDecision} counts={counts} myTurn={myTurn} />

      <div className="mt-5 flex gap-1 border-b border-line">
        {([
          ["review", "Review"],
          ["versions", `Versions (${p.versions.length})`],
          ["comments", `Comments (${p.comments.length})`],
          ["activity", "Activity"],
        ] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={clsx("-mb-px border-b-2 px-3 py-2 text-sm font-medium", tab === k ? "border-accent text-accent" : "border-transparent text-muted hover:text-ink")}>
            {l}
          </button>
        ))}
      </div>

      {tab === "review" && (
        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
          <div className="space-y-4">
            <IntentCard p={p} canEdit={isCreator && editable} run={run} pending={pending} />
            {editing ? (
              <Editor p={p} onCancel={() => setEditing(false)} onSave={(patch) => { setEditing(false); run("Saving a new version and re-checking…", () => saveEdit(c.id, patch)); }} />
            ) : (
              <>
                <Card className="p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted">Text</span>
                    {isCreator && editable && <Button variant="ghost" size="sm" onClick={() => setEditing(true)}><Pencil size={13} /> Edit</Button>}
                  </div>
                  {p.current.body ? (
                    <Highlighted text={p.current.body} findings={p.findings.filter((f) => f.field === "body")} selected={selected} onSelect={setSelected} />
                  ) : <p className="text-sm text-muted">No text.</p>}
                </Card>
                {p.current.imageData && <ImagePanel p={p} selected={selected} onSelect={setSelected} />}
              </>
            )}
            <CheckSummary p={p} />
          </div>

          <div className="scroll-thin space-y-4 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pr-1">
            {myTurn && <ReviewPanel p={p} run={run} pending={pending} />}
            <FindingsList p={p} selected={selected} onSelect={setSelected} run={run} pending={pending} isCreator={isCreator} editable={editable} reviewing={reviewing} />
          </div>
        </div>
      )}

      {tab === "versions" && <Versions p={p} />}
      {tab === "comments" && <Comments p={p} run={run} pending={pending} />}
      {tab === "activity" && <Activity p={p} />}
    </div>
  );
}

// ---------------------------------------------------------------------------- banner

function StatusBanner({ p, lastDecision, counts, myTurn }: { p: DetailProps; lastDecision?: DetailProps["approvals"][number]; counts: { blocker: number; disputedBlockers: number }; myTurn: boolean }) {
  const c = p.content;
  if (c.status === "approved" && p.verified) return <VerifiedRecord p={p} />;
  if (c.status === "in_review") {
    const approved: Role[] = p.approvals.filter((a) => a.round === c.reviewRound && a.decision === "approved").map((a) => (a.role === "admin" ? "reviewer" : a.role));
    return (
      <div className="mt-4 rounded-xl border border-accent/20 bg-accent-soft/60 px-4 py-3 text-sm">
        <b className="text-ink">In review, round {c.reviewRound}.</b>{" "}
        Needs:{" "}
        {c.requiredRoles.map((r) => (
          <span key={r} className="mr-2 inline-flex items-center gap-1">
            {approved.includes(r) ? <CheckCircle2 size={14} className="text-ok" /> : <span className="inline-block h-3 w-3 rounded-full border-2 border-accent/50" />}
            {ROLE_LABEL[r]}
          </span>
        ))}
        {myTurn ? <span className="text-accent">· Your review is needed.</span> : <span className="text-muted">· Switch persona to review.</span>}
        {counts.disputedBlockers > 0 && <span className="ml-1 text-major">{counts.disputedBlockers} disputed blocker(s) must be overridden before approval.</span>}
      </div>
    );
  }
  if (c.status === "changes_requested" && lastDecision) {
    return (
      <div className="mt-4 rounded-xl border border-major/30 bg-major-soft/60 px-4 py-3 text-sm">
        <b className="text-ink">Changes requested</b> by {lastDecision.userName} ({ROLE_LABEL[lastDecision.role]}): “{lastDecision.note}”
      </div>
    );
  }
  if (counts.blocker > 0) {
    return (
      <div className="mt-4 rounded-xl border border-blocker/20 bg-blocker-soft/50 px-4 py-3 text-sm">
        <b className="text-ink">{counts.blocker} blocker{counts.blocker > 1 ? "s" : ""}</b> must be fixed or disputed (with a reason) before this can be submitted.
      </div>
    );
  }
  return null;
}

function VerifiedRecord({ p }: { p: DetailProps }) {
  const v = p.verified!;
  const record = {
    product: "Brandrail", content: p.content.title, version: v.version, sha256: v.hash, rulebookVersion: v.rulebookVersion,
    approvers: v.approvers, openNonBlockingFindings: v.openNonBlocking, verifiedAt: v.createdAt, text: p.current.body, altText: p.current.altText,
  };
  return (
    <div className="mt-4 rounded-xl border border-ok/30 bg-ok-soft/70 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-sm">
          <VerifiedSeal size={56} className="shrink-0 drop-shadow" />
          <div>
            <b className="text-ink">Brandrail Verified</b> · v{v.version} locked against Rulebook v{v.rulebookVersion}
            <div className="text-xs text-muted">
              Approved by {v.approvers.map((a) => `${a.name} (${ROLE_LABEL[a.role]})`).join(", ")} · <Mono>sha256 {v.hash.slice(0, 16)}…</Mono>
              {v.openNonBlocking > 0 && ` · ${v.openNonBlocking} non-blocking finding(s) accepted by the reviewer`}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => navigator.clipboard.writeText(p.current.body)}><FileText size={13} /> Copy approved text</Button>
          <Button variant="secondary" size="sm" onClick={() => {
            const blob = new Blob([JSON.stringify(record, null, 2)], { type: "application/json" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = `brandrail-verified-${p.content.id}.json`;
            a.click();
          }}><Download size={13} /> Verified record</Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------- intent

function IntentCard({ p, canEdit, run, pending }: { p: DetailProps; canEdit: boolean; run: (l: string, f: () => Promise<{ ok: boolean; error?: string }>) => void; pending: boolean }) {
  const i = p.content.intent;
  const [edit, setEdit] = useState(false);
  const [draft, setDraft] = useState<Intent>(i ?? { goal: "", audience: p.content.audience, keyMessage: "", cta: "" });
  if (!i && !canEdit) return null;
  if (edit || (!i && canEdit)) {
    return (
      <Card className="border-dashed p-4">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Intent lock</div>
        <p className="mb-3 text-xs text-muted">{i ? "Correct Brandrail's reading of your intent." : "State your intent. Suggested fixes will be checked to keep it."} Fixes that drop the call to action are withheld.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {(["goal", "audience", "keyMessage", "cta"] as const).map((k) => (
            <label key={k} className="text-xs text-muted">
              {k === "keyMessage" ? "Key message" : k === "cta" ? "Call to action" : k[0].toUpperCase() + k.slice(1)}
              <input className="mt-1 w-full rounded-lg border border-line px-2.5 py-1.5 text-sm text-ink" value={draft[k]} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} />
            </label>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <Button size="sm" disabled={pending || !draft.goal.trim()} onClick={() => { setEdit(false); run("Saving intent…", () => confirmIntent(p.content.id, draft)); }}><Check size={13} /> Confirm intent</Button>
          {i && <Button size="sm" variant="ghost" onClick={() => setEdit(false)}>Cancel</Button>}
        </div>
      </Card>
    );
  }
  return (
    <Card className={clsx("p-4", p.content.intentConfirmed ? "" : "border-dashed")}>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">
          Intent lock {p.content.intentConfirmed ? <span className="text-ok">✓ confirmed</span> : <span className="text-major">· please confirm</span>}
        </span>
        {canEdit && (
          <div className="flex gap-1">
            {!p.content.intentConfirmed && <Button size="sm" onClick={() => run("Confirming intent…", () => confirmIntent(p.content.id, i!))} disabled={pending}><Check size={13} /> Confirm</Button>}
            <Button size="sm" variant="ghost" onClick={() => { setDraft(i!); setEdit(true); }}><Pencil size={13} /> Edit</Button>
          </div>
        )}
      </div>
      <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
        <div><dt className="inline text-muted">Goal: </dt><dd className="inline text-ink">{i!.goal}</dd></div>
        <div><dt className="inline text-muted">Audience: </dt><dd className="inline text-ink">{i!.audience}</dd></div>
        <div><dt className="inline text-muted">Key message: </dt><dd className="inline text-ink">{i!.keyMessage}</dd></div>
        <div><dt className="inline text-muted">Call to action: </dt><dd className="inline text-ink">{i!.cta || "none"}</dd></div>
      </dl>
      {!p.content.intentConfirmed && <p className="mt-2 text-xs text-muted">Extracted by the AI model. Once you confirm it, the AI review keeps it and rejects fixes that would drop the call to action.</p>}
    </Card>
  );
}

// ---------------------------------------------------------------------------- text with highlights

function Highlighted({ text, findings, selected, onSelect }: { text: string; findings: FindingView[]; selected: number | null; onSelect: (id: number) => void }) {
  const spans = findings.filter((f) => f.start >= 0 && f.end > f.start && f.end <= text.length);
  const cuts = new Set<number>([0, text.length]);
  for (const f of spans) { cuts.add(f.start); cuts.add(f.end); }
  const points = [...cuts].sort((a, b) => a - b);
  const parts: React.ReactNode[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], b = points[i + 1];
    const seg = text.slice(a, b);
    const covering = spans.filter((f) => f.start <= a && f.end >= b);
    if (!covering.length) { parts.push(<span key={i}>{seg}</span>); continue; }
    const live = covering.filter(active);
    const sev = SEV_ORDER.find((s) => live.some((f) => f.severity === s));
    const target = [...(live.length ? live : covering)].sort((x, y) => SEV_ORDER.indexOf(x.severity) - SEV_ORDER.indexOf(y.severity))[0];
    parts.push(
      <mark
        key={i}
        className={clsx("hl", sev ? `hl-${sev}` : "hl-done", covering.some((f) => f.id === selected) && "active")}
        onClick={() => onSelect(target.id)}
        title={covering.map((f) => `${f.ruleCode}: ${f.ruleTitle}`).join("\n")}
      >
        {seg}
      </mark>,
    );
  }
  return <div className="whitespace-pre-wrap text-[15px] leading-8 text-ink">{parts}</div>;
}

function ImagePanel({ p, selected, onSelect }: { p: DetailProps; selected: number | null; onSelect: (id: number) => void }) {
  const imageFindings = p.findings.filter((f) => f.field === "image");
  return (
    <Card className="p-4">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Image</div>
      <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.current.imageData!} alt={p.current.altText || "Creative under review"} className="w-full rounded-lg border border-line" />
        <div className="space-y-3 text-sm">
          <div>
            <div className="text-xs text-muted">Text in image (OCR)</div>
            {p.current.imageText ? (
              <Highlighted text={p.current.imageText} findings={p.findings.filter((f) => f.field === "image_text")} selected={selected} onSelect={onSelect} />
            ) : <span className="text-muted">None detected</span>}
          </div>
          <div>
            <div className="text-xs text-muted">Alt text</div>
            <div className={p.current.altText ? "text-ink" : "text-major"}>{p.current.altText || "Missing"}</div>
          </div>
          {p.current.analysis && (
            <div>
              <div className="text-xs text-muted">Text contrast (WCAG)</div>
              <ul className="mt-1 space-y-1">
                {p.current.analysis.lines.map((l, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs">
                    <span className="inline-flex h-5 items-center rounded px-1.5 font-semibold" style={{ background: l.bg, color: l.fg }}>Aa</span>
                    <span className="truncate text-ink-2">{l.text}</span>
                    <Tag tone={l.contrast >= (l.large ? 3 : 4.5) ? "ok" : "blocker"}>{l.contrast.toFixed(1)}:1</Tag>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {imageFindings.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {imageFindings.map((f) => (
                <button key={f.id} onClick={() => onSelect(f.id)} className="rounded-full"><Tag tone={f.status === "open" ? f.severity : "grey"}>{f.ruleCode}</Tag></button>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function Editor({ p, onCancel, onSave }: { p: DetailProps; onCancel: () => void; onSave: (patch: { body: string; altText: string; imageText: string }) => void }) {
  const [body, setBody] = useState(p.current.body);
  const [alt, setAlt] = useState(p.current.altText);
  const [img, setImg] = useState(p.current.imageText);
  return (
    <Card className="p-4">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Editing · saves as v{p.content.currentVersion + 1}</div>
      <textarea className="min-h-48 w-full rounded-lg border border-line p-3 text-[15px] leading-7 text-ink" value={body} onChange={(e) => setBody(e.target.value)} />
      {p.current.imageData && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-muted">Text in image<textarea className="mt-1 min-h-16 w-full rounded-lg border border-line p-2 text-sm text-ink" value={img} onChange={(e) => setImg(e.target.value)} /></label>
          <label className="text-xs text-muted">Alt text<textarea className="mt-1 min-h-16 w-full rounded-lg border border-line p-2 text-sm text-ink" value={alt} onChange={(e) => setAlt(e.target.value)} /></label>
        </div>
      )}
      <div className="mt-3 flex gap-2">
        <Button size="sm" onClick={() => onSave({ body, altText: alt, imageText: img })}><Check size={13} /> Save new version</Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------- check summary

function CheckSummary({ p }: { p: DetailProps }) {
  const [open, setOpen] = useState(false);
  if (!p.check) return null;
  const s = p.check.stats;
  const full = p.check.kind === "full" ? s : p.lastFull?.stats;
  return (
    <Card className="p-4 text-sm">
      <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">How this was checked</div>
      <div className="mb-3">
        <CheckPipeline
          rules={s.rulesEvaluated}
          ruleFindings={s.ruleFindings}
          masked={s.maskedTerms ?? 0}
          ai={s.ai.status === "ok" ? "on" : s.ai.status === "skipped" ? "skipped" : s.ai.status === "error" || s.ai.status === "refused" ? "error" : "off"}
          proposed={s.ai.proposed ?? 0}
          kept={s.ai.kept ?? 0}
          dropped={s.dropped.length}
        />
      </div>
      <ul className="space-y-1 text-ink-2">
        <li>{p.check.kind === "full" ? "Full check" : "Quick re-check"} of v{p.check.version} against <b>Rulebook v{p.check.rulebookVersion}</b> · {timeAgo(p.check.createdAt)}</li>
        <li><Tag tone="teal">Rule-based</Tag> {s.rulesEvaluated} rules evaluated → {s.ruleFindings} finding(s). Reproducible: same text + same rulebook = same result.</li>
        <li>
          <Tag tone="accent">AI-assisted</Tag>{" "}
          {s.ai.status === "ok" && <>AI review ({s.ai.model}) proposed {s.ai.proposed}, the verifier kept {s.ai.kept} · {((s.ai.latencyMs ?? 0) / 1000).toFixed(1)} s{s.ai.cacheReadTokens ? ` · ${s.ai.cacheReadTokens.toLocaleString()} tokens served from cache` : ""}</>}
          {s.ai.status === "skipped" && <>{s.ai.message}{full?.ai.status === "ok" && ` (last full check: ${full.ai.kept} kept of ${full.ai.proposed})`}</>}
          {(s.ai.status === "off" || s.ai.status === "error" || s.ai.status === "refused") && <span className="text-major">{s.ai.message ?? "AI review unavailable."} Rule-based checks still ran.</span>}
        </li>
        {(s.maskedTerms ?? 0) > 0 && <li><Tag>Privacy</Tag> {s.maskedTerms} confidential term(s) or personal detail(s) were masked before the AI call.</li>}
        {s.dropped.length > 0 && (
          <li>
            <button className="inline-flex items-center gap-1 text-accent" onClick={() => setOpen(!open)}>
              <ChevronDown size={14} className={clsx("transition", open && "rotate-180")} /> {s.dropped.length} AI finding(s) dropped by the verifier
            </button>
            {open && (
              <ul className="mt-2 space-y-1 rounded-lg bg-soft p-2 text-xs">
                {s.dropped.map((d, i) => <li key={i}><Mono>{d.ruleCode}</Mono> “{d.quote.slice(0, 70)}”: {d.reason}</li>)}
              </ul>
            )}
          </li>
        )}
      </ul>
    </Card>
  );
}

// ---------------------------------------------------------------------------- findings

function FindingsList(props: {
  p: DetailProps; selected: number | null; onSelect: (id: number) => void; run: (l: string, f: () => Promise<{ ok: boolean; error?: string }>) => void;
  pending: boolean; isCreator: boolean; editable: boolean; reviewing: boolean;
}) {
  const { p } = props;
  const [showDone, setShowDone] = useState(false);
  const live = p.findings.filter((f) => f.status === "open" || f.status === "disputed");
  const done = p.findings.filter((f) => !(f.status === "open" || f.status === "disputed"));
  const sorted = (list: FindingView[]) => [...list].sort((a, b) => SEV_ORDER.indexOf(a.severity) - SEV_ORDER.indexOf(b.severity) || a.start - b.start);
  if (!p.check) return <Card className="p-6 text-sm text-muted">Not checked yet.</Card>;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-semibold">Findings</h2>
        <div className="flex gap-1">
          {(["blocker", "major", "minor"] as const).map((s) => {
            const n = live.filter((f) => f.severity === s && f.status === "open").length;
            return n ? <Tag key={s} tone={s}>{n} {s}</Tag> : null;
          })}
          {live.length === 0 && <Tag tone="ok"><CheckCircle2 size={12} /> No open issues</Tag>}
        </div>
      </div>
      <div className="space-y-3">
        {sorted(live).map((f) => <FindingCard key={f.id} f={f} {...props} />)}
        {live.length === 0 && (
          <Card className="p-5 text-sm text-muted">
            Nothing open. {p.content.status === "draft" ? "Submit it for review when you're ready." : ""}
          </Card>
        )}
      </div>
      {done.length > 0 && (
        <div className="mt-4">
          <button className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink" onClick={() => setShowDone(!showDone)}>
            <ChevronDown size={14} className={clsx("transition", showDone && "rotate-180")} /> {done.length} resolved or overridden
          </button>
          {showDone && <div className="mt-2 space-y-3">{sorted(done).map((f) => <FindingCard key={f.id} f={f} {...props} />)}</div>}
        </div>
      )}
    </div>
  );
}

function FindingCard({ f, p, selected, onSelect, run, pending, isCreator, editable, reviewing }: {
  f: FindingView; p: DetailProps; selected: number | null; onSelect: (id: number) => void; run: (l: string, fn: () => Promise<{ ok: boolean; error?: string }>) => void;
  pending: boolean; isCreator: boolean; editable: boolean; reviewing: boolean;
}) {
  const [mode, setMode] = useState<null | "dispute" | "override">(null);
  const [reason, setReason] = useState("");
  const rule = p.rules[f.ruleCode];
  const mayOverride = reviewing && rule && canOverride(p.viewer.role, rule.overrideRole) && (f.status === "open" || f.status === "disputed");
  const border = { blocker: "border-l-blocker", major: "border-l-major", minor: "border-l-minor" }[f.severity];
  const fieldLabel = f.field === "image" ? "Image" : f.field === "image_text" ? "Text in image" : null;
  return (
    <div
      id={`f-${f.id}`}
      onClick={() => onSelect(f.id)}
      className={clsx("fade-up rounded-2xl border border-l-4 bg-white p-4 text-sm shadow-soft transition hover:shadow-lift", border, selected === f.id ? "border-accent ring-2 ring-accent/25" : "border-line/80", f.status !== "open" && f.status !== "disputed" && "opacity-75")}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <SeverityTag severity={f.severity} />
        <b className="text-ink">{f.ruleTitle}</b>
        <Mono className="text-muted">{f.ruleCode}{f.sourcePage ? ` · p.${f.sourcePage}` : ""}</Mono>
        <span className="ml-auto flex gap-1">
          {f.method === "ai" ? <Tag tone="accent">AI-assisted · {Math.round(f.confidence * 100)}%</Tag> : <Tag tone="teal">Rule-based</Tag>}
          {f.status !== "open" && <FindingStatusTag status={f.status} />}
        </span>
      </div>
      <div className="mt-2 text-ink-2">
        {fieldLabel && <span className="mr-1 text-xs text-muted">{fieldLabel}:</span>}
        <span className="italic text-ink">“{f.quote}”</span>
      </div>
      <p className="mt-1.5 leading-relaxed text-ink-2">{f.message}</p>
      {f.factCodes.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {f.factCodes.map((c) => <Link key={c} href={`/app/facts#${c}`} className="rounded-full"><Tag tone="grey">{c}</Tag></Link>)}
        </div>
      )}
      {f.suggestion !== null && (f.status === "open" || f.status === "disputed") && (
        <div className="mt-2 rounded-lg bg-ok-soft px-3 py-2 text-[13px] text-emerald-900">
          <b>Suggested fix: </b>
          {f.suggestion === "" ? <span>remove this phrase</span> : <span>“{f.suggestion}”</span>}
        </div>
      )}
      {f.resolutionReason && (
        <div className="mt-2 rounded-lg bg-soft px-3 py-2 text-xs text-ink-2">
          <b>{f.status === "disputed" ? "Disputed" : f.status === "overridden" ? "Overridden" : "Note"}</b>{f.resolvedBy ? ` by ${f.resolvedBy}` : ""}: {f.resolutionReason}
        </div>
      )}
      {rule && <details className="mt-2 text-xs text-muted" onClick={(e) => e.stopPropagation()}><summary className="cursor-pointer">Rule text</summary><p className="mt-1">{rule.statement} <span className="italic">({rule.sourceDoc}{f.sourcePage ? `, p.${f.sourcePage}` : ""})</span></p></details>}

      <div className="mt-3 flex flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()}>
        {isCreator && editable && f.status === "open" && (
          <>
            {f.suggestion !== null && (
              <Button size="sm" onClick={() => run("Applying the fix and re-checking…", () => acceptSuggestion(f.id))} disabled={pending}>
                <Sparkles size={13} /> {f.field === "image" ? "Use this alt text" : "Accept fix"}
              </Button>
            )}
            <Button size="sm" variant="secondary" onClick={() => setMode(mode === "dispute" ? null : "dispute")} disabled={pending}>Dispute…</Button>
          </>
        )}
        {isCreator && editable && f.status === "disputed" && (
          <Button size="sm" variant="ghost" onClick={() => run("Withdrawing dispute…", () => reopenFinding(f.id))} disabled={pending}><Undo2 size={13} /> Withdraw dispute</Button>
        )}
        {mayOverride && (
          <Button size="sm" variant="secondary" onClick={() => setMode(mode === "override" ? null : "override")} disabled={pending}>
            <ShieldCheck size={13} /> {f.status === "disputed" ? "Uphold dispute…" : "Override…"}
          </Button>
        )}
        {reviewing && f.status === "disputed" && (
          <Button size="sm" variant="danger" onClick={() => run("Rejecting dispute…", () => reopenFinding(f.id))} disabled={pending}><X size={13} /> Reject dispute</Button>
        )}
        {reviewing && rule && !canOverride(p.viewer.role, rule.overrideRole) && (f.status === "open" || f.status === "disputed") && (
          <span className="self-center text-xs text-muted"><Lock size={11} className="inline" /> Only {ROLE_LABEL[rule.overrideRole]} can override this</span>
        )}
      </div>
      {mode && (
        <div className="mt-2" onClick={(e) => e.stopPropagation()}>
          <textarea
            className="w-full rounded-lg border border-line p-2 text-sm"
            placeholder={mode === "dispute" ? "Why is this not a problem here? The reviewer will see this." : "Why is it acceptable to publish this? Recorded in the audit log."}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="mt-1.5 flex gap-1.5">
            <Button size="sm" disabled={pending || reason.trim().length < 5} onClick={() => {
              setMode(null);
              run(mode === "dispute" ? "Recording dispute…" : "Recording override…", () => (mode === "dispute" ? disputeFinding(f.id, reason) : overrideFinding(f.id, reason)));
            }}>{mode === "dispute" ? "Dispute" : "Override"}</Button>
            <Button size="sm" variant="ghost" onClick={() => setMode(null)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------- review panel

function ReviewPanel({ p, run, pending }: { p: DetailProps; run: (l: string, f: () => Promise<{ ok: boolean; error?: string }>) => void; pending: boolean }) {
  const [note, setNote] = useState("");
  const live = p.findings.filter((f) => f.severity === "blocker" && (f.status === "open" || f.status === "disputed"));
  const blocked = live.filter((f) => canOverride(p.viewer.role, p.rules[f.ruleCode]?.overrideRole ?? "compliance")).length;
  const others = live.length - blocked;
  return (
    <Card className="border-accent/30 p-4">
      <div className="text-sm font-semibold text-ink">Your decision as {ROLE_LABEL[p.viewer.role === "admin" ? "reviewer" : p.viewer.role]}</div>
      <p className="mt-1 text-xs text-muted">
        Approve when nothing blocking remains in your area. Override findings you accept with a reason, or send it back with a note.{" "}
        {blocked > 0 && <span className="text-blocker">{blocked} blocker(s) you own are still open or disputed.</span>}
        {others > 0 && <span className="text-muted"> {others} blocker(s) belong to Compliance and must be cleared there before the piece is verified.</span>}
      </p>
      <textarea className="mt-2 w-full rounded-lg border border-line p-2 text-sm" placeholder="Note for the creator (required to request changes)" value={note} onChange={(e) => setNote(e.target.value)} />
      <div className="mt-2 flex gap-2">
        <Button variant="ok" disabled={pending || blocked > 0} onClick={() => run("Recording approval…", () => approveContent(p.content.id, note))}><CheckCircle2 size={15} /> Approve</Button>
        <Button variant="secondary" disabled={pending || note.trim().length < 3} onClick={() => run("Sending back…", () => requestChanges(p.content.id, note))}><Undo2 size={15} /> Request changes</Button>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------- tabs

function Versions({ p }: { p: DetailProps }) {
  const [v, setV] = useState(p.versions[p.versions.length - 1].version);
  const cur = p.versions.find((x) => x.version === v)!;
  const prev = p.versions.find((x) => x.version === v - 1);
  const parts = prev ? diffWords(prev.body, cur.body) : [{ value: cur.body, added: false, removed: false }];
  return (
    <div className="mt-5 grid gap-5 lg:grid-cols-[260px_1fr]">
      <Card className="divide-y divide-line">
        {[...p.versions].reverse().map((x) => (
          <button key={x.version} onClick={() => setV(x.version)} className={clsx("block w-full px-4 py-3 text-left text-sm", x.version === v ? "bg-accent-soft" : "hover:bg-soft")}>
            <div className="font-semibold text-ink">v{x.version}{x.version === p.content.currentVersion && <span className="ml-2 text-xs font-normal text-muted">current</span>}</div>
            <div className="text-xs text-muted">{x.note} · {x.createdBy} · {timeAgo(x.createdAt)}</div>
          </button>
        ))}
      </Card>
      <Card className="p-5">
        <div className="mb-3 text-xs text-muted">{prev ? `Changes from v${prev.version} to v${cur.version}` : "First version"}</div>
        <div className="whitespace-pre-wrap text-[15px] leading-8 text-ink">
          {parts.map((part, i) => (
            <span key={i} className={part.added ? "diff-add" : part.removed ? "diff-del" : ""}>{part.value}</span>
          ))}
        </div>
        {prev && prev.altText !== cur.altText && <p className="mt-3 text-sm"><b>Alt text:</b> <span className="diff-del">{prev.altText || "(none)"}</span> → <span className="diff-add">{cur.altText}</span></p>}
      </Card>
    </div>
  );
}

function Comments({ p, run, pending }: { p: DetailProps; run: (l: string, f: () => Promise<{ ok: boolean; error?: string }>) => void; pending: boolean }) {
  const [body, setBody] = useState("");
  const [quote, setQuote] = useState("");
  return (
    <div className="mt-5 max-w-3xl space-y-3">
      {p.comments.map((c) => (
        <Card key={c.id} className="p-4 text-sm">
          <div className="text-xs text-muted"><b className="text-ink">{c.userName}</b> · {ROLE_LABEL[c.role]} · on v{c.version} · {timeAgo(c.createdAt)}</div>
          {c.quote && <div className="mt-2 border-l-2 border-accent/40 pl-2 italic text-muted">“{c.quote}”</div>}
          <p className="mt-1.5 text-ink">{c.body}</p>
        </Card>
      ))}
      {p.comments.length === 0 && <p className="text-sm text-muted">No comments yet.</p>}
      <Card className="p-4">
        <input className="w-full rounded-lg border border-line px-2.5 py-1.5 text-sm" placeholder="Quote the text you're commenting on (optional)" value={quote} onChange={(e) => setQuote(e.target.value)} />
        <textarea className="mt-2 w-full rounded-lg border border-line p-2.5 text-sm" placeholder={`Comment as ${p.viewer.name}`} value={body} onChange={(e) => setBody(e.target.value)} />
        <Button size="sm" className="mt-2" disabled={pending || !body.trim()} onClick={() => { const b = body, q = quote; setBody(""); setQuote(""); run("Posting…", () => addComment(p.content.id, b, q)); }}>
          <MessageSquare size={13} /> Comment
        </Button>
      </Card>
    </div>
  );
}

function Activity({ p }: { p: DetailProps }) {
  return (
    <Card className="mt-5 divide-y divide-line">
      {[...p.events].reverse().map((e) => (
        <div key={e.seq} className="grid gap-1 px-4 py-3 text-sm sm:grid-cols-[150px_1fr]">
          <div className="text-xs text-muted">{new Date(e.at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</div>
          <div>
            <b className="text-ink">{e.actorName}</b> <span className="text-xs text-muted">({e.actorRole})</span> {e.summary}
            <div className="font-mono text-[10px] text-muted">#{e.seq} · {e.hash.slice(0, 16)}…</div>
          </div>
        </div>
      ))}
    </Card>
  );
}

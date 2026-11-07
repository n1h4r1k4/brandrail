"use client";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { FileUp, Loader2, Pencil, Plus, Sparkles, X } from "lucide-react";
import { Button, Card, Mono, SeverityTag, Tag, timeAgo } from "@/components/ui";
import { CATEGORY_LABEL, ROLE_LABEL } from "@/lib/workflow";
import type { Category, CheckType, Role, Severity } from "@/lib/db/schema";
import type { RuleDraft } from "@/lib/ai/compile";
import { addRule, compileBrandBook, extractDocumentText, publishDrafts, updateRule } from "../actions";

interface RuleView {
  code: string; category: Category; title: string; statement: string; severity: Severity; checkType: CheckType; sourceDoc: string;
  sourcePage: number | null; overrideRole: Role; examplesDo: string[]; examplesDont: string[];
  terms: { kind: string; term: string; replacement: string | null }[];
}

const CATS = Object.keys(CATEGORY_LABEL) as Category[];
const CHECK_LABEL: Record<CheckType, [string, "teal" | "accent" | "grey"]> = {
  rule: ["Rule-based", "teal"],
  ai: ["AI-judged", "accent"],
  visual: ["Image analysis", "grey"],
};

export function RulebookView(props: { isAdmin: boolean; ai: boolean; version: number; active: number; versions: { version: number; note: string; createdBy: string; createdAt: string }[]; rules: RuleView[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [panel, setPanel] = useState<null | "add" | "import">(null);
  const readOnly = !props.isAdmin || props.version !== props.active;

  function run(fn: () => Promise<{ ok: boolean; error?: string; version?: number }>, success: string) {
    setMsg(null);
    start(async () => {
      const res = await fn();
      if (!res.ok) setMsg({ ok: false, text: res.error ?? "Failed." });
      else {
        setMsg({ ok: true, text: success.replace("{v}", String(res.version ?? "")) });
        setPanel(null);
        router.push("/app/rulebook");
        router.refresh();
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
      <div className="min-w-0">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Tag tone="accent">Viewing v{props.version}{props.version === props.active ? " (active)" : ""}</Tag>
          <span className="text-sm text-muted">{props.rules.length} rules</span>
          {props.isAdmin && props.version === props.active && (
            <span className="ml-auto flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setPanel(panel === "add" ? null : "add")}><Plus size={14} /> Add rule</Button>
              <Button size="sm" onClick={() => setPanel(panel === "import" ? null : "import")}><Sparkles size={14} /> Import guidelines</Button>
            </span>
          )}
        </div>
        {!props.isAdmin && <p className="mb-4 rounded-lg bg-soft px-3 py-2 text-xs text-muted">Read-only. Switch persona to <b>Ishita Sen (Brand admin)</b> to edit rules or import guidelines.</p>}
        {msg && <p className={clsx("mb-4 rounded-lg px-3 py-2 text-sm", msg.ok ? "bg-ok-soft text-ok" : "bg-blocker-soft text-blocker")}>{msg.text}</p>}
        {panel === "add" && <AddRule pending={pending} onCancel={() => setPanel(null)} onSave={(input) => run(() => addRule(input), "Published Rulebook v{v}. Content in progress was re-checked.")} />}
        {panel === "import" && <ImportGuidelines ai={props.ai} onDone={(text) => { setMsg({ ok: true, text }); setPanel(null); router.refresh(); }} />}

        {CATS.map((cat) => {
          const list = props.rules.filter((r) => r.category === cat);
          if (!list.length) return null;
          return (
            <section key={cat} className="mb-6">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted">{CATEGORY_LABEL[cat]}</h2>
              <div className="space-y-2">
                {list.map((r) => <RuleCard key={r.code} r={r} readOnly={readOnly} pending={pending} onSave={(patch) => run(() => updateRule(r.code, patch), `Published Rulebook v{v} with the edit to ${r.code}. Content in progress was re-checked.`)} />)}
              </div>
            </section>
          );
        })}
      </div>
      <aside>
        <h2 className="mb-2 text-sm font-semibold text-ink">Version history</h2>
        <Card className="divide-y divide-line">
          {props.versions.map((v) => (
            <Link key={v.version} href={`/app/rulebook?v=${v.version}`} className={clsx("block px-3 py-2.5 text-sm hover:bg-soft", v.version === props.version && "bg-accent-soft")}>
              <div className="font-semibold text-ink">v{v.version}{v.version === props.active && <span className="ml-1.5 text-xs font-normal text-ok">active</span>}</div>
              <div className="text-xs text-muted">{v.note}</div>
              <div className="text-[11px] text-muted">{v.createdBy} · {timeAgo(v.createdAt)}</div>
            </Link>
          ))}
        </Card>
        <p className="mt-3 text-xs leading-relaxed text-muted">Publishing a new version never changes approved content. Content still in progress is re-checked against the new version.</p>
      </aside>
    </div>
  );
}

function RuleCard({ r, readOnly, pending, onSave }: { r: RuleView; readOnly: boolean; pending: boolean; onSave: (p: { title: string; statement: string; severity: Severity }) => void }) {
  const [edit, setEdit] = useState(false);
  const [title, setTitle] = useState(r.title);
  const [statement, setStatement] = useState(r.statement);
  const [severity, setSeverity] = useState<Severity>(r.severity);
  const [label, tone] = CHECK_LABEL[r.checkType];
  return (
    <Card className="p-3.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <Mono className="font-semibold text-accent">{r.code}</Mono>
        {edit ? <input className="input max-w-sm py-1" value={title} onChange={(e) => setTitle(e.target.value)} /> : <b className="text-sm text-ink">{r.title}</b>}
        <span className="ml-auto flex items-center gap-1">
          {edit ? (
            <select className="rounded border border-line px-1.5 py-0.5 text-xs" value={severity} onChange={(e) => setSeverity(e.target.value as Severity)}>
              <option value="blocker">blocker</option><option value="major">major</option><option value="minor">minor</option>
            </select>
          ) : <SeverityTag severity={r.severity} />}
          <Tag tone={tone}>{label}</Tag>
          {!readOnly && !edit && <Button variant="ghost" size="sm" onClick={() => setEdit(true)} aria-label={`Edit ${r.code}`}><Pencil size={13} /></Button>}
        </span>
      </div>
      {edit ? (
        <>
          <textarea className="input mt-2 min-h-20 text-sm" value={statement} onChange={(e) => setStatement(e.target.value)} />
          <div className="mt-2 flex gap-2">
            <Button size="sm" disabled={pending} onClick={() => { setEdit(false); onSave({ title, statement, severity }); }}>Publish as new version</Button>
            <Button size="sm" variant="ghost" onClick={() => { setEdit(false); setTitle(r.title); setStatement(r.statement); setSeverity(r.severity); }}>Cancel</Button>
          </div>
        </>
      ) : <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{r.statement}</p>}
      {(r.examplesDo.length > 0 || r.examplesDont.length > 0) && (
        <div className="mt-2 grid gap-1 text-xs sm:grid-cols-2">
          {r.examplesDo.map((e) => <div key={e} className="rounded bg-ok-soft px-2 py-1 text-emerald-900">Do: “{e}”</div>)}
          {r.examplesDont.map((e) => <div key={e} className="rounded bg-blocker-soft px-2 py-1 text-red-900">Don&apos;t: “{e}”</div>)}
        </div>
      )}
      {r.terms.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1 text-xs">
          {r.terms.map((t) => (
            <span key={t.term} className="rounded border border-line bg-soft px-1.5 py-0.5 text-ink-2">
              {t.term}{t.replacement !== null && t.kind === "banned" ? ` → ${t.replacement || "(remove)"}` : ""}
            </span>
          ))}
        </div>
      )}
      <div className="mt-2 text-[11px] text-muted">
        Source: {r.sourceDoc}{r.sourcePage ? `, p.${r.sourcePage}` : ""} · override: {ROLE_LABEL[r.overrideRole]}
      </div>
    </Card>
  );
}

function AddRule({ pending, onCancel, onSave }: { pending: boolean; onCancel: () => void; onSave: (input: { category: Category; title: string; statement: string; severity: Severity; bannedTerms: { term: string; replacement: string }[] }) => void }) {
  const [category, setCategory] = useState<Category>("tone");
  const [title, setTitle] = useState("");
  const [statement, setStatement] = useState("");
  const [severity, setSeverity] = useState<Severity>("major");
  const [banned, setBanned] = useState("");
  return (
    <Card className="mb-6 border-accent/30 p-4">
      <div className="mb-3 flex items-center justify-between"><b className="text-sm">New rule</b><button onClick={onCancel} aria-label="Close"><X size={16} /></button></div>
      <div className="grid gap-3 sm:grid-cols-3">
        <select className="input" value={category} onChange={(e) => setCategory(e.target.value as Category)}>
          {CATS.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
        </select>
        <input className="input sm:col-span-2" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <textarea className="input mt-3 min-h-20" placeholder="The rule, in one or two testable sentences" value={statement} onChange={(e) => setStatement(e.target.value)} />
      <div className="mt-3 grid gap-3 sm:grid-cols-[160px_1fr]">
        <select className="input" value={severity} onChange={(e) => setSeverity(e.target.value as Severity)}>
          <option value="blocker">Blocker</option><option value="major">Major</option><option value="minor">Minor</option>
        </select>
        <input className="input" placeholder="Optional banned words, e.g. jackpot→reward, lottery (comma separated)" value={banned} onChange={(e) => setBanned(e.target.value)} />
      </div>
      <p className="mt-2 text-xs text-muted">With banned words, the rule is checked deterministically. Without them, the AI reviewer judges it (with citations).</p>
      <Button className="mt-3" size="sm" disabled={pending || !title.trim() || !statement.trim()} onClick={() => onSave({
        category, title, statement, severity,
        bannedTerms: banned.split(",").map((x) => x.trim()).filter(Boolean).map((x) => { const [t, r = ""] = x.split(/→|->/); return { term: t.trim(), replacement: r.trim() }; }),
      })}>Publish as new version</Button>
    </Card>
  );
}

function ImportGuidelines({ ai, onDone }: { ai: boolean; onDone: (msg: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [pages, setPages] = useState<string[] | null>(null);
  const [name, setName] = useState("");
  const [drafts, setDrafts] = useState<(RuleDraft & { pick: boolean })[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load(file: File) {
    setError(null);
    setDrafts(null);
    setBusy("Reading document…");
    const fd = new FormData();
    fd.set("file", file);
    const res = await extractDocumentText(fd);
    setBusy(null);
    if (!res.ok) return setError(res.error);
    setPages(res.pages);
    setName(res.name);
  }
  async function loadSample() {
    setBusy("Fetching sample…");
    const blob = await (await fetch("/samples/nimbus-festive-addendum.pdf")).blob();
    await load(new File([blob], "Nimbus Pay Festive Campaign Addendum.pdf"));
  }
  async function compile() {
    if (!pages) return;
    setError(null);
    setBusy("Compiling rules and quoting their source pages… (about 20–40 s)");
    const res = await compileBrandBook(pages, name);
    setBusy(null);
    if (!res.ok) return setError(res.error);
    setDrafts(res.drafts.map((d) => ({ ...d, pick: d.verified })));
  }
  async function publish() {
    if (!drafts) return;
    setBusy("Publishing…");
    const res = await publishDrafts(drafts.filter((d) => d.pick), name);
    setBusy(null);
    if (!res.ok) return setError(res.error);
    onDone(`Published Rulebook v${res.version} with ${drafts.filter((d) => d.pick).length} imported rule(s). Content in progress was re-checked.`);
  }

  return (
    <Card className="mb-6 border-accent/30 p-4">
      <b className="text-sm">Rule Compiler</b>
      <p className="mt-1 text-xs leading-relaxed text-muted">
        Upload brand guidelines (PDF, DOCX or TXT). The AI model drafts atomic rules and must quote the page each rule comes from. Brandrail checks every quote
        against the document, so drafts it can&apos;t verify can&apos;t be published. You approve each rule before it goes live.
      </p>
      {!ai && <p className="mt-2 text-xs text-major">Needs an AI key on this deployment. You can still add rules by hand.</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <input ref={ref} type="file" accept=".pdf,.docx,.txt,.md" className="hidden" onChange={(e) => e.target.files?.[0] && load(e.target.files[0])} />
        <Button size="sm" variant="secondary" onClick={() => ref.current?.click()} disabled={!!busy}><FileUp size={14} /> Upload guidelines</Button>
        <Button size="sm" variant="secondary" onClick={loadSample} disabled={!!busy}>Use sample: festive campaign addendum</Button>
        {pages && <Button size="sm" onClick={compile} disabled={!!busy || !ai}><Sparkles size={14} /> Compile {pages.length} page(s)</Button>}
      </div>
      {pages && <p className="mt-2 text-xs text-muted">Loaded “{name}”: {pages.length} page(s), {pages.join(" ").length.toLocaleString()} characters.</p>}
      {busy && <p className="mt-3 flex items-center gap-2 text-sm text-accent"><Loader2 size={14} className="animate-spin" /> {busy}</p>}
      {error && <p className="mt-3 rounded-lg bg-blocker-soft px-3 py-2 text-sm text-blocker">{error}</p>}
      {drafts && (
        <div className="mt-4 space-y-2">
          {drafts.map((d, i) => (
            <label key={i} className={clsx("flex gap-3 rounded-lg border p-3 text-sm", d.verified ? "border-line" : "border-blocker/30 bg-blocker-soft/40")}>
              <input type="checkbox" disabled={!d.verified} checked={d.pick} onChange={(e) => setDrafts(drafts.map((x, j) => (j === i ? { ...x, pick: e.target.checked } : x)))} />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5"><b className="text-ink">{d.title}</b><SeverityTag severity={d.severity} /><Tag>{CATEGORY_LABEL[d.category]}</Tag></div>
                <p className="mt-1 text-ink-2">{d.statement}</p>
                {d.bannedTerms.length > 0 && <p className="mt-1 text-xs text-muted">Banned: {d.bannedTerms.map((t) => `${t.term}${t.replacement ? ` → ${t.replacement}` : ""}`).join(", ")}</p>}
                <p className="mt-1 text-xs italic text-muted">p.{d.sourcePage}: “{d.sourceQuote}” {d.verified ? <span className="not-italic text-ok">✓ quote found on page</span> : <span className="not-italic text-blocker">✗ quote not found on that page: can&apos;t publish</span>}</p>
              </div>
            </label>
          ))}
          <Button onClick={publish} disabled={!!busy || !drafts.some((d) => d.pick)}>Publish {drafts.filter((d) => d.pick).length} rule(s) as a new version</Button>
        </div>
      )}
    </Card>
  );
}

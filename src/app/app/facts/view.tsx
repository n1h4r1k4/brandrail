"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Plus, Upload, X } from "lucide-react";
import { Button, Card, Mono, Tag } from "@/components/ui";
import { addFact, importFactsCsv, setFactValidity } from "../actions";

interface FactView {
  code: string; statement: string; keywords: string[]; supports: string[]; evidence: string; owner: string; validUntil: string;
  supersededBy: string | null; status: "active" | "expiring" | "expired" | "superseded";
}

const STATUS: Record<FactView["status"], [string, "ok" | "major" | "blocker" | "grey"]> = {
  active: ["In date", "ok"],
  expiring: ["Expires within 30 days", "major"],
  expired: ["Expired", "blocker"],
  superseded: ["Superseded", "grey"],
};

const SAMPLE_CSV = `statement,keywords,evidence,owner,valid_until,supersedes
"Nimbus Pay processed 48 crore UPI payments in Oct 2026.",48 crore,NPCI monthly report Oct 2026,Growth Analytics,2026-12-31,
"Winter offer: 2% cashback on bill payments, up to ₹200, till 31 Dec 2026.",2% cashback,Campaign brief WIN-26,Growth Marketing,2026-12-31,`;

export function FactsView({ canEdit, facts, terms }: { canEdit: boolean; facts: FactView[]; terms: { kind: string; term: string; replacement: string | null; ruleCode: string; note: string | null }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [panel, setPanel] = useState<null | "add" | "csv">(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [form, setForm] = useState({ statement: "", keywords: "", evidence: "", owner: "", validUntil: "", supersedes: "" });
  const [csv, setCsv] = useState(SAMPLE_CSV);
  const [editing, setEditing] = useState<string | null>(null);
  const [date, setDate] = useState("");

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, ok: string) {
    setMsg(null);
    start(async () => {
      const res = await fn();
      setMsg(res.ok ? { ok: true, text: ok } : { ok: false, text: res.error ?? "Failed." });
      if (res.ok) setPanel(null);
      router.refresh();
    });
  }

  const watch = terms.filter((t) => t.kind === "watch");
  const vocab = terms.filter((t) => t.kind !== "watch");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Tag tone="ok">{facts.filter((f) => f.status === "active").length} in date</Tag>
        <Tag tone="major">{facts.filter((f) => f.status === "expiring").length} expiring soon</Tag>
        <Tag tone="blocker">{facts.filter((f) => f.status === "expired" || f.status === "superseded").length} expired or superseded</Tag>
        {canEdit ? (
          <span className="ml-auto flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setPanel(panel === "csv" ? null : "csv")}><Upload size={14} /> Import CSV</Button>
            <Button size="sm" onClick={() => setPanel(panel === "add" ? null : "add")}><Plus size={14} /> Add fact</Button>
          </span>
        ) : <span className="ml-auto text-xs text-muted">Read-only. Compliance (Kabir) or the brand admin (Ishita) can edit.</span>}
      </div>
      {msg && <p className={clsx("rounded-lg px-3 py-2 text-sm", msg.ok ? "bg-ok-soft text-ok" : "bg-blocker-soft text-blocker")}>{msg.text}</p>}

      {panel === "add" && (
        <Card className="border-accent/30 p-4">
          <div className="mb-3 flex items-center justify-between"><b className="text-sm">New fact</b><button onClick={() => setPanel(null)} aria-label="Close"><X size={16} /></button></div>
          <textarea className="input min-h-16" placeholder="Statement, e.g. 'Nimbus Pay has 13 million registered users (as of 31 Dec 2026).'" value={form.statement} onChange={(e) => setForm({ ...form, statement: e.target.value })} />
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <input className="input" placeholder="Keywords that appear in copy (separate with ;)" value={form.keywords} onChange={(e) => setForm({ ...form, keywords: e.target.value })} />
            <input className="input" placeholder="Evidence (document, link)" value={form.evidence} onChange={(e) => setForm({ ...form, evidence: e.target.value })} />
            <input className="input" placeholder="Owner (team)" value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} />
            <div className="flex gap-2">
              <input className="input" type="date" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} aria-label="Valid until" />
              <input className="input" placeholder="Supersedes (e.g. F-041)" value={form.supersedes} onChange={(e) => setForm({ ...form, supersedes: e.target.value })} />
            </div>
          </div>
          <Button className="mt-3" size="sm" disabled={pending} onClick={() => run(() => addFact(form), "Fact added.")}>Add to ledger</Button>
        </Card>
      )}
      {panel === "csv" && (
        <Card className="border-accent/30 p-4">
          <div className="mb-2 flex items-center justify-between"><b className="text-sm">Import facts from CSV</b><button onClick={() => setPanel(null)} aria-label="Close"><X size={16} /></button></div>
          <p className="mb-2 text-xs text-muted">Columns: statement, keywords (separate with ;), evidence, owner, valid_until (YYYY-MM-DD), supersedes (optional fact code). Pre-filled with a sample.</p>
          <textarea className="input min-h-32 font-mono text-xs" value={csv} onChange={(e) => setCsv(e.target.value)} />
          <Button className="mt-3" size="sm" disabled={pending} onClick={() => run(() => importFactsCsv(csv), "Facts imported.")}>Import</Button>
        </Card>
      )}

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-soft text-left text-xs text-muted">
            <tr>
              <th className="px-4 py-2 font-medium">Code</th>
              <th className="px-4 py-2 font-medium">Statement</th>
              <th className="px-4 py-2 font-medium">Evidence · owner</th>
              <th className="px-4 py-2 font-medium">Valid until</th>
              <th className="px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {facts.map((f) => (
              <tr key={f.code} id={f.code} className="target:bg-accent-soft">
                <td className="px-4 py-3 align-top"><Mono className="font-semibold text-accent">{f.code}</Mono></td>
                <td className="px-4 py-3 align-top">
                  <div className="text-ink">{f.statement}</div>
                  {f.keywords.length > 0 && <div className="mt-1 flex flex-wrap gap-1">{f.keywords.map((k) => <span key={k} className="rounded bg-soft px-1.5 py-0.5 text-[11px] text-muted">{k}</span>)}</div>}
                  {f.supports.length > 0 && <div className="mt-1 text-[11px] text-muted">Substantiates: {f.supports.join(", ")}</div>}
                </td>
                <td className="px-4 py-3 align-top text-xs text-muted">{f.evidence}<br />{f.owner}</td>
                <td className="px-4 py-3 align-top text-xs">
                  {editing === f.code ? (
                    <span className="flex gap-1">
                      <input type="date" className="rounded border border-line px-1 py-0.5" value={date} onChange={(e) => setDate(e.target.value)} />
                      <Button size="sm" disabled={pending || !date} onClick={() => { setEditing(null); run(() => setFactValidity(f.code, date), `${f.code} updated.`); }}>Save</Button>
                    </span>
                  ) : (
                    <button className={clsx("font-mono", canEdit && "underline decoration-dotted")} disabled={!canEdit} onClick={() => { setEditing(f.code); setDate(f.validUntil); }}>{f.validUntil}</button>
                  )}
                </td>
                <td className="px-4 py-3 align-top">
                  <Tag tone={STATUS[f.status][1]}>{STATUS[f.status][0]}</Tag>
                  {f.supersededBy && <div className="mt-1 text-[11px] text-muted">by {f.supersededBy}</div>}
                  {f.status === "expiring" && <div className="mt-1 text-[11px] text-muted">Listed for {f.owner} in Insights</div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-4">
          <h2 className="text-sm font-semibold">Terminology</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {vocab.map((t) => (
              <li key={t.term} className="flex items-center gap-2">
                <Tag tone={t.kind === "preferred" ? "ok" : t.kind === "banned" ? "blocker" : "major"}>{t.kind}</Tag>
                <span className="text-ink">{t.term}</span>
                {t.kind === "banned" && <span className="text-muted">→ {t.replacement || "(remove)"}</span>}
                <Mono className="ml-auto text-muted">{t.ruleCode}</Mono>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-4">
          <h2 className="text-sm font-semibold">Confidential watch-list</h2>
          <p className="mt-1 text-xs text-muted">Never allowed in external content. Masked before any text is sent to an external AI service.</p>
          <ul className="mt-2 space-y-1.5 text-sm">
            {watch.map((t) => (
              <li key={t.term}><b className="text-ink">{t.term}</b> <span className="text-xs text-muted">· {t.note}</span></li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

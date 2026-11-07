import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";
import { getContentDetail } from "@/lib/queries";
import { aiEnabled } from "@/lib/ai/client";
import { ContentWorkspace, type DetailProps } from "./workspace";

export const maxDuration = 120;

export default async function ContentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await requireSession();
  const d = await getContentDetail(s.db, s.workspace.id, id);
  if (!d) notFound();
  const cur = d.versions.find((v) => v.version === d.content.currentVersion)!;
  const props: DetailProps = {
    viewer: { id: s.user.id, name: s.user.name, role: s.user.role },
    ai: aiEnabled(),
    content: {
      id: d.content.id, title: d.content.title, channel: d.content.channel, audience: d.content.audience, source: d.content.source,
      status: d.content.status, currentVersion: d.content.currentVersion, intent: d.content.intent, intentConfirmed: d.content.intentConfirmed,
      requiredRoles: d.content.requiredRoles, reviewRound: d.content.reviewRound, createdBy: d.content.createdBy, seeded: d.content.seeded,
    },
    current: { body: cur.body, imageText: cur.imageText, imageData: cur.imageData, altText: cur.altText, analysis: cur.imageAnalysis },
    versions: d.versions.map((v) => ({ version: v.version, body: v.body, imageText: v.imageText, altText: v.altText, note: v.note, createdBy: v.createdBy, createdAt: v.createdAt.toISOString() })),
    check: d.latest ? { id: d.latest.id, kind: d.latest.kind, version: d.latest.version, rulebookVersion: d.latest.rulebookVersion, stats: d.latest.stats, createdAt: d.latest.createdAt.toISOString() } : null,
    lastFull: d.lastFull ? { version: d.lastFull.version, stats: d.lastFull.stats, createdAt: d.lastFull.createdAt.toISOString() } : null,
    findings: d.findings.map((f) => ({
      id: f.id, ruleCode: f.ruleCode, ruleTitle: f.ruleTitle, sourcePage: f.sourcePage, category: f.category, severity: f.severity, field: f.field,
      quote: f.quote, start: f.start, end: f.end, message: f.message, suggestion: f.suggestion, factCodes: f.factCodes, method: f.method,
      confidence: f.confidence, status: f.status, resolutionReason: f.resolutionReason, resolvedBy: f.resolvedBy,
    })),
    rules: Object.fromEntries(d.rules.map((r) => [r.code, { overrideRole: r.overrideRole, statement: r.statement, sourceDoc: r.sourceDoc }])),
    comments: d.comments.map((c) => ({ id: c.id, userName: c.userName, role: c.role, body: c.body, quote: c.quote, version: c.version, createdAt: c.createdAt.toISOString() })),
    approvals: d.approvals.map((a) => ({ id: a.id, userName: a.userName, role: a.role, decision: a.decision, note: a.note, round: a.round, version: a.version, createdAt: a.createdAt.toISOString() })),
    verified: d.verified ? { ...d.verified, createdAt: d.verified.createdAt.toISOString() } : null,
    events: d.events.map((e) => ({ seq: e.seq, at: e.at, actorName: e.actorName, actorRole: e.actorRole, action: e.action, summary: e.summary, hash: e.hash })),
  };
  return <ContentWorkspace {...props} />;
}

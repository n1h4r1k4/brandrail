import "server-only";
import { and, desc, eq } from "drizzle-orm";
import type { DB } from "./db";
import { checks, contents, contentVersions, findings, workspaces, type CheckStats, type ContentRow, type FindingRow, type VersionRow } from "./db/schema";
import { loadKit } from "./kit";
import { runDeterministic } from "./engine/deterministic";
import { verifyAiFindings } from "./engine/verify";
import { locateQuote } from "./engine/text";
import type { DraftFinding, EngineContent, Kit } from "./engine/types";
import { aiEnabled } from "./ai/client";
import { aiReview } from "./ai/review";

export function toEngineContent(c: ContentRow, v: VersionRow): EngineContent {
  return {
    body: v.body,
    imageText: v.imageText,
    altText: v.altText,
    hasImage: Boolean(v.imageData),
    imageAnalysis: v.imageAnalysis,
    channel: c.channel,
    audience: c.audience,
    source: c.source,
    intent: c.intentConfirmed ? c.intent : null,
  };
}

export const fingerprint = (f: { ruleCode: string; field: string; quote: string }) =>
  `${f.ruleCode}|${f.field}|${f.quote.toLowerCase().replace(/\s+/g, " ").trim()}`;

/** Build finding rows for a check, carrying earlier disputes/overrides forward. */
export function buildFindingRows(
  kit: Kit & { version: number },
  content: ContentRow,
  version: number,
  checkId: number,
  drafts: DraftFinding[],
  previous: FindingRow[],
) {
  const ruleBy = new Map(kit.rules.map((r) => [r.code, r]));
  const prevBy = new Map(previous.filter((p) => p.status === "disputed" || p.status === "overridden").map((p) => [fingerprint(p), p]));
  return drafts.map((d) => {
    const r = ruleBy.get(d.ruleCode)!;
    const prev = prevBy.get(fingerprint(d));
    return {
      checkId,
      contentId: content.id,
      workspaceId: content.workspaceId,
      version,
      ruleCode: d.ruleCode,
      ruleTitle: r.title,
      rulebookVersion: kit.version,
      sourcePage: r.sourcePage,
      category: r.category,
      severity: r.severity,
      field: d.field,
      quote: d.quote,
      start: d.start,
      end: d.end,
      message: d.message,
      suggestion: d.suggestion,
      factCodes: d.factCodes,
      method: d.method,
      confidence: d.confidence,
      status: prev?.status ?? ("open" as const),
      resolutionReason: prev?.resolutionReason ?? null,
      resolvedBy: prev?.resolvedBy ?? null,
      source: content.source,
    };
  });
}

export async function latestCheck(db: DB, contentId: string) {
  const [c] = await db.select().from(checks).where(eq(checks.contentId, contentId)).orderBy(desc(checks.id)).limit(1);
  return c ?? null;
}

/**
 * Run a check on the current version.
 *  full  = rule-based checks + grounded AI review + verifier
 *  quick = rule-based checks only; AI findings from the last full check are carried over
 *          when their quote still exists (used right after an edit, so it is instant).
 */
export async function runCheck(db: DB, contentId: string, kind: "full" | "quick", actorName: string) {
  const [content] = await db.select().from(contents).where(eq(contents.id, contentId));
  if (!content) throw new Error("Content not found");
  const [ws] = await db.select().from(workspaces).where(eq(workspaces.id, content.workspaceId));
  const [version] = await db
    .select()
    .from(contentVersions)
    .where(and(eq(contentVersions.contentId, contentId), eq(contentVersions.version, content.currentVersion)));
  const kit = await loadKit(db, content.workspaceId);
  const ec = toEngineContent(content, version);
  const det = runDeterministic(kit, ec);
  const prevCheck = await latestCheck(db, contentId);
  const prevFindings = prevCheck ? await db.select().from(findings).where(eq(findings.checkId, prevCheck.id)) : [];

  const stats: CheckStats = { rulesEvaluated: det.rulesEvaluated, ruleFindings: det.findings.length, ai: { status: "off" }, dropped: [] };
  let aiDrafts: DraftFinding[] = [];

  if (kind === "full") {
    if (!aiEnabled()) {
      stats.ai = { status: "off", message: "No Claude API key is configured, so only rule-based checks ran." };
    } else {
      const res = await aiReview(kit, ws.brandName, kit.version, ec, det.findings);
      stats.maskedTerms = res.masked;
      if (res.status === "ok") {
        const v = verifyAiFindings(kit, ec, det.findings, res.findings, res.unmask);
        aiDrafts = v.kept;
        stats.dropped = v.dropped;
        stats.ai = {
          status: "ok", model: res.model, latencyMs: res.latencyMs, proposed: res.findings.length, kept: v.kept.length,
          inputTokens: res.usage?.input, cacheReadTokens: res.usage?.cacheRead, outputTokens: res.usage?.output,
        };
      } else {
        stats.ai = { status: res.status, message: res.message, latencyMs: res.latencyMs };
      }
    }
  } else {
    // Carry AI findings from the last full check whose quote still exists in the edited text.
    const lastFull = (await db.select().from(checks).where(and(eq(checks.contentId, contentId), eq(checks.kind, "full"))).orderBy(desc(checks.id)).limit(1))[0];
    // The previous check either is the last full check or already carried its AI findings forward.
    let carried = 0;
    for (const f of prevFindings.filter((x) => x.method === "ai" && x.status !== "accepted" && x.status !== "resolved")) {
      const text = f.field === "body" ? ec.body : ec.imageText;
      const loc = locateQuote(text, f.quote);
      if (!loc) continue;
      carried++;
      aiDrafts.push({
        ruleCode: f.ruleCode, field: f.field, quote: text.slice(loc.start, loc.end), start: loc.start, end: loc.end,
        message: f.message, suggestion: f.suggestion, factCodes: f.factCodes, method: "ai", confidence: f.confidence,
      });
    }
    stats.carried = carried;
    stats.ai = { status: "skipped", message: lastFull ? "Quick re-check after an edit. AI findings were carried over from the last full check." : "Quick check: rule-based only." };
  }

  const [check] = await db
    .insert(checks)
    .values({ contentId, version: content.currentVersion, rulebookVersion: kit.version, kind, stats, createdBy: actorName })
    .returning({ id: checks.id });
  const rows = buildFindingRows(kit, content, content.currentVersion, check.id, [...det.findings, ...aiDrafts], prevFindings);
  if (rows.length) await db.insert(findings).values(rows);
  await db.update(contents).set({ updatedAt: new Date() }).where(eq(contents.id, contentId));
  return check.id;
}

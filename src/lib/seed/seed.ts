import "server-only";
import { randomBytes } from "node:crypto";
import type { DB } from "../db";
import {
  approvals, auditEvents, checks, contents, contentVersions, facts, findings, rulebookVersions, rules, terms, users,
  verifiedRecords, workspaces, type ContentRow, type Role,
} from "../db/schema";
import { hashEvent, contentHash } from "../audit";
import { runDeterministic } from "../engine/deterministic";
import { todayIST } from "../engine/text";
import { buildFindingRows } from "../review";
import { requiredRolesFor } from "../workflow";
import { BRAND_BOOK, HISTORY, SEED_FACTS, SEED_RULES, SEED_TERMS, SEED_USERS, overrideRoleFor } from "./nimbus";
import { seedKit } from "./kit";

export const randomId = (bytes = 12) => randomBytes(bytes).toString("base64url");

type Ev = { at: Date; actorName: string; actorRole: string; action: string; entityType: string; entityId: string; summary: string };

/** Create a private sandbox workspace with the fictional Nimbus Pay brand kit and some review history. */
export async function createDemoWorkspace(db: DB) {
  const wsId = randomId(18);
  const now = Date.now();
  const DAY = 86400000;
  const at = (daysAgo: number, plusHours = 0) => new Date(now - daysAgo * DAY + plusHours * 3600000);
  const today = todayIST();
  const kit = { ...seedKit(today), version: 1 };
  const events: Ev[] = [];

  const people = SEED_USERS.map((u) => ({ ...u, id: `${wsId.slice(0, 10)}_${u.key}` }));
  const person = (role: Role) => people.find((p) => p.role === role)!;
  const creator = person("creator"), admin = person("admin");

  await db.insert(workspaces).values({ id: wsId, name: "Nimbus Pay (demo sandbox)", brandName: "Nimbus Pay", activeRulebookVersion: 1 });
  await db.insert(users).values(people.map((p) => ({ id: p.id, workspaceId: wsId, name: p.name, title: p.title, role: p.role })));
  await db.insert(rulebookVersions).values({ workspaceId: wsId, version: 1, note: `Compiled from ${BRAND_BOOK}`, createdBy: admin.name, createdAt: at(45) });
  await db.insert(rules).values(
    SEED_RULES.map((r) => ({
      workspaceId: wsId, version: 1, code: r.code, category: r.category, title: r.title, statement: r.statement,
      severity: r.severity, checkType: r.checkType, params: r.params ?? {}, examplesDo: r.examplesDo ?? [],
      examplesDont: r.examplesDont ?? [], sourceDoc: BRAND_BOOK, sourcePage: r.sourcePage, overrideRole: overrideRoleFor(r.category),
    })),
  );
  await db.insert(facts).values(
    SEED_FACTS.map((f) => ({
      workspaceId: wsId, code: f.code, statement: f.statement, keywords: f.keywords, supports: f.supports ?? [],
      evidence: f.evidence, owner: f.owner, validUntil: f.validUntil, supersededBy: f.supersededBy ?? null,
    })),
  );
  await db.insert(terms).values(
    SEED_TERMS.map((t) => ({ workspaceId: wsId, kind: t.kind, term: t.term, replacement: t.replacement ?? null, ruleCode: t.ruleCode, note: t.note ?? null })),
  );
  events.push({ at: at(45), actorName: admin.name, actorRole: "admin", action: "rulebook.published", entityType: "rulebook", entityId: "v1", summary: `Published Rulebook v1 (${SEED_RULES.length} rules) compiled from ${BRAND_BOOK}` });

  // ---- seeded review history
  const contentRows: (typeof contents.$inferInsert)[] = [];
  const versionRows: (typeof contentVersions.$inferInsert)[] = [];
  const checkPlans: { content: ContentRow; version: number; body: string; createdAt: Date; mutate: (rows: ReturnType<typeof buildFindingRows>) => void }[] = [];
  const approvalRows: (typeof approvals.$inferInsert)[] = [];
  const verifiedRows: (typeof verifiedRecords.$inferInsert)[] = [];

  for (const h of [...HISTORY].sort((a, b) => b.daysAgo - a.daysAgo)) {
    const id = randomId(9);
    const t0 = h.daysAgo;
    const ec = (body: string) => ({ body, imageText: "", altText: "", hasImage: false, imageAnalysis: null, channel: h.channel, audience: h.audience, source: h.source, intent: null });
    const det1 = runDeterministic(kit, ec(h.body)).findings;
    const cat = (code: string) => kit.rules.find((r) => r.code === code)!.category;
    const required = requiredRolesFor(det1.map((f) => ({ category: cat(f.ruleCode) })));
    const rounds = h.revised ? 2 : 1;
    const content: ContentRow = {
      id, workspaceId: wsId, title: h.title, channel: h.channel, audience: h.audience, region: "India", source: h.source,
      status: h.outcome, createdBy: creator.name, currentVersion: h.revised ? 2 : 1, intent: null, intentConfirmed: false,
      requiredRoles: required, reviewRound: rounds, seeded: true, createdAt: at(t0), updatedAt: at(t0, h.revised ? 30 : 6),
    };
    contentRows.push(content);
    versionRows.push({ contentId: id, version: 1, body: h.body, note: "First draft", createdBy: creator.name, createdAt: at(t0) });
    events.push({ at: at(t0), actorName: creator.name, actorRole: "creator", action: "content.created", entityType: "content", entityId: id, summary: `Created "${h.title}" (v1) and ran checks: ${det1.length} finding(s)` });

    const disputes = h.disputes ?? [];
    const reviewerFor = (code?: string) => (code && ["claims", "legal", "confidentiality"].includes(cat(code)) ? person("compliance") : person("reviewer"));

    checkPlans.push({
      content, version: 1, body: h.body, createdAt: at(t0, 0.1),
      mutate: (rows) => {
        for (const r of rows) {
          const d = disputes.find((x) => x.ruleCode === r.ruleCode);
          if (d) {
            r.status = "disputed";
            r.resolutionReason = d.reason;
            r.resolvedBy = creator.name;
          }
          if (!h.revised && d?.upheld && h.outcome === "approved") {
            r.status = "overridden";
            r.resolutionReason = `Dispute upheld: ${d.reason}`;
            r.resolvedBy = reviewerFor(r.ruleCode).name;
          }
          if (h.revised && !(h.revised.includes(r.quote)) && r.status === "open") r.status = "resolved";
          if (h.revised && d && !d.upheld) r.status = "resolved";
        }
      },
    });
    for (const d of disputes) {
      events.push({ at: at(t0, 0.5), actorName: creator.name, actorRole: "creator", action: "finding.disputed", entityType: "content", entityId: id, summary: `Disputed ${d.ruleCode}: "${d.reason}"` });
    }
    events.push({ at: at(t0, 1), actorName: creator.name, actorRole: "creator", action: "content.submitted", entityType: "content", entityId: id, summary: "Submitted for review (round 1)" });

    if (h.revised || h.outcome === "changes_requested") {
      const decider = required.includes("compliance") ? person("compliance") : person("reviewer");
      approvalRows.push({ contentId: id, version: 1, round: 1, userId: decider.id, userName: decider.name, role: decider.role, decision: "changes_requested", note: h.reviewNote ?? "", createdAt: at(t0, 4) });
      events.push({ at: at(t0, 4), actorName: decider.name, actorRole: decider.role, action: "review.changes_requested", entityType: "content", entityId: id, summary: `Requested changes: ${h.reviewNote ?? ""}` });
      for (const d of disputes.filter((x) => !x.upheld)) {
        events.push({ at: at(t0, 4.1), actorName: decider.name, actorRole: decider.role, action: "finding.reopened", entityType: "content", entityId: id, summary: `Rejected dispute on ${d.ruleCode}` });
      }
    }
    if (h.revised) {
      versionRows.push({ contentId: id, version: 2, body: h.revised, note: "Revised after review", createdBy: creator.name, createdAt: at(t0, 20) });
      events.push({ at: at(t0, 20), actorName: creator.name, actorRole: "creator", action: "content.revised", entityType: "content", entityId: id, summary: "Saved v2 and re-ran checks" });
      events.push({ at: at(t0, 21), actorName: creator.name, actorRole: "creator", action: "content.submitted", entityType: "content", entityId: id, summary: "Submitted for review (round 2)" });
      checkPlans.push({
        content, version: 2, body: h.revised, createdAt: at(t0, 20.1),
        mutate: (rows) => {
          for (const r of rows) {
            const d = disputes.find((x) => x.ruleCode === r.ruleCode && x.upheld);
            if (d) {
              r.status = h.outcome === "approved" ? "overridden" : "disputed";
              r.resolutionReason = h.outcome === "approved" ? `Dispute upheld: ${d.reason}` : d.reason;
              r.resolvedBy = h.outcome === "approved" ? reviewerFor(r.ruleCode).name : creator.name;
            }
          }
        },
      });
    }
    if (h.outcome === "approved") {
      const finalVersion = h.revised ? 2 : 1;
      const when = h.revised ? 28 : 6;
      const approvers = required.map((role) => person(role));
      for (const d of disputes.filter((x) => x.upheld)) {
        const who = reviewerFor(d.ruleCode);
        events.push({ at: at(t0, when - 0.5), actorName: who.name, actorRole: who.role, action: "finding.overridden", entityType: "content", entityId: id, summary: `Upheld dispute on ${d.ruleCode}: ${d.reason}` });
      }
      for (const p of approvers) {
        approvalRows.push({ contentId: id, version: finalVersion, round: rounds, userId: p.id, userName: p.name, role: p.role, decision: "approved", note: "", createdAt: at(t0, when) });
        events.push({ at: at(t0, when), actorName: p.name, actorRole: p.role, action: "review.approved", entityType: "content", entityId: id, summary: `Approved v${finalVersion} (round ${rounds})` });
      }
      const body = h.revised ?? h.body;
      const hash = contentHash({ contentId: id, version: finalVersion, body, imageText: "", rulebookVersion: 1 });
      verifiedRows.push({
        contentId: id, version: finalVersion, hash, rulebookVersion: 1,
        approvers: approvers.map((p) => ({ name: p.name, role: p.role, at: at(t0, when).toISOString() })), openNonBlocking: 0, createdAt: at(t0, when),
      });
      events.push({ at: at(t0, when + 0.01), actorName: "Brandrail", actorRole: "system", action: "content.verified", entityType: "content", entityId: id, summary: `Locked v${finalVersion} as Brandrail Verified (sha256 ${hash.slice(0, 12)}…)` });
    }
  }

  if (contentRows.length) await db.insert(contents).values(contentRows);
  if (versionRows.length) await db.insert(contentVersions).values(versionRows);
  const checkIds = await db
    .insert(checks)
    .values(checkPlans.map((p) => ({
      contentId: p.content.id, version: p.version, rulebookVersion: 1, kind: "full" as const, createdBy: creator.name, createdAt: p.createdAt,
      stats: { rulesEvaluated: kit.rules.filter((r) => r.params.detectors?.length).length, ruleFindings: 0, ai: { status: "skipped" as const, message: "Seeded demo history (rule-based checks only)." }, dropped: [] },
    })))
    .returning({ id: checks.id, contentId: checks.contentId, version: checks.version });
  const findingRows: ReturnType<typeof buildFindingRows> = [];
  for (const plan of checkPlans) {
    const id = checkIds.find((c) => c.contentId === plan.content.id && c.version === plan.version)!.id;
    const det = runDeterministic(kit, { body: plan.body, imageText: "", altText: "", hasImage: false, imageAnalysis: null, channel: plan.content.channel, audience: plan.content.audience, source: plan.content.source, intent: null }).findings;
    const rows = buildFindingRows(kit, plan.content, plan.version, id, det, []);
    plan.mutate(rows);
    findingRows.push(...rows.map((r) => ({ ...r, createdAt: plan.createdAt })));
  }
  if (findingRows.length) await db.insert(findings).values(findingRows);
  if (approvalRows.length) await db.insert(approvals).values(approvalRows);
  if (verifiedRows.length) await db.insert(verifiedRecords).values(verifiedRows);

  events.push({ at: new Date(now), actorName: "Brandrail", actorRole: "system", action: "workspace.opened", entityType: "workspace", entityId: wsId.slice(0, 8), summary: "Demo sandbox created with the fictional Nimbus Pay brand kit" });
  events.sort((a, b) => a.at.getTime() - b.at.getTime());
  let prev = "GENESIS";
  const auditRows = events.map((e, i) => {
    const payload = { seq: i + 1, at: e.at.toISOString(), actorName: e.actorName, actorRole: e.actorRole, action: e.action, entityType: e.entityType, entityId: e.entityId, summary: e.summary, prevHash: prev };
    const hash = hashEvent(payload);
    prev = hash;
    return { ...payload, workspaceId: wsId, hash };
  });
  await db.insert(auditEvents).values(auditRows);

  return { workspaceId: wsId, creatorId: creator.id };
}

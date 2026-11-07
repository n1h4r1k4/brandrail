import "server-only";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import type { DB } from "./db";
import {
  approvals, auditEvents, checks, comments, contents, contentVersions, findings, rules, verifiedRecords, type ContentRow, type FindingRow,
} from "./db/schema";

export interface ContentListItem extends ContentRow {
  open: { blocker: number; major: number; minor: number };
  disputed: number;
  total: number;
}

/** All content in a workspace with open-finding counts from each item's latest check. */
export async function listContents(db: DB, workspaceId: string): Promise<ContentListItem[]> {
  const rows = await db.select().from(contents).where(eq(contents.workspaceId, workspaceId)).orderBy(desc(contents.updatedAt));
  if (!rows.length) return [];
  const allChecks = await db
    .select({ id: checks.id, contentId: checks.contentId })
    .from(checks)
    .where(inArray(checks.contentId, rows.map((r) => r.id)))
    .orderBy(desc(checks.id));
  const latest = new Map<string, number>();
  for (const c of allChecks) if (!latest.has(c.contentId)) latest.set(c.contentId, c.id);
  const fs = latest.size
    ? await db.select({ checkId: findings.checkId, severity: findings.severity, status: findings.status }).from(findings).where(inArray(findings.checkId, [...latest.values()]))
    : [];
  return rows.map((r) => {
    const mine = fs.filter((f) => f.checkId === latest.get(r.id));
    const open = { blocker: 0, major: 0, minor: 0 };
    for (const f of mine) if (f.status === "open") open[f.severity]++;
    return { ...r, open, disputed: mine.filter((f) => f.status === "disputed").length, total: mine.length };
  });
}

export async function getContentDetail(db: DB, workspaceId: string, id: string) {
  const [content] = await db.select().from(contents).where(and(eq(contents.id, id), eq(contents.workspaceId, workspaceId)));
  if (!content) return null;
  const [versions, checkRows, commentRows, approvalRows, verified, events] = await Promise.all([
    db.select().from(contentVersions).where(eq(contentVersions.contentId, id)).orderBy(asc(contentVersions.version)),
    db.select().from(checks).where(eq(checks.contentId, id)).orderBy(desc(checks.id)),
    db.select().from(comments).where(eq(comments.contentId, id)).orderBy(asc(comments.id)),
    db.select().from(approvals).where(eq(approvals.contentId, id)).orderBy(asc(approvals.id)),
    db.select().from(verifiedRecords).where(eq(verifiedRecords.contentId, id)),
    db.select().from(auditEvents).where(and(eq(auditEvents.workspaceId, workspaceId), eq(auditEvents.entityId, id))).orderBy(asc(auditEvents.seq)),
  ]);
  const latest = checkRows[0] ?? null;
  const latestFindings: FindingRow[] = latest ? await db.select().from(findings).where(eq(findings.checkId, latest.id)).orderBy(asc(findings.id)) : [];
  const lastFull = checkRows.find((c) => c.kind === "full") ?? null;
  const ruleRows = latest
    ? await db.select({ code: rules.code, overrideRole: rules.overrideRole, statement: rules.statement, sourceDoc: rules.sourceDoc })
        .from(rules).where(and(eq(rules.workspaceId, workspaceId), eq(rules.version, latest.rulebookVersion)))
    : [];
  return { content, versions, latest, lastFull, findings: latestFindings, comments: commentRows, approvals: approvalRows, verified: verified[0] ?? null, events, rules: ruleRows };
}

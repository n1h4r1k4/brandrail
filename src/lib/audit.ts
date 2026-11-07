import "server-only";
import { createHash } from "node:crypto";
import { asc, desc, eq } from "drizzle-orm";
import type { DB } from "./db";
import { auditEvents } from "./db/schema";

export interface Actor {
  name: string;
  role: string;
}

type Payload = {
  seq: number;
  at: string;
  actorName: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  prevHash: string;
};

export function hashEvent(p: Payload) {
  const canonical = JSON.stringify([p.seq, p.at, p.actorName, p.actorRole, p.action, p.entityType, p.entityId, p.summary, p.prevHash]);
  return createHash("sha256").update(canonical).digest("hex");
}

/** Append an event to the workspace's hash-chained, append-only audit log. */
export async function logEvent(
  db: DB,
  workspaceId: string,
  actor: Actor,
  action: string,
  entityType: string,
  entityId: string,
  summary: string,
  at: Date = new Date(),
) {
  const [last] = await db
    .select({ seq: auditEvents.seq, hash: auditEvents.hash })
    .from(auditEvents)
    .where(eq(auditEvents.workspaceId, workspaceId))
    .orderBy(desc(auditEvents.seq))
    .limit(1);
  const payload: Payload = {
    seq: (last?.seq ?? 0) + 1,
    at: at.toISOString(),
    actorName: actor.name,
    actorRole: actor.role,
    action,
    entityType,
    entityId,
    summary,
    prevHash: last?.hash ?? "GENESIS",
  };
  await db.insert(auditEvents).values({ ...payload, workspaceId, hash: hashEvent(payload) });
}

/** Recompute every hash; any edit or deletion breaks the chain at that point. */
export async function verifyChain(db: DB, workspaceId: string) {
  const rows = await db.select().from(auditEvents).where(eq(auditEvents.workspaceId, workspaceId)).orderBy(asc(auditEvents.seq));
  let prev = "GENESIS";
  for (const [i, r] of rows.entries()) {
    if (r.seq !== i + 1 || r.prevHash !== prev || hashEvent(r) !== r.hash) {
      return { ok: false as const, events: rows.length, brokenAt: r.seq };
    }
    prev = r.hash;
  }
  return { ok: true as const, events: rows.length, head: prev };
}

export const contentHash = (data: unknown) => createHash("sha256").update(JSON.stringify(data)).digest("hex");

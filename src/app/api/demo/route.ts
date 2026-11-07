import { NextResponse, type NextRequest } from "next/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { contents } from "@/lib/db/schema";
import { createDemoWorkspace } from "@/lib/seed/seed";
import { COOKIE_OPTS, getSession, USER_COOKIE, WS_COOKIE } from "@/lib/session";

export const runtime = "nodejs";

// where each marketing-site screen opens inside the app
const PAGES: Record<string, string> = {
  dashboard: "/app",
  new: "/app/new",
  queue: "/app/review",
  rulebook: "/app/rulebook",
  facts: "/app/facts",
  insights: "/app/insights",
  audit: "/app/audit",
};

/**
 * Opens the demo. Reuses the visitor's sandbox if they already have one, otherwise creates a
 * private sandbox (no sign-up). An optional `next` field picks the screen to land on.
 */
export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const next = String(form?.get("next") ?? "");

  const existing = await getSession().catch(() => null);
  const db = existing?.db ?? (await getDb());
  let workspaceId = existing?.workspace.id;
  let creatorId: string | null = null;
  if (!workspaceId) {
    const ws = await createDemoWorkspace(db);
    workspaceId = ws.workspaceId;
    creatorId = ws.creatorId;
  }

  let path = PAGES[next] ?? "/app";
  if (next === "review" || next === "verified") {
    // a real piece of content: a draft with findings to fix, or one that has been verified
    const statuses = next === "verified" ? ["approved"] : ["changes_requested", "draft", "in_review"];
    const [row] = await db
      .select({ id: contents.id })
      .from(contents)
      .where(and(eq(contents.workspaceId, workspaceId), inArray(contents.status, statuses as ("approved" | "draft" | "changes_requested" | "in_review")[])))
      .orderBy(desc(contents.updatedAt))
      .limit(1);
    path = row ? `/app/content/${row.id}` : next === "review" ? "/app/new" : "/app";
  }

  const res = NextResponse.redirect(new URL(path, req.url), 303);
  if (creatorId) {
    res.cookies.set(WS_COOKIE, workspaceId, COOKIE_OPTS);
    res.cookies.set(USER_COOKIE, creatorId, COOKIE_OPTS);
  }
  return res;
}

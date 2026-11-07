import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { createDemoWorkspace } from "@/lib/seed/seed";
import { COOKIE_OPTS, USER_COOKIE, WS_COOKIE } from "@/lib/session";

export const runtime = "nodejs";

/** Creates a private sandbox workspace for this visitor (no sign-up) and opens it. */
export async function POST(req: NextRequest) {
  const db = await getDb();
  const ws = await createDemoWorkspace(db);
  const res = NextResponse.redirect(new URL("/app", req.url), 303);
  res.cookies.set(WS_COOKIE, ws.workspaceId, COOKIE_OPTS);
  res.cookies.set(USER_COOKIE, ws.creatorId, COOKIE_OPTS);
  return res;
}

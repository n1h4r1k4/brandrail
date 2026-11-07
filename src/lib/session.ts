import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { users, workspaces } from "./db/schema";

export const WS_COOKIE = "br_ws";
export const USER_COOKIE = "br_user";
export const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 14,
};

/** The visitor's sandbox workspace and the persona they are acting as. */
export async function getSession() {
  const jar = await cookies();
  const wsId = jar.get(WS_COOKIE)?.value;
  if (!wsId) return null;
  const db = await getDb();
  const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, wsId));
  if (!workspace) return null;
  const people = await db.select().from(users).where(eq(users.workspaceId, wsId));
  const uid = jar.get(USER_COOKIE)?.value;
  const user = people.find((u) => u.id === uid) ?? people.find((u) => u.role === "creator")!;
  return { db, workspace, user, people };
}

export async function requireSession() {
  const s = await getSession();
  if (!s) redirect("/?expired=1");
  return s;
}

export type Session = NonNullable<Awaited<ReturnType<typeof getSession>>>;

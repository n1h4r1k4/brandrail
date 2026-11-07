"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { and, eq, inArray, max } from "drizzle-orm";
import {
  approvals, comments, contents, contentVersions, facts, findings, rulebookVersions, rules, terms, verifiedRecords,
  workspaces, type Category, type ImageAnalysis, type Intent, type Role, type RuleParams, type Severity,
} from "@/lib/db/schema";
import { getDb } from "@/lib/db";
import { requireSession, USER_COOKIE, WS_COOKIE, COOKIE_OPTS, type Session } from "@/lib/session";
import { contentHash, logEvent } from "@/lib/audit";
import { latestCheck, runCheck } from "@/lib/review";
import { applyReplacement, locateQuote } from "@/lib/engine/text";
import { extractIntent } from "@/lib/ai/intent";
import { compileRules, type RuleDraft } from "@/lib/ai/compile";
import { aiEnabled } from "@/lib/ai/client";
import { canOverride, canReview, isBlocking, requiredRolesFor } from "@/lib/workflow";
import { createDemoWorkspace, randomId } from "@/lib/seed/seed";
import { overrideRoleFor } from "@/lib/seed/nimbus";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const actor = (s: Session) => ({ name: s.user.name, role: s.user.role });
const fail = (error: string) => ({ ok: false as const, error });

function refresh() {
  revalidatePath("/app", "layout");
}

async function ownContent(s: Session, contentId: string) {
  const [c] = await s.db.select().from(contents).where(and(eq(contents.id, contentId), eq(contents.workspaceId, s.workspace.id)));
  return c ?? null;
}

async function currentVersionRow(s: Session, contentId: string, version: number) {
  const [v] = await s.db.select().from(contentVersions).where(and(eq(contentVersions.contentId, contentId), eq(contentVersions.version, version)));
  return v;
}

// ---------------------------------------------------------------- personas & sandbox

export async function switchUser(userId: string): Promise<Result> {
  const s = await requireSession();
  if (!s.people.some((p) => p.id === userId)) return fail("Unknown persona.");
  (await cookies()).set(USER_COOKIE, userId, COOKIE_OPTS);
  refresh();
  return { ok: true };
}

export async function resetSandbox(): Promise<Result> {
  const db = await getDb();
  const ws = await createDemoWorkspace(db);
  const jar = await cookies();
  jar.set(WS_COOKIE, ws.workspaceId, COOKIE_OPTS);
  jar.set(USER_COOKIE, ws.creatorId, COOKIE_OPTS);
  refresh();
  return { ok: true };
}

// ---------------------------------------------------------------- documents

export async function extractDocumentText(form: FormData): Promise<Result<{ pages: string[]; name: string }>> {
  await requireSession();
  const file = form.get("file");
  if (!(file instanceof File)) return fail("No file received.");
  if (file.size > 4 * 1024 * 1024) return fail("Files up to 4 MB are supported.");
  const buf = Buffer.from(await file.arrayBuffer());
  const name = file.name.toLowerCase();
  try {
    if (name.endsWith(".pdf")) {
      const { extractText, getDocumentProxy } = await import("unpdf");
      const pdf = await getDocumentProxy(new Uint8Array(buf));
      const { text } = await extractText(pdf, { mergePages: false });
      return { ok: true, pages: (text as string[]).map((t) => t.trim()), name: file.name };
    }
    if (name.endsWith(".docx")) {
      const mammoth = await import("mammoth");
      const { value } = await mammoth.extractRawText({ buffer: buf });
      return { ok: true, pages: [value.trim()], name: file.name };
    }
    if (name.endsWith(".txt") || name.endsWith(".md")) {
      return { ok: true, pages: buf.toString("utf8").split(/\f|\n-{3,}\n/).map((p) => p.trim()).filter(Boolean), name: file.name };
    }
    return fail("Supported formats: PDF, DOCX, TXT.");
  } catch {
    return fail("Could not read that file. Is it a valid PDF or DOCX?");
  }
}

// ---------------------------------------------------------------- content

export interface NewContentInput {
  title: string;
  channel: string;
  audience: string;
  source: "human" | "agency" | "ai";
  body: string;
  altText: string;
  imageData: string | null;
  imageText: string;
  imageAnalysis: ImageAnalysis | null;
}

export async function createContent(input: NewContentInput): Promise<Result<{ id: string }>> {
  const s = await requireSession();
  const title = input.title.trim().slice(0, 140);
  const body = input.body.trim();
  if (!title) return fail("Give the piece a title.");
  if (!body && !input.imageData) return fail("Add some text or an image to check.");
  if (input.imageData && input.imageData.length > 3_500_000) return fail("Image is too large after compression. Try a smaller one.");
  const id = randomId(9);
  const { db } = s;
  await db.insert(contents).values({
    id, workspaceId: s.workspace.id, title, channel: input.channel || "Other", audience: input.audience || "General", region: "India",
    source: input.source, createdBy: s.user.name, currentVersion: 1,
  });
  await db.insert(contentVersions).values({
    contentId: id, version: 1, body, imageText: input.imageText.trim(), imageData: input.imageData, imageAnalysis: input.imageAnalysis,
    altText: input.altText.trim(), note: "First draft", createdBy: s.user.name,
  });
  const watch = (await db.select({ term: terms.term }).from(terms).where(and(eq(terms.workspaceId, s.workspace.id), eq(terms.kind, "watch")))).map((t) => t.term);
  const [intent] = await Promise.all([
    extractIntent([body, input.imageText].filter(Boolean).join("\n"), input.channel, input.audience, watch),
    runCheck(db, id, "full", s.user.name),
  ]);
  if (intent) await db.update(contents).set({ intent }).where(eq(contents.id, id));
  await logEvent(db, s.workspace.id, actor(s), "content.created", "content", id, `Created "${title}" (v1) and ran a full check`);
  refresh();
  return { ok: true, id };
}

export async function confirmIntent(contentId: string, intent: Intent): Promise<Result> {
  const s = await requireSession();
  const c = await ownContent(s, contentId);
  if (!c) return fail("Not found.");
  const clean: Intent = {
    goal: intent.goal.trim().slice(0, 200), audience: intent.audience.trim().slice(0, 200),
    keyMessage: intent.keyMessage.trim().slice(0, 200), cta: intent.cta.trim().slice(0, 200),
  };
  await s.db.update(contents).set({ intent: clean, intentConfirmed: true }).where(eq(contents.id, contentId));
  await logEvent(s.db, s.workspace.id, actor(s), "intent.confirmed", "content", contentId, `Confirmed intent: ${clean.goal}`);
  refresh();
  return { ok: true };
}

export async function runFullCheck(contentId: string): Promise<Result> {
  const s = await requireSession();
  const c = await ownContent(s, contentId);
  if (!c) return fail("Not found.");
  if (c.status === "approved") return fail("Approved content is locked.");
  await runCheck(s.db, contentId, "full", s.user.name);
  await logEvent(s.db, s.workspace.id, actor(s), "check.full", "content", contentId, `Ran a full check on v${c.currentVersion}`);
  refresh();
  return { ok: true };
}

const editable = (status: string) => status === "draft" || status === "changes_requested";

async function newVersion(s: Session, contentId: string, patch: { body?: string; altText?: string; imageText?: string }, note: string) {
  const c = (await ownContent(s, contentId))!;
  const cur = await currentVersionRow(s, contentId, c.currentVersion);
  const next = c.currentVersion + 1;
  await s.db.insert(contentVersions).values({
    contentId, version: next, body: patch.body ?? cur.body, imageText: patch.imageText ?? cur.imageText, imageData: cur.imageData,
    imageAnalysis: cur.imageAnalysis, altText: patch.altText ?? cur.altText, note, createdBy: s.user.name,
  });
  await s.db.update(contents).set({ currentVersion: next, updatedAt: new Date() }).where(eq(contents.id, contentId));
  return next;
}

export async function acceptSuggestion(findingId: number): Promise<Result> {
  const s = await requireSession();
  const [f] = await s.db.select().from(findings).where(and(eq(findings.id, findingId), eq(findings.workspaceId, s.workspace.id)));
  if (!f) return fail("Finding not found.");
  const c = (await ownContent(s, f.contentId))!;
  if (s.user.role !== "creator" && s.user.role !== "admin") return fail("Only the creator can change the content.");
  if (!editable(c.status)) return fail("This content is in review or approved and can't be edited now.");
  if (f.suggestion === null) return fail("This finding has no suggested fix.");
  const last = await latestCheck(s.db, c.id);
  if (!last || last.id !== f.checkId) return fail("This finding is out of date. Refresh the page.");
  const cur = await currentVersionRow(s, c.id, c.currentVersion);
  let version: number;
  if (f.field === "image") {
    version = await newVersion(s, c.id, { altText: f.suggestion }, `Added alt text (${f.ruleCode})`);
  } else {
    const text = f.field === "body" ? cur.body : cur.imageText;
    const loc = text.slice(f.start, f.end) === f.quote ? { start: f.start, end: f.end } : locateQuote(text, f.quote);
    if (!loc) return fail("The quoted text has already changed.");
    const updated = applyReplacement(text, loc.start, loc.end, f.suggestion);
    version = await newVersion(s, c.id, f.field === "body" ? { body: updated } : { imageText: updated }, `Accepted ${f.ruleCode} fix`);
  }
  await s.db.update(findings).set({ status: "accepted", resolvedBy: s.user.name }).where(eq(findings.id, f.id));
  await runCheck(s.db, c.id, "quick", s.user.name);
  await logEvent(s.db, s.workspace.id, actor(s), "finding.accepted", "content", c.id, `Accepted the ${f.ruleCode} fix for "${f.quote.slice(0, 60)}" (now v${version})`);
  refresh();
  return { ok: true };
}

export async function disputeFinding(findingId: number, reason: string): Promise<Result> {
  const s = await requireSession();
  const why = reason.trim();
  if (why.length < 5) return fail("Give a short reason so the reviewer understands.");
  const [f] = await s.db.select().from(findings).where(and(eq(findings.id, findingId), eq(findings.workspaceId, s.workspace.id)));
  if (!f) return fail("Finding not found.");
  const c = (await ownContent(s, f.contentId))!;
  if (!editable(c.status)) return fail("Content in review can't be changed by the creator.");
  await s.db.update(findings).set({ status: "disputed", resolutionReason: why.slice(0, 400), resolvedBy: s.user.name }).where(eq(findings.id, f.id));
  await logEvent(s.db, s.workspace.id, actor(s), "finding.disputed", "content", c.id, `Disputed ${f.ruleCode} on "${f.quote.slice(0, 60)}": ${why.slice(0, 160)}`);
  refresh();
  return { ok: true };
}

export async function overrideFinding(findingId: number, reason: string): Promise<Result> {
  const s = await requireSession();
  const why = reason.trim();
  if (why.length < 5) return fail("A reason is required to override a finding.");
  const [f] = await s.db.select().from(findings).where(and(eq(findings.id, findingId), eq(findings.workspaceId, s.workspace.id)));
  if (!f) return fail("Finding not found.");
  const [rule] = await s.db.select().from(rules).where(and(eq(rules.workspaceId, s.workspace.id), eq(rules.version, f.rulebookVersion), eq(rules.code, f.ruleCode)));
  if (!rule || !canOverride(s.user.role, rule.overrideRole)) {
    return fail(rule?.overrideRole === "compliance" ? "Only Compliance can override claims, legal and confidentiality findings." : "Your role can't override this finding.");
  }
  const note = f.status === "disputed" ? `Dispute upheld: ${why}` : why;
  await s.db.update(findings).set({ status: "overridden", resolutionReason: note.slice(0, 400), resolvedBy: s.user.name }).where(eq(findings.id, f.id));
  await logEvent(s.db, s.workspace.id, actor(s), "finding.overridden", "content", f.contentId, `Overrode ${f.ruleCode} on "${f.quote.slice(0, 60)}": ${why.slice(0, 160)}`);
  refresh();
  return { ok: true };
}

export async function reopenFinding(findingId: number): Promise<Result> {
  const s = await requireSession();
  const [f] = await s.db.select().from(findings).where(and(eq(findings.id, findingId), eq(findings.workspaceId, s.workspace.id)));
  if (!f) return fail("Finding not found.");
  const c = (await ownContent(s, f.contentId))!;
  const creatorWithdraw = (s.user.role === "creator" || s.user.role === "admin") && editable(c.status) && f.status === "disputed";
  const reviewerReject = canReview(s.user.role) && c.status === "in_review";
  if (!creatorWithdraw && !reviewerReject) return fail("You can't reopen this finding now.");
  await s.db.update(findings).set({ status: "open", resolutionReason: null, resolvedBy: null }).where(eq(findings.id, f.id));
  const what = reviewerReject && !creatorWithdraw ? "Rejected the dispute on" : "Withdrew the dispute on";
  await logEvent(s.db, s.workspace.id, actor(s), "finding.reopened", "content", f.contentId, `${what} ${f.ruleCode} ("${f.quote.slice(0, 60)}")`);
  refresh();
  return { ok: true };
}

export async function saveEdit(contentId: string, patch: { body: string; altText: string; imageText: string }): Promise<Result> {
  const s = await requireSession();
  const c = await ownContent(s, contentId);
  if (!c) return fail("Not found.");
  if (s.user.role !== "creator" && s.user.role !== "admin") return fail("Only the creator can edit the content.");
  if (!editable(c.status)) return fail("Content in review or approved can't be edited.");
  const v = await newVersion(s, contentId, { body: patch.body.trim(), altText: patch.altText.trim(), imageText: patch.imageText.trim() }, "Edited by hand");
  await runCheck(s.db, contentId, "quick", s.user.name);
  await logEvent(s.db, s.workspace.id, actor(s), "content.revised", "content", contentId, `Saved v${v} and re-ran rule-based checks`);
  refresh();
  return { ok: true };
}

export async function submitForReview(contentId: string): Promise<Result> {
  const s = await requireSession();
  const c = await ownContent(s, contentId);
  if (!c) return fail("Not found.");
  if (s.user.role !== "creator" && s.user.role !== "admin") return fail("Only the creator submits content.");
  if (!editable(c.status)) return fail("Already in review or approved.");
  let last = await latestCheck(s.db, contentId);
  let ranFull = false;
  if (!last || last.version !== c.currentVersion || last.kind !== "full") {
    await runCheck(s.db, contentId, "full", s.user.name);
    last = await latestCheck(s.db, contentId);
    ranFull = true;
  }
  const rows = await s.db.select().from(findings).where(eq(findings.checkId, last!.id));
  const open = rows.filter((f) => f.severity === "blocker" && f.status === "open");
  if (open.length) {
    const n = `${open.length} blocker${open.length > 1 ? "s" : ""}`;
    if (ranFull) refresh();
    return fail(ranFull
      ? `Before submitting, Brandrail ran a full check on v${c.currentVersion} and found ${n}. Fix or dispute ${open.length > 1 ? "them" : "it"}, then submit again.`
      : `Fix or dispute ${n} before submitting.`);
  }
  const required = requiredRolesFor(rows);
  const round = c.reviewRound + 1;
  await s.db.update(contents).set({ status: "in_review", requiredRoles: required, reviewRound: round, updatedAt: new Date() }).where(eq(contents.id, contentId));
  await logEvent(s.db, s.workspace.id, actor(s), "content.submitted", "content", contentId, `Submitted v${c.currentVersion} for review (round ${round}); needs ${required.join(" + ")}`);
  refresh();
  return { ok: true };
}

const reviewerRoleOf = (role: Role): Role => (role === "admin" ? "reviewer" : role);

export async function approveContent(contentId: string, note: string): Promise<Result<{ verified: boolean }>> {
  const s = await requireSession();
  const c = await ownContent(s, contentId);
  if (!c) return fail("Not found.");
  if (c.status !== "in_review") return fail("Only content in review can be approved.");
  const as = reviewerRoleOf(s.user.role);
  if (!c.requiredRoles.includes(as)) return fail("Your approval isn't required for this piece.");
  const last = await latestCheck(s.db, contentId);
  const rows = last ? await s.db.select().from(findings).where(eq(findings.checkId, last.id)) : [];
  const ruleRows = last ? await s.db.select({ code: rules.code, overrideRole: rules.overrideRole }).from(rules)
    .where(and(eq(rules.workspaceId, s.workspace.id), eq(rules.version, last.rulebookVersion))) : [];
  const owner = new Map(ruleRows.map((r) => [r.code, r.overrideRole]));
  // Each approver must clear the blockers within their authority; Compliance-owned blockers are Compliance's call.
  const mine = rows.filter((f) => isBlocking(f) && canOverride(s.user.role, owner.get(f.ruleCode) ?? "compliance"));
  if (mine.length) return fail(`${mine.length} blocker${mine.length > 1 ? "s are" : " is"} still open or disputed. Override (with a reason) or request changes.`);
  const prior = await s.db.select().from(approvals).where(and(eq(approvals.contentId, contentId), eq(approvals.round, c.reviewRound), eq(approvals.decision, "approved")));
  if (prior.some((p) => reviewerRoleOf(p.role) === as)) return fail("This role has already approved this round.");
  await s.db.insert(approvals).values({ contentId, version: c.currentVersion, round: c.reviewRound, userId: s.user.id, userName: s.user.name, role: as, decision: "approved", note: note.trim().slice(0, 400) });
  await logEvent(s.db, s.workspace.id, actor(s), "review.approved", "content", contentId, `Approved v${c.currentVersion} (round ${c.reviewRound})${note.trim() ? `: ${note.trim().slice(0, 120)}` : ""}`);
  const done = new Set([...prior.map((p) => reviewerRoleOf(p.role)), as]);
  const verified = c.requiredRoles.every((r) => done.has(r)) && !rows.some(isBlocking);
  if (verified) {
    const v = await currentVersionRow(s, contentId, c.currentVersion);
    const all = await s.db.select().from(approvals).where(and(eq(approvals.contentId, contentId), eq(approvals.round, c.reviewRound), eq(approvals.decision, "approved")));
    const rb = last?.rulebookVersion ?? s.workspace.activeRulebookVersion;
    const hash = contentHash({ contentId, version: c.currentVersion, body: v.body, imageText: v.imageText, altText: v.altText, image: v.imageData ? contentHash(v.imageData) : null, rulebookVersion: rb });
    const record = {
      contentId, version: c.currentVersion, hash, rulebookVersion: rb,
      approvers: all.map((a) => ({ name: a.userName, role: a.role, at: a.createdAt.toISOString() })),
      openNonBlocking: rows.filter((f) => f.status === "open" || f.status === "disputed").length, createdAt: new Date(),
    };
    await s.db.delete(verifiedRecords).where(eq(verifiedRecords.contentId, contentId));
    await s.db.insert(verifiedRecords).values(record);
    await s.db.update(contents).set({ status: "approved", updatedAt: new Date() }).where(eq(contents.id, contentId));
    await logEvent(s.db, s.workspace.id, { name: "Brandrail", role: "system" }, "content.verified", "content", contentId, `Locked v${c.currentVersion} as Brandrail Verified (sha256 ${hash.slice(0, 12)}…)`);
  }
  refresh();
  return { ok: true, verified };
}

export async function requestChanges(contentId: string, note: string): Promise<Result> {
  const s = await requireSession();
  const c = await ownContent(s, contentId);
  if (!c) return fail("Not found.");
  if (!canReview(s.user.role)) return fail("Only reviewers can request changes.");
  if (c.status !== "in_review") return fail("Only content in review can be sent back.");
  if (note.trim().length < 3) return fail("Tell the creator what to change.");
  await s.db.insert(approvals).values({ contentId, version: c.currentVersion, round: c.reviewRound, userId: s.user.id, userName: s.user.name, role: reviewerRoleOf(s.user.role), decision: "changes_requested", note: note.trim().slice(0, 600) });
  await s.db.update(contents).set({ status: "changes_requested", updatedAt: new Date() }).where(eq(contents.id, contentId));
  await logEvent(s.db, s.workspace.id, actor(s), "review.changes_requested", "content", contentId, `Requested changes: ${note.trim().slice(0, 160)}`);
  refresh();
  return { ok: true };
}

export async function addComment(contentId: string, body: string, quote: string): Promise<Result> {
  const s = await requireSession();
  const c = await ownContent(s, contentId);
  if (!c) return fail("Not found.");
  if (!body.trim()) return fail("Write a comment first.");
  await s.db.insert(comments).values({ contentId, version: c.currentVersion, userId: s.user.id, userName: s.user.name, role: s.user.role, body: body.trim().slice(0, 1000), quote: quote.trim().slice(0, 200) || null });
  await logEvent(s.db, s.workspace.id, actor(s), "comment.added", "content", contentId, `Commented: ${body.trim().slice(0, 100)}`);
  refresh();
  return { ok: true };
}

// ---------------------------------------------------------------- rulebook

const PREFIX: Record<Category, string> = {
  tone: "TON", terminology: "TRM", messaging: "MSG", claims: "CLM", legal: "LEG", confidentiality: "CNF", accessibility: "ACC", visual: "VIS",
};

/** Copy the active rulebook to a new version, apply `mutate`, publish it, and quick re-check content in progress. */
async function publishNewVersion(
  s: Session,
  note: string,
  mutate: (rows: (typeof rules.$inferInsert)[], version: number) => void,
  beforeRecheck?: () => Promise<void>,
) {
  const { db } = s;
  const [ws] = await db.select().from(workspaces).where(eq(workspaces.id, s.workspace.id));
  const current = await db.select().from(rules).where(and(eq(rules.workspaceId, ws.id), eq(rules.version, ws.activeRulebookVersion)));
  const next = ws.activeRulebookVersion + 1;
  const rows = current.map((r) => {
    const { id, ...rest } = r;
    void id;
    return { ...rest, version: next };
  });
  mutate(rows, next);
  await db.insert(rules).values(rows);
  await db.insert(rulebookVersions).values({ workspaceId: ws.id, version: next, note, createdBy: s.user.name });
  await db.update(workspaces).set({ activeRulebookVersion: next }).where(eq(workspaces.id, ws.id));
  await logEvent(db, ws.id, actor(s), "rulebook.published", "rulebook", `v${next}`, `Published Rulebook v${next}: ${note}`);
  if (beforeRecheck) await beforeRecheck();
  const inFlight = await db.select({ id: contents.id }).from(contents).where(and(eq(contents.workspaceId, ws.id), inArray(contents.status, ["draft", "changes_requested", "in_review"])));
  for (const c of inFlight) await runCheck(db, c.id, "quick", "Brandrail");
  return { version: next, rechecked: inFlight.length };
}

function nextCode(existing: string[], category: Category) {
  const prefix = PREFIX[category];
  const n = Math.max(0, ...existing.filter((c) => c.startsWith(prefix)).map((c) => Number(c.split("-")[1]) || 0)) + 1;
  return `${prefix}-${String(n).padStart(2, "0")}`;
}

export async function updateRule(code: string, patch: { title: string; statement: string; severity: Severity }): Promise<Result<{ version: number }>> {
  const s = await requireSession();
  if (s.user.role !== "admin") return fail("Only the brand admin can change the rulebook.");
  if (!patch.statement.trim() || !patch.title.trim()) return fail("Title and statement are required.");
  let found = false;
  const res = await publishNewVersion(s, `Edited ${code}`, (rows) => {
    const r = rows.find((x) => x.code === code);
    if (!r) return;
    found = true;
    r.title = patch.title.trim().slice(0, 120);
    r.statement = patch.statement.trim().slice(0, 1000);
    r.severity = patch.severity;
  });
  if (!found) return fail("Rule not found.");
  refresh();
  return { ok: true, version: res.version };
}

export interface NewRuleInput {
  category: Category;
  title: string;
  statement: string;
  severity: Severity;
  bannedTerms: { term: string; replacement: string }[];
  examplesDo?: string[];
  examplesDont?: string[];
  sourceDoc?: string;
  sourcePage?: number | null;
}

async function addRulesToNewVersion(s: Session, inputs: NewRuleInput[], note: string) {
  const termRows: (typeof terms.$inferInsert)[] = [];
  const res = await publishNewVersion(s, note, (rows, version) => {
    for (const input of inputs) {
      const code = nextCode(rows.map((r) => r.code), input.category);
      const hasTerms = input.bannedTerms.length > 0;
      const params: RuleParams = hasTerms ? { detectors: ["terms"] } : {};
      rows.push({
        workspaceId: s.workspace.id, version, code, category: input.category, title: input.title.trim().slice(0, 120),
        statement: input.statement.trim().slice(0, 1000), severity: input.severity, checkType: hasTerms ? "rule" : "ai", params,
        examplesDo: input.examplesDo ?? [], examplesDont: input.examplesDont ?? [], sourceDoc: input.sourceDoc ?? "Added in Brandrail",
        sourcePage: input.sourcePage ?? null, overrideRole: overrideRoleFor(input.category),
      });
      for (const t of input.bannedTerms) {
        termRows.push({ workspaceId: s.workspace.id, kind: "banned", term: t.term.trim(), replacement: t.replacement.trim(), ruleCode: code });
      }
    }
  }, async () => {
    if (termRows.length) await s.db.insert(terms).values(termRows);
  });
  return res;
}

export async function addRule(input: NewRuleInput): Promise<Result<{ version: number }>> {
  const s = await requireSession();
  if (s.user.role !== "admin") return fail("Only the brand admin can change the rulebook.");
  if (!input.title.trim() || !input.statement.trim()) return fail("Title and statement are required.");
  const res = await addRulesToNewVersion(s, [input], `Added rule "${input.title.trim()}"`);
  refresh();
  return { ok: true, version: res.version };
}

export async function compileBrandBook(pages: string[], sourceName: string): Promise<Result<{ drafts: RuleDraft[] }>> {
  const s = await requireSession();
  if (s.user.role !== "admin") return fail("Only the brand admin can import guidelines.");
  if (!aiEnabled()) return fail("The Rule Compiler needs an AI key (Gemini or Claude). You can still add rules by hand.");
  const text = pages.join("\n").trim();
  if (text.length < 40) return fail("That document has too little text to compile.");
  if (text.length > 120_000) return fail("Documents up to ~120k characters are supported.");
  const existing = await s.db.select({ title: rules.title }).from(rules).where(and(eq(rules.workspaceId, s.workspace.id), eq(rules.version, s.workspace.activeRulebookVersion)));
  const res = await compileRules(pages, existing.map((r) => r.title));
  if (!res.ok) return fail(res.error);
  await logEvent(s.db, s.workspace.id, actor(s), "rulebook.compiled", "rulebook", "draft", `Rule Compiler drafted ${res.drafts.length} rule(s) from ${sourceName}`);
  return { ok: true, drafts: res.drafts };
}

export async function publishDrafts(drafts: RuleDraft[], sourceName: string): Promise<Result<{ version: number }>> {
  const s = await requireSession();
  if (s.user.role !== "admin") return fail("Only the brand admin can change the rulebook.");
  const chosen = drafts.filter((d) => d.verified).slice(0, 40);
  if (!chosen.length) return fail("Select at least one verified rule.");
  const res = await addRulesToNewVersion(
    s,
    chosen.map((d) => ({ ...d, sourceDoc: sourceName, sourcePage: d.sourcePage })),
    `Imported ${chosen.length} rule(s) from ${sourceName}`,
  );
  refresh();
  return { ok: true, version: res.version };
}

// ---------------------------------------------------------------- facts

export interface FactInput {
  statement: string;
  keywords: string;
  evidence: string;
  owner: string;
  validUntil: string;
  supersedes?: string;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

async function insertFacts(s: Session, inputs: FactInput[]) {
  const [{ n }] = await s.db.select({ n: max(facts.code) }).from(facts).where(eq(facts.workspaceId, s.workspace.id));
  let next = (Number(n?.split("-")[1]) || 0) + 1;
  const created: string[] = [];
  for (const f of inputs) {
    const code = `F-${String(next++).padStart(3, "0")}`;
    await s.db.insert(facts).values({
      workspaceId: s.workspace.id, code, statement: f.statement.trim().slice(0, 500),
      keywords: f.keywords.split(/[;|]/).map((k) => k.trim()).filter(Boolean).slice(0, 10),
      evidence: f.evidence.trim().slice(0, 300) || "Not recorded", owner: f.owner.trim().slice(0, 80) || "Unassigned", validUntil: f.validUntil,
    });
    if (f.supersedes) {
      await s.db.update(facts).set({ supersededBy: code }).where(and(eq(facts.workspaceId, s.workspace.id), eq(facts.code, f.supersedes.trim().toUpperCase())));
    }
    created.push(code);
  }
  return created;
}

export async function addFact(input: FactInput): Promise<Result<{ code: string }>> {
  const s = await requireSession();
  if (s.user.role !== "compliance" && s.user.role !== "admin") return fail("Only Compliance or the brand admin can change the Facts Ledger.");
  if (!input.statement.trim() || !DATE.test(input.validUntil)) return fail("A statement and a valid-until date (YYYY-MM-DD) are required.");
  const [code] = await insertFacts(s, [input]);
  await logEvent(s.db, s.workspace.id, actor(s), "fact.added", "fact", code, `Added ${code}: ${input.statement.trim().slice(0, 100)} (valid until ${input.validUntil})`);
  refresh();
  return { ok: true, code };
}

export async function importFactsCsv(csv: string): Promise<Result<{ codes: string[] }>> {
  const s = await requireSession();
  if (s.user.role !== "compliance" && s.user.role !== "admin") return fail("Only Compliance or the brand admin can change the Facts Ledger.");
  const rows = parseCsv(csv);
  if (rows.length < 2) return fail("The CSV needs a header row and at least one fact.");
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = (name: string) => header.indexOf(name);
  if (col("statement") < 0 || col("valid_until") < 0) return fail("Required columns: statement, valid_until. Optional: keywords, evidence, owner, supersedes.");
  const inputs: FactInput[] = rows.slice(1).filter((r) => r.some((c) => c.trim())).map((r) => ({
    statement: r[col("statement")] ?? "", keywords: r[col("keywords")] ?? "", evidence: r[col("evidence")] ?? "", owner: r[col("owner")] ?? "",
    validUntil: (r[col("valid_until")] ?? "").trim(), supersedes: col("supersedes") >= 0 ? r[col("supersedes")] : undefined,
  }));
  const bad = inputs.findIndex((i) => !i.statement.trim() || !DATE.test(i.validUntil));
  if (bad >= 0) return fail(`Row ${bad + 2}: needs a statement and valid_until as YYYY-MM-DD.`);
  const codes = await insertFacts(s, inputs.slice(0, 100));
  await logEvent(s.db, s.workspace.id, actor(s), "fact.imported", "fact", codes.join(","), `Imported ${codes.length} fact(s) from CSV`);
  refresh();
  return { ok: true, codes };
}

export async function setFactValidity(code: string, validUntil: string): Promise<Result> {
  const s = await requireSession();
  if (s.user.role !== "compliance" && s.user.role !== "admin") return fail("Only Compliance or the brand admin can change the Facts Ledger.");
  if (!DATE.test(validUntil)) return fail("Use YYYY-MM-DD.");
  await s.db.update(facts).set({ validUntil }).where(and(eq(facts.workspaceId, s.workspace.id), eq(facts.code, code)));
  await logEvent(s.db, s.workspace.id, actor(s), "fact.updated", "fact", code, `Set ${code} valid until ${validUntil}`);
  refresh();
  return { ok: true };
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

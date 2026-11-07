import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export type Role = "creator" | "reviewer" | "compliance" | "admin";
export type Severity = "blocker" | "major" | "minor";
export type Category =
  | "tone"
  | "terminology"
  | "messaging"
  | "claims"
  | "legal"
  | "confidentiality"
  | "accessibility"
  | "visual";
export type CheckType = "rule" | "ai" | "visual";
export type ContentStatus = "draft" | "in_review" | "changes_requested" | "approved";
export type FindingStatus =
  | "open"
  | "accepted" // creator applied the suggestion
  | "disputed" // creator dismissed it with a reason
  | "overridden" // authorised reviewer accepted the dispute / risk, with a reason
  | "resolved"; // no longer present after an edit
export type ContentSource = "human" | "agency" | "ai";
export type Field = "body" | "image_text" | "image";

export type Detector =
  | "patterns"
  | "terms"
  | "unverified_numbers"
  | "expired_facts"
  | "pii"
  | "alt_text"
  | "readability"
  | "exclamations"
  | "caps"
  | "emoji"
  | "disclaimer"
  | "tagline"
  | "contrast"
  | "palette";

export interface RuleParams {
  detectors?: Detector[];
  patterns?: string[]; // regex sources (case-insensitive) for rule-based detection
  replacement?: string; // suggested replacement for pattern matches ("" = remove)
  requiresFact?: boolean; // pattern matches are fine when an active fact supports them
  tagline?: string;
  maxExclamations?: number;
  maxEmoji?: number;
  allowCaps?: string[];
  minReadingEase?: number;
  minContrast?: number;
  palette?: { name: string; hex: string }[];
  disclaimer?: string;
  triggers?: string[];
}

export interface Intent {
  goal: string;
  audience: string;
  keyMessage: string;
  cta: string;
}

export interface ImageAnalysis {
  width: number;
  height: number;
  ocrConfidence: number;
  lines: { text: string; contrast: number; fg: string; bg: string; large: boolean }[];
  palette: { hex: string; share: number }[];
}

export interface CheckStats {
  rulesEvaluated: number;
  ruleFindings: number;
  ai: {
    status: "ok" | "off" | "error" | "refused" | "skipped";
    message?: string;
    model?: string;
    latencyMs?: number;
    proposed?: number;
    kept?: number;
    inputTokens?: number;
    cacheReadTokens?: number;
    outputTokens?: number;
  };
  dropped: { ruleCode: string; quote: string; reason: string }[];
  carried?: number;
  maskedTerms?: number;
}

const ts = (name: string) => timestamp(name, { withTimezone: true }).notNull().defaultNow();

export const workspaces = pgTable("workspaces", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  brandName: text("brand_name").notNull(),
  activeRulebookVersion: integer("active_rulebook_version").notNull().default(1),
  createdAt: ts("created_at"),
});

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    name: text("name").notNull(),
    title: text("title").notNull(),
    role: text("role").$type<Role>().notNull(),
  },
  (t) => [index("users_ws").on(t.workspaceId)],
);

export const rulebookVersions = pgTable(
  "rulebook_versions",
  {
    id: serial("id").primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    version: integer("version").notNull(),
    note: text("note").notNull(),
    createdBy: text("created_by").notNull(),
    createdAt: ts("created_at"),
  },
  (t) => [index("rbv_ws").on(t.workspaceId)],
);

export const rules = pgTable(
  "rules",
  {
    id: serial("id").primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    version: integer("version").notNull(),
    code: text("code").notNull(),
    category: text("category").$type<Category>().notNull(),
    title: text("title").notNull(),
    statement: text("statement").notNull(),
    severity: text("severity").$type<Severity>().notNull(),
    checkType: text("check_type").$type<CheckType>().notNull(),
    params: jsonb("params").$type<RuleParams>().notNull().default({}),
    examplesDo: jsonb("examples_do").$type<string[]>().notNull().default([]),
    examplesDont: jsonb("examples_dont").$type<string[]>().notNull().default([]),
    sourceDoc: text("source_doc").notNull(),
    sourcePage: integer("source_page"),
    overrideRole: text("override_role").$type<Role>().notNull(),
  },
  (t) => [index("rules_ws_ver").on(t.workspaceId, t.version)],
);

export const facts = pgTable(
  "facts",
  {
    id: serial("id").primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    code: text("code").notNull(),
    statement: text("statement").notNull(),
    keywords: jsonb("keywords").$type<string[]>().notNull().default([]),
    evidence: text("evidence").notNull(),
    owner: text("owner").notNull(),
    validUntil: text("valid_until").notNull(), // YYYY-MM-DD
    supersededBy: text("superseded_by"),
    supports: jsonb("supports").$type<string[]>().notNull().default([]), // claim words this fact substantiates, e.g. "#1"
    createdAt: ts("created_at"),
  },
  (t) => [index("facts_ws").on(t.workspaceId)],
);

export const terms = pgTable(
  "terms",
  {
    id: serial("id").primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    kind: text("kind").$type<"preferred" | "banned" | "competitor" | "watch">().notNull(),
    term: text("term").notNull(),
    replacement: text("replacement"),
    ruleCode: text("rule_code").notNull(),
    note: text("note"),
  },
  (t) => [index("terms_ws").on(t.workspaceId)],
);

export const contents = pgTable(
  "contents",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    title: text("title").notNull(),
    channel: text("channel").notNull(),
    audience: text("audience").notNull(),
    region: text("region").notNull(),
    source: text("source").$type<ContentSource>().notNull(),
    status: text("status").$type<ContentStatus>().notNull().default("draft"),
    createdBy: text("created_by").notNull(),
    currentVersion: integer("current_version").notNull().default(1),
    intent: jsonb("intent").$type<Intent | null>(),
    intentConfirmed: boolean("intent_confirmed").notNull().default(false),
    requiredRoles: jsonb("required_roles").$type<Role[]>().notNull().default([]),
    reviewRound: integer("review_round").notNull().default(0),
    seeded: boolean("seeded").notNull().default(false),
    createdAt: ts("created_at"),
    updatedAt: ts("updated_at"),
  },
  (t) => [index("contents_ws").on(t.workspaceId)],
);

export const contentVersions = pgTable(
  "content_versions",
  {
    id: serial("id").primaryKey(),
    contentId: text("content_id").notNull(),
    version: integer("version").notNull(),
    body: text("body").notNull(),
    imageText: text("image_text").notNull().default(""),
    imageData: text("image_data"),
    imageAnalysis: jsonb("image_analysis").$type<ImageAnalysis | null>(),
    altText: text("alt_text").notNull().default(""),
    note: text("note").notNull(),
    createdBy: text("created_by").notNull(),
    createdAt: ts("created_at"),
  },
  (t) => [index("cv_content").on(t.contentId)],
);

export const checks = pgTable(
  "checks",
  {
    id: serial("id").primaryKey(),
    contentId: text("content_id").notNull(),
    version: integer("version").notNull(),
    rulebookVersion: integer("rulebook_version").notNull(),
    kind: text("kind").$type<"full" | "quick">().notNull(),
    stats: jsonb("stats").$type<CheckStats>().notNull(),
    createdBy: text("created_by").notNull(),
    createdAt: ts("created_at"),
  },
  (t) => [index("checks_content").on(t.contentId)],
);

export const findings = pgTable(
  "findings",
  {
    id: serial("id").primaryKey(),
    checkId: integer("check_id").notNull(),
    contentId: text("content_id").notNull(),
    workspaceId: text("workspace_id").notNull(),
    version: integer("version").notNull(),
    ruleCode: text("rule_code").notNull(),
    ruleTitle: text("rule_title").notNull(),
    rulebookVersion: integer("rulebook_version").notNull(),
    sourcePage: integer("source_page"),
    category: text("category").$type<Category>().notNull(),
    severity: text("severity").$type<Severity>().notNull(),
    field: text("field").$type<Field>().notNull(),
    quote: text("quote").notNull(),
    start: integer("start").notNull().default(-1),
    end: integer("end").notNull().default(-1),
    message: text("message").notNull(),
    suggestion: text("suggestion"),
    factCodes: jsonb("fact_codes").$type<string[]>().notNull().default([]),
    method: text("method").$type<"rule" | "ai">().notNull(),
    confidence: real("confidence").notNull().default(1),
    status: text("status").$type<FindingStatus>().notNull().default("open"),
    resolutionReason: text("resolution_reason"),
    resolvedBy: text("resolved_by"),
    source: text("source").$type<ContentSource>().notNull(),
    createdAt: ts("created_at"),
  },
  (t) => [index("findings_check").on(t.checkId), index("findings_ws").on(t.workspaceId)],
);

export const comments = pgTable(
  "comments",
  {
    id: serial("id").primaryKey(),
    contentId: text("content_id").notNull(),
    version: integer("version").notNull(),
    userId: text("user_id").notNull(),
    userName: text("user_name").notNull(),
    role: text("role").$type<Role>().notNull(),
    body: text("body").notNull(),
    quote: text("quote"),
    createdAt: ts("created_at"),
  },
  (t) => [index("comments_content").on(t.contentId)],
);

export const approvals = pgTable(
  "approvals",
  {
    id: serial("id").primaryKey(),
    contentId: text("content_id").notNull(),
    version: integer("version").notNull(),
    round: integer("round").notNull(),
    userId: text("user_id").notNull(),
    userName: text("user_name").notNull(),
    role: text("role").$type<Role>().notNull(),
    decision: text("decision").$type<"approved" | "changes_requested">().notNull(),
    note: text("note").notNull().default(""),
    createdAt: ts("created_at"),
  },
  (t) => [index("approvals_content").on(t.contentId)],
);

export const verifiedRecords = pgTable("verified_records", {
  contentId: text("content_id").primaryKey(),
  version: integer("version").notNull(),
  hash: text("hash").notNull(),
  rulebookVersion: integer("rulebook_version").notNull(),
  approvers: jsonb("approvers").$type<{ name: string; role: Role; at: string }[]>().notNull(),
  openNonBlocking: integer("open_non_blocking").notNull().default(0),
  createdAt: ts("created_at"),
});

export const auditEvents = pgTable(
  "audit_events",
  {
    id: serial("id").primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    seq: integer("seq").notNull(),
    at: text("at").notNull(), // ISO string, part of the hashed payload
    actorName: text("actor_name").notNull(),
    actorRole: text("actor_role").notNull(),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    summary: text("summary").notNull(),
    prevHash: text("prev_hash").notNull(),
    hash: text("hash").notNull(),
  },
  (t) => [index("audit_ws_seq").on(t.workspaceId, t.seq)],
);

export type RuleRow = typeof rules.$inferSelect;
export type FactRow = typeof facts.$inferSelect;
export type TermRow = typeof terms.$inferSelect;
export type ContentRow = typeof contents.$inferSelect;
export type VersionRow = typeof contentVersions.$inferSelect;
export type FindingRow = typeof findings.$inferSelect;
export type CheckRow = typeof checks.$inferSelect;
export type UserRow = typeof users.$inferSelect;

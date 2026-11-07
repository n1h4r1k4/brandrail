import type { Category, ContentStatus, FindingStatus, Role, Severity } from "./db/schema";

export const ROLE_LABEL: Record<Role, string> = {
  creator: "Creator",
  reviewer: "Brand reviewer",
  compliance: "Compliance",
  admin: "Brand admin",
};

export const STATUS_LABEL: Record<ContentStatus, string> = {
  draft: "Draft",
  in_review: "In review",
  changes_requested: "Changes requested",
  approved: "Approved",
};

export const SENSITIVE: Category[] = ["claims", "legal", "confidentiality"];

/** Every piece needs a brand reviewer; claims, legal or confidentiality issues also need Compliance. */
export function requiredRolesFor(found: { category: Category }[]): Role[] {
  const roles: Role[] = ["reviewer"];
  if (found.some((f) => SENSITIVE.includes(f.category))) roles.push("compliance");
  return roles;
}

/** Who may override (accept the risk of) a finding of this category. */
export function canOverride(role: Role, overrideRole: Role) {
  if (role === "compliance") return true; // compliance can override anything
  if (role === "admin" || role === "reviewer") return overrideRole === "reviewer";
  return false;
}

export const canReview = (role: Role) => role !== "creator";

export const isBlocking = (f: { severity: Severity; status: FindingStatus }) =>
  f.severity === "blocker" && (f.status === "open" || f.status === "disputed");

export const CATEGORY_LABEL: Record<Category, string> = {
  tone: "Tone & voice",
  terminology: "Terminology",
  messaging: "Messaging",
  claims: "Facts & claims",
  legal: "Legal",
  confidentiality: "Confidentiality",
  accessibility: "Accessibility",
  visual: "Visual identity",
};

export const SOURCE_LABEL = { human: "Employee", agency: "Agency", ai: "AI-assisted" } as const;

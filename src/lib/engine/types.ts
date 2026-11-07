import type {
  Category, CheckType, ContentSource, Field, ImageAnalysis, Intent, Role, RuleParams, Severity,
} from "../db/schema";

export interface EngineRule {
  code: string;
  category: Category;
  severity: Severity;
  title: string;
  statement: string;
  checkType: CheckType;
  params: RuleParams;
  sourcePage: number | null;
  overrideRole: Role;
  examplesDo: string[];
  examplesDont: string[];
}

export interface EngineFact {
  code: string;
  statement: string;
  keywords: string[];
  supports: string[];
  evidence: string;
  owner: string;
  validUntil: string;
  supersededBy: string | null;
}

export interface EngineTerm {
  kind: "preferred" | "banned" | "competitor" | "watch";
  term: string;
  replacement: string | null;
  ruleCode: string;
  note: string | null;
}

export interface EngineContent {
  body: string;
  imageText: string;
  altText: string;
  hasImage: boolean;
  imageAnalysis: ImageAnalysis | null;
  channel: string;
  audience: string;
  source: ContentSource;
  intent: Intent | null;
}

export interface Kit {
  rules: EngineRule[];
  facts: EngineFact[];
  terms: EngineTerm[];
  today: string; // YYYY-MM-DD
}

export interface DraftFinding {
  ruleCode: string;
  field: Field;
  quote: string;
  start: number;
  end: number;
  message: string;
  suggestion: string | null; // replacement for the quote ("" = remove); for image alt text, the new alt text
  factCodes: string[];
  method: "rule" | "ai";
  confidence: number;
  suggestionByAi?: boolean;
}

export function factStatus(f: EngineFact, today: string): "active" | "expiring" | "expired" | "superseded" {
  if (f.supersededBy) return "superseded";
  if (f.validUntil < today) return "expired";
  const days = (Date.parse(f.validUntil) - Date.parse(today)) / 86400000;
  return days <= 30 ? "expiring" : "active";
}

export const isActive = (f: EngineFact, today: string) => {
  const s = factStatus(f, today);
  return s === "active" || s === "expiring";
};

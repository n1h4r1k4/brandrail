// Copy and data for Brandrail's marketing pages (home, about, screens and each screen's page).

export interface Screen {
  slug: string;
  name: string;
  tags: string;          // mono line under a card, e.g. "RULES / AI / VERIFIER"
  blurb: string;         // two-line mono description in the carousel
  type: string;
  scope: string[];
  challenge: string;
  what: string;          // "What it is" paragraph
  highlights: [string, string][];
  img: string;
  accent: string;        // neon colour in the carousel
  area: "Checking" | "Approvals" | "Governance";
  date: string;
  stack: string[];
}

export const SCREENS: Screen[] = [
  {
    slug: "review",
    name: "Review & fix",
    tags: "Rules / AI / Verifier",
    blurb: "Every flag quotes the text and cites a rule, with a fix one click away",
    type: "Core screen",
    scope: ["Rule engine", "AI review", "Fix studio"],
    challenge: "Catch what breaks a brand before it ships, without burying the creator in noise",
    what: "The working surface for a draft. Rule-based checks and a grounded AI review run together, every finding quotes the exact words and cites a page of the rulebook or an approved fact, and each one comes with a rewrite that keeps the creator's intent",
    highlights: [["Findings with quotes and citations", "Evidence"], ["One-click fixes, re-checked", "Fix studio"], ["Intent lock on goal, message and CTA", "Intent"], ["Accept or dispute with a reason", "Workflow"]],
    img: "/landing/review.png",
    accent: "#e040fb",
    area: "Checking",
    date: "07.11.2026",
    stack: ["Next.js", "Postgres", "Gemini"],
  },
  {
    slug: "verified",
    name: "Brandrail Verified",
    tags: "Approvals / Audit",
    blurb: "The record that every check passed and every approver signed",
    type: "Outcome",
    scope: ["Approvals", "Audit", "Export"],
    challenge: "Show anyone, later, exactly why a piece of content was allowed to go live",
    what: "When the last required role approves, the draft becomes Brandrail Verified: the rulebook version it was checked against, every approver and override reason, and a hash-chained audit entry that can't be quietly edited",
    highlights: [["Rulebook version pinned to the record", "Traceability"], ["Every approver and override reason", "People"], ["Hash-chained audit entry", "Integrity"]],
    img: "/landing/verified.png",
    accent: "#2979ff",
    area: "Approvals",
    date: "07.11.2026",
    stack: ["Next.js", "SHA-256", "Drizzle"],
  },
  {
    slug: "insights",
    name: "Guideline Health",
    tags: "Analytics / Guideline health",
    blurb: "Which rules get broken, disputed or ignored, and where the guide needs work",
    type: "Analytics",
    scope: ["Insights", "Rulebook", "Trends"],
    challenge: "Turn thousands of small corrections into a better brand guide",
    what: "A view for brand owners: the rules people break most, the ones they dispute, first-pass approval rates and how much reviewer time the checks save, so the guide itself keeps improving",
    highlights: [["Most broken and most disputed rules", "Rules"], ["First-pass approval rate", "North star"], ["Reviewer time saved", "Impact"]],
    img: "/landing/insights.png",
    accent: "#ff7a00",
    area: "Governance",
    date: "07.11.2026",
    stack: ["Next.js", "SQL", "Charts"],
  },
  {
    slug: "rulebook",
    name: "Rulebook",
    tags: "Rule compiler / Versions",
    blurb: "Brand guidelines turned into checks, each one tied to its page",
    type: "Brand kit",
    scope: ["Rule compiler", "Versions", "Citations"],
    challenge: "Make a PDF style guide something software can enforce, without losing its nuance",
    what: "The brand guide as a living set of rules. Each rule keeps its do and don't examples and the page it came from, new guidance can be compiled into draft rules, and every change creates a new version",
    highlights: [["Page citations on every rule", "Evidence"], ["Compile new guidance into drafts", "AI assist"], ["Versioned, so old checks stay explainable", "History"]],
    img: "/landing/rulebook.png",
    accent: "#18c8ff",
    area: "Governance",
    date: "07.11.2026",
    stack: ["Next.js", "Zod", "Gemini"],
  },
  {
    slug: "dashboard",
    name: "Dashboard",
    tags: "Workflow / Activity",
    blurb: "What needs fixing, who is waiting and what just shipped",
    type: "Home",
    scope: ["Workflow", "Personas", "Activity"],
    challenge: "Give four different roles one place to start",
    what: "A home that changes with the person: creators see drafts to fix, reviewers see their queue, compliance sees what's waiting on them, and everyone sees recent activity",
    highlights: [["Role-aware summary", "Personas"], ["Drafts and queue at a glance", "Workflow"], ["Recent activity feed", "Audit"]],
    img: "/landing/dashboard.png",
    accent: "#8b5cf6",
    area: "Approvals",
    date: "07.11.2026",
    stack: ["Next.js", "Server actions"],
  },
  {
    slug: "facts",
    name: "Facts Ledger",
    tags: "Claims / Expiry dates",
    blurb: "Approved claims with sources and expiry dates, so old offers can't slip out",
    type: "Brand kit",
    scope: ["Facts", "Expiry", "Replacements"],
    challenge: "Stop a superseded rate or an expired offer from going out in new copy",
    what: "Every claim a brand is allowed to make, with its source, the date it expires and what replaced it. Copy that leans on an expired fact is flagged with the current wording ready to swap in",
    highlights: [["Source on every approved claim", "Evidence"], ["Expiry dates and replacements", "Freshness"], ["Flags superseded figures in copy", "Checks"]],
    img: "/landing/facts.png",
    accent: "#00e5a0",
    area: "Checking",
    date: "07.11.2026",
    stack: ["Postgres", "Rule engine"],
  },
  {
    slug: "new",
    name: "Check a draft",
    tags: "Text / Images / Channels",
    blurb: "Paste copy, drop in an image, pick a channel and run the rails",
    type: "Entry point",
    scope: ["Text", "OCR", "Contrast"],
    challenge: "Make checking a draft as quick as pasting it",
    what: "Where every check starts. Paste text, add an image (its words are read in the browser and its colours checked for contrast), choose the channel and audience, and Brandrail runs every rule that applies",
    highlights: [["In-browser OCR for images", "Privacy"], ["WCAG contrast and palette checks", "Accessibility"], ["Channel-aware rules", "Context"]],
    img: "/landing/new.png",
    accent: "#ff4081",
    area: "Checking",
    date: "07.11.2026",
    stack: ["tesseract.js", "Canvas"],
  },
  {
    slug: "audit",
    name: "Audit log",
    tags: "Integrity / History",
    blurb: "Every action, chained so the history can't be rewritten",
    type: "Governance",
    scope: ["Audit", "Hashing", "Export"],
    challenge: "Prove what happened, in order, months after the fact",
    what: "A tamper-evident history of the workspace. Each entry stores the hash of the one before it, so changing any past action breaks the chain and shows up straight away",
    highlights: [["SHA-256 hash chain", "Integrity"], ["Every submit, fix and approval", "Coverage"], ["Chain check on demand", "Verification"]],
    img: "/landing/audit.png",
    accent: "#ffd400",
    area: "Governance",
    date: "07.11.2026",
    stack: ["SHA-256", "Postgres"],
  },
];

export const SERVICES = [
  "Brand Rulebook", "Facts Ledger", "24 Rule-based Detectors", "Grounded AI Review", "Evidence-or-silence Verifier",
  "Fix Studio", "Intent Lock", "Role-based Approvals", "Guideline Health", "Privacy Masking", "Audit Log",
];

export const PROOF = [
  { group: "Evaluation", count: "44", rows: [["Precision, rule-based checks", "100%"], ["Recall with the AI review", "100%"], ["Blocker recall", "100%"], ["False flags on clean controls", "0"], ["Citation validity", "100%"]] },
  { group: "Product", count: "29", rows: [["Rules with page citations", "29"], ["Deterministic detectors", "24"], ["Facts with expiry dates", "13"], ["Review roles", "4"]] },
  { group: "Running cost", count: "₹0", rows: [["Hosting (Vercel Hobby)", "₹0"], ["Database (Neon free)", "₹0"], ["AI review (Gemini free tier)", "₹0"]] },
] as const;

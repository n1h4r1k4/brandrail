// Fictional demo brand kit: "Nimbus Pay", an Indian UPI payments app.
// Everything here is invented for the demo. No real company's data is used.
import type { Category, CheckType, ContentSource, Role, RuleParams, Severity } from "../db/schema";

export const BRAND_BOOK = "Nimbus Pay Brand Book v3 (2026)";

export interface SeedRule {
  code: string;
  category: Category;
  title: string;
  statement: string;
  severity: Severity;
  checkType: CheckType;
  params?: RuleParams;
  examplesDo?: string[];
  examplesDont?: string[];
  sourcePage: number;
}

const CAPS_ALLOW = [
  "UPI", "EMI", "KYC", "RBI", "NPCI", "OTP", "PIN", "ATM", "PCI", "DSS", "SEBI", "FAQ", "FD", "SIP",
  "GST", "PAN", "APR", "AI", "NRI", "IFSC", "NEFT", "IMPS", "RTGS", "QR", "ID", "SMS", "APP", "T&C",
];

export const BRAND_PALETTE = [
  { name: "Nimbus Indigo", hex: "#3B3FD8" },
  { name: "Calm Teal", hex: "#14B8A6" },
  { name: "Ink", hex: "#111827" },
  { name: "Cloud", hex: "#F5F7FB" },
  { name: "White", hex: "#FFFFFF" },
  { name: "Sunrise (accent, max 10%)", hex: "#F59E0B" },
];

export const SEED_RULES: SeedRule[] = [
  // ---------------- Tone & voice (p.4-7)
  {
    code: "TON-01", category: "tone", title: "Calm, reassuring voice", severity: "major", checkType: "ai", sourcePage: 4,
    statement: "We sound calm, clear and reassuring. We explain, we never pressure. Money is stressful; our words should lower the temperature, not raise it.",
    examplesDo: ["Pay your bills on time, every time, with AutoPay."], examplesDont: ["Your bills are piling up. Panic over!"],
  },
  {
    code: "TON-02", category: "tone", title: "Plain language", severity: "minor", checkType: "ai", sourcePage: 5,
    statement: "Use everyday words. Avoid financial or corporate jargon (e.g. 'leverage', 'synergy', 'liquidity solutions', 'seamless omnichannel') unless the audience is professional.",
    examplesDo: ["Move money between your accounts in seconds."], examplesDont: ["Leverage our omnichannel liquidity solutions."],
  },
  {
    code: "TON-03", category: "tone", title: "No fear-based urgency", severity: "major", checkType: "rule", sourcePage: 6,
    statement: "Never create urgency through fear of loss or regret ('miss out forever', 'last chance ever', 'act now or lose'). Real deadlines may be stated plainly.",
    params: {
      detectors: ["patterns"],
      patterns: [
        "miss(?:ing)? out forever", "last chance ever", "act now or (?:lose|miss)[^.!?]*", "now or never",
        "before it'?s too late", "don'?t miss out", "you'?ll regret",
      ],
    },
    examplesDo: ["Offer ends 30 Nov."], examplesDont: ["Act now or miss out forever!"],
  },
  {
    code: "TON-04", category: "tone", title: "Restraint in punctuation and capitals", severity: "minor", checkType: "rule", sourcePage: 7,
    statement: "Use at most one exclamation mark per piece. Do not write words in ALL CAPS, except standard acronyms such as UPI or KYC.",
    params: { detectors: ["exclamations", "caps"], maxExclamations: 1, allowCaps: CAPS_ALLOW },
  },
  {
    code: "TON-05", category: "tone", title: "Emoji in moderation", severity: "minor", checkType: "rule", sourcePage: 7,
    statement: "Social posts may use up to two emoji. Emails, ads and documents use none in body copy.",
    params: { detectors: ["emoji"], maxEmoji: 2 },
  },
  // ---------------- Terminology (p.9-10)
  {
    code: "TRM-01", category: "terminology", title: "Brand name: Nimbus Pay", severity: "minor", checkType: "rule", sourcePage: 9,
    statement: "Always write the brand as 'Nimbus Pay': two words, capital N and capital P. Never 'NimbusPay', 'Nimbus pay' or 'nimbus-pay'.",
    params: { detectors: ["terms"] },
  },
  {
    code: "TRM-02", category: "terminology", title: "Product and feature names", severity: "minor", checkType: "rule", sourcePage: 9,
    statement: "Product names are 'Nimbus Save', 'Nimbus Card' and 'AutoPay', written exactly as shown.",
    params: { detectors: ["terms"] },
  },
  {
    code: "TRM-03", category: "terminology", title: "Words we don't use", severity: "major", checkType: "rule", sourcePage: 10,
    statement: "Avoid words that cheapen the brand or over-promise: 'cheap', 'free money', 'no questions asked'. Use the listed alternatives.",
    params: { detectors: ["terms"] },
  },
  {
    code: "TRM-04", category: "terminology", title: "No competitor names", severity: "major", checkType: "rule", sourcePage: 10,
    statement: "Never name or compare against competitors in marketing content. Talk about what Nimbus Pay does, not what others don't.",
    params: { detectors: ["terms"] },
  },
  // ---------------- Messaging (p.11-12)
  {
    code: "MSG-01", category: "messaging", title: "Core message", severity: "major", checkType: "ai", sourcePage: 11,
    statement: "Nimbus Pay helps people pay, save and stay in control of their money. Do not position Nimbus Pay as a trading, crypto, gambling or get-rich-quick product.",
  },
  {
    code: "MSG-02", category: "messaging", title: "Tagline is 'Money, made calm.'", severity: "minor", checkType: "rule", sourcePage: 11,
    statement: "When the tagline is used it must read exactly 'Money, made calm.' (with the comma and full stop). Never paraphrase it.",
    params: { detectors: ["tagline"], tagline: "Money, made calm." },
  },
  {
    code: "MSG-03", category: "messaging", title: "Explain terms for beginners", severity: "minor", checkType: "ai", sourcePage: 12,
    statement: "For first-time or beginner audiences, explain any financial term (e.g. SIP, KYC, p.a.) in plain words the first time it appears.",
  },
  // ---------------- Claims (p.14-16), owned by Compliance
  {
    code: "CLM-01", category: "claims", title: "Figures must match the Facts Ledger", severity: "blocker", checkType: "rule", sourcePage: 14,
    statement: "Every number, statistic, rating, price or performance figure must match an approved, in-date entry in the Facts Ledger.",
    params: { detectors: ["unverified_numbers"] },
  },
  {
    code: "CLM-02", category: "claims", title: "No absolute security promises", severity: "major", checkType: "rule", sourcePage: 15,
    statement: "Never promise absolute security or zero risk ('100% secure', 'completely safe', 'unhackable', 'risk-free'). Describe the actual protection instead (see F-008, F-012).",
    params: {
      detectors: ["patterns"],
      patterns: [
        "100\\s?% (?:secure|safe|protected|fraud[- ]proof)", "(?:completely|totally|absolutely) (?:safe|secure)",
        "zero risk", "risk[- ]free(?! returns?)", "unhackable", "can never be hacked", "fraud[- ]proof",
      ],
      replacement: "protected with bank-grade 256-bit encryption",
    },
  },
  {
    code: "CLM-03", category: "claims", title: "No guaranteed outcomes", severity: "blocker", checkType: "rule", sourcePage: 15,
    statement: "Never guarantee returns, approvals or outcomes ('guaranteed returns', 'assured approval', 'double your money', credit 'for everyone').",
    params: {
      detectors: ["patterns"],
      patterns: [
        "guaranteed (?:returns?|approval|profits?|income|credit)", "assured (?:returns?|approval)", "100\\s?% approval",
        "double your money", "risk[- ]free returns?",
      ],
    },
  },
  {
    code: "CLM-04", category: "claims", title: "Superlatives need substantiation", severity: "blocker", checkType: "rule", sourcePage: 14,
    statement: "Superlative or comparative claims ('fastest', 'best', 'No. 1', 'India's largest', 'cheapest') require independent substantiation recorded in the Facts Ledger.",
    params: {
      detectors: ["patterns"],
      requiresFact: true,
      patterns: [
        "(?:India['’]s\\s+|the world['’]s\\s+|the\\s+)?(?:fastest|quickest|best|cheapest|largest|biggest|safest|smartest|most (?:trusted|secure|popular|loved|reliable))(?:\\s+[A-Za-z]+){0,2}",
        "(?:#\\s?1|No\\.?\\s?1|number one)\\b(?:\\s+[A-Za-z]+){0,3}",
      ],
    },
  },
  {
    code: "CLM-05", category: "claims", title: "Environmental claims need evidence", severity: "blocker", checkType: "rule", sourcePage: 16,
    statement: "Do not make generic environmental claims ('eco-friendly', 'green', 'carbon neutral', 'sustainable') without specific evidence in the Facts Ledger (CCPA Greenwashing Guidelines 2024; EU Directive 2024/825).",
    params: {
      detectors: ["patterns"],
      requiresFact: true,
      patterns: [
        "eco[- ]friendly", "carbon[- ]neutral", "net[- ]zero", "environment(?:ally)?[- ]friendly", "planet[- ]friendly",
        "green (?:payments?|app|banking|savings|choice)", "sustainable",
      ],
    },
  },
  // ---------------- Legal (p.17-18), owned by Compliance
  {
    code: "LEG-01", category: "legal", title: "No expired or superseded facts", severity: "blocker", checkType: "rule", sourcePage: 17,
    statement: "Facts past their valid-until date, or replaced by a newer fact, must not be published.",
    params: { detectors: ["expired_facts"] },
  },
  {
    code: "LEG-02", category: "legal", title: "Offers carry 'T&C apply'", severity: "major", checkType: "rule", sourcePage: 17,
    statement: "Any cashback, discount, reward or offer must include the words 'T&C apply.'",
    params: {
      detectors: ["disclaimer"], disclaimer: "T&C apply.",
      triggers: ["cashback", "discount", "% off", "coupon", "reward", "promo code", "festive offer", "special offer", "limited-time offer", "offer ends"],
      patterns: ["T&Cs? apply", "terms (?:and|&) conditions apply"],
    },
  },
  {
    code: "LEG-03", category: "legal", title: "Investment disclaimer", severity: "blocker", checkType: "rule", sourcePage: 18,
    statement: "Any mention of investments, mutual funds, SIPs or returns must carry: 'Investments are subject to market risks. Read all scheme-related documents carefully.'",
    params: {
      detectors: ["disclaimer"],
      disclaimer: "Investments are subject to market risks. Read all scheme-related documents carefully.",
      triggers: ["mutual fund", "invest", "SIP", "returns"],
      patterns: ["subject to market risks?"],
    },
  },
  {
    code: "LEG-04", category: "legal", title: "No regulator endorsement", severity: "blocker", checkType: "rule", sourcePage: 18,
    statement: "Never imply that the RBI, NPCI or SEBI approves, endorses, backs or guarantees Nimbus Pay or its products.",
    params: {
      detectors: ["patterns"],
      patterns: [
        "(?:RBI|NPCI|SEBI)[- ](?:approved|certified|endorsed|backed|guaranteed)",
        "(?:approved|endorsed|backed|guaranteed|certified) by (?:the )?(?:RBI|NPCI|SEBI|Reserve Bank)",
      ],
    },
  },
  // ---------------- Confidentiality (p.19)
  {
    code: "CNF-01", category: "confidentiality", title: "No codenames or unreleased products", severity: "blocker", checkType: "rule", sourcePage: 19,
    statement: "Internal codenames and unreleased products on the confidential watch-list must never appear in external content before their embargo lifts.",
    params: { detectors: ["terms"] },
  },
  {
    code: "CNF-02", category: "confidentiality", title: "No personal data", severity: "blocker", checkType: "rule", sourcePage: 19,
    statement: "Marketing content must not contain personal data: personal phone numbers, personal email addresses, account, Aadhaar or PAN numbers. Use support@nimbuspay.example for contact.",
    params: { detectors: ["pii"] },
  },
  // ---------------- Accessibility (p.21-22)
  {
    code: "ACC-01", category: "accessibility", title: "Text contrast in images", severity: "blocker", checkType: "visual", sourcePage: 21,
    statement: "Text in images must have a contrast ratio of at least 4.5:1 against its background (3:1 for large text), per WCAG 2.2 AA.",
    params: { detectors: ["contrast"], minContrast: 4.5 },
  },
  {
    code: "ACC-02", category: "accessibility", title: "Alt text for every image", severity: "minor", checkType: "rule", sourcePage: 21,
    statement: "Every image needs alt text that describes what it shows and repeats any text in it.",
    params: { detectors: ["alt_text"] },
  },
  {
    code: "ACC-03", category: "accessibility", title: "Readable for everyone", severity: "minor", checkType: "rule", sourcePage: 22,
    statement: "Consumer copy should score at least 50 on the Flesch reading-ease scale. Prefer short sentences and common words.",
    params: { detectors: ["readability"], minReadingEase: 50 },
  },
  {
    code: "ACC-04", category: "accessibility", title: "Descriptive link text", severity: "minor", checkType: "rule", sourcePage: 22,
    statement: "Links and buttons must say where they lead. Never use 'click here' or 'tap here'.",
    params: { detectors: ["patterns"], patterns: ["(?:click|tap) here"] },
  },
  // ---------------- Visual identity (p.23-25)
  {
    code: "VIS-01", category: "visual", title: "Brand palette only", severity: "major", checkType: "visual", sourcePage: 23,
    statement: "Use only the brand palette: Nimbus Indigo #3B3FD8, Calm Teal #14B8A6, Ink #111827, Cloud #F5F7FB and White, with Sunrise #F59E0B as an accent (max 10% of the area).",
    params: { detectors: ["palette"], palette: BRAND_PALETTE },
  },
  {
    code: "VIS-02", category: "visual", title: "Logo integrity", severity: "major", checkType: "visual", sourcePage: 24,
    statement: "Never stretch, recolour, rotate or crowd the logo. Keep clear space equal to the height of the 'N' on all sides.",
  },
];

export const overrideRoleFor = (category: Category): Role =>
  category === "claims" || category === "legal" || category === "confidentiality" ? "compliance" : "reviewer";

export interface SeedFact {
  code: string;
  statement: string;
  keywords: string[];
  supports?: string[];
  evidence: string;
  owner: string;
  validUntil: string;
  supersededBy?: string;
}

// Keyword lists of a superseded fact and its replacement are aligned by index,
// so "5% cashback" (F-037) can be suggested as "3% cashback" (F-041).
export const SEED_FACTS: SeedFact[] = [
  { code: "F-001", statement: "Nimbus Pay has 12 million registered users (as of 30 Sep 2026).", keywords: ["12 million", "1.2 crore"], evidence: "User database report, Q3 FY27", owner: "Growth Analytics", validUntil: "2026-12-31" },
  { code: "F-008", statement: "Nimbus Pay is PCI DSS v4.0 certified.", keywords: ["PCI DSS"], evidence: "QSA attestation of compliance, Mar 2026", owner: "Security", validUntil: "2027-03-31" },
  { code: "F-012", statement: "Every payment is protected with bank-grade 256-bit encryption.", keywords: ["256-bit", "bank-grade encryption"], evidence: "Security architecture review, 2026", owner: "Security", validUntil: "2027-06-30" },
  { code: "F-021", statement: "The median UPI payment on Nimbus Pay completes in 2.1 seconds (internal benchmark, Aug 2026).", keywords: ["2.1 seconds", "2 seconds", "2.1 s"], evidence: "Payments latency benchmark, Aug 2026", owner: "Payments Engineering", validUntil: "2027-03-31" },
  { code: "F-030", statement: "Nimbus Save offers up to 7.25% p.a. interest through partner bank Meridian Small Finance Bank.", keywords: ["7.25% p.a.", "7.25%"], evidence: "Partner bank rate card, 1 Oct 2026", owner: "Treasury", validUntil: "2026-12-31" },
  { code: "F-031", statement: "Nimbus Save offers up to 7.5% p.a. interest through partner bank Meridian Small Finance Bank.", keywords: ["7.5% p.a.", "7.5%"], evidence: "Partner bank rate card, 1 Jul 2026", owner: "Treasury", validUntil: "2026-09-30", supersededBy: "F-030" },
  { code: "F-037", statement: "Festive offer: 5% cashback on UPI payments, up to ₹100, till 31 Oct 2026.", keywords: ["5% cashback till 31 Oct", "5% cashback"], evidence: "Campaign brief DIW-26, v1", owner: "Growth Marketing", validUntil: "2026-10-31", supersededBy: "F-041" },
  { code: "F-041", statement: "Festive offer: 3% cashback on UPI payments, up to ₹150, till 30 Nov 2026.", keywords: ["3% cashback till 30 Nov", "3% cashback"], evidence: "Campaign brief DIW-26, v2", owner: "Growth Marketing", validUntil: "2026-11-30" },
  { code: "F-045", statement: "Nimbus Pay is rated 4.6 on Google Play (2.3 lakh reviews, Oct 2026).", keywords: ["4.6", "2.3 lakh"], evidence: "Play Console export, 1 Nov 2026", owner: "Growth Analytics", validUntil: "2026-12-31" },
  { code: "F-050", statement: "UPI payments on Nimbus Pay have zero fees for consumers.", keywords: ["zero fees", "no fees"], evidence: "Pricing policy v5", owner: "Product", validUntil: "2027-12-31" },
  { code: "F-052", statement: "The Nimbus Pay app is available in 9 Indian languages.", keywords: ["9 languages", "nine languages", "9 Indian languages"], evidence: "App release notes 8.2", owner: "Product", validUntil: "2027-06-30" },
  { code: "F-060", statement: "Nimbus Pay ranked #1 for customer satisfaction among UPI apps in the independent FinServe India Survey 2026 (n=5,000).", keywords: ["customer satisfaction"], supports: ["#1", "# 1", "No. 1", "No.1", "No 1", "number one"], evidence: "FinServe India Survey 2026, p.12", owner: "Brand", validUntil: "2027-06-30" },
  { code: "F-070", statement: "Nimbus Card gives 1% cashback on all spends and has no annual fee in the first year.", keywords: ["1% cashback", "no annual fee"], evidence: "Nimbus Card product terms v2", owner: "Cards", validUntil: "2027-03-31" },
];

export interface SeedTerm {
  kind: "preferred" | "banned" | "competitor" | "watch";
  term: string;
  replacement?: string;
  ruleCode: string;
  note?: string;
}

export const SEED_TERMS: SeedTerm[] = [
  { kind: "preferred", term: "Nimbus Pay", ruleCode: "TRM-01" },
  { kind: "preferred", term: "Nimbus Save", ruleCode: "TRM-02" },
  { kind: "preferred", term: "Nimbus Card", ruleCode: "TRM-02" },
  { kind: "preferred", term: "AutoPay", ruleCode: "TRM-02" },
  { kind: "banned", term: "cheap", replacement: "affordable", ruleCode: "TRM-03" },
  { kind: "banned", term: "free money", replacement: "cashback", ruleCode: "TRM-03" },
  { kind: "banned", term: "no questions asked", replacement: "", ruleCode: "TRM-03" },
  { kind: "competitor", term: "ZapPay", ruleCode: "TRM-04", note: "Fictional competitor" },
  { kind: "competitor", term: "QuickRupee", ruleCode: "TRM-04", note: "Fictional competitor" },
  { kind: "competitor", term: "PayKaro", ruleCode: "TRM-04", note: "Fictional competitor" },
  { kind: "watch", term: "Project Falcon", ruleCode: "CNF-01", note: "Internal codename for Nimbus Credit Line" },
  { kind: "watch", term: "Nimbus Credit Line", ruleCode: "CNF-01", note: "Unreleased. Embargoed until 15 Jan 2027" },
  { kind: "watch", term: "Project Orion", ruleCode: "CNF-01", note: "Internal codename for the 2027 app redesign" },
];

export const SEED_USERS: { key: string; name: string; title: string; role: Role }[] = [
  { key: "creator", name: "Aarav Mehta", title: "Copywriter, Kite & Co. (agency)", role: "creator" },
  { key: "reviewer", name: "Meera Iyer", title: "Brand manager", role: "reviewer" },
  { key: "compliance", name: "Kabir Rao", title: "Compliance lead", role: "compliance" },
  { key: "admin", name: "Ishita Sen", title: "Head of brand", role: "admin" },
];

export interface Sample {
  key: string;
  title: string;
  channel: string;
  audience: string;
  source: ContentSource;
  body: string;
  image?: string;
  altText?: string;
  blurb: string;
}

export const SAMPLES: Sample[] = [
  {
    key: "diwali",
    title: "Diwali cashback post",
    channel: "Instagram",
    audience: "Young salaried users",
    source: "ai",
    image: "/samples/diwali-creative.png",
    body: "This Diwali, switch to Nimbus pay, India's fastest UPI app with 100% secure payments. Get 5% cashback till 31 Oct! Act now or miss out forever!",
    blurb: "Agency post drafted with an AI tool: expired offer, unsupported superlative, low-contrast CTA.",
  },
  {
    key: "save-email",
    title: "Nimbus Save launch email",
    channel: "Email",
    audience: "Existing users, beginners to saving",
    source: "human",
    body:
      "Subject: Grow your savings with guaranteed returns\n\nHi there,\n\nNimbus Save now offers 7.5% p.a. on your savings, the best rate in India. Our eco-friendly paperless account is backed by RBI, so your money is completely safe. Start a SIP today and double your money.\n\nClick here to start saving.\n\nTeam NimbusPay",
    blurb: "Superseded interest rate, guaranteed returns, green claim, regulator endorsement, missing disclaimer.",
  },
  {
    key: "falcon-blog",
    title: "Blog teaser: what's next",
    channel: "Blog",
    audience: "Tech-savvy early adopters",
    source: "ai",
    body:
      "Big news is coming! Our team has been quietly building Project Falcon, a brand-new Nimbus Credit Line that launches on 15 January. Unlike ZapPay, we will give instant credit to everyone, no questions asked. Write to priya.k@gmail.com or call 9876543210 for early access.",
    blurb: "Leaks an embargoed product and a codename, names a competitor, contains personal data.",
  },
  {
    key: "autopay-clean",
    title: "AutoPay explainer (clean control)",
    channel: "Website",
    audience: "Busy professionals",
    source: "human",
    body:
      "Set up AutoPay on Nimbus Pay and never miss a bill date. You choose the amount and the date, and you can pause or cancel any time. Most UPI payments complete in about 2 seconds, and every payment is protected with bank-grade 256-bit encryption. Money, made calm.",
    blurb: "A compliant piece. A good checker should stay (almost) silent here.",
  },
];

// Historical pieces seeded so Insights and Guideline Health have data on day one.
// They are clearly labelled as seeded demo history in the UI.
export interface HistoryItem {
  title: string;
  channel: string;
  source: ContentSource;
  body: string;
  daysAgo: number;
  outcome: "approved-first" | "approved-second" | "in_review" | "changes_requested";
  disputes?: { ruleCode: string; reason: string; upheld: boolean }[];
}

export const HISTORY: HistoryItem[] = [
  { title: "Holi festive banner copy", channel: "Instagram", source: "agency", daysAgo: 40, outcome: "approved-second",
    body: "Celebrate Holi with Nimbus Pay! Don't miss out on colourful savings this week.",
    disputes: [{ ruleCode: "TON-03", reason: "Festive campaign: celebratory urgency, not fear.", upheld: true }] },
  { title: "Independence Day push notification", channel: "Push", source: "ai", daysAgo: 33, outcome: "approved-first",
    body: "Freedom to pay your way. Nimbus Pay works in 9 Indian languages. Money, made calm." },
  { title: "Navratri cashback teaser", channel: "Instagram", source: "agency", daysAgo: 29, outcome: "approved-second",
    body: "Nine nights, nine reasons to smile. Get 3% cashback on UPI payments. Don't miss out!",
    disputes: [{ ruleCode: "TON-03", reason: "Festive tone; the offer has a real end date.", upheld: true }] },
  { title: "Nimbus Card launch tweet", channel: "X / Twitter", source: "ai", daysAgo: 25, outcome: "approved-second",
    body: "The best credit card for young India is here. Nimbus Card: 1% cashback on all spends. T&C apply.",
    disputes: [{ ruleCode: "CLM-04", reason: "It's puffery, everyone says best.", upheld: false }] },
  { title: "Security FAQ snippet", channel: "Website", source: "human", daysAgo: 22, outcome: "approved-first",
    body: "Every payment is protected with bank-grade 256-bit encryption, and Nimbus Pay is PCI DSS v4.0 certified." },
  { title: "Dussehra offer email", channel: "Email", source: "agency", daysAgo: 18, outcome: "approved-second",
    body: "Win over bills this Dussehra! Get 3% cashback on UPI payments. Hurry before it's too late!",
    disputes: [{ ruleCode: "TON-03", reason: "Seasonal campaign language agreed with marketing.", upheld: true }] },
  { title: "Referral programme post", channel: "Instagram", source: "ai", daysAgo: 14, outcome: "approved-second",
    body: "Refer a friend and earn free money with NimbusPay. It's the cheap way to save!" },
  { title: "Diwali countdown story", channel: "Instagram", source: "agency", daysAgo: 9, outcome: "approved-second",
    body: "Diwali is almost here! Last chance ever to grab festive cashback on Nimbus Pay. T&C apply.",
    disputes: [{ ruleCode: "TON-03", reason: "Festive countdown, brand team asked for urgency.", upheld: true }] },
  { title: "App rating ad", channel: "Display ad", source: "human", daysAgo: 6, outcome: "approved-first",
    body: "Rated 4.6 on Google Play by 2.3 lakh users. Money, made calm." },
  { title: "Bhai Dooj gifting post", channel: "Instagram", source: "agency", daysAgo: 3, outcome: "in_review",
    body: "Gift your sibling instantly with Nimbus Pay. Don't miss out on 3% cashback! T&C apply.",
    disputes: [{ ruleCode: "TON-03", reason: "Festive gifting post; urgency is celebratory.", upheld: false }] },
  { title: "Savings rate reminder", channel: "SMS", source: "ai", daysAgo: 2, outcome: "changes_requested",
    body: "Earn 7.5% p.a. on Nimbus Save. Guaranteed returns, completely safe." },
];

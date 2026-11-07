// Rule-based checks: exact, reproducible and free to run.
// Same input + same rulebook version => same findings, every time.
import type { Field } from "../db/schema";
import { chroma, deltaE2000, hexToRgb } from "../color";
import {
  escapeRegex, findAll, normaliseClaim, overlaps, readingEase, sentenceAt, sentences, type Span,
} from "./text";
import { isActive, type DraftFinding, type EngineContent, type EngineFact, type EngineRule, type Kit } from "./types";

const SOCIAL = /instagram|facebook|twitter|x \/|linkedin|push|whatsapp|story|reel|social/i;

interface Ctx {
  kit: Kit;
  content: EngineContent;
  out: DraftFinding[];
}

function add(ctx: Ctx, rule: EngineRule, field: Field, span: Span | null, message: string, suggestion: string | null, factCodes: string[] = []) {
  ctx.out.push({
    ruleCode: rule.code,
    field,
    quote: span ? span.text : "",
    start: span ? span.start : -1,
    end: span ? span.end : -1,
    message,
    suggestion,
    factCodes,
    method: "rule",
    confidence: 1,
  });
}

function textFields(c: EngineContent): { field: Field; text: string }[] {
  const f: { field: Field; text: string }[] = [{ field: "body", text: c.body }];
  if (c.imageText.trim()) f.push({ field: "image_text", text: c.imageText });
  return f;
}

/** Boundary-safe regex for a literal keyword (keywords may start or end with % or ₹). */
function literal(term: string) {
  return new RegExp(`(?<![\\w])${escapeRegex(term)}(?![\\w])`, "gi");
}

// Which fact to point at when a superlative is unsupported: the object of the claim first, then the claim word.
const SUPERLATIVE_HINTS: [RegExp, string][] = [
  [/rate|interest|returns?|savings/i, "p.a."],
  [/card/i, "Nimbus Card"],
  [/fastest|quickest|speed/i, "seconds"],
  [/safest|secure|safe/i, "encryption"],
  [/cheapest|fees?/i, "fees"],
  [/largest|biggest|popular/i, "users"],
  [/best|#\s?1|no\.?\s?1|number one|loved|trusted/i, "satisfaction"],
];

function closestFact(facts: EngineFact[], today: string, claim: string): EngineFact | null {
  const hint = SUPERLATIVE_HINTS.find(([re]) => re.test(claim))?.[1];
  if (!hint) return null;
  return facts.find((f) => isActive(f, today) && f.statement.toLowerCase().includes(hint.toLowerCase())) ?? null;
}

const TRAILING_STOPWORDS = /(?:\s+(?:in|on|at|for|with|to|of|and|or|the|a|an|is|are|was|that|this|from|by))+$/i;

function factSupports(facts: EngineFact[], today: string, matched: string, sentence: string) {
  const m = matched.toLowerCase();
  const s = sentence.toLowerCase();
  return facts.find(
    (f) =>
      isActive(f, today) &&
      f.supports.some((w) => m.includes(w.toLowerCase())) &&
      (f.keywords.length === 0 || f.keywords.some((k) => s.includes(k.toLowerCase()))),
  );
}

function detectPatterns(ctx: Ctx, rule: EngineRule) {
  const { kit } = ctx;
  for (const { field, text } of textFields(ctx.content)) {
    for (const p of rule.params.patterns ?? []) {
      for (const raw of findAll(new RegExp(p, "gi"), text)) {
        const trimmed = raw.text.replace(TRAILING_STOPWORDS, "");
        const m = { ...raw, text: trimmed, end: raw.start + trimmed.length };
        const sentence = sentenceAt(text, m.start).text;
        if (rule.params.requiresFact) {
          const support = factSupports(kit.facts, kit.today, m.text, sentence);
          if (support) continue;
          const near = closestFact(kit.facts, kit.today, m.text);
          add(
            ctx, rule, field, m,
            `No approved fact substantiates "${m.text.trim()}".` +
              (near ? ` Closest approved fact: ${near.code}: "${near.statement}"` : " Remove it or add independent evidence to the Facts Ledger."),
            null,
            near ? [near.code] : [],
          );
        } else {
          const repl = rule.params.replacement;
          add(ctx, rule, field, m, `"${m.text.trim()}": ${rule.title.toLowerCase()}.`, field === "body" && repl !== undefined ? repl : null);
        }
      }
    }
  }
}

/** True when the span sits inside an email address or URL (e.g. support@nimbuspay.example). */
function insideAddress(text: string, span: Span) {
  let a = span.start, b = span.end;
  while (a > 0 && !/\s/.test(text[a - 1])) a--;
  while (b < text.length && !/\s/.test(text[b])) b++;
  return /@|:\/\/|www\./i.test(text.slice(a, b));
}

function termRegex(term: string) {
  // "Nimbus Pay" / "AutoPay" -> tolerate case, missing or extra spaces and hyphens.
  const parts = term.split(/\s+|(?<=[a-z])(?=[A-Z])/).map(escapeRegex);
  return new RegExp(`(?<![\\w])${parts.join("[\\s-]?")}(?![\\w])`, "gi");
}

function detectTerms(ctx: Ctx, rule: EngineRule) {
  const terms = ctx.kit.terms.filter((t) => t.ruleCode === rule.code);
  for (const { field, text } of textFields(ctx.content)) {
    for (const t of terms) {
      if (t.kind === "preferred") {
        for (const m of findAll(termRegex(t.term), text)) {
          if (m.text === t.term || insideAddress(text, m)) continue;
          add(ctx, rule, field, m, `Write "${t.term}" exactly as shown, not "${m.text}".`, field === "body" ? t.term : null);
        }
      } else {
        for (const m of findAll(literal(t.term), text)) {
          if (t.kind === "banned") {
            const alt = t.replacement ? ` Use "${t.replacement}" instead.` : " Remove it.";
            add(ctx, rule, field, m, `"${m.text}" is on the list of words we don't use.${alt}`, field === "body" ? (t.replacement ?? "") : null);
          } else if (t.kind === "competitor") {
            add(ctx, rule, field, m, `"${m.text}" is a competitor. Describe what Nimbus Pay does instead of comparing.`, null);
          } else {
            add(ctx, rule, field, m, `"${m.text}" is on the confidential watch-list${t.note ? ` (${t.note})` : ""}. It must not appear in external content.`, null);
          }
        }
      }
    }
  }
}

const NUMBER_CLAIM =
  /(?:₹|\brs\.?|\binr)\s?\d[\d,]*(?:\.\d+)?(?:\s?(?:lakh|crore|cr|k)\b)?|(?<![\w.])\d[\d,]*(?:\.\d+)?\s?(?:%|percent\b|x\b|times\b|lakh\b|crore\b|cr\b|million\b|mn\b|billion\b|bn\b|seconds?\b|secs?\b|s\b|minutes?\b|mins?\b|languages\b|users\b|customers\b|merchants\b|reviews\b|stars?\b)|(?<![\w.])\d(?:\.\d)?\s?\/\s?5\b|(?<=\brated )\d\.\d\b/gi;

function detectNumbers(ctx: Ctx, rule: EngineRule) {
  const { kit } = ctx;
  const active = kit.facts.filter((f) => isActive(f, kit.today));
  const inactive = kit.facts.filter((f) => !isActive(f, kit.today));
  const norm = (f: EngineFact) => normaliseClaim([f.statement, ...f.keywords].join(" "));
  for (const { field, text } of textFields(ctx.content)) {
    for (const m of findAll(NUMBER_CLAIM, text)) {
      const n = normaliseClaim(m.text);
      if (active.some((f) => norm(f).includes(n))) continue;
      const old = inactive.find((f) => norm(f).includes(n));
      if (old) continue; // the expired-facts rule reports these with the replacement
      add(ctx, rule, field, m, `"${m.text}" does not match any approved, in-date fact in the Facts Ledger. Use an approved figure or remove it.`, null);
    }
  }
}

function detectExpired(ctx: Ctx, rule: EngineRule) {
  const { kit } = ctx;
  const byCode = new Map(kit.facts.map((f) => [f.code, f]));
  for (const { field, text } of textFields(ctx.content)) {
    for (const f of kit.facts) {
      if (isActive(f, kit.today)) continue;
      const repl = f.supersededBy ? byCode.get(f.supersededBy) : undefined;
      const taken: Span[] = [];
      f.keywords.forEach((k, i) => {
        for (const m of findAll(literal(k), text)) {
          if (taken.some((t) => overlaps(t, m))) continue;
          taken.push(m);
          const why = f.supersededBy ? `was superseded by ${f.supersededBy}` : `expired on ${f.validUntil}`;
          add(
            ctx, rule, field, m,
            `"${m.text}" comes from fact ${f.code}, which ${why}.` + (repl ? ` Current approved fact: ${repl.code}: "${repl.statement}"` : ""),
            field === "body" && repl?.keywords[i] ? repl.keywords[i] : null,
            repl ? [f.code, repl.code] : [f.code],
          );
        }
      });
    }
  }
}

function detectPii(ctx: Ctx, rule: EngineRule) {
  const checks: [RegExp, string, string | null][] = [
    [/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, "Personal email address", "support@nimbuspay.example"],
    [/(?<!\d)(?:\+91[\s-]?)?[6-9]\d{9}(?!\d)/g, "Personal phone number", null],
    [/(?<!\d)\d{4}\s\d{4}\s\d{4}(?!\d)/g, "Possible Aadhaar number", null],
    [/\b[A-Z]{5}\d{4}[A-Z]\b/g, "Possible PAN number", null],
  ];
  for (const { field, text } of textFields(ctx.content)) {
    for (const [re, label, repl] of checks) {
      for (const m of findAll(re, text)) {
        if (/@nimbuspay\.example$/i.test(m.text)) continue;
        add(ctx, rule, field, m, `${label} in marketing content. Use the official support contact instead.`, field === "body" ? repl : null);
      }
    }
  }
}

function detectDisclaimer(ctx: Ctx, rule: EngineRule) {
  const p = rule.params;
  const all = `${ctx.content.body}\n${ctx.content.imageText}`;
  const present = (p.patterns ?? []).some((re) => new RegExp(re, "i").test(all));
  if (present || !p.disclaimer) return;
  for (const { field, text } of textFields(ctx.content)) {
    const hits: Span[] = [];
    for (const t of p.triggers ?? []) {
      const re = /^[A-Z]+$/.test(t) ? new RegExp(`\\b${escapeRegex(t)}s?\\b`, "g") : new RegExp(`(?<![\\w])${escapeRegex(t)}`, "gi");
      hits.push(...findAll(re, text));
    }
    if (!hits.length) continue;
    hits.sort((a, b) => a.start - b.start);
    const first = hits.find((h) => !/^subject:/i.test(sentenceAt(text, h.start).text)) ?? hits[0];
    const s = sentenceAt(text, first.start);
    const sentence = s.text.trimEnd();
    const fixed = /[.!?]$/.test(sentence) ? `${sentence} ${p.disclaimer}` : `${sentence}. ${p.disclaimer}`;
    add(ctx, rule, field, { ...s, text: s.text.trimEnd(), end: s.start + sentence.length },
      `Mentions "${first.text}" but the required disclaimer is missing: "${p.disclaimer}"`,
      field === "body" ? fixed : null);
    return;
  }
}

function detectTagline(ctx: Ctx, rule: EngineRule) {
  const tag = rule.params.tagline;
  if (!tag) return;
  const core = tag.replace(/[.,]/g, "").split(/\s+/).map(escapeRegex).join(",?\\s+");
  for (const { field, text } of textFields(ctx.content)) {
    for (const m of findAll(new RegExp(`${core}\\.?`, "gi"), text)) {
      if (m.text === tag) continue;
      add(ctx, rule, field, m, `The tagline must read exactly "${tag}".`, field === "body" ? tag : null);
    }
  }
}

function detectBodyStyle(ctx: Ctx, rule: EngineRule, detector: string) {
  const text = ctx.content.body;
  const p = rule.params;
  if (detector === "exclamations") {
    const marks = findAll(/!+/g, text);
    const max = p.maxExclamations ?? 1;
    for (const m of marks.slice(max)) {
      const s = sentenceAt(text, m.start - 1);
      add(ctx, rule, "body", s, `More than ${max} exclamation mark${max === 1 ? "" : "s"} in one piece. Let the words carry the energy.`, s.text.replace(/!+(\s*)$/, ".$1").trimEnd());
    }
  } else if (detector === "caps") {
    const allow = new Set((p.allowCaps ?? []).map((w) => w.toUpperCase()));
    const seen = new Set<string>();
    for (const m of findAll(/(?<![\w&])[A-Z][A-Z&]{2,}(?![\w&])/g, text)) {
      if (allow.has(m.text) || seen.has(m.text)) continue;
      seen.add(m.text);
      add(ctx, rule, "body", m, `"${m.text}" is in ALL CAPS. Only standard acronyms may be capitalised.`, m.text[0] + m.text.slice(1).toLowerCase());
    }
  } else if (detector === "emoji") {
    const max = SOCIAL.test(ctx.content.channel) ? (p.maxEmoji ?? 2) : 0;
    const emoji = findAll(/\p{Extended_Pictographic}(?:️)?/gu, text);
    for (const m of emoji.slice(max)) {
      add(ctx, rule, "body", m, max === 0 ? `No emoji in ${ctx.content.channel} body copy.` : `More than ${max} emoji in one post.`, "");
    }
  } else if (detector === "readability") {
    const { score, words } = readingEase(text);
    const min = p.minReadingEase ?? 50;
    if (words >= 40 && score < min) {
      const longest = sentences(text).sort((a, b) => b.text.length - a.text.length)[0];
      add(ctx, rule, "body", longest ?? null, `Reading ease is ${score} (target ${min}+). Shorten this sentence or use simpler words.`, null);
    }
  }
}

function detectImage(ctx: Ctx, rule: EngineRule, detector: string) {
  const c = ctx.content;
  if (!c.hasImage) return;
  if (detector === "alt_text") {
    if (c.altText.trim()) return;
    const t = c.imageText.replace(/\s+/g, " ").trim();
    add(ctx, rule, "image", { start: -1, end: -1, text: "Image has no alt text" },
      "Add alt text that describes the image and repeats any text in it.",
      t ? `Brand graphic with the text: "${t}"` : null);
    return;
  }
  const a = c.imageAnalysis;
  if (!a) return;
  if (detector === "contrast") {
    for (const line of a.lines) {
      if (line.text.replace(/[^A-Za-z0-9]/g, "").length < 2) continue;
      const need = line.large ? 3 : (rule.params.minContrast ?? 4.5);
      if (line.contrast >= need) continue;
      add(ctx, rule, "image", { start: -1, end: -1, text: line.text },
        `Contrast is ${line.contrast.toFixed(1)}:1 (text ${line.fg} on ${line.bg}). It needs at least ${need}:1${line.large ? " for large text" : ""}.`, null);
    }
  } else if (detector === "palette") {
    const brand = (rule.params.palette ?? []).map((p) => ({ ...p, rgb: hexToRgb(p.hex) }));
    if (!brand.length) return;
    const off = a.palette
      .filter((p) => p.share >= 0.05 && chroma(hexToRgb(p.hex)) > 12)
      .map((p) => {
        const rgb = hexToRgb(p.hex);
        const near = brand.map((b) => ({ b, d: deltaE2000(rgb, b.rgb) })).sort((x, y) => x.d - y.d)[0];
        return { ...p, near: near.b, d: near.d };
      })
      .filter((p) => p.d > 18);
    if (!off.length) return;
    const share = Math.round(off.reduce((s, p) => s + p.share, 0) * 100);
    add(ctx, rule, "image", { start: -1, end: -1, text: off.map((p) => `${p.hex} (${Math.round(p.share * 100)}%)`).join(", ") },
      `About ${share}% of the image uses colours outside the brand palette. Nearest brand colours: ${[...new Set(off.map((p) => `${p.near.name} ${p.near.hex}`))].join(", ")}.`, null);
  }
}

export function runDeterministic(kit: Kit, content: EngineContent) {
  const ctx: Ctx = { kit, content, out: [] };
  let evaluated = 0;
  for (const rule of kit.rules) {
    const detectors = rule.params.detectors ?? [];
    if (!detectors.length) continue;
    evaluated++;
    for (const d of detectors) {
      switch (d) {
        case "patterns": detectPatterns(ctx, rule); break;
        case "terms": detectTerms(ctx, rule); break;
        case "unverified_numbers": detectNumbers(ctx, rule); break;
        case "expired_facts": detectExpired(ctx, rule); break;
        case "pii": detectPii(ctx, rule); break;
        case "disclaimer": detectDisclaimer(ctx, rule); break;
        case "tagline": detectTagline(ctx, rule); break;
        case "exclamations": case "caps": case "emoji": case "readability": detectBodyStyle(ctx, rule, d); break;
        case "alt_text": case "contrast": case "palette": detectImage(ctx, rule, d); break;
      }
    }
  }
  return { findings: tidy(kit, ctx.out), rulesEvaluated: evaluated };
}

function tidy(kit: Kit, list: DraftFinding[]) {
  const cat = new Map(kit.rules.map((r) => [r.code, r.category]));
  // An unverified number inside a phrase already flagged by another claims/legal rule is noise.
  const filtered = list.filter((f) => {
    const r = kit.rules.find((x) => x.code === f.ruleCode);
    if (r?.params.detectors?.includes("unverified_numbers")) {
      return !list.some((o) => {
        if (o === f || o.field !== f.field || !overlaps(o, f) || !["claims", "legal"].includes(cat.get(o.ruleCode) ?? "")) return false;
        // A missing-disclaimer finding quotes a whole sentence; it doesn't cover the figure inside it.
        return !kit.rules.find((x) => x.code === o.ruleCode)?.params.detectors?.includes("disclaimer");
      });
    }
    return true;
  });
  const merged = filtered.filter(
    (f) => !filtered.some((o) => o !== f && o.ruleCode === f.ruleCode && o.field === f.field && f.start >= 0 &&
      overlaps(o, f) && (o.end - o.start > f.end - f.start || (o.end - o.start === f.end - f.start && filtered.indexOf(o) < filtered.indexOf(f)))),
  );
  const seen = new Set<string>();
  return merged
    .filter((f) => {
      const k = `${f.ruleCode}|${f.field}|${f.start}|${f.end}|${f.quote}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .sort((a, b) => (a.field === b.field ? a.start - b.start : a.field < b.field ? -1 : 1));
}

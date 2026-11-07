// Text utilities shared by the rule engine, the AI verifier and the UI.

export interface Span {
  start: number;
  end: number;
  text: string;
}

export function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function findAll(re: RegExp, text: string): Span[] {
  const flags = re.flags.includes("g") ? re.flags : re.flags + "g";
  const r = new RegExp(re.source, flags);
  const out: Span[] = [];
  let m: RegExpExecArray | null;
  while ((m = r.exec(text))) {
    if (m[0].length === 0) {
      r.lastIndex++;
      continue;
    }
    out.push({ start: m.index, end: m.index + m[0].length, text: m[0] });
  }
  return out;
}

function isTerminator(text: string, i: number) {
  const c = text[i];
  if (c === "\n" || c === "!" || c === "?") return true;
  if (c === ".") return i + 1 >= text.length || /[\s"')\]]/.test(text[i + 1]);
  return false;
}

/** Sentence containing position `i` (ends at . ! ? or a newline; decimals like 7.5 don't end a sentence). */
export function sentenceAt(text: string, i: number): Span {
  let s = Math.max(0, Math.min(i, text.length));
  while (s > 0 && !isTerminator(text, s - 1)) s--;
  while (s < text.length && /\s/.test(text[s])) s++;
  let e = Math.max(s, Math.min(i, text.length));
  while (e < text.length && !isTerminator(text, e)) e++;
  while (e < text.length && /[.!?]/.test(text[e])) e++;
  return { start: s, end: e, text: text.slice(s, e) };
}

export function sentences(text: string): Span[] {
  const out: Span[] = [];
  let i = 0;
  while (i < text.length) {
    while (i < text.length && /\s/.test(text[i])) i++;
    if (i >= text.length) break;
    const sp = sentenceAt(text, i);
    if (sp.end <= i) break;
    if (sp.text.trim()) out.push(sp);
    i = sp.end;
  }
  return out;
}

const QUOTE_MAP: Record<string, string> = { "‘": "'", "’": "'", "“": '"', "”": '"', "–": "-", "—": "-", " ": " " };

/** Normalise for tolerant matching while keeping a map back to original offsets. */
function normaliseWithMap(text: string) {
  let out = "";
  const map: number[] = [];
  let lastSpace = false;
  for (let i = 0; i < text.length; i++) {
    let c = QUOTE_MAP[text[i]] ?? text[i];
    if (/\s/.test(c)) {
      if (lastSpace) continue;
      c = " ";
      lastSpace = true;
    } else lastSpace = false;
    out += c.toLowerCase();
    map.push(i);
  }
  return { out, map };
}

/**
 * Locate a quote in text: exact match first, then a whitespace/quote/case-tolerant match.
 * Returns original offsets, or null when the quote does not exist in the text.
 */
export function locateQuote(text: string, quote: string, from = 0): { start: number; end: number } | null {
  const q = quote.trim();
  if (!q) return null;
  const exact = text.indexOf(q, from);
  if (exact >= 0) return { start: exact, end: exact + q.length };
  const T = normaliseWithMap(text);
  const Q = normaliseWithMap(q);
  const idx = T.out.indexOf(Q.out);
  if (idx < 0) return null;
  const start = T.map[idx];
  const end = T.map[idx + Q.out.length - 1] + 1;
  return { start, end };
}

export function overlaps(a: { start: number; end: number }, b: { start: number; end: number }) {
  return a.start < b.end && b.start < a.end;
}

export function normaliseClaim(s: string) {
  return s.toLowerCase().replace(/rs\.?|inr/g, "₹").replace(/[\s,]/g, "");
}

// ---- readability (Flesch reading ease)
function syllables(word: string) {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;
  if (w.length <= 3) return 1;
  const groups = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, "").match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups ? groups.length : 1);
}

export function readingEase(text: string) {
  const words = text.match(/[A-Za-z][A-Za-z'-]*/g) ?? [];
  const sents = Math.max(1, sentences(text).length);
  if (words.length === 0) return { score: 100, words: 0 };
  const syl = words.reduce((n, w) => n + syllables(w), 0);
  const score = 206.835 - 1.015 * (words.length / sents) - 84.6 * (syl / words.length);
  return { score: Math.round(score), words: words.length };
}

export function applyReplacement(text: string, start: number, end: number, replacement: string) {
  let before = text.slice(0, start);
  let after = text.slice(end);
  if (replacement === "") {
    // Removing a phrase: tidy the doubled space or dangling comma it leaves behind.
    before = before.replace(/[ ,]+$/, "");
    after = after.replace(/^[ ,]+/, (m) => (/^[.!?]/.test(after.slice(m.length)) ? "" : " "));
    if (!before || /[\n]$/.test(before)) after = after.trimStart();
  }
  return before + replacement + after;
}

export function todayIST(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}

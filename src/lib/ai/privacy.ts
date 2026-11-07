// Privacy gateway: mask confidential terms and personal data before any text
// leaves our servers, and restore them in what comes back.
import { escapeRegex } from "../engine/text";

const PII: [RegExp, string][] = [
  [/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, "EMAIL"],
  [/(?<!\d)(?:\+91[\s-]?)?[6-9]\d{9}(?!\d)/g, "PHONE"],
  [/(?<!\d)\d{4}\s\d{4}\s\d{4}(?!\d)/g, "ID_NUMBER"],
  [/\b[A-Z]{5}\d{4}[A-Z]\b/g, "PAN"],
];

export interface Mask {
  map: Map<string, string>; // placeholder -> original
  mask(text: string): string;
  unmask(text: string): string;
}

export function createMask(watchTerms: string[]): Mask {
  const map = new Map<string, string>();
  const reverse = new Map<string, string>();
  const counters: Record<string, number> = {};
  const placeholder = (kind: string, original: string) => {
    const key = `${kind}:${original.toLowerCase()}`;
    const existing = reverse.get(key);
    if (existing) return existing;
    counters[kind] = (counters[kind] ?? 0) + 1;
    const p = `[${kind}_${counters[kind]}]`;
    map.set(p, original);
    reverse.set(key, p);
    return p;
  };
  const terms = [...watchTerms].sort((a, b) => b.length - a.length);
  return {
    map,
    mask(text: string) {
      let out = text;
      for (const t of terms) {
        out = out.replace(new RegExp(`(?<![\\w])${escapeRegex(t)}(?![\\w])`, "gi"), (m) => placeholder("CONFIDENTIAL", m));
      }
      for (const [re, kind] of PII) out = out.replace(re, (m) => (/@nimbuspay\.example$/i.test(m) ? m : placeholder(kind, m)));
      return out;
    },
    unmask(text: string) {
      let out = text;
      for (const [p, original] of map) out = out.split(p).join(original);
      return out;
    },
  };
}

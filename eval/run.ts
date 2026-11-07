// Evaluation harness: scores the review engine against the labelled golden set.
//   npm run eval           -> rule-based checks only (free, deterministic)
//   npm run eval -- --ai   -> rule-based + Claude review + verifier (needs ANTHROPIC_API_KEY)
// Writes docs/eval-report.md.
import { writeFileSync } from "node:fs";
import { runDeterministic } from "../src/lib/engine/deterministic";
import { verifyAiFindings } from "../src/lib/engine/verify";
import { seedKit } from "../src/lib/seed/kit";
import type { DraftFinding, EngineContent } from "../src/lib/engine/types";
import { GOLDEN } from "./golden";

const withAi = process.argv.includes("--ai");
// Optional: --ids=g29,g30 runs a subset (e.g. to re-run samples whose AI call hit a quota).
const idsArg = process.argv.find((a) => a.startsWith("--ids="));
const onlyIds = idsArg ? new Set(idsArg.slice(6).split(",")) : null;
const SET = onlyIds ? GOLDEN.filter((g) => onlyIds.has(g.id)) : GOLDEN;
const OUT = process.argv.find((a) => a.startsWith("--out="))?.slice(6) ?? "docs/eval-report.md";
// Fixed date so results are reproducible (F-041 in date, F-037/F-031 expired).
const kit = { ...seedKit("2026-11-07"), version: 1 };
const category = new Map(kit.rules.map((r) => [r.code, r.category]));

interface Row { id: string; expected: Set<string>; predicted: Set<string>; aiStats?: string; citationsValid: boolean }

async function predict(item: (typeof GOLDEN)[number]): Promise<Row> {
  const content: EngineContent = {
    body: item.body, imageText: "", altText: "", hasImage: false, imageAnalysis: null, channel: item.channel,
    audience: item.audience ?? "General", source: "human", intent: null,
  };
  const det = runDeterministic(kit, content).findings;
  let all: DraftFinding[] = det;
  let aiStats: string | undefined;
  if (withAi) {
    const { aiReview } = await import("../src/lib/ai/review");
    const res = await aiReview(kit, "Nimbus Pay", 1, content, det);
    if (res.status === "ok") {
      const v = verifyAiFindings(kit, content, det, res.findings, res.unmask);
      all = [...det, ...v.kept];
      aiStats = `${res.model}: ${res.findings.length} proposed, ${v.kept.length} kept, ${v.dropped.length} dropped`;
    } else aiStats = `AI ${res.status}: ${res.message}`;
  }
  const citationsValid = all.every((f) => category.has(f.ruleCode) && (f.field !== "body" || content.body.slice(f.start, f.end) === f.quote));
  return { id: item.id, expected: new Set(item.expected), predicted: new Set(all.map((f) => f.ruleCode)), aiStats, citationsValid };
}

function score(rows: Row[], filter?: (code: string) => boolean) {
  let tp = 0, fp = 0, fn = 0;
  for (const r of rows) {
    for (const p of r.predicted) {
      if (filter && !filter(p)) continue;
      if (r.expected.has(p)) tp++;
      else fp++;
    }
    for (const e of r.expected) if ((!filter || filter(e)) && !r.predicted.has(e)) fn++;
  }
  const precision = tp + fp ? tp / (tp + fp) : 1;
  const recall = tp + fn ? tp / (tp + fn) : 1;
  return { tp, fp, fn, precision, recall };
}

const pct = (x: number) => `${(x * 100).toFixed(0)}%`;

async function main() {
  const rows: Row[] = [];
  for (const [i, item] of SET.entries()) {
    rows.push(await predict(item));
    // Stay under free-tier rate limits when calling the AI provider.
    if (withAi && i < SET.length - 1) await new Promise((r) => setTimeout(r, 7000));
    if (withAi) process.stderr.write(`\r${i + 1}/${SET.length}`);
  }
  const overall = score(rows);
  const blockers = new Set(kit.rules.filter((r) => r.severity === "blocker").map((r) => r.code));
  const blockerScore = score(rows, (c) => blockers.has(c));
  const clean = rows.filter((r) => r.expected.size === 0);
  const cleanFlags = clean.reduce((n, r) => n + r.predicted.size, 0);
  const cats = [...new Set(kit.rules.map((r) => r.category))];

  const lines = [
    `# Brandrail evaluation report`,
    ``,
    `- Mode: **${withAi ? `rule-based + AI review (${process.env.ANTHROPIC_API_KEY ? "Claude" : "Gemini"}) + verifier` : "rule-based checks only"}**`,
    `- Golden set: **${SET.length} labelled samples**${onlyIds ? ` (subset: ${[...onlyIds].join(", ")})` : ""}, of which ${clean.length} are clean controls (fictional Nimbus Pay brand, eval/golden.ts)`,
    `- Rulebook: v1 (${kit.rules.length} rules) · Facts as of ${kit.today}`,
    `- Generated: ${new Date().toISOString()}`,
    ``,
    `| Metric | Value |`,
    `|---|---|`,
    `| Precision (all findings) | ${pct(overall.precision)} (${overall.tp} TP / ${overall.fp} FP) |`,
    `| Recall (all labelled issues) | ${pct(overall.recall)} (${overall.fn} missed) |`,
    `| Precision, blocker rules | ${pct(blockerScore.precision)} |`,
    `| Recall, blocker rules | ${pct(blockerScore.recall)} |`,
    `| False flags on clean controls | ${cleanFlags} across ${clean.length} samples (${(cleanFlags / Math.max(1, clean.length)).toFixed(2)} per sample) |`,
    `| Citation validity (rule exists, quote matches text) | ${pct(rows.filter((r) => r.citationsValid).length / rows.length)} |`,
    ``,
    `## By category`,
    ``,
    `| Category | Precision | Recall | TP | FP | FN |`,
    `|---|---|---|---|---|---|`,
    ...cats.map((c) => {
      const s = score(rows, (code) => category.get(code) === c);
      return `| ${c} | ${s.tp + s.fp ? pct(s.precision) : "–"} | ${s.tp + s.fn ? pct(s.recall) : "–"} | ${s.tp} | ${s.fp} | ${s.fn} |`;
    }),
    ``,
    `## Misses and false positives`,
    ``,
    ...rows.flatMap((r) => {
      const missed = [...r.expected].filter((e) => !r.predicted.has(e));
      const extra = [...r.predicted].filter((p) => !r.expected.has(p));
      if (!missed.length && !extra.length) return [];
      return [`- **${r.id}**: ${missed.length ? `missed ${missed.join(", ")}` : ""}${missed.length && extra.length ? "; " : ""}${extra.length ? `extra ${extra.join(", ")}` : ""}${r.aiStats ? ` (${r.aiStats})` : ""}`];
    }),
    ``,
    withAi ? `` : `Rule-based checks cannot judge tone, messaging or audience fit (TON-01, TON-02, MSG-01, MSG-03) or implied claims. Those labels are expected to be missed in this mode and are covered by the AI review.`,
  ];
  writeFileSync(OUT, lines.join("\n") + "\n");
  console.log(lines.slice(0, 18).join("\n"));
}

main();

# Brandrail evaluation report

- Mode: **rule-based + AI review (Gemini) + verifier**
- Golden set: **5 labelled samples** (subset: g29, g30, g31, g32, g36), of which 0 are clean controls (fictional Nimbus Pay brand, eval/golden.ts)
- Rulebook: v1 (29 rules) · Facts as of 2026-11-07
- Generated: 2026-11-07T14:38:01.612Z

| Metric | Value |
|---|---|
| Precision (all findings) | 100% (7 TP / 0 FP) |
| Recall (all labelled issues) | 100% (0 missed) |
| Precision, blocker rules | 100% |
| Recall, blocker rules | 100% |
| False flags on clean controls | 0 across 0 samples (0.00 per sample) |
| Citation validity (rule exists, quote matches text) | 100% |

## By category

| Category | Precision | Recall | TP | FP | FN |
|---|---|---|---|---|---|
| tone | 100% | 100% | 3 | 0 | 0 |
| terminology | – | – | 0 | 0 | 0 |
| messaging | 100% | 100% | 2 | 0 | 0 |
| claims | – | – | 0 | 0 | 0 |
| legal | 100% | 100% | 1 | 0 | 0 |
| confidentiality | – | – | 0 | 0 | 0 |
| accessibility | 100% | 100% | 1 | 0 | 0 |
| visual | – | – | 0 | 0 | 0 |

## Misses and false positives




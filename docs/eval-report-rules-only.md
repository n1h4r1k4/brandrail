# Brandrail evaluation report

- Mode: **rule-based checks only**
- Golden set: **44 labelled samples**, of which 12 are clean controls (fictional Nimbus Pay brand, eval/golden.ts)
- Rulebook: v1 (29 rules) · Facts as of 2026-11-07
- Generated: 2026-11-07T13:36:01.601Z

| Metric | Value |
|---|---|
| Precision (all findings) | 100% (52 TP / 0 FP) |
| Recall (all labelled issues) | 90% (6 missed) |
| Precision, blocker rules | 100% |
| Recall, blocker rules | 97% |
| False flags on clean controls | 0 across 12 samples (0.00 per sample) |
| Citation validity (rule exists, quote matches text) | 100% |

## By category

| Category | Precision | Recall | TP | FP | FN |
|---|---|---|---|---|---|
| tone | 100% | 67% | 6 | 0 | 3 |
| terminology | 100% | 100% | 7 | 0 | 0 |
| messaging | 100% | 33% | 1 | 0 | 2 |
| claims | 100% | 95% | 19 | 0 | 1 |
| legal | 100% | 100% | 11 | 0 | 0 |
| confidentiality | 100% | 100% | 5 | 0 | 0 |
| accessibility | 100% | 100% | 3 | 0 | 0 |
| visual | – | – | 0 | 0 | 0 |

## Misses and false positives

- **g03**: missed CLM-03
- **g29**: missed TON-01
- **g30**: missed TON-02
- **g31**: missed MSG-01
- **g32**: missed MSG-03
- **g36**: missed TON-02

Rule-based checks cannot judge tone, messaging or audience fit (TON-01, TON-02, MSG-01, MSG-03) or implied claims. Those labels are expected to be missed in this mode and are covered by the AI review.

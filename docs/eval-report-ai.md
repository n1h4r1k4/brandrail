# Brandrail evaluation report

- Mode: **rule-based + AI review (Gemini) + verifier**
- Golden set: **44 labelled samples**, of which 12 are clean controls (fictional Nimbus Pay brand, eval/golden.ts)
- Rulebook: v1 (29 rules) · Facts as of 2026-11-07
- Generated: 2026-11-07T14:15:11.091Z

| Metric | Value |
|---|---|
| Precision (all findings) | 100% (53 TP / 0 FP) |
| Recall (all labelled issues) | 91% (5 missed) |
| Precision, blocker rules | 100% |
| Recall, blocker rules | 100% |
| False flags on clean controls | 0 across 12 samples (0.00 per sample) |
| Citation validity (rule exists, quote matches text) | 100% |

## By category

| Category | Precision | Recall | TP | FP | FN |
|---|---|---|---|---|---|
| tone | 100% | 67% | 6 | 0 | 3 |
| terminology | 100% | 100% | 7 | 0 | 0 |
| messaging | 100% | 33% | 1 | 0 | 2 |
| claims | 100% | 100% | 20 | 0 | 0 |
| legal | 100% | 100% | 11 | 0 | 0 |
| confidentiality | 100% | 100% | 5 | 0 | 0 |
| accessibility | 100% | 100% | 3 | 0 | 0 |
| visual | – | – | 0 | 0 | 0 |

## Misses and false positives

- **g29**: missed TON-01 (AI error: Gemini free-tier rate limit reached. Wait a minute and run the check again.)
- **g30**: missed TON-02 (AI error: Gemini free-tier rate limit reached. Wait a minute and run the check again.)
- **g31**: missed MSG-01 (AI error: Gemini free-tier rate limit reached. Wait a minute and run the check again.)
- **g32**: missed MSG-03 (AI error: Gemini free-tier rate limit reached. Wait a minute and run the check again.)
- **g36**: missed TON-02 (AI error: Gemini free-tier rate limit reached. Wait a minute and run the check again.)



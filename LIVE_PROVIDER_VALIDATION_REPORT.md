# Live Provider Validation Report

Validated: 2026-06-01 18:11 IST / 12:41 UTC

Scope: Gemini, Groq, DeepSeek, OpenRouter, HuggingFace, Cerebras.

Result: deployment goal is not met yet. Only Cerebras is fully healthy and active. OpenRouter passed all live checks but is inactive, so it is ready as a second provider only after activation. Preferred pairs are not healthy: Cerebras + Groq is blocked by Groq rate/request limits, and Cerebras + Gemini is blocked by Gemini project access.

## Summary

| Provider | Status | Latency | Generation Success | SEO Success | Fallback Success | Recommendation |
|---|---:|---:|---:|---:|---:|---|
| Cerebras | Fully healthy, active | 2,939 ms retry avg | Yes | Yes | Yes | Keep active. Pair with one more healthy active provider before deployment. |
| OpenRouter | Ready but inactive | 6,825 ms avg | Yes | Yes | Yes | Enable as the current second healthy provider if non-preferred fallback is acceptable. |
| Groq | Down, inactive | 745 ms initial test; retry failed | No | No | No | Keep inactive. Current calls hit Groq TPM/request-size limits before generation can complete. |
| Gemini | Down, inactive | 1,130 ms | No | No | No | Fix Gemini API/project access; live calls return 403 permission denied. |
| DeepSeek | Down, active | 1,284 ms | No | No | No | Add DeepSeek credits or disable until billing is fixed; live calls return 402 insufficient balance. |
| HuggingFace | Down, inactive | 1,424 ms | No | No | No | Keep disabled until the inference endpoint/model access is fixed. |

## Validation Matrix

| Provider | Test Provider | Refresh Models | AI Draft Generation | SEO Generation | Fallback Participation | Monitoring Participation | Statistics Update |
|---|---:|---:|---:|---:|---:|---:|---:|
| Cerebras | Pass on retry (`gpt-oss-120b`) | Pass, 2 models saved | Pass | Pass | Pass | Yes, active | Yes |
| OpenRouter | Pass | Pass, 25 models saved | Pass | Pass | Pass in direct validation; inactive in production | No, inactive | Yes |
| Groq | Initial pass, retry failed 413/429 | Pass, 14 models saved | Fail | Fail | Fail | No, inactive | Yes |
| Gemini | Fail, 403 permission denied | Pass, 28 models saved | Fail | Fail | Fail | No, inactive | Yes |
| DeepSeek | Fail, 402 insufficient balance | Pass, 2 models saved | Fail | Fail | Fail | Yes, active | Yes |
| HuggingFace | Fail, fetch failed | Static list saved, 4 models | Fail | Fail | Fail | No, inactive | Yes |

## Final Provider State

| Provider | Active | Health | Requests | Successes | Failures | Last Latency | Last Error |
|---|---:|---:|---:|---:|---:|---:|---|
| DeepSeek | Yes | Down | 20 | 0 | 20 | 857 ms | 402 insufficient balance |
| Gemini | No | Down | 24 | 3 | 21 | 779 ms | 403 permission denied |
| Groq | No | Down | 19 | 8 | 11 | 440 ms | 429/413 TPM or request-size limit |
| OpenRouter | No | Healthy | 19 | 5 | 14 | 4,049 ms | None |
| HuggingFace | No | Down | 19 | 0 | 19 | 2 ms | fetch failed |
| Cerebras | Yes | Healthy | 23 | 18 | 5 | 2,939 ms | None |

## Commands Run

- `npm run monitor:providers`: ran production monitor path. DeepSeek failed with 402. Cerebras initially hit 429 high traffic.
- Live direct provider validation through `server/ai/providerCore.js`: tested provider calls, model refresh, draft JSON, SEO JSON, fallback chain, and DB stats updates.
- Targeted retry for Groq and Cerebras: Cerebras passed all checks on retry; Groq remained blocked by rate/request limits.
- `node scripts\validate-ai-job-system.mjs`: passed all AI fallback/static wiring checks.
- `npm run -s test:conversion`: passed 3/3 tests.
- `npm run -s typecheck`: failed on existing broad JS/typing issues, including `file-saver` globals, Supabase API error-shape typing, and many UI component prop typings.

## Deployment Decision

Do not deploy as fully redundant yet if the requirement is at least 2 active healthy providers.

Fastest path to the goal: enable OpenRouter as the second active provider beside Cerebras. Preferred path is not currently available: Groq needs rate/token-limit remediation, and Gemini needs project access remediation.

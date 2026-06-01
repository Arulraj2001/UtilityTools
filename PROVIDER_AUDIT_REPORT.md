# AI Provider Audit

Audit date: 2026-06-01

## Verdict

Status: WARNING

Provider wiring exists and live model discovery worked for every configured provider. Only three providers passed a live "Test Provider" call. The database currently has only Cerebras active, so the in-app "Test All" and live AI generation path use Cerebras only.

## Provider Configuration

Live DB order:

1. DeepSeek
2. Gemini
3. Groq
4. OpenRouter
5. HuggingFace
6. Cerebras

Live active provider:

- Cerebras only

All six provider rows have API keys stored in `ai_provider_settings`.

## Live Provider Tests

| Provider | Status | Result |
|---|---:|---|
| DeepSeek | FAIL | API returned 402 insufficient balance. |
| Gemini | FAIL | API returned 403 project access denied. |
| Groq | PASS | Returned `OK` in 711 ms. |
| OpenRouter | PASS | Returned `OK` in 17575 ms. |
| HuggingFace | FAIL | Fetch failed against inference endpoint. |
| Cerebras | PASS | Returned `OK` in 4080 ms. |

## Model Discovery

PASS:

- DeepSeek: 2 models discovered
- Gemini: 28 models discovered
- Groq: 14 models discovered
- OpenRouter: 25 models discovered
- HuggingFace: static 4-model list returned
- Cerebras: 2 models discovered

WARNING:

- OpenRouter test passed, but `/models/openrouter/free` returned a 404 during model-info lookup. The chat call still worked.
- HuggingFace has no live model-list endpoint in this implementation, so "Refresh Models" returns static configured options.

## Fallback Chain

PASS: Live all-provider fallback test succeeded.

Attempt order:

1. DeepSeek failed with quota.
2. Gemini failed with auth/project permission.
3. Groq succeeded.

WARNING: The actual production DB active chain currently contains only Cerebras. The full fallback chain only runs if more providers are active.

## Feature Checks

| Feature | Status | Evidence |
|---|---:|---|
| Save API Key | PASS | `updateAiProvider()` updates provider rows. |
| Test Provider | WARNING | Works for Groq, OpenRouter, Cerebras; fails for DeepSeek, Gemini, HuggingFace due provider/account/network responses. |
| Refresh Models | PASS | Discovery returned models for all providers or static fallback. |
| Provider Ordering | PASS | Drag-and-drop swaps priorities. DB order is correct. |
| Fallback Chain | PASS | Live fallback reached Groq after two failures. |
| Statistics | PASS | Provider stats JSON exists and monitor updated Cerebras. |
| Health Status | PASS | Health fields exist and update. |
| Failure Logging | PASS | Existing provider failures present; insertion/RLS verified. |
| Model Discovery | PASS | Counts listed above. |

## Required Fixes

1. Fix provider account/key issues for DeepSeek, Gemini, and HuggingFace.
2. Decide which providers should be active in production. Currently only Cerebras is active.
3. Add deterministic SEO fallback because the active provider returned empty content for SEO-only generation.


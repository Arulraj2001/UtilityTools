# Content Quality Audit

Audit date: 2026-06-01

## Verdict

Status: WARNING

The live AI draft generation produced a usable job article with a strong overall score. The separate SEO-only generation step failed against the active provider, and public job HTML rendering is not sanitized.

## Live Sample

Temporary sample:

- Organization: National Sample Recruitment Board
- Job type: government
- Provider used: Cerebras
- Model: `zai-glm-4.7`
- Generation time: 6138 ms
- Tokens used: 5486
- Cleanup: completed

## Quality Scores

| Dimension | Score |
|---|---:|
| Content Quality | 72 |
| SEO Quality | 65 |
| EEAT | 80 |
| Adsense Safety | 100 |
| Spam Risk | 0 |
| Duplicate Risk | 0 |
| Freshness | 100 |
| Overall | 82 |

Label: Excellent

## Content Checks

PASS:

- Generated valid JSON.
- Generated HTML article content.
- Saved draft to `ai_job_drafts`.
- Saved job draft to `jobs`.
- Preview fetch returned saved content.
- Publish updated status to `published`.
- FAQ count: 6
- `schema_type`: `JobPosting`
- No spam phrases detected by `scoreJob()`.

WARNING:

- Approximate generated article length was 745 words. This is acceptable, but below the 1000 to 2000 word target implied by the scorer for top content depth.
- SEO-only generation failed because Cerebras returned empty content.
- `JobSEO` emits JobPosting schema, but does not emit FAQ schema for `faq_items`.
- Public job pages render `full_description` with `dangerouslySetInnerHTML` and no sanitizer.
- Internal linking is handled by `JobSEOLinking`, not embedded in the generated article itself.

## Adsense Compliance

PASS:

- No prohibited hype/spam phrases were detected.
- Spam risk score was 0.
- Adsense score was 100.

WARNING:

- HTML safety is not equivalent to Adsense safety. Unsanitized stored HTML remains a production risk.

## Structured Data

PASS:

- `JobSEO` is imported and rendered by `JobDetailPage`.
- `JobPosting` JSON-LD is emitted.

WARNING:

- `JobPosting.description` uses job text/HTML without explicit stripping.
- FAQ schema is missing for job FAQ data.

## Required Fixes

1. Add SEO fallback or retry handling for empty provider responses. A deterministic fallback was applied after this audit.
2. Sanitize AI-generated and manually entered HTML before rendering.
3. Add FAQ schema output for job `faq_items`.
4. Enforce minimum quality thresholds before allowing draft conversion or publish.

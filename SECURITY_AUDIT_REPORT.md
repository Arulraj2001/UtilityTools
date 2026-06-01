# Security Audit

Audit date: 2026-06-01

## Verdict

Status: NO-GO

The largest production risk is not table existence; it is the security model. AI provider API keys are stored in Supabase and used directly in browser-side code. Stored HTML from AI output is rendered unsanitized on public pages. These are production-blocking risks for a public admin/content system.

## API Key Exposure

FAIL:

- `AiSettings.jsx` fetches provider rows into the browser.
- Provider API keys are stored in `ai_provider_settings.api_key`.
- `aiProvider.js` calls external AI APIs directly from the browser.
- Any admin browser session can expose provider keys through devtools/network/runtime memory.

PASS:

- Anonymous users could not read provider settings during live RLS probe.
- Service role key is used by `monitorProviders.js`, not by the Vite client.

Required fix:

- Move provider calls behind a server-side endpoint or edge function. The browser should never receive provider API keys.

## Service Role Exposure

PASS:

- `SUPABASE_SERVICE_ROLE_KEY` is referenced by Node scripts, not `VITE_*`.
- Vite client uses anon key only.

WARNING:

- `.env` contains multiple provider keys and service credentials. Ensure it is never committed or exposed in deployment logs.

## Stored HTML And XSS

FAIL:

- Public job pages render `job.full_description` using `dangerouslySetInnerHTML`.
- AI moderation preview renders generated `full_description` using `dangerouslySetInnerHTML`.
- No sanitizer such as DOMPurify is present.
- AI output can include arbitrary HTML if a provider ignores prompt constraints.

Related existing surfaces:

- Blogs
- Workflow pages
- Tool content
- Category SEO content

Required fix:

- Sanitize stored HTML before saving and before rendering, with an allowlist for headings, paragraphs, lists, links, and tables.

## Prompt Injection

WARNING:

- Raw source notification text is inserted into prompts.
- The prompt asks for JSON-only output, but malicious source text could instruct the model to output unsafe HTML or ignore constraints.

Required fix:

- Treat provider output as untrusted.
- Validate JSON shape.
- Sanitize generated HTML.
- Reject forbidden tags and attributes.

## SQL Injection

PASS:

- Supabase query builder is used for inserts/updates/selects.

WARNING:

- Search filters use `.or()` strings with user input in some APIs. This should be reviewed and escaped defensively.

## RLS And Permissions

PASS:

- Anonymous AI inserts were blocked.
- Anonymous provider failure inserts were blocked.
- Public published-job reads worked.

WARNING:

- React route protection checks authentication only. Non-admin authenticated users may reach admin UI shells, though RLS should block data.
- Configured admin credentials failed login during audit.

## Rate Limiting And Abuse

FAIL:

- No app-level rate limit for AI generation calls.
- No daily generation cap enforcement in UI/API despite environment variables such as `MAX_DAILY_PUBLISH_LIMIT`.
- No minimum quality threshold enforcement before conversion to job draft.

## Go/No-Go

Security recommendation: NO-GO until provider keys are server-side and stored HTML is sanitized.


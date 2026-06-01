# GROQ_TOKEN_OPTIMIZATION_REPORT

## Objective

Audit Groq request payloads, identify token-heavy prompts, and add provider-specific prompt compression so Groq requests target under 4000 tokens per request.

## Findings

- The Groq request path is implemented in:
  - `supabase/functions/_shared/providerCore.js`
  - `server/ai/providerCore.js`
- Groq calls go through `callGroq()` and ultimately use the shared OpenAI-compatible helper `callOpenAICompat()`.
- Previously there was no Groq-specific prompt compression or token estimation.
- The existing fallback system and provider selection are unchanged.

## Audit changes

Implemented a new Groq audit and compression layer in both provider cores:

- `GROQ_MAX_REQUEST_TOKENS = 4000`
- `GROQ_MAX_REQUEST_CHARS = 16000`
- `GROQ_HIGH_WATERMARK_TOKENS = 6000`

Added prompt instrumentation for every Groq request:

- `originalPromptLength`
- `promptLength`
- `estimatedTokens`
- `truncated`
- warnings when estimate exceeds 6000 tokens

## Prompt reduction strategy

A new Groq prompt optimizer was added:

- `compressGroqPrompt(prompt)`
  - trims whitespace
  - normalizes CRLF and repeated newlines
  - collapses repeated spaces and tabs
  - normalizes punctuation spacing
  - removes redundant whitespace around line breaks
- `prepareGroqPrompt(prompt)`
  - compresses the prompt
  - estimates tokens using `length / 4`
  - truncates prompts that still exceed 4000 tokens

## Provider-specific changes

Updated `callGroq()` in both provider cores to:

- compress and prepare the incoming prompt before sending it to Groq
- log request metadata for auditing
- warn when the estimated token count crosses the 6000 token watermark
- enforce a hard target of 4000 estimated tokens per Groq request

## Impact

- Groq payloads are now audited and reduced before request submission.
- Large prompts that previously could exceed Groq's TPM limits are now compacted.
- Any Groq request with an estimated token count above 6000 will output a console warning.
- The system now targets fewer than 4000 tokens per Groq request.

## Next steps

- Run production-like Groq calls and inspect logs for `[groq] request` entries.
- If real prompts still exceed the estimate target, further reduce or restructure prompt generation upstream.
- Consider applying a similar compression layer to other OpenAI-compatible providers if token-heavy prompts remain a broad issue.

## Changed files

- `supabase/functions/_shared/providerCore.js`
- `server/ai/providerCore.js`

-- ============================================================
-- AI Job Intelligence Hardening Migration
-- Additive / backward-compatible. Run after the AI job migrations.
-- ============================================================

-- Preserve AI-generated FAQ/social/schema fields when present.
-- Existing code retries without these fields if this migration has not run yet.
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS faq_items jsonb,
  ADD COLUMN IF NOT EXISTS og_title text,
  ADD COLUMN IF NOT EXISTS og_description text,
  ADD COLUMN IF NOT EXISTS schema_type text DEFAULT 'JobPosting';

-- Enforce the requested free-provider fallback order:
-- DeepSeek -> Gemini -> Groq -> OpenRouter free -> HuggingFace -> Cerebras.
UPDATE public.ai_provider_settings
SET priority = CASE provider_name
  WHEN 'deepseek' THEN 1
  WHEN 'gemini' THEN 2
  WHEN 'groq' THEN 3
  WHEN 'openrouter' THEN 4
  WHEN 'huggingface' THEN 5
  WHEN 'cerebras' THEN 6
  ELSE priority
END,
updated_at = NOW()
WHERE provider_name IN ('deepseek','gemini','groq','openrouter','huggingface','cerebras');

-- Replace known retired/fragile defaults only when the row still uses them.
UPDATE public.ai_provider_settings
SET model = 'gemini-2.5-flash', updated_at = NOW()
WHERE provider_name = 'gemini'
  AND (model IS NULL OR model = '' OR model LIKE 'gemini-1.5%' OR model LIKE '%preview%');

UPDATE public.ai_provider_settings
SET model = 'llama-3.1-8b-instant', updated_at = NOW()
WHERE provider_name = 'groq'
  AND model IN ('llama3-8b-8192','llama3-70b-8192','mixtral-8x7b-32768','gemma2-9b-it');

UPDATE public.ai_provider_settings
SET model = 'openrouter/free', updated_at = NOW()
WHERE provider_name = 'openrouter'
  AND (
    model IS NULL
    OR model = ''
    OR model IN ('mistralai/mistral-7b-instruct:free','meta-llama/llama-3.1-8b-instruct:free','meta-llama/llama-3.2-3b-instruct:free')
    OR COALESCE(stats->>'last_error', '') ILIKE '%rate-limited%'
  );

UPDATE public.ai_provider_settings
SET model = 'deepseek-chat', updated_at = NOW()
WHERE provider_name = 'deepseek'
  AND (model IS NULL OR model = '' OR model NOT IN ('deepseek-v4-flash','deepseek-v4-pro','deepseek-chat','deepseek-reasoner'));

-- End migration

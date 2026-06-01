import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import ws from 'ws'
import { testProvider, fetchProviderModels, callAI, classifyProviderError } from '../server/ai/providerCore.js'

dotenv.config()

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  realtime: { transport: ws },
  auth: { persistSession: false },
})

const fallbackPrompt = 'Write a concise, professional job posting summary for a government exam notification.'
const draftPrompt = 'Write a short AI-generated job posting summary for a government exam notification.'
const seoPrompt = 'Write an SEO title and meta description for the government exam job posting. Title max 70 characters. Description max 160 characters.'

const normalizeProvider = (provider) => ({
  id: provider.id,
  provider_name: provider.provider_name,
  model: provider.model,
  priority: provider.priority,
  base_url: provider.base_url,
  available_models: provider.available_models,
  api_key: provider.api_key,
  is_active: provider.is_active,
})

const classify = (source, result, err) => {
  if (result?.ok === false && result.errorType) return result.errorType
  if (err) return classifyProviderError(err)
  if (result?.ok === false) return 'provider_error'
  return null
}

const run = async () => {
  const { data: providers, error } = await supabase.from('ai_provider_settings').select('*').order('priority')
  if (error) throw error
  const rows = providers || []

  const mapped = rows.map((p) => normalizeProvider(p))
  console.log('Provider config loaded:', mapped.map((p) => ({ provider_name: p.provider_name, priority: p.priority, active: p.is_active })))

  const results = []
  for (const provider of mapped) {
    const p = { ...provider }
    const providerResult = {
      provider_name: p.provider_name,
      priority: p.priority,
      is_active: p.is_active,
      api_key_present: Boolean(p.api_key && String(p.api_key).trim()),
      testProvider: null,
      fetchModels: null,
      aiDraft: null,
      seo: null,
      monitoringParticipation: !!p.is_active && !!p.api_key,
      recommendedState: 'inactive',
    }

    if (!p.api_key || !p.is_active) {
      providerResult.testProvider = { ok: false, reason: 'configuration', error: 'Missing API key or provider inactive' }
      providerResult.fetchModels = { ok: false, reason: 'configuration' }
      providerResult.aiDraft = { ok: false, reason: 'configuration' }
      providerResult.seo = { ok: false, reason: 'configuration' }
      results.push(providerResult)
      continue
    }

    try {
      const test = await testProvider(p)
      providerResult.testProvider = {
        ok: test.ok,
        durationMs: test.durationMs,
        model: test.model,
        response: test.response || null,
        error: test.ok ? null : test.error,
        errorType: test.errorType || (test.ok ? null : 'provider_error'),
      }
    } catch (err) {
      providerResult.testProvider = {
        ok: false,
        durationMs: 0,
        model: p.model,
        error: err.message,
        errorType: classifyProviderError(err),
      }
    }

    try {
      const models = await fetchProviderModels(p)
      providerResult.fetchModels = {
        ok: Array.isArray(models) && models.length > 0,
        count: Array.isArray(models) ? models.length : 0,
        error: null,
      }
    } catch (err) {
      providerResult.fetchModels = {
        ok: false,
        count: 0,
        error: err.message,
      }
    }

    try {
      const result = await callAI([p], draftPrompt, { timeoutMs: 30000 })
      providerResult.aiDraft = {
        ok: !!result.text,
        durationMs: result.durationMs || null,
        provider: result.provider,
        model: result.model,
        textPreview: result.text?.slice(0, 200) || null,
      }
    } catch (err) {
      providerResult.aiDraft = {
        ok: false,
        error: err.message,
        errorType: err.code === 'AI_PROVIDERS_FAILED' ? 'provider_error' : classifyProviderError(err),
      }
    }

    try {
      const result = await callAI([p], seoPrompt, { timeoutMs: 30000 })
      providerResult.seo = {
        ok: !!result.text,
        durationMs: result.durationMs || null,
        provider: result.provider,
        model: result.model,
        textPreview: result.text?.slice(0, 200) || null,
      }
    } catch (err) {
      providerResult.seo = {
        ok: false,
        error: err.message,
        errorType: err.code === 'AI_PROVIDERS_FAILED' ? 'provider_error' : classifyProviderError(err),
      }
    }

    results.push(providerResult)
  }

  const activeProviders = mapped.filter((p) => p.is_active && p.api_key)
  let fallbackResult = null
  try {
    const result = await callAI(activeProviders, fallbackPrompt, { timeoutMs: 30000, onAttempt: (attempt) => {
      // log attempt details as part of the final result
      if (!fallbackResult) fallbackResult = { attempts: [] }
      fallbackResult.attempts.push({
        providerName: attempt.providerName,
        model: attempt.model,
        ok: attempt.ok,
        durationMs: attempt.durationMs,
        errorType: attempt.errorType,
        error: attempt.error,
      })
    }})
    fallbackResult = {
      ...fallbackResult,
      ok: true,
      provider: result.provider,
      model: result.model,
      textPreview: result.text?.slice(0, 200) || null,
    }
  } catch (err) {
    fallbackResult = {
      ...fallbackResult,
      ok: false,
      error: err.message,
      code: err.code || null,
      attempts: fallbackResult?.attempts || err.attempts || [],
    }
  }

  return { providers: results, fallback: fallbackResult }
}

const main = async () => {
  const data = await run()
  console.log(JSON.stringify(data, null, 2))
}

main().catch((err) => {
  console.error('Validation run failed', err)
  process.exit(1)
})

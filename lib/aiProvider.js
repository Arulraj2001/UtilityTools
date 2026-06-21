import { supabase } from '@/api/supabaseClient'
import { buildApiUrl } from '@/api/apiBase'
import {
  DEFAULT_PROVIDER_TIMEOUT_MS,
  PROVIDER_MODELS,
  chooseProviderModel,
  classifyProviderError,
  safeProviderPayload,
  sortProvidersForFallback,
} from './aiProviderCore'

export * from './aiProviderCore'

const invokeProviderProxy = async (body, { signal } = {}) => {
  const { data, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) throw sessionError

  const token = data?.session?.access_token
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`

  const response = await fetch(buildApiUrl('/api/ai-provider-proxy'), {
    method: 'POST',
    signal,
    headers,
    body: JSON.stringify(body),
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok || payload.error) {
    const error = new Error(payload.error || `AI provider proxy failed with ${response.status}`)
    error.status = response.status
    error.code = payload.code || 'AI_PROVIDER_PROXY_FAILED'
    error.errorType = payload.errorType || classifyProviderError(error)
    error.attempts = Array.isArray(payload.attempts) ? payload.attempts : []
    throw error
  }

  return payload
}

const replayAttempts = async (attempts = [], onAttempt) => {
  if (typeof onAttempt !== 'function') return
  for (const attempt of attempts) {
    await Promise.resolve(onAttempt(attempt)).catch(() => {})
  }
}

export const fetchProviderModels = async (provider, { signal } = {}) => {
  const providerName = provider?.provider_name || ''
  if (!provider?.has_api_key && !provider?.hasApiKey && !provider?.transientKey) {
    return PROVIDER_MODELS[providerName] || []
  }

  const payload = await invokeProviderProxy({
    action: 'fetchModels',
    provider: safeProviderPayload(provider),
    transientKey: provider.transientKey || null,
  }, { signal })

  return Array.isArray(payload.models) ? payload.models : (PROVIDER_MODELS[providerName] || [])
}

export const callAI = async (providers, prompt, { signal, timeoutMs = DEFAULT_PROVIDER_TIMEOUT_MS, onAttempt } = {}) => {
  const active = sortProvidersForFallback(providers)

  if (active.length === 0) {
    throw new Error('No AI providers configured. Go to AI Settings and add at least one API key.')
  }

  try {
    const payload = await invokeProviderProxy({
      action: 'callAI',
      providers: active.map(safeProviderPayload),
      prompt,
      timeoutMs,
    }, { signal })

    await replayAttempts(payload.attempts, onAttempt)

    return {
      text: payload.text || '',
      provider: payload.provider,
      tokensUsed: payload.tokensUsed || 0,
      durationMs: payload.durationMs || 0,
      model: payload.model || '',
    }
  } catch (err) {
    await replayAttempts(err.attempts, onAttempt)
    throw err
  }
}

export const testProvider = async (provider, { timeoutMs = 20_000, signal } = {}) => {
  if (!provider?.has_api_key && !provider?.hasApiKey && !provider?.transientKey) {
    return { ok: false, durationMs: 0, error: 'No API key saved for this provider.' }
  }

  try {
    const payload = await invokeProviderProxy({
      action: 'testProvider',
      provider: safeProviderPayload(provider),
      transientKey: provider.transientKey || null,
      timeoutMs,
    }, { signal })

    return {
      ok: !!payload.ok,
      durationMs: payload.durationMs || 0,
      error: payload.error || null,
      errorType: payload.errorType || null,
      response: payload.response || '',
      model: payload.model || chooseProviderModel(provider),
      tokensUsed: payload.tokensUsed || 0,
    }
  } catch (err) {
    return {
      ok: false,
      durationMs: 0,
      error: err.message,
      errorType: err.errorType || classifyProviderError(err),
      model: chooseProviderModel(provider),
    }
  }
}

export const monitorProviders = async (providers = [], { recordFn, failureLogger, signal } = {}) => {
  if (!Array.isArray(providers)) return []
  const results = []
  for (const provider of providers) {
    if (signal?.aborted) break
    const result = await testProvider(provider, { signal })
    results.push({
      provider: provider.provider_name,
      ok: result.ok,
      durationMs: result.durationMs,
      error: result.error || null,
      errorType: result.errorType || null,
    })
    if (typeof recordFn === 'function' && provider.id) {
      await recordFn(provider.id, {
        success: !!result.ok,
        latencyMs: result.durationMs,
        error: result.error || null,
      }).catch(() => {})
    }
    if (!result.ok && typeof failureLogger === 'function') {
      await failureLogger({
        provider_name: provider.provider_name,
        error: result.error || null,
        details: { error_type: result.errorType || null, model: result.model || provider.model || null },
        duration_ms: result.durationMs,
        occurred_at: new Date().toISOString(),
      }).catch(() => {})
    }
  }
  return results
}

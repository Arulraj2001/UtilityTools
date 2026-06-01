import { supabase } from '@/api/supabaseClient'

export const DEFAULT_PROVIDER_TIMEOUT_MS = 45_000

export const DEFAULT_PROVIDER_PRIORITY = {
  deepseek: 1,
  gemini: 2,
  groq: 3,
  openrouter: 4,
  huggingface: 5,
  cerebras: 6,
}

export const PROVIDER_MODELS = {
  gemini: [
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (recommended)' },
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
    { value: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite (fast)' },
    { value: 'gemini-2.5-flash-preview-04-17', label: 'Gemini 2.5 Flash Preview' },
  ],
  groq: [
    { value: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant (fast, free)' },
    { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B Versatile (free)' },
    { value: 'llama3-70b-8192', label: 'Llama 3 70B (free)' },
    { value: 'gemma2-9b-it', label: 'Gemma 2 9B (free)' },
    { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B (free)' },
    { value: 'deepseek-r1-distill-llama-70b', label: 'DeepSeek R1 Distill 70B (free)' },
  ],
  deepseek: [
    { value: 'deepseek-chat', label: 'DeepSeek Chat V3 (recommended)' },
    { value: 'deepseek-reasoner', label: 'DeepSeek Reasoner R1' },
  ],
  openrouter: [
    { value: 'openrouter/free', label: 'OpenRouter Free Router (auto-select)' },
    { value: 'deepseek/deepseek-v4-flash:free', label: 'DeepSeek V4 Flash (free)' },
    { value: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B (free)' },
    { value: 'qwen/qwen3-coder:free', label: 'Qwen3 Coder (free)' },
    { value: 'meta-llama/llama-3.1-8b-instruct:free', label: 'Llama 3.1 8B (free)' },
    { value: 'meta-llama/llama-3.2-3b-instruct:free', label: 'Llama 3.2 3B (free)' },
    { value: 'google/gemma-3-12b-it:free', label: 'Gemma 3 12B (free)' },
    { value: 'google/gemma-2-9b-it:free', label: 'Gemma 2 9B (free)' },
    { value: 'qwen/qwen-2.5-7b-instruct:free', label: 'Qwen 2.5 7B (free)' },
    { value: 'mistralai/mistral-7b-instruct:free', label: 'Mistral 7B (free)' },
    { value: 'deepseek/deepseek-r1:free', label: 'DeepSeek R1 (free)' },
    { value: 'deepseek/deepseek-chat-v3-0324:free', label: 'DeepSeek V3 0324 (free)' },
  ],
  cerebras: [
    { value: 'llama-3.3-70b', label: 'Llama 3.3 70B (fast, free)' },
    { value: 'llama-3.1-8b', label: 'Llama 3.1 8B (fastest, free)' },
    { value: 'llama-4-scout-17b-16e-instruct', label: 'Llama 4 Scout 17B (free)' },
  ],
  huggingface: [
    { value: 'mistralai/Mistral-7B-Instruct-v0.2', label: 'Mistral 7B Instruct v0.2' },
    { value: 'mistralai/Mistral-7B-Instruct-v0.1', label: 'Mistral 7B Instruct v0.1' },
    { value: 'HuggingFaceH4/zephyr-7b-beta', label: 'Zephyr 7B Beta' },
    { value: 'microsoft/Phi-3-mini-4k-instruct', label: 'Phi-3 Mini 4K' },
  ],
}

export const PROVIDER_MODEL_PREFERENCES = {
  deepseek: ['deepseek-v4-flash', 'deepseek-chat', 'deepseek-v4-pro', 'deepseek-reasoner'],
  gemini: ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.5-flash-lite', 'gemini-flash-latest'],
  groq: ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile', 'openai/gpt-oss-20b'],
  openrouter: ['openrouter/free', 'deepseek/deepseek-v4-flash:free', 'meta-llama/llama-3.3-70b-instruct:free', 'qwen/qwen3-coder:free'],
  huggingface: ['mistralai/Mistral-7B-Instruct-v0.2', 'HuggingFaceH4/zephyr-7b-beta'],
  cerebras: ['llama-3.3-70b', 'gpt-oss-120b', 'zai-glm-4.7'],
}

const hasStoredKey = (provider = {}) => Boolean(provider.has_api_key || provider.hasApiKey)

const safeProviderPayload = (provider = {}) => ({
  id: provider.id || null,
  provider_name: provider.provider_name,
  model: provider.model || '',
  priority: provider.priority,
  is_active: provider.is_active,
  base_url: provider.base_url || null,
  available_models: Array.isArray(provider.available_models) ? provider.available_models : [],
  has_api_key: hasStoredKey(provider),
})

const getAvailableModelIds = (provider) => (
  Array.isArray(provider?.available_models)
    ? provider.available_models.map((model) => model?.value || model?.id || model?.name).filter(Boolean)
    : []
)

export const chooseProviderModel = (provider = {}) => {
  const configured = provider.model || ''
  const available = getAvailableModelIds(provider)
  const availableSet = new Set(available)
  const preferences = PROVIDER_MODEL_PREFERENCES[provider.provider_name] || []
  const staticModels = (PROVIDER_MODELS[provider.provider_name] || []).map((model) => model.value)
  const candidates = [...preferences, ...staticModels].filter(Boolean)
  const lastError = String(provider.stats?.last_error || '').toLowerCase()
  const shouldBypassConfigured =
    provider.health_status === 'down' ||
    /rate.?limit|temporarily rate-limited|insufficient balance|not found|invalid model/.test(lastError)

  if (!shouldBypassConfigured && configured && (!available.length || availableSet.has(configured))) {
    return configured
  }

  const availablePreferred = candidates.find((model) => availableSet.has(model))
  if (availablePreferred) return availablePreferred

  if (configured) return configured
  return candidates[0] || ''
}

export const sortProvidersForFallback = (providers = []) => (
  [...providers]
    .filter((provider) => provider?.is_active && hasStoredKey(provider))
    .sort((a, b) => {
      const aPriority = Number.isFinite(a.priority) ? a.priority : DEFAULT_PROVIDER_PRIORITY[a.provider_name] || 99
      const bPriority = Number.isFinite(b.priority) ? b.priority : DEFAULT_PROVIDER_PRIORITY[b.provider_name] || 99
      return aPriority - bPriority
    })
)

export const classifyProviderError = (err) => {
  const status = Number(err?.status || 0)
  const message = `${err?.message || ''} ${err?.body || ''}`.toLowerCase()

  if (err?.name === 'AbortError' || /abort|cancel/.test(message)) return 'cancelled'
  if (/timeout|timed out/.test(message)) return 'timeout'
  if (status === 401 || status === 403 || /unauthorized|forbidden|invalid api key|invalid key/.test(message)) return 'auth'
  if (status === 402 || /insufficient balance|payment required|quota/.test(message)) return 'quota'
  if (status === 408 || status === 429 || /rate.?limit|too many requests|temporarily rate-limited/.test(message)) return 'rate_limit'
  if (status >= 500 || /fetch failed|network|econnreset|enotfound|failed to fetch/.test(message)) return 'network'
  if (/empty content|invalid json|parse/.test(message)) return 'invalid_response'
  return 'provider_error'
}

const getFunctionUrl = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  if (!supabaseUrl) throw new Error('Missing VITE_SUPABASE_URL for AI provider proxy.')
  return `${supabaseUrl.replace(/\/$/, '')}/functions/v1/ai-provider-proxy`
}

const invokeProviderProxy = async (body, { signal } = {}) => {
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  const response = await fetch(getFunctionUrl(), {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      apikey: anonKey,
    },
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
  if (!hasStoredKey(provider) && !provider.transientKey) {
    return PROVIDER_MODELS[provider.provider_name] || []
  }

  const payload = await invokeProviderProxy({
    action: 'fetchModels',
    provider: safeProviderPayload(provider),
    transientKey: provider.transientKey || null,
  }, { signal })

  return Array.isArray(payload.models) ? payload.models : (PROVIDER_MODELS[provider.provider_name] || [])
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
  if (!hasStoredKey(provider) && !provider.transientKey) {
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

export const extractJSON = (text) => {
  if (!text) return null

  try { return JSON.parse(text.trim()) } catch {}

  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenceMatch) {
    try { return JSON.parse(fenceMatch[1].trim()) } catch {}
  }

  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start !== -1 && end > start) {
    try { return JSON.parse(text.slice(start, end + 1)) } catch {}
  }

  return null
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

export const deriveHealthFromStats = (stats = {}) => {
  const requests = stats.requests || 0
  const failures = stats.failures || 0
  if (requests === 0) return 'unknown'
  if (failures === 0) return 'healthy'
  if (failures / requests >= 0.5) return 'down'
  return 'degraded'
}

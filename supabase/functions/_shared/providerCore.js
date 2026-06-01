/**
 * AI Provider abstraction with automatic fallback chain.
 * Providers are tried in priority order; on any failure the next is used.
 * API keys are loaded from Supabase ai_provider_settings table (admin-only RLS).
 *
 * Supported: Gemini → Groq → DeepSeek → OpenRouter → Cerebras → HuggingFace
 *
 * All existing exports (callAI, testProvider, extractJSON, PROVIDER_MODELS)
 * remain unchanged in signature — fully backward compatible.
 */

// ── Individual provider callers ───────────────────────────────────────────────

export const DEFAULT_PROVIDER_TIMEOUT_MS = 45_000

export const DEFAULT_PROVIDER_PRIORITY = {
  deepseek: 1,
  gemini: 2,
  groq: 3,
  openrouter: 4,
  huggingface: 5,
  cerebras: 6,
}

const GEMINI_DEFAULT_MODEL = 'gemini-2.5-flash'

const redactSensitive = (value) => {
  if (value === null || value === undefined) return ''
  const text = typeof value === 'string'
    ? value
    : JSON.stringify(value, (_key, nestedValue) => {
        if (/api[_-]?key|authorization|token|secret|password/i.test(_key)) return '[REDACTED]'
        return nestedValue
      })

  return String(text)
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [REDACTED]')
    .replace(/([?&]key=)[^&\s"']+/gi, '$1[REDACTED]')
    .replace(/("api_key"\s*:\s*")[^"]+/gi, '$1[REDACTED]')
    .replace(/("authorization"\s*:\s*")[^"]+/gi, '$1[REDACTED]')
}

const normalizeErrorMessage = (err) =>
  redactSensitive(err?.message || err?.body || String(err || 'Unknown error'))

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

const createAttemptSignal = (outerSignal, timeoutMs = DEFAULT_PROVIDER_TIMEOUT_MS) => {
  const controller = new AbortController()
  let timeoutId = null

  const abortFromOuter = () => {
    if (!controller.signal.aborted) controller.abort(outerSignal?.reason || new Error('Cancelled'))
  }

  if (outerSignal) {
    if (outerSignal.aborted) abortFromOuter()
    else outerSignal.addEventListener('abort', abortFromOuter, { once: true })
  }

  if (timeoutMs > 0) {
    timeoutId = setTimeout(() => {
      if (!controller.signal.aborted) controller.abort(new Error(`Provider timed out after ${timeoutMs}ms`))
    }, timeoutMs)
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      if (timeoutId) clearTimeout(timeoutId)
      if (outerSignal) outerSignal.removeEventListener('abort', abortFromOuter)
    },
  }
}

const selectSupportedGeminiModel = async (apiKey, configuredModel, options = {}) => {
  const preferredModel = configuredModel || GEMINI_DEFAULT_MODEL
  try {
    const supportedModels = await fetchProviderModels({ provider_name: 'gemini', api_key: apiKey }, options)
    if (Array.isArray(supportedModels) && supportedModels.length > 0) {
      if (supportedModels.some((m) => m.value === preferredModel)) {
        return preferredModel
      }
      const fallbackModel =
        supportedModels.find((m) => m.value === GEMINI_DEFAULT_MODEL)?.value ||
        supportedModels[0].value
      console.warn(
        `[Gemini] configured model ${preferredModel} unavailable; switching to supported model ${fallbackModel}`
      )
      return fallbackModel
    }
  } catch (err) {
    console.warn('[Gemini] unable to validate configured model:', normalizeErrorMessage(err))
  }
  return preferredModel
}

const callGemini = async (apiKey, model, prompt, _baseUrl, options = {}) => {
  const mdl = await selectSupportedGeminiModel(apiKey, model, options)
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${mdl}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      signal: options.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 8192, temperature: 0.3, topP: 0.9 },
      }),
    }
  )
  if (!res.ok) {
    const body = await res.text()
    const error = new Error(`Gemini ${res.status}: ${redactSensitive(body.slice(0, 300))}`)
    error.status = res.status
    error.body = body
    throw error
  }
  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Gemini returned empty content')
  return { text, tokensUsed: data.usageMetadata?.totalTokenCount ?? 0 }
}

// OpenAI-compatible helper (used by Groq, DeepSeek, Cerebras, OpenRouter)
const inferModelMaxTokens = (modelInfo) => {
  if (!modelInfo || typeof modelInfo !== 'object') return undefined
  const candidates = [
    modelInfo.max_tokens,
    modelInfo.maxTokens,
    modelInfo.token_limit,
    modelInfo.context_length,
    modelInfo.context_window,
    modelInfo.capacity?.max_tokens,
    modelInfo.metadata?.max_tokens,
    modelInfo.result?.context_window,
  ]
  return candidates.find(
    (value) => Number.isFinite(value) && value > 0
  )
}

const fetchOpenAIModelInfo = async (apiKey, model, baseUrl, providerName, signal) => {
  if (!apiKey || !model || !baseUrl) return null
  try {
    const url = `${baseUrl.replace(/\/$/, '')}/models/${encodeURIComponent(model)}`
    const res = await fetch(url, {
      signal,
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (!res.ok) {
      const body = await res.text()
      console.warn(
        `[fetchOpenAIModelInfo] ${providerName} ${model}: ${res.status} ${redactSensitive(body.slice(0, 300))}`
      )
      return null
    }
    return await res.json()
  } catch (err) {
    if (err?.name !== 'AbortError') {
      console.warn(`[fetchOpenAIModelInfo] ${providerName} ${model}:`, normalizeErrorMessage(err))
    }
    return null
  }
}

const capMaxTokens = (requestedTokens, modelInfo) => {
  const modelMax = inferModelMaxTokens(modelInfo)
  if (Number.isFinite(modelMax) && modelMax > 0) {
    return Math.min(requestedTokens, modelMax)
  }
  return requestedTokens
}

const GROQ_MAX_REQUEST_TOKENS = 4000
const GROQ_MAX_REQUEST_CHARS = GROQ_MAX_REQUEST_TOKENS * 4
const GROQ_HIGH_WATERMARK_TOKENS = 6000

const estimateTokens = (text = '') => Math.max(1, Math.ceil(String(text).length / 4))

const compressGroqPrompt = (prompt) => {
  const text = String(prompt || '').trim()
  if (!text) return ''

  return text
    .replace(/\r\n/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .replace(/([,;:.!?])\s+/g, '$1 ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

const prepareGroqPrompt = (prompt) => {
  const original = String(prompt || '')
  const compressed = compressGroqPrompt(original)
  const charLength = compressed.length
  const estimatedTokens = estimateTokens(compressed)
  let finalPrompt = compressed
  let truncated = false

  if (estimatedTokens > GROQ_MAX_REQUEST_TOKENS) {
    finalPrompt = compressed.slice(0, GROQ_MAX_REQUEST_CHARS)
    truncated = true
  }

  return {
    prompt: finalPrompt,
    originalLength: original.length,
    promptLength: finalPrompt.length,
    estimatedTokens: estimateTokens(finalPrompt),
    truncated,
  }
}

const callOpenAICompat = async (apiKey, model, prompt, baseUrl, providerName, extraHeaders = {}, options = {}) => {
  const modelInfo = await fetchOpenAIModelInfo(apiKey, model, baseUrl, providerName, options.signal)
  const maxTokens = capMaxTokens(8000, modelInfo)
  const timings = { fetchStart: null, fetchEnd: null, readEnd: null }
  let res
  try {
    timings.fetchStart = Date.now()
    res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      signal: options.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        ...extraHeaders,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        temperature: 0.3,
      }),
    })
    timings.fetchEnd = Date.now()
  } catch (err) {
    // network / fetch-level error (including AbortError)
    timings.fetchEnd = Date.now()
    if (providerName === 'OpenRouter') {
      console.log('[openrouter] fetch_error', { providerName, endpoint: baseUrl, error: normalizeErrorMessage(err), name: err?.name, message: err?.message, timings })
    }
    const error = new Error(`${providerName} fetch failed: ${err?.name || 'Error'}: ${normalizeErrorMessage(err)}`)
    error.status = err?.status || null
    error.body = err?.body || null
    error.rawError = err
    throw error
  }

  try {
    if (!res.ok) {
      const body = await res.text()
      if (providerName === 'OpenRouter') {
        timings.readEnd = Date.now()
        console.log('[openrouter] response_non_ok', { providerName, endpoint: baseUrl, status: res.status, timings, body: redactSensitive(body.slice(0, 300)) })
      }
      const error = new Error(`${providerName} ${res.status}: ${redactSensitive(body.slice(0, 300))}`)
      error.status = res.status
      error.body = body
      throw error
    }
    const data = await res.json()
    timings.readEnd = Date.now()
    if (providerName === 'OpenRouter') {
      console.log('[openrouter] timings', { providerName, endpoint: baseUrl, fetchMs: timings.fetchEnd - timings.fetchStart, readMs: timings.readEnd - timings.fetchEnd, totalMs: timings.readEnd - timings.fetchStart })
    }
    const text = data.choices?.[0]?.message?.content
    if (!text) throw new Error(`${providerName} returned empty content`)
    return { text, tokensUsed: data.usage?.total_tokens ?? 0 }
  } catch (err) {
    if (providerName === 'OpenRouter') {
      console.log('[openrouter] parse_error', { providerName, endpoint: baseUrl, error: normalizeErrorMessage(err), name: err?.name, message: err?.message, timings })
    }
    throw err
  }
}

const callGroq = (apiKey, model, prompt, _baseUrl, options = {}) => {
  const prepared = prepareGroqPrompt(prompt)
  const endpoint = 'https://api.groq.com/openai/v1'

  const requestInfo = {
    provider: 'Groq',
    endpoint,
    model: model || 'llama-3.1-8b-instant',
    originalPromptLength: prepared.originalLength,
    promptLength: prepared.promptLength,
    estimatedTokens: prepared.estimatedTokens,
    truncated: prepared.truncated,
  }

  if (prepared.estimatedTokens >= GROQ_HIGH_WATERMARK_TOKENS) {
    console.warn('[groq] request exceeds 6000 token estimate', requestInfo)
  } else {
    console.log('[groq] request', requestInfo)
  }

  return callOpenAICompat(
    apiKey,
    model || 'llama-3.1-8b-instant',
    prepared.prompt,
    endpoint,
    'Groq',
    {},
    options
  )
}

const callDeepSeek = (apiKey, model, prompt, baseUrl, options = {}) =>
  callOpenAICompat(
    apiKey,
    model || 'deepseek-chat',
    prompt,
    (baseUrl || 'https://api.deepseek.com/v1').replace(/\/$/, ''),
    'DeepSeek',
    {},
    options
  )

const callOpenRouter = async (apiKey, model, prompt, _baseUrl, options = {}) => {
  const endpoint = 'https://openrouter.ai/api/v1'
  const referer = (typeof window !== 'undefined' && window?.location?.origin) || ''
  const insight = {
    provider: 'OpenRouter',
    endpoint,
    model: model || 'openrouter/free',
    referer: referer || '(none)',
    promptLength: prompt?.length || 0,
  }
  console.log('[openrouter] request', insight)

  try {
    const result = await callOpenAICompat(
      apiKey,
      model || 'openrouter/free',
      prompt,
      endpoint,
      'OpenRouter',
      {
        'HTTP-Referer': referer,
        'X-Title': 'AI Job Intelligence',
      },
      options
    )
    console.log('[openrouter] response', {
      ...insight,
      tokensUsed: result.tokensUsed || 0,
      textLength: result.text?.length || 0,
    })
    return result
  } catch (err) {
    console.log('[openrouter] error', {
      ...insight,
      error: normalizeErrorMessage(err),
    })
    throw err
  }
}

const callCerebras = (apiKey, model, prompt, baseUrl, options = {}) =>
  callOpenAICompat(
    apiKey,
    model || 'llama-3.3-70b',
    prompt,
    (baseUrl || 'https://api.cerebras.ai/v1').replace(/\/$/, ''),
    'Cerebras',
    {},
    options
  )

const callHuggingFace = async (apiKey, model, prompt, _baseUrl, options = {}) => {
  const mdl = model || 'mistralai/Mistral-7B-Instruct-v0.2'
  const encodedModel = mdl
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
  const endpoint = `https://api-inference.huggingface.co/models/${encodedModel}`
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  }
  const body = JSON.stringify({
    inputs: prompt,
    parameters: { max_new_tokens: 4000, temperature: 0.3, return_full_text: false },
  })

  let res
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      signal: options.signal,
      headers,
      body,
    })
  } catch (err) {
    console.warn('[HuggingFace] request failed', {
      endpoint,
      model: mdl,
      error: normalizeErrorMessage(err),
    })
    const error = new Error(
      `HuggingFace fetch failed: ${err.name}: ${normalizeErrorMessage(err)} | endpoint=${endpoint}`
    )
    error.endpoint = endpoint
    error.status = err.status || null
    error.body = err.body || null
    error.requestBody = body
    error.rawError = err
    throw error
  }

  if (!res.ok) {
    const responseText = await res.text()
    const error = new Error(
      `HuggingFace ${res.status}: ${redactSensitive(responseText.slice(0, 1000))} | endpoint=${endpoint}`
    )
    error.status = res.status
    error.body = responseText
    error.endpoint = endpoint
    error.requestBody = body
    throw error
  }

  const data = await res.json()
  let text = ''
  if (Array.isArray(data)) text = data[0]?.generated_text || ''
  else text = data.generated_text || ''
  if (!text) {
    const error = new Error(
      `HuggingFace returned empty content | endpoint=${endpoint}`
    )
    error.status = res.status
    error.body = JSON.stringify(data)
    error.endpoint = endpoint
    throw error
  }
  return { text, tokensUsed: 0 }
}

export const CALLERS = {
  gemini:      callGemini,
  groq:        callGroq,
  deepseek:    callDeepSeek,
  openrouter:  callOpenRouter,
  cerebras:    callCerebras,
  huggingface: callHuggingFace,
}

// ── Static fallback model lists (used when dynamic fetch unavailable) ──────────

export const PROVIDER_MODELS = {
  gemini: [
    { value: 'gemini-2.5-flash',                    label: 'Gemini 2.5 Flash (recommended)' },
    { value: 'gemini-2.0-flash',                    label: 'Gemini 2.0 Flash' },
    { value: 'gemini-2.0-flash-lite',               label: 'Gemini 2.0 Flash Lite (fast)' },
    { value: 'gemini-2.5-flash-preview-04-17',      label: 'Gemini 2.5 Flash Preview' },
  ],
  groq: [
    { value: 'llama-3.1-8b-instant',               label: 'Llama 3.1 8B Instant (fast, free)' },
    { value: 'llama-3.3-70b-versatile',            label: 'Llama 3.3 70B Versatile (free)' },
    { value: 'llama3-70b-8192',                    label: 'Llama 3 70B (free)' },
    { value: 'gemma2-9b-it',                       label: 'Gemma 2 9B (free)' },
    { value: 'mixtral-8x7b-32768',                 label: 'Mixtral 8x7B (free)' },
    { value: 'deepseek-r1-distill-llama-70b',      label: 'DeepSeek R1 Distill 70B (free)' },
  ],
  deepseek: [
    { value: 'deepseek-chat',                      label: 'DeepSeek Chat V3 (recommended)' },
    { value: 'deepseek-reasoner',                  label: 'DeepSeek Reasoner R1' },
  ],
  openrouter: [
    { value: 'openrouter/free',                            label: 'OpenRouter Free Router (auto-select)' },
    { value: 'deepseek/deepseek-v4-flash:free',            label: 'DeepSeek V4 Flash (free)' },
    { value: 'meta-llama/llama-3.3-70b-instruct:free',     label: 'Llama 3.3 70B (free)' },
    { value: 'qwen/qwen3-coder:free',                      label: 'Qwen3 Coder (free)' },
    { value: 'meta-llama/llama-3.1-8b-instruct:free',    label: 'Llama 3.1 8B (free)' },
    { value: 'meta-llama/llama-3.2-3b-instruct:free',    label: 'Llama 3.2 3B (free)' },
    { value: 'google/gemma-3-12b-it:free',               label: 'Gemma 3 12B (free)' },
    { value: 'google/gemma-2-9b-it:free',                label: 'Gemma 2 9B (free)' },
    { value: 'qwen/qwen-2.5-7b-instruct:free',           label: 'Qwen 2.5 7B (free)' },
    { value: 'mistralai/mistral-7b-instruct:free',       label: 'Mistral 7B (free)' },
    { value: 'deepseek/deepseek-r1:free',                label: 'DeepSeek R1 (free)' },
    { value: 'deepseek/deepseek-chat-v3-0324:free',      label: 'DeepSeek V3 0324 (free)' },
  ],
  cerebras: [
    { value: 'llama-3.3-70b',                      label: 'Llama 3.3 70B (fast, free)' },
    { value: 'llama-3.1-8b',                       label: 'Llama 3.1 8B (fastest, free)' },
    { value: 'llama-4-scout-17b-16e-instruct',     label: 'Llama 4 Scout 17B (free)' },
  ],
  huggingface: [
    { value: 'mistralai/Mistral-7B-Instruct-v0.2', label: 'Mistral 7B Instruct v0.2' },
    { value: 'mistralai/Mistral-7B-Instruct-v0.1', label: 'Mistral 7B Instruct v0.1' },
    { value: 'HuggingFaceH4/zephyr-7b-beta',       label: 'Zephyr 7B Beta' },
    { value: 'microsoft/Phi-3-mini-4k-instruct',   label: 'Phi-3 Mini 4K' },
  ],
}

// ── Dynamic model discovery ────────────────────────────────────────────────────

/**
 * Fetch the live model list directly from a provider's API.
 * Returns [{ value, label }] or falls back to PROVIDER_MODELS static list on error.
 */
export const PROVIDER_MODEL_PREFERENCES = {
  deepseek: ['deepseek-v4-flash', 'deepseek-chat', 'deepseek-v4-pro', 'deepseek-reasoner'],
  gemini: ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.5-flash-lite', 'gemini-flash-latest'],
  groq: ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile', 'openai/gpt-oss-20b'],
  openrouter: ['openrouter/free', 'deepseek/deepseek-v4-flash:free', 'meta-llama/llama-3.3-70b-instruct:free', 'qwen/qwen3-coder:free'],
  huggingface: ['mistralai/Mistral-7B-Instruct-v0.2', 'HuggingFaceH4/zephyr-7b-beta'],
  cerebras: ['llama-3.3-70b', 'gpt-oss-120b', 'zai-glm-4.7'],
}

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
  const staticModels = (PROVIDER_MODELS[provider.provider_name] || []).map((m) => m.value)
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
    .filter(p => p?.is_active && p?.api_key)
    .sort((a, b) => {
      const aPriority = Number.isFinite(a.priority) ? a.priority : DEFAULT_PROVIDER_PRIORITY[a.provider_name] || 99
      const bPriority = Number.isFinite(b.priority) ? b.priority : DEFAULT_PROVIDER_PRIORITY[b.provider_name] || 99
      return aPriority - bPriority
    })
)

export const fetchProviderModels = async (provider, { signal } = {}) => {
  const { provider_name, api_key, base_url } = provider
  if (!api_key) return PROVIDER_MODELS[provider_name] || []

  try {
    switch (provider_name) {
      case 'gemini': {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${api_key}&pageSize=50`,
          { signal }
        )
        if (!res.ok) throw new Error(`Gemini models API ${res.status}`)
        const data = await res.json()
        return (data.models || [])
          .filter(m =>
            m.supportedGenerationMethods?.includes('generateContent') &&
            m.name.includes('gemini')
          )
          .map(m => ({
            value: m.name.replace('models/', ''),
            label: m.displayName || m.name.replace('models/', ''),
          }))
          .sort((a, b) => a.label.localeCompare(b.label))
      }

      case 'groq': {
        const res = await fetch('https://api.groq.com/openai/v1/models', {
          signal,
          headers: { Authorization: `Bearer ${api_key}` },
        })
        if (!res.ok) throw new Error(`Groq models API ${res.status}`)
        const data = await res.json()
        return (data.data || [])
          .filter(m => !m.id.includes('whisper') && !m.id.includes('distil'))
          .map(m => ({ value: m.id, label: m.id }))
          .sort((a, b) => a.label.localeCompare(b.label))
      }

      case 'deepseek': {
        const base = (base_url || 'https://api.deepseek.com/v1').replace(/\/$/, '')
        const res = await fetch(`${base}/models`, {
          signal,
          headers: { Authorization: `Bearer ${api_key}` },
        })
        if (!res.ok) throw new Error(`DeepSeek models API ${res.status}`)
        const data = await res.json()
        return (data.data || []).map(m => ({ value: m.id, label: m.id }))
      }

      case 'openrouter': {
        const res = await fetch('https://openrouter.ai/api/v1/models', {
          signal,
          headers: { Authorization: `Bearer ${api_key}` },
        })
        if (!res.ok) throw new Error(`OpenRouter models API ${res.status}`)
        const data = await res.json()
        const free = (data.data || []).filter(
          m => m.id.endsWith(':free') || m.pricing?.prompt === '0' || m.pricing?.prompt === 0
        )
        return free
          .map(m => ({ value: m.id, label: `${m.name || m.id} (free)` }))
          .sort((a, b) => a.label.localeCompare(b.label))
          .slice(0, 40)
      }

      case 'cerebras': {
        const base = (base_url || 'https://api.cerebras.ai/v1').replace(/\/$/, '')
        const res = await fetch(`${base}/models`, {
          signal,
          headers: { Authorization: `Bearer ${api_key}` },
        })
        if (!res.ok) throw new Error(`Cerebras models API ${res.status}`)
        const data = await res.json()
        return (data.data || []).map(m => ({ value: m.id, label: m.id }))
      }

      case 'huggingface':
        // No standard models list endpoint — return static list
        return PROVIDER_MODELS.huggingface

      default:
        return PROVIDER_MODELS[provider_name] || []
    }
  } catch (err) {
    if (err?.name !== 'AbortError') {
      console.warn(`[fetchProviderModels] ${provider_name}:`, normalizeErrorMessage(err))
    }
    return PROVIDER_MODELS[provider_name] || []
  }
}

// ── Main call function ─────────────────────────────────────────────────────────

/**
 * Call AI with automatic fallback chain.
 * providers: array from ai_provider_settings, sorted by priority.
 * Returns { text, provider, tokensUsed, durationMs }
 *
 * Backward compatible: signature unchanged.
 */
export const callAI = async (providers, prompt, { signal, timeoutMs = DEFAULT_PROVIDER_TIMEOUT_MS, onAttempt } = {}) => {
  const active = sortProvidersForFallback(providers)

  if (active.length === 0) {
    throw new Error(
      'No AI providers configured. Go to AI Settings and add at least one API key.'
    )
  }

  const errors = []

  for (const provider of active) {
    if (signal?.aborted) throw new Error('Cancelled')

    const caller = CALLERS[provider.provider_name]
    if (!caller) continue

    const model = chooseProviderModel(provider)
    const attemptSignal = createAttemptSignal(signal, timeoutMs)
    const t0 = Date.now()
    try {
      const result = await caller(
        provider.api_key,
        model,
        prompt,
        provider.base_url || null,
        { signal: attemptSignal.signal, provider }
      )
      const durationMs = Date.now() - t0
      if (typeof onAttempt === 'function') {
        await Promise.resolve(onAttempt({
          provider,
          providerName: provider.provider_name,
          model,
          ok: true,
          durationMs,
          tokensUsed: result.tokensUsed || 0,
          error: null,
          errorType: null,
        })).catch(() => {})
      }
      return {
        ...result,
        provider: provider.provider_name,
        model,
        durationMs,
      }
    } catch (err) {
      const durationMs = Date.now() - t0
      const error = normalizeErrorMessage(err)
      const errorType = classifyProviderError(err)
      console.warn(`[AI] ${provider.provider_name} failed (${errorType}):`, error)
      errors.push({ provider: provider.provider_name, model, error, errorType, durationMs })
      if (typeof onAttempt === 'function') {
        await Promise.resolve(onAttempt({
          provider,
          providerName: provider.provider_name,
          model,
          ok: false,
          durationMs,
          tokensUsed: 0,
          error,
          errorType,
        })).catch(() => {})
      }
    } finally {
      attemptSignal.cleanup()
    }
  }

  const error = new Error(
    `All AI providers failed.\n${errors.map(e => `${e.provider}: ${e.error}`).join('\n')}\n\nCheck API keys in AI Settings.`
  )
  error.code = 'AI_PROVIDERS_FAILED'
  error.attempts = errors
  throw error
}

/**
 * Test a single provider connection.
 * Returns { ok, durationMs, error?, response? }
 *
 * Backward compatible: signature unchanged.
 */
export const testProvider = async (provider, { timeoutMs = 20_000, signal } = {}) => {
  const caller = CALLERS[provider.provider_name]
  if (!caller) return { ok: false, error: `Unknown provider: ${provider.provider_name}` }

  const model = chooseProviderModel(provider)
  const attemptSignal = createAttemptSignal(signal, timeoutMs)
  const t0 = Date.now()
  try {
    const result = await caller(
      provider.api_key,
      model,
      'Reply with exactly one word: OK',
      provider.base_url || null,
      { signal: attemptSignal.signal, provider }
    )
    return {
      ok: !!result.text,
      durationMs: Date.now() - t0,
      response: result.text?.slice(0, 60),
      tokensUsed: result.tokensUsed,
      model,
    }
  } catch (err) {
    return {
      ok: false,
      durationMs: Date.now() - t0,
      error: normalizeErrorMessage(err),
      errorType: classifyProviderError(err),
      model,
    }
  } finally {
    attemptSignal.cleanup()
  }
}

// ── JSON extraction from AI response ──────────────────────────────────────────

/**
 * Extract a JSON object from AI response text.
 * Handles markdown fences and leading/trailing garbage.
 * Backward compatible: signature and behaviour unchanged.
 */
export const extractJSON = (text) => {
  if (!text) return null

  try { return JSON.parse(text.trim()) } catch {}

  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenceMatch) {
    try { return JSON.parse(fenceMatch[1].trim()) } catch {}
  }

  const start = text.indexOf('{')
  const end   = text.lastIndexOf('}')
  if (start !== -1 && end > start) {
    try { return JSON.parse(text.slice(start, end + 1)) } catch {}
  }

  return null
}

/**
 * Periodic provider monitor helper.
 * Runs `testProvider` for each provided provider and records results via a provided recorder.
 * - `providers`: array of provider rows
 * - `recordFn`: async function(id, { success, latencyMs, error }) used to persist call stats
 * - `failureLogger`: async function(payload) used to ingest failure records (best-effort)
 */
export const monitorProviders = async (providers = [], { recordFn, failureLogger, signal } = {}) => {
  if (!Array.isArray(providers)) return [];
  const results = [];
  for (const p of providers) {
    if (signal?.aborted) break;
    try {
      const res = await testProvider(p);
      results.push({ provider: p.provider_name, ok: res.ok, durationMs: res.durationMs, error: res.error || null, errorType: res.errorType || null });
      if (typeof recordFn === 'function' && p.id) {
        await recordFn(p.id, { success: !!res.ok, latencyMs: res.durationMs, error: res.error || null }).catch(() => {});
      }
      if (!res.ok && typeof failureLogger === 'function') {
        await failureLogger({
          provider_name: p.provider_name,
          error: res.error || null,
          details: { error_type: res.errorType || null, model: res.model || p.model || null },
          duration_ms: res.durationMs,
          occurred_at: new Date().toISOString(),
        }).catch(() => {});
      }
    } catch (err) {
      const error = normalizeErrorMessage(err);
      results.push({ provider: p.provider_name, ok: false, durationMs: 0, error, errorType: classifyProviderError(err) });
      if (typeof recordFn === 'function' && p.id) {
        await recordFn(p.id, { success: false, latencyMs: 0, error }).catch(() => {});
      }
      if (typeof failureLogger === 'function') {
        await failureLogger({
          provider_name: p.provider_name,
          error,
          details: { error_type: classifyProviderError(err), model: p.model || null },
          duration_ms: 0,
          occurred_at: new Date().toISOString(),
        }).catch(() => {});
      }
    }
  }
  return results;
}

/**
 * Derive a simple health label from stats object.
 */
export const deriveHealthFromStats = (stats = {}) => {
  const requests = stats.requests || 0;
  const failures = stats.failures || 0;
  if (requests === 0) return 'unknown';
  if (failures === 0) return 'healthy';
  if (failures / requests >= 0.5) return 'down';
  return 'degraded';
}

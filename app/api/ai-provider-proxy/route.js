import { createClient } from '@supabase/supabase-js'
import WebSocket from 'ws'
import {
  PROVIDER_MODELS,
  chooseProviderModel,
  classifyProviderError,
  normalizeProviderName,
} from '@/lib/aiProviderCore'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = WebSocket
}

const PROVIDER_FIELDS = [
  'id',
  'provider_name',
  'model',
  'priority',
  'is_active',
  'base_url',
  'available_models',
  'stats',
  'health_status',
  'last_tested',
  'last_latency_ms',
  'updated_at',
  'api_key',
].join(',')

const OPENAI_COMPATIBLE_PROVIDERS = {
  openai: { label: 'OpenAI', baseUrl: 'https://api.openai.com/v1' },
  deepseek: { label: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1' },
  groq: { label: 'Groq', baseUrl: 'https://api.groq.com/openai/v1' },
  openrouter: { label: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1' },
  cerebras: { label: 'Cerebras', baseUrl: 'https://api.cerebras.ai/v1' },
}

const getEnv = (...names) => {
  for (const name of names) {
    if (process.env[name]) return process.env[name]
  }
  return ''
}

const supabaseUrl = () => getEnv('NEXT_PUBLIC_SUPABASE_URL', 'VITE_SUPABASE_URL')
const supabaseAnonKey = () => getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY')
const supabaseServiceKey = () => getEnv('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_KEY')

const json = (payload, status = 200) => Response.json(payload, {
  status,
  headers: { 'Cache-Control': 'no-store' },
})

const httpError = (status, message, code = 'AI_PROVIDER_PROXY_ERROR') => {
  const error = new Error(message)
  error.status = status
  error.code = code
  return error
}

const redactMessage = (value) => String(value || 'Unknown provider error')
  .replace(/sk-[A-Za-z0-9_-]+/g, '[redacted-key]')
  .replace(/sk-proj-[A-Za-z0-9_-]+/g, '[redacted-key]')
  .slice(0, 500)

const createSupabase = ({ token = '', forceAnon = false } = {}) => {
  const url = supabaseUrl()
  const anonKey = supabaseAnonKey()
  const serviceKey = forceAnon ? '' : supabaseServiceKey()
  const key = serviceKey || anonKey

  if (!url || !key || !anonKey) {
    throw httpError(500, 'Supabase server configuration is missing.', 'SUPABASE_CONFIG_MISSING')
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: token && !serviceKey ? { Authorization: `Bearer ${token}` } : {},
    },
    realtime: {
      transport: WebSocket,
    },
  })
}

const getBearerToken = (request) => {
  const authorization = request.headers.get('authorization') || ''
  const match = authorization.match(/^Bearer\s+(.+)$/i)
  return match?.[1] || ''
}

const requireAdmin = async (request) => {
  const token = getBearerToken(request)
  if (!token) throw httpError(401, 'Admin session is required. Please log in.', 'ADMIN_AUTH_REQUIRED')

  const authClient = createSupabase({ forceAnon: true })
  const { data: authData, error: authError } = await authClient.auth.getUser(token)
  const user = authData?.user
  if (authError || !user) {
    throw httpError(401, 'Admin session is invalid or expired.', 'ADMIN_AUTH_INVALID')
  }

  const supabase = createSupabase({ token })
  const { data: admin, error: adminError } = await supabase
    .from('admin_users')
    .select('id,is_admin')
    .eq('id', user.id)
    .maybeSingle()

  if (adminError) throw httpError(500, `Unable to verify admin access: ${adminError.message}`, 'ADMIN_VERIFY_FAILED')
  if (!admin?.is_admin) throw httpError(403, 'Admin access is required.', 'ADMIN_FORBIDDEN')

  return { supabase, user }
}

const safeProvider = (provider = {}) => {
  const { api_key, ...safe } = provider
  return {
    ...safe,
    provider_name: normalizeProviderName(safe.provider_name),
    has_api_key: Boolean(String(api_key || '').trim()),
  }
}

const getProviderQuery = (supabase, provider = {}) => {
  const id = provider.id && !String(provider.id).startsWith('missing-') ? provider.id : null
  const providerName = normalizeProviderName(provider.provider_name)
  let query = supabase.from('ai_provider_settings').select(PROVIDER_FIELDS)
  query = id ? query.eq('id', id) : query.eq('provider_name', providerName)
  return query.maybeSingle()
}

const resolveProvider = async (supabase, provider = {}, transientKey = null) => {
  const providerName = normalizeProviderName(provider.provider_name)
  const canUseTransientOnly = transientKey && (!provider.id || String(provider.id).startsWith('missing-'))

  if (canUseTransientOnly) {
    return {
      ...provider,
      provider_name: providerName,
      api_key: transientKey,
      is_active: provider.is_active ?? true,
      available_models: provider.available_models || [],
      stats: provider.stats || {},
    }
  }

  const { data, error } = await getProviderQuery(supabase, provider)
  if (error) throw httpError(500, `Unable to read provider settings: ${error.message}`, 'PROVIDER_READ_FAILED')
  if (!data) throw httpError(404, `Provider not found: ${providerName || provider.id || 'unknown'}`, 'PROVIDER_NOT_FOUND')

  return {
    ...data,
    model: provider.model || data.model,
    base_url: provider.base_url ?? data.base_url,
    available_models: provider.available_models?.length ? provider.available_models : data.available_models,
    api_key: transientKey || data.api_key || '',
  }
}

const providerError = (label, response, payload) => {
  const message =
    payload?.error?.message ||
    payload?.error ||
    payload?.message ||
    (typeof payload === 'string' ? payload : JSON.stringify(payload || {}))

  const error = new Error(`${label} ${response.status}: ${redactMessage(message)}`)
  error.status = response.status
  error.body = redactMessage(typeof payload === 'string' ? payload : JSON.stringify(payload || {}))
  return error
}

const fetchJson = async (url, options = {}, { timeoutMs = 20_000, label = 'Provider' } = {}) => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      ...options,
      signal: options.signal || controller.signal,
    })
    const text = await response.text()
    let payload = null
    try {
      payload = text ? JSON.parse(text) : null
    } catch {
      payload = text
    }

    if (!response.ok) throw providerError(label, response, payload)
    return payload
  } catch (err) {
    if (err?.name === 'AbortError') {
      const timeoutError = new Error(`${label} timed out after ${timeoutMs}ms`)
      timeoutError.status = 408
      throw timeoutError
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

const openAiCompatibleHeaders = (providerName, apiKey) => {
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  }

  if (providerName === 'openrouter') {
    const siteUrl = getEnv('NEXT_PUBLIC_SITE_URL', 'VITE_SITE_URL')
    if (siteUrl) headers['HTTP-Referer'] = siteUrl
    headers['X-Title'] = 'UtilityToolsNext Job Intelligence'
  }

  return headers
}

const openAiCompatibleConfig = (provider) => {
  const providerName = normalizeProviderName(provider.provider_name)
  const config = OPENAI_COMPATIBLE_PROVIDERS[providerName]
  if (!config) throw httpError(400, `Unknown provider: ${providerName}`, 'UNKNOWN_PROVIDER')

  return {
    ...config,
    providerName,
    baseUrl: String(provider.base_url || config.baseUrl).replace(/\/$/, ''),
  }
}

const parseOpenAiText = (payload = {}) => {
  const chatText = payload.choices?.[0]?.message?.content
  if (typeof chatText === 'string') return chatText

  if (typeof payload.output_text === 'string') return payload.output_text

  if (Array.isArray(payload.output)) {
    return payload.output
      .flatMap((item) => Array.isArray(item.content) ? item.content : [])
      .map((content) => content.text || content.value || '')
      .filter(Boolean)
      .join('\n')
  }

  return ''
}

const shouldTryOpenAiResponses = (err) => (
  err?.status === 400 &&
  /responses api|not supported|unsupported|chat.?completions|parameter|max_tokens|max_completion_tokens/i.test(err.message || '')
)

const callOpenAiCompatible = async (provider, prompt, { timeoutMs = 20_000 } = {}) => {
  const apiKey = String(provider.api_key || '').trim()
  if (!apiKey) throw httpError(400, 'No API key saved for this provider.', 'PROVIDER_KEY_MISSING')

  const config = openAiCompatibleConfig(provider)
  const model = chooseProviderModel(provider)
  if (!model) throw httpError(400, `No model configured for ${config.label}.`, 'PROVIDER_MODEL_MISSING')

  const body = {
    model,
    messages: [
      { role: 'system', content: 'You are a concise assistant for job intelligence workflows. Return the requested format only.' },
      { role: 'user', content: prompt },
    ],
  }

  try {
    const payload = await fetchJson(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: openAiCompatibleHeaders(config.providerName, apiKey),
      body: JSON.stringify(body),
    }, { timeoutMs, label: config.label })

    const text = parseOpenAiText(payload)
    if (!text) throw httpError(502, `${config.label} returned empty content.`, 'PROVIDER_EMPTY_CONTENT')

    return {
      text,
      provider: config.providerName,
      model,
      tokensUsed: payload.usage?.total_tokens || payload.usage?.totalTokens || 0,
    }
  } catch (err) {
    if (config.providerName !== 'openai' || !shouldTryOpenAiResponses(err)) throw err

    const payload = await fetchJson(`${config.baseUrl}/responses`, {
      method: 'POST',
      headers: openAiCompatibleHeaders(config.providerName, apiKey),
      body: JSON.stringify({ model, input: prompt }),
    }, { timeoutMs, label: config.label })

    const text = parseOpenAiText(payload)
    if (!text) throw httpError(502, `${config.label} returned empty content.`, 'PROVIDER_EMPTY_CONTENT')

    return {
      text,
      provider: config.providerName,
      model,
      tokensUsed: payload.usage?.total_tokens || payload.usage?.totalTokens || 0,
    }
  }
}

const fetchOpenAiCompatibleModels = async (provider, { timeoutMs = 20_000 } = {}) => {
  const apiKey = String(provider.api_key || '').trim()
  if (!apiKey) return PROVIDER_MODELS[normalizeProviderName(provider.provider_name)] || []

  const config = openAiCompatibleConfig(provider)
  const payload = await fetchJson(`${config.baseUrl}/models`, {
    headers: openAiCompatibleHeaders(config.providerName, apiKey),
  }, { timeoutMs, label: config.label })

  const models = Array.isArray(payload?.data) ? payload.data : []
  return models
    .map((model) => {
      const id = model.id || model.name
      return id ? { value: id, label: model.name && model.name !== id ? `${model.name} (${id})` : id } : null
    })
    .filter(Boolean)
}

const callGemini = async (provider, prompt, { timeoutMs = 20_000 } = {}) => {
  const apiKey = String(provider.api_key || '').trim()
  if (!apiKey) throw httpError(400, 'No API key saved for this provider.', 'PROVIDER_KEY_MISSING')

  const model = chooseProviderModel(provider)
  if (!model) throw httpError(400, 'No model configured for Gemini.', 'PROVIDER_MODEL_MISSING')

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`
  const payload = await fetchJson(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2 },
    }),
  }, { timeoutMs, label: 'Gemini' })

  const text = payload?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || '')
    .filter(Boolean)
    .join('\n') || ''

  if (!text) throw httpError(502, 'Gemini returned empty content.', 'PROVIDER_EMPTY_CONTENT')

  return {
    text,
    provider: 'gemini',
    model,
    tokensUsed: payload.usageMetadata?.totalTokenCount || 0,
  }
}

const fetchGeminiModels = async (provider, { timeoutMs = 20_000 } = {}) => {
  const apiKey = String(provider.api_key || '').trim()
  if (!apiKey) return PROVIDER_MODELS.gemini

  const payload = await fetchJson(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`, {}, {
    timeoutMs,
    label: 'Gemini',
  })

  const models = Array.isArray(payload?.models) ? payload.models : []
  return models
    .filter((model) => !Array.isArray(model.supportedGenerationMethods) || model.supportedGenerationMethods.includes('generateContent'))
    .map((model) => {
      const id = String(model.name || '').replace(/^models\//, '')
      return id ? { value: id, label: model.displayName ? `${model.displayName} (${id})` : id } : null
    })
    .filter(Boolean)
}

const callHuggingFace = async (provider, prompt, { timeoutMs = 20_000 } = {}) => {
  const apiKey = String(provider.api_key || '').trim()
  if (!apiKey) throw httpError(400, 'No API key saved for this provider.', 'PROVIDER_KEY_MISSING')

  const model = chooseProviderModel(provider)
  if (!model) throw httpError(400, 'No model configured for HuggingFace.', 'PROVIDER_MODEL_MISSING')

  const payload = await fetchJson(`https://api-inference.huggingface.co/models/${encodeURIComponent(model)}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: { max_new_tokens: 800, return_full_text: false },
    }),
  }, { timeoutMs, label: 'HuggingFace' })

  const text = Array.isArray(payload)
    ? (payload[0]?.generated_text || payload[0]?.summary_text || '')
    : (payload?.generated_text || payload?.summary_text || '')

  if (!text) throw httpError(502, 'HuggingFace returned empty content.', 'PROVIDER_EMPTY_CONTENT')

  return { text, provider: 'huggingface', model, tokensUsed: 0 }
}

const callProvider = async (provider, prompt, options = {}) => {
  const providerName = normalizeProviderName(provider.provider_name)
  if (providerName === 'gemini') return callGemini(provider, prompt, options)
  if (providerName === 'huggingface') return callHuggingFace(provider, prompt, options)
  if (OPENAI_COMPATIBLE_PROVIDERS[providerName]) return callOpenAiCompatible(provider, prompt, options)
  throw httpError(400, `Unknown provider: ${providerName}`, 'UNKNOWN_PROVIDER')
}

const fetchModels = async (provider, options = {}) => {
  const providerName = normalizeProviderName(provider.provider_name)
  if (providerName === 'gemini') return fetchGeminiModels(provider, options)
  if (providerName === 'huggingface') return PROVIDER_MODELS.huggingface
  if (OPENAI_COMPATIBLE_PROVIDERS[providerName]) return fetchOpenAiCompatibleModels(provider, options)
  return PROVIDER_MODELS[providerName] || []
}

const attemptProvider = async (provider, prompt, { timeoutMs = 20_000 } = {}) => {
  const providerName = normalizeProviderName(provider.provider_name)
  const started = Date.now()
  const model = chooseProviderModel(provider)

  try {
    const result = await callProvider(provider, prompt, { timeoutMs })
    const durationMs = Date.now() - started
    return {
      ok: true,
      durationMs,
      result: { ...result, durationMs },
      attempt: {
        provider: providerName,
        model: result.model || model,
        ok: true,
        durationMs,
      },
    }
  } catch (err) {
    const durationMs = Date.now() - started
    return {
      ok: false,
      durationMs,
      error: err,
      attempt: {
        provider: providerName,
        model,
        ok: false,
        durationMs,
        status: err.status || 0,
        error: redactMessage(err.message),
        errorType: err.errorType || classifyProviderError(err),
      },
    }
  }
}

const handleListProviders = async (supabase) => {
  const { data, error } = await supabase
    .from('ai_provider_settings')
    .select(PROVIDER_FIELDS)
    .order('priority')

  if (error) throw httpError(500, `Unable to load providers: ${error.message}`, 'PROVIDER_LIST_FAILED')
  return json({ providers: (data || []).map(safeProvider) })
}

const handleUpdateProviderSecret = async (supabase, body) => {
  if (!body.providerId) throw httpError(400, 'providerId is required.', 'PROVIDER_ID_REQUIRED')
  if (body.apiKey === undefined) throw httpError(400, 'apiKey is required.', 'PROVIDER_KEY_REQUIRED')

  const { data, error } = await supabase
    .from('ai_provider_settings')
    .update({ api_key: String(body.apiKey || '').trim(), updated_at: new Date().toISOString() })
    .eq('id', body.providerId)
    .select(PROVIDER_FIELDS)
    .maybeSingle()

  if (error) throw httpError(500, `Unable to update provider key: ${error.message}`, 'PROVIDER_KEY_UPDATE_FAILED')
  if (!data) throw httpError(404, 'Provider not found.', 'PROVIDER_NOT_FOUND')

  return json({ ok: true, provider: safeProvider(data) })
}

const handleFetchModels = async (supabase, body) => {
  const provider = await resolveProvider(supabase, body.provider || {}, body.transientKey || null)
  const models = await fetchModels(provider, { timeoutMs: body.timeoutMs || 20_000 })
  return json({ models })
}

const handleTestProvider = async (supabase, body) => {
  const provider = await resolveProvider(supabase, body.provider || {}, body.transientKey || null)
  const attempt = await attemptProvider(provider, 'Reply with OK only.', { timeoutMs: body.timeoutMs || 20_000 })

  if (!attempt.ok) {
    return json({
      ok: false,
      durationMs: attempt.durationMs,
      error: redactMessage(attempt.error?.message),
      errorType: attempt.attempt.errorType,
      model: attempt.attempt.model,
    })
  }

  return json({
    ok: true,
    durationMs: attempt.durationMs,
    response: attempt.result.text.slice(0, 160),
    model: attempt.result.model,
    tokensUsed: attempt.result.tokensUsed || 0,
  })
}

const resolveCallProviders = async (supabase, providers = []) => {
  const resolved = []
  for (const provider of providers) {
    try {
      const fullProvider = await resolveProvider(supabase, provider, null)
      if (fullProvider.is_active && String(fullProvider.api_key || '').trim()) {
        resolved.push(fullProvider)
      }
    } catch {
      // Skip providers that no longer exist.
    }
  }
  return resolved
}

const handleCallAI = async (supabase, body) => {
  const prompt = String(body.prompt || '').trim()
  if (!prompt) throw httpError(400, 'prompt is required.', 'PROMPT_REQUIRED')

  const providers = await resolveCallProviders(supabase, Array.isArray(body.providers) ? body.providers : [])
  if (!providers.length) {
    throw httpError(400, 'No active AI providers with saved API keys are configured.', 'NO_ACTIVE_PROVIDERS')
  }

  const attempts = []
  let lastError = null

  for (const provider of providers) {
    const attempt = await attemptProvider(provider, prompt, { timeoutMs: body.timeoutMs || 45_000 })
    attempts.push(attempt.attempt)
    if (attempt.ok) return json({ ...attempt.result, attempts })
    lastError = attempt.error
  }

  const error = new Error(lastError?.message || 'All AI providers failed.')
  error.status = lastError?.status || 502
  error.errorType = lastError?.errorType || classifyProviderError(lastError)
  error.attempts = attempts
  throw error
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { supabase } = await requireAdmin(request)

    switch (body.action) {
      case 'listProviders':
        return handleListProviders(supabase)
      case 'updateProviderSecret':
        return handleUpdateProviderSecret(supabase, body)
      case 'fetchModels':
        return handleFetchModels(supabase, body)
      case 'testProvider':
        return handleTestProvider(supabase, body)
      case 'callAI':
        return handleCallAI(supabase, body)
      default:
        throw httpError(400, `Unknown provider proxy action: ${body.action || 'missing'}`, 'UNKNOWN_ACTION')
    }
  } catch (err) {
    return json({
      error: redactMessage(err.message),
      code: err.code || 'AI_PROVIDER_PROXY_FAILED',
      errorType: err.errorType || classifyProviderError(err),
      attempts: Array.isArray(err.attempts) ? err.attempts : [],
    }, err.status || 500)
  }
}

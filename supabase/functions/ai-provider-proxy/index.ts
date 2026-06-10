import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.35.0'
import {
  callAI,
  fetchProviderModels,
  testProvider,
} from '../_shared/providerCore.js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SAFE_PROVIDER_COLUMNS = [
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
].join(',')

const DAILY_GENERATION_LIMIT = Number(Deno.env.get('AI_DAILY_GENERATION_LIMIT') || 50)
const GENERATION_THROTTLE_SECONDS = Number(Deno.env.get('AI_GENERATION_THROTTLE_SECONDS') || 20)
const PROVIDER_TEST_THROTTLE_SECONDS = Number(Deno.env.get('AI_PROVIDER_TEST_THROTTLE_SECONDS') || 5)
const MAX_PROMPT_CHARS = Number(Deno.env.get('AI_MAX_PROMPT_CHARS') || 80_000)

const json = (body: Record<string, unknown>, status = 200) => (
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
)

const getServiceClient = () => {
  const url = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !serviceKey) throw new Error('Missing Supabase service credentials.')
  return createClient(url, serviceKey, { auth: { persistSession: false } })
}

const normalizeProviderName = (providerName: unknown) => String(providerName || '').trim().toLowerCase()

const safeProvider = (provider: Record<string, any> = {}) => ({
  id: provider.id,
  provider_name: normalizeProviderName(provider.provider_name || provider.provider || 'unknown'),
  model: provider.model || '',
  priority: provider.priority,
  is_active: !!provider.is_active,
  base_url: provider.base_url || null,
  available_models: Array.isArray(provider.available_models) ? provider.available_models : [],
  stats: provider.stats || {},
  health_status: provider.health_status || 'unknown',
  last_tested: provider.last_tested || null,
  last_latency_ms: provider.last_latency_ms || null,
  updated_at: provider.updated_at || null,
  has_api_key: Boolean(String(provider.api_key || '').trim()),
})

const safeAttempt = (attempt: Record<string, any> = {}) => ({
  provider: safeProvider(attempt.provider || {}),
  providerName: attempt.providerName || attempt.provider?.provider_name || 'unknown',
  model: attempt.model || null,
  ok: !!attempt.ok,
  durationMs: attempt.durationMs || 0,
  tokensUsed: attempt.tokensUsed || 0,
  error: attempt.error || null,
  errorType: attempt.errorType || null,
})

const requireAdmin = async (req: Request, supabase: ReturnType<typeof createClient>) => {
  const authHeader = req.headers.get('Authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) {
    const error = new Error('Authentication required.')
    ;(error as any).status = 401
    throw error
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(token)
  const user = userData?.user
  if (userError || !user) {
    const error = new Error('Invalid or expired admin session.')
    ;(error as any).status = 401
    throw error
  }

  const { data: admin, error: adminError } = await supabase
    .from('admin_users')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle()

  if (adminError || !admin?.is_admin) {
    const error = new Error('Admin role required.')
    ;(error as any).status = 403
    throw error
  }

  return user
}

const enforceRateLimit = async (
  supabase: ReturnType<typeof createClient>,
  adminId: string,
  type: 'generation' | 'provider_test',
) => {
  const usageDate = new Date().toISOString().slice(0, 10)
  const nowIso = new Date().toISOString()
  const countColumn = type === 'generation' ? 'generation_count' : 'provider_test_count'
  const lastColumn = type === 'generation' ? 'last_generation_at' : 'last_provider_test_at'
  const throttleSeconds = type === 'generation' ? GENERATION_THROTTLE_SECONDS : PROVIDER_TEST_THROTTLE_SECONDS

  const { data: current, error } = await supabase
    .from('ai_generation_usage')
    .select('*')
    .eq('admin_id', adminId)
    .eq('usage_date', usageDate)
    .maybeSingle()

  if (error) {
    const rateError = new Error('AI rate limit store is unavailable.')
    ;(rateError as any).status = 503
    throw rateError
  }

  if (current) {
    const lastAt = current[lastColumn] ? new Date(current[lastColumn]).getTime() : 0
    const secondsSinceLast = lastAt ? (Date.now() - lastAt) / 1000 : Infinity
    if (secondsSinceLast < throttleSeconds) {
      const throttleError = new Error(`AI ${type.replace('_', ' ')} throttled. Try again in ${Math.ceil(throttleSeconds - secondsSinceLast)}s.`)
      ;(throttleError as any).status = 429
      ;(throttleError as any).code = 'AI_RATE_LIMIT_THROTTLED'
      throw throttleError
    }

    if (type === 'generation' && Number(current.generation_count || 0) >= DAILY_GENERATION_LIMIT) {
      const limitError = new Error(`Daily AI generation cap reached (${DAILY_GENERATION_LIMIT}).`)
      ;(limitError as any).status = 429
      ;(limitError as any).code = 'AI_DAILY_CAP_REACHED'
      throw limitError
    }

    const { error: updateError } = await supabase
      .from('ai_generation_usage')
      .update({
        [countColumn]: Number(current[countColumn] || 0) + 1,
        [lastColumn]: nowIso,
        updated_at: nowIso,
      })
      .eq('id', current.id)

    if (updateError) throw updateError
    return
  }

  const { error: insertError } = await supabase.from('ai_generation_usage').insert([{
    admin_id: adminId,
    usage_date: usageDate,
    generation_count: type === 'generation' ? 1 : 0,
    provider_test_count: type === 'provider_test' ? 1 : 0,
    last_generation_at: type === 'generation' ? nowIso : null,
    last_provider_test_at: type === 'provider_test' ? nowIso : null,
    updated_at: nowIso,
  }])

  if (insertError) throw insertError
}

const loadProviders = async (
  supabase: ReturnType<typeof createClient>,
  requestedProviders: Array<Record<string, any>> = [],
) => {
  const ids = requestedProviders.map((provider) => provider?.id).filter(Boolean)

  const { data, error } = await supabase.from('ai_provider_settings').select('*').order('priority')
  if (error) throw error

  const byId = new Map((data || []).map((provider) => [provider.id, provider]))
  const byName = new Map((data || []).map((provider) => [normalizeProviderName(provider.provider_name), provider]))

  const ordered = requestedProviders.length
    ? requestedProviders
      .map((requested) => byId.get(requested.id) || byName.get(normalizeProviderName(requested.provider_name)))
      .filter(Boolean)
    : (data || [])

  return ordered
    .filter((provider) => provider?.is_active && String(provider.api_key || '').trim())
    .map((provider) => {
      const requested = requestedProviders.find(
        (item) => item.id === provider.id || normalizeProviderName(item.provider_name) === normalizeProviderName(provider.provider_name)
      ) || {}
      return {
        ...provider,
        model: requested.model || provider.model,
        base_url: requested.base_url || provider.base_url,
        available_models: requested.available_models?.length ? requested.available_models : provider.available_models,
      }
    })
}

const loadProvider = async (
  supabase: ReturnType<typeof createClient>,
  requestedProvider: Record<string, any> = {},
  transientKey: string | null = null,
) => {
  const providerId = requestedProvider.id
  if (!providerId) {
    const error = new Error('Provider id is required.')
    ;(error as any).status = 400
    throw error
  }

  const { data, error } = await supabase
    .from('ai_provider_settings')
    .select('*')
    .eq('id', providerId)
    .maybeSingle()
  if (error) throw error
  if (!data) {
    const notFound = new Error('Provider not found.')
    ;(notFound as any).status = 404
    throw notFound
  }

  return {
    ...data,
    api_key: transientKey || data.api_key,
    model: requestedProvider.model || data.model,
    base_url: requestedProvider.base_url || data.base_url,
    available_models: requestedProvider.available_models?.length ? requestedProvider.available_models : data.available_models,
  }
}

const listProviders = async (supabase: ReturnType<typeof createClient>) => {
  const { data, error } = await supabase
    .from('ai_provider_settings')
    .select(`api_key,${SAFE_PROVIDER_COLUMNS}`)
    .order('priority')
  if (error) throw error
  return (data || []).map(safeProvider)
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405)

  let body: Record<string, any> = {}
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400)
  }

  try {
    const supabase = getServiceClient()
    const adminUser = await requireAdmin(req, supabase)
    const action = body.action

    if (action === 'listProviders') {
      return json({ providers: await listProviders(supabase) })
    }

    if (action === 'updateProviderSecret') {
      const providerId = body.providerId
      if (!providerId) return json({ error: 'Provider id is required.' }, 400)
      const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : ''
      const { error } = await supabase
        .from('ai_provider_settings')
        .update({ api_key: apiKey, updated_at: new Date().toISOString() })
        .eq('id', providerId)
      if (error) throw error
      return json({ ok: true, providers: await listProviders(supabase) })
    }

    if (action === 'fetchModels') {
      await enforceRateLimit(supabase, adminUser.id, 'provider_test')
      const provider = await loadProvider(supabase, body.provider, body.transientKey || null)
      const models = await fetchProviderModels(provider)
      return json({ models })
    }

    if (action === 'testProvider') {
      await enforceRateLimit(supabase, adminUser.id, 'provider_test')
      const provider = await loadProvider(supabase, body.provider, body.transientKey || null)
      const result = await testProvider(provider, { timeoutMs: Number(body.timeoutMs || 20_000) })
      return json(result)
    }

    if (action === 'callAI') {
      const prompt = String(body.prompt || '')
      if (!prompt.trim()) return json({ error: 'Prompt is required.' }, 400)
      if (prompt.length > MAX_PROMPT_CHARS) return json({ error: `Prompt exceeds ${MAX_PROMPT_CHARS} character provider safety limit.` }, 413)

      await enforceRateLimit(supabase, adminUser.id, 'generation')

      const providers = await loadProviders(supabase, Array.isArray(body.providers) ? body.providers : [])
      if (!providers.length) {
        return json({ error: 'No active providers with saved server-side keys.' }, 400)
      }
      console.log('[proxy] providersLoadedCount', providers.length)
      console.log('[proxy] providersLoadedOrder', providers.map(p => ({ id: p.id, provider_name: p.provider_name, priority: p.priority })))

      const attempts: Array<Record<string, any>> = []
      try {
        const result = await callAI(providers, prompt, {
          timeoutMs: Number(body.timeoutMs || 45_000),
          onAttempt: (attempt: Record<string, any>) => attempts.push(safeAttempt(attempt)),
        })
        console.log('[proxy] callAI.success.provider', result.provider || null)
        console.log('[proxy] callAI.attempts', attempts)
        return json({ ...result, attempts })
      } catch (error) {
        const err = error as any
        console.log('[proxy] callAI.error', { message: err?.message, code: err?.code })
        console.log('[proxy] callAI.attempts_on_error', attempts.length ? attempts : (Array.isArray(err.attempts) ? err.attempts.map(safeAttempt) : []))
        return json({
          error: err.message || 'All AI providers failed.',
          code: err.code || 'AI_PROVIDERS_FAILED',
          attempts: attempts.length ? attempts : (Array.isArray(err.attempts) ? err.attempts.map(safeAttempt) : []),
        }, 502)
      }
    }

    return json({ error: 'Unknown AI proxy action.' }, 400)
  } catch (error) {
    const err = error as any
    return json({
      error: err.message || 'AI provider proxy failed.',
      code: err.code || 'AI_PROVIDER_PROXY_FAILED',
    }, Number(err.status || 500))
  }
})

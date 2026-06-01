import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import ws from 'ws'

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const anonKey = process.env.VITE_SUPABASE_ANON_KEY
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const adminEmail = process.env.VITE_ADMIN_USERNAME
const adminPassword = process.env.VITE_ADMIN_PASSWORD

if (!url || !anonKey || !serviceKey) {
  console.error('Missing SUPABASE_URL/VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

  const service = createClient(url, serviceKey, {
    auth: { persistSession: false },
    realtime: { transport: ws },
  })
  const anonClient = createClient(url, anonKey, {
    auth: { persistSession: false },
    realtime: { transport: ws },
  })

const safePrint = (label, value) => {
  const out = JSON.stringify(value, null, 2)
  console.log(`${label}: ${out}`)
}

await (async () => {
  console.log('--- LIVE PRODUCTION VALIDATION ---')

  const providerRes = await service.from('ai_provider_settings').select('*').order('priority')
  console.log('providerSettings.error', providerRes.error ? providerRes.error.message : null)
  console.log('providersCount', Array.isArray(providerRes.data) ? providerRes.data.length : 0)
  const activeProviders = (providerRes.data || []).filter(p => p.is_active && p.api_key && p.api_key.toString().trim())
  console.log('activeProviders', activeProviders.map(p => ({ id: p.id, provider_name: p.provider_name, model: p.model, priority: p.priority, base_url: p.base_url })).slice(0, 10))

  // Prefer a provided admin access token from environment to avoid sending
  // credentials through this script. Obtain the token from the production
  // admin UI session and set `SUPABASE_ADMIN_ACCESS_TOKEN` before running.
  const normalizeAdminToken = (token) => {
    if (!token) return ''
    let value = String(token).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (value.toLowerCase().startsWith('bearer ')) {
      value = value.slice(7).trim()
    }
    value = value.replace(/[\u2018\u2019\u201C\u201D]/g, '')
    value = value.replace(/\u2026/g, '...')
    value = value.replace(/[^\x20-\x7E]/g, '')
    return value
  }

  const parseAdminToken = (raw) => {
    if (!raw) return ''
    const trimmed = String(raw).trim()
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed)
        if (parsed?.access_token) return normalizeAdminToken(parsed.access_token)
        if (parsed?.currentSession?.access_token) return normalizeAdminToken(parsed.currentSession.access_token)
        if (parsed?.session?.access_token) return normalizeAdminToken(parsed.session.access_token)
      } catch (err) {
        // fall through to raw token handling
      }
    }
    return normalizeAdminToken(trimmed)
  }

  let authSession = null
  const envToken = process.env.SUPABASE_ADMIN_ACCESS_TOKEN
  if (envToken) {
    const normalized = parseAdminToken(envToken)
    if (!normalized) {
      throw new Error('SUPABASE_ADMIN_ACCESS_TOKEN is invalid after sanitization. Please re-copy a valid admin access token from the production admin UI session.')
    }
    if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(normalized)) {
      console.warn('SUPABASE_ADMIN_ACCESS_TOKEN does not appear to be a valid JWT format. Verify you copied the raw access token string, not the full auth object.')
    }
    authSession = { access_token: normalized }
    console.log('adminSessionOK', true)
  } else if (adminEmail && adminPassword) {
    const signIn = await anonClient.auth.signInWithPassword({ email: adminEmail, password: adminPassword })
    console.log('adminSignInError', signIn.error ? signIn.error.message : null)
    authSession = signIn.data?.session
    console.log('adminSessionOK', !!authSession)
  } else {
    console.log('No admin credentials available for login test. To run authenticated validation, set SUPABASE_ADMIN_ACCESS_TOKEN in your shell from an active admin UI session.')
  }

  const functionUrl = `${url.replace(/\/$/, '')}/functions/v1/ai-provider-proxy`
  console.log('functionUrl', functionUrl)

  const doProxy = async (body) => {
    const headers = {
      'Content-Type': 'application/json',
      apikey: anonKey,
    }
    if (authSession?.access_token) {
      headers.Authorization = `Bearer ${authSession.access_token}`
    }

    const res = await fetch(functionUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })
    const text = await res.text()
    let data
    try { data = JSON.parse(text) } catch (err) { data = text }
    return { status: res.status, headers: Object.fromEntries(res.headers.entries()), data }
  }

  const listProviders = await doProxy({ action: 'listProviders' })
  console.log('listProviders.status', listProviders.status)
  console.log('listProviders.headers', {
    'Access-Control-Allow-Origin': listProviders.headers['access-control-allow-origin'],
    'Access-Control-Allow-Methods': listProviders.headers['access-control-allow-methods'],
    'Access-Control-Allow-Headers': listProviders.headers['access-control-allow-headers'],
  })
  console.log('listProviders.data', typeof listProviders.data === 'object' ? { providers: Array.isArray(listProviders.data.providers) ? listProviders.data.providers.map(p => ({ id: p.id, provider_name: p.provider_name, is_active: p.is_active, has_api_key: p.has_api_key })) : listProviders.data.providers } : listProviders.data)

  if (!activeProviders.length) {
    console.warn('No active providers found in DB. Execution will only validate proxy and DB tables.')
  }

  if (activeProviders.length > 0) {
    const provider = activeProviders[0]
    const fetchModels = await doProxy({ action: 'fetchModels', provider: { id: provider.id, provider_name: provider.provider_name, model: provider.model, base_url: provider.base_url, available_models: provider.available_models }, transientKey: null })
    console.log('fetchModels.status', fetchModels.status)
    console.log('fetchModels.data', typeof fetchModels.data === 'object' ? { modelsCount: Array.isArray(fetchModels.data.models) ? fetchModels.data.models.length : null } : fetchModels.data)
  }

  const sampleProviders = activeProviders.slice(0, 2).map(p => ({ id: p.id, provider_name: p.provider_name, model: p.model, base_url: p.base_url, available_models: p.available_models, is_active: p.is_active, api_key: p.api_key }))
  if (!sampleProviders.length) {
    console.log('No providers available for callAI test')
  } else {
    const callAI = await doProxy({ action: 'callAI', providers: sampleProviders, prompt: 'Write a short AI-generated job posting summary for a government exam notification.', timeoutMs: 20000 })
    console.log('callAI.status', callAI.status)
    if (typeof callAI.data === 'object' && callAI.data?.text) {
      console.log('callAI.provider', callAI.data.provider)
      console.log('callAI.textPreview', callAI.data.text.slice(0, 260).replace(/\n/g, ' '))
      console.log('callAI.attempts', Array.isArray(callAI.data.attempts) ? callAI.data.attempts.map(a => ({ providerName: a.providerName, ok: a.ok, durationMs: a.durationMs, errorType: a.errorType, error: a.error ? String(a.error).slice(0,120) : null })).slice(0,5) : callAI.data.attempts)
    } else {
      console.log('callAI.data', callAI.data)
    }
  }

  const jobs = await service.from('jobs').select('id,title,status,seo_title,seo_description,seo_keywords').limit(5)
  console.log('jobs.error', jobs.error ? jobs.error.message : null)
  console.log('jobs.count', Array.isArray(jobs.data) ? jobs.data.length : 0)
  if (Array.isArray(jobs.data) && jobs.data.length) {
    console.log('jobs.sample', jobs.data.slice(0, 5))
  }

  const aiDrafts = await service.from('ai_job_drafts').select('id,status,ai_provider,quality_scores').limit(5)
  console.log('aiJobDrafts.error', aiDrafts.error ? aiDrafts.error.message : null)
  console.log('aiJobDrafts.count', Array.isArray(aiDrafts.data) ? aiDrafts.data.length : 0)
  if (Array.isArray(aiDrafts.data) && aiDrafts.data.length) {
    console.log('aiJobDrafts.sample', aiDrafts.data.slice(0, 5))
  }

  const monitoring = await service.from('ai_monitoring_rules').select('*').limit(5)
  console.log('aiMonitoringRules.error', monitoring.error ? monitoring.error.message : null)
  console.log('aiMonitoringRules.count', Array.isArray(monitoring.data) ? monitoring.data.length : 0)

  const providerStats = await service.from('ai_provider_settings').select('id,provider_name,stats,last_latency_ms,health_status').order('priority').limit(5)
  console.log('providerStats.error', providerStats.error ? providerStats.error.message : null)
  console.log('providerStats.sample', (providerStats.data || []).map(p => ({ id: p.id, provider_name: p.provider_name, health_status: p.health_status, last_latency_ms: p.last_latency_ms, stats: p.stats })) )

  console.log('--- VALIDATION COMPLETE ---')
})().catch(err => {
  console.error('Script failed', err)
  process.exit(1)
})

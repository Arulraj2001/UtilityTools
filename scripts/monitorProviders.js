import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import cron from 'node-cron'
import ws from 'ws'
import { fetchProviderModels, testProvider } from '../server/ai/providerCore.js'

dotenv.config()

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  realtime: { transport: ws }
})

const DEFAULT_CRON = process.env.AI_MONITOR_CRON || '*/5 * * * *' // every 5 minutes

async function recordProviderCall(id, { success, latencyMs, error = null }) {
  const cur = await supabase.from('ai_provider_settings').select('stats, last_latency_ms').eq('id', id).maybeSingle()
  if (cur.error || !cur.data) return

  const prev = cur.data.stats || { requests: 0, successes: 0, failures: 0, avg_latency_ms: 0, last_error: null }
  const requests   = (prev.requests   || 0) + 1
  const successes  = (prev.successes  || 0) + (success ? 1 : 0)
  const failures   = (prev.failures   || 0) + (success ? 0 : 1)
  const totalMs    = ((prev.avg_latency_ms || 0) * (requests - 1) + (latencyMs || 0))
  const avg_latency_ms = requests > 0 ? Math.round(totalMs / requests) : 0

  const patch = {
    stats: { requests, successes, failures, avg_latency_ms, last_error: success ? null : (error || null) },
    last_latency_ms: latencyMs || null,
    last_tested: new Date().toISOString(),
    health_status: success ? 'healthy' : (failures >= 3 ? 'down' : 'degraded'),
    updated_at: new Date(),
  }

  await supabase.from('ai_provider_settings').update(patch).eq('id', id)
}

async function logProviderFailure(payload) {
  const res = await supabase.from('ai_provider_failures').insert([{ ...payload }]).select()
  if (res.error) {
    // fallback to analytics_events
    await supabase.from('analytics_events').insert([{ event_type: 'provider_failure', event_data: payload, page_url: '' }])
  }
}

async function refreshModelsIfAny(provider) {
  try {
    const models = await fetchProviderModels(provider)
    if (Array.isArray(models) && models.length && provider.id) {
      await supabase.from('ai_provider_settings').update({ available_models: models, updated_at: new Date() }).eq('id', provider.id)
    }
  } catch (err) {
    // ignore
  }
}

async function runOnce() {
  console.log('[monitor] Starting provider health check...')
  const res = await supabase.from('ai_provider_settings').select('*').order('priority')
  if (res.error) { console.error('[monitor] failed to fetch providers', res.error); return }
  const providers = res.data || []

  for (const p of providers) {
    if (!p.is_active || !p.api_key) continue
    console.log(`[monitor] testing ${p.provider_name}`)
    const t0 = Date.now()
    let outcome
    try {
      outcome = await testProvider(p)
    } catch (err) {
      outcome = { ok: false, error: err.message, durationMs: 0 }
    }

    await recordProviderCall(p.id, { success: !!outcome.ok, latencyMs: outcome.durationMs || 0, error: outcome.error || null })
    if (!outcome.ok) {
      await logProviderFailure({ provider_name: p.provider_name, error: outcome.error || 'unknown', details: { note: 'monitoring' }, duration_ms: outcome.durationMs || 0, occurred_at: new Date().toISOString() })
      console.warn(`[monitor] ${p.provider_name} failed: ${outcome.error}`)
    } else {
      console.log(`[monitor] ${p.provider_name} ok ${outcome.durationMs}ms`)
    }

    // refresh available models periodically (best-effort)
    await refreshModelsIfAny(p)
  }
}

async function startDaemon() {
  console.log(`[monitor] Scheduling provider monitor: cron='${DEFAULT_CRON}'`)
  cron.schedule(DEFAULT_CRON, async () => {
    try {
      await runOnce()
    } catch (err) {
      console.error('[monitor] run error', err)
    }
  })
}

const once = process.argv.includes('--once')
if (once) {
  runOnce().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1) })
} else {
  startDaemon()
}

import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'

import {
  CALLERS,
  callAI,
  classifyProviderError,
  extractJSON,
} from '../server/ai/providerCore.js'
import { buildLocalFallbackJobDraft } from '../src/lib/jobWritingFramework.js'

const root = process.cwd()
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')

const provider = (name, priority = 1, extra = {}) => ({
  id: `${name}-id`,
  provider_name: name,
  api_key: `${name}-key`,
  model: '',
  priority,
  is_active: true,
  available_models: [],
  stats: {},
  ...extra,
})

const originalCallers = { ...CALLERS }
const restoreCallers = () => {
  Object.keys(CALLERS).forEach((key) => {
    if (originalCallers[key]) CALLERS[key] = originalCallers[key]
  })
}

const testPrimaryProviderWorks = async () => {
  CALLERS.deepseek = async () => ({ text: '{"ok":true}', tokensUsed: 7 })
  const attempts = []
  const result = await callAI([provider('deepseek', 1)], 'prompt', {
    timeoutMs: 1000,
    onAttempt: (attempt) => attempts.push(attempt),
  })
  assert.equal(result.provider, 'deepseek')
  assert.equal(attempts.length, 1)
  assert.equal(attempts[0].ok, true)
}

const testSecondaryProviderWorks = async () => {
  CALLERS.deepseek = async () => {
    const err = new Error('Rate limit')
    err.status = 429
    throw err
  }
  CALLERS.gemini = async () => ({ text: '{"ok":true}', tokensUsed: 3 })
  const attempts = []
  const result = await callAI([provider('deepseek', 1), provider('gemini', 2)], 'prompt', {
    timeoutMs: 1000,
    onAttempt: (attempt) => attempts.push(attempt),
  })
  assert.equal(result.provider, 'gemini')
  assert.equal(attempts.length, 2)
  assert.equal(attempts[0].errorType, 'rate_limit')
}

const testAllProvidersFail = async () => {
  CALLERS.deepseek = async () => {
    const err = new Error('Unauthorized')
    err.status = 401
    throw err
  }
  await assert.rejects(
    () => callAI([provider('deepseek', 1)], 'prompt', { timeoutMs: 1000 }),
    (err) => err.code === 'AI_PROVIDERS_FAILED' && err.attempts?.[0]?.errorType === 'auth'
  )
}

const testMissingKey = async () => {
  await assert.rejects(
    () => callAI([{ ...provider('deepseek'), api_key: '' }], 'prompt'),
    /No AI providers configured/
  )
}

const testTimeout = async () => {
  CALLERS.deepseek = async (_key, _model, _prompt, _base, { signal }) => (
    new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => {
        const err = new Error('Provider timed out')
        err.name = 'AbortError'
        reject(err)
      }, { once: true })
    })
  )
  await assert.rejects(
    () => callAI([provider('deepseek', 1)], 'prompt', { timeoutMs: 5 }),
    (err) => err.code === 'AI_PROVIDERS_FAILED'
  )
}

const testInvalidResponseFallbackShape = () => {
  assert.equal(extractJSON('not json'), null)
  const fallback = buildLocalFallbackJobDraft({
    jobType: 'government',
    reason: 'AI returned invalid JSON.',
    jobData: {
      title: 'SSC CGL 2026',
      organization: 'Staff Selection Commission',
      notification_text: 'Applications open for SSC CGL 2026. Verify dates and eligibility.',
    },
  })
  assert.equal(fallback.generation_method, 'local_fallback')
  assert.ok(fallback.title)
  assert.ok(fallback.slug)
  assert.ok(fallback.full_description.includes('Source Notification'))
}

const testStaticWiring = () => {
  const aiProvider = read('src/lib/aiProvider.js')
  const providerCore = read('server/ai/providerCore.js')
  const providerProxy = read('supabase/functions/ai-provider-proxy/index.ts')
  const queue = read('src/pages/admin/ai/AiResearchQueue.jsx')
  const api = read('src/api/supabaseApi.js')
  const settings = read('src/pages/admin/ai/AiSettings.jsx')
  const dashboard = read('src/pages/admin/ai/AiDashboard.jsx')

  assert.ok(aiProvider.includes('ai-provider-proxy'))
  assert.ok(aiProvider.includes('has_api_key'))
  assert.ok(!aiProvider.includes('generativelanguage.googleapis.com'))
  assert.ok(!aiProvider.includes('api.groq.com/openai/v1'))
  assert.ok(providerCore.includes('DEFAULT_PROVIDER_TIMEOUT_MS'))
  assert.ok(providerCore.includes('classifyProviderError'))
  assert.ok(providerCore.includes('sortProvidersForFallback'))
  assert.ok(!providerCore.includes('requestHeaders = headers'))
  assert.ok(providerProxy.includes('requireAdmin'))
  assert.ok(providerProxy.includes('enforceRateLimit'))
  assert.ok(providerProxy.includes('updateProviderSecret'))

  for (const providerName of ['gemini', 'groq', 'deepseek', 'huggingface']) {
    assert.equal(typeof CALLERS[providerName], 'function')
    assert.ok(providerCore.includes(providerName))
  }

  assert.ok(queue.includes('buildLocalFallbackJobDraft'))
  assert.ok(queue.includes('recordProviderCall'))
  assert.ok(queue.includes('logProviderFailure'))
  assert.ok(queue.includes('AbortController'))

  assert.ok(api.includes('redactForLog'))
  assert.ok(api.includes('provider_name: payload.provider_name'))
  assert.ok(api.includes('stripOptionalJobExtensionFields'))

  assert.ok(settings.includes("['deepseek', 'gemini', 'groq', 'openrouter', 'huggingface', 'cerebras']"))
  assert.ok(settings.includes('f.provider_name'))
  assert.ok(settings.includes('has_api_key'))

  assert.ok(dashboard.includes('pendingDrafts.length > 0'))
  assert.ok(dashboard.includes('pendingQueue.length > 5'))
}

const run = async () => {
  const tests = [
    ['primary provider works', testPrimaryProviderWorks],
    ['secondary provider works after primary failure', testSecondaryProviderWorks],
    ['all providers fail with classified error', testAllProvidersFail],
    ['missing key is rejected safely', testMissingKey],
    ['timeout is enforced', testTimeout],
    ['invalid response has local fallback shape', testInvalidResponseFallbackShape],
    ['static wiring checks', testStaticWiring],
  ]

  for (const [name, fn] of tests) {
    restoreCallers()
    await fn()
    console.log(`PASS ${name}`)
  }
  restoreCallers()
  console.log('AI job-system validation passed.')
}

run().catch((err) => {
  restoreCallers()
  console.error('AI job-system validation failed:')
  console.error(err)
  process.exit(1)
})

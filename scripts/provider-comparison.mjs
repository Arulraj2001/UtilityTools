import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import { testProvider, callAI } from '../server/ai/providerCore.js'

dotenv.config()

const OUT_DIR = process.cwd()
const RESULTS_FILE = path.join(OUT_DIR, 'comparison-results.json')

const DEFAULT_ITERATIONS = 10

const draftPrompt = 'Write a short AI-generated job posting summary for a government exam notification.'
const seoPrompt = 'Write an SEO title and meta description for the government exam job posting. Title max 70 characters. Description max 160 characters.'

const loadProviders = () => {
  const cfgPath = path.join(process.cwd(), 'providers.json')
  if (!fs.existsSync(cfgPath)) {
    console.error('providers.json not found. Create a providers.json file with provider objects for openrouter and groq.')
    process.exit(2)
  }
  const raw = fs.readFileSync(cfgPath, 'utf8')
  return JSON.parse(raw)
}

const now = () => Date.now()

const runIterations = async (provider, task, prompt, iterations = DEFAULT_ITERATIONS) => {
  const results = []
  for (let i = 0; i < iterations; i++) {
    const t0 = now()
    try {
      const res = await callAI([provider], prompt, { timeoutMs: 30000 })
      const durationMs = res.durationMs || (now() - t0)
      results.push({ ok: !!res.text, durationMs, provider: res.provider, model: res.model, text: res.text, tokensUsed: res.tokensUsed || null, error: null })
    } catch (err) {
      const durationMs = now() - t0
      results.push({ ok: false, durationMs, provider: provider.provider_name, model: provider.model || null, text: null, tokensUsed: null, error: { message: err.message, code: err.code || null, errorType: err.errorType || null } })
    }
  }
  return results
}

const scoreQuality = (task, text) => {
  if (!text) return 0
  const len = text.length
  if (task === 'aiDraft') {
    // simple heuristic: prefer moderate-length drafts up to 300 chars
    return Math.min(1, len / 300)
  }
  if (task === 'seo') {
    // attempt to parse title/description lines
    const lines = text.split(/\n/).map(l => l.trim()).filter(Boolean)
    let title = lines[0] || ''
    let desc = lines[1] || ''
    // if not separated, fallback: first 70 chars title, next 160 desc
    if (!desc) {
      title = text.slice(0, 70)
      desc = text.slice(70, 230)
    }
    const titleScore = title.length > 0 && title.length <= 70 ? 1 : (title.length > 70 ? 0.5 : 0.2)
    const descScore = desc.length > 0 && desc.length <= 160 ? 1 : (desc.length > 160 ? 0.6 : 0.2)
    return (titleScore + descScore) / 2
  }
  return 0
}

const summarizeRuns = (runs) => {
  const total = runs.length
  const successes = runs.filter(r => r.ok).length
  const avgTime = runs.reduce((s, r) => s + (r.durationMs || 0), 0) / total
  const avgTokens = runs.reduce((s, r) => s + (r.tokensUsed || 0), 0) / total
  const timeouts = runs.filter(r => r.error && (r.error.errorType === 'timeout' || (r.error && /timeout|timed out|AbortError/i.test(r.error.message || '')))).length
  const rateLimits = runs.filter(r => r.error && /rate|429/.test(String(r.error.message || '') || '')).length
  const qualityScores = runs.map(r => scoreQuality('aiDraft', r.text))
  return { total, successes, successRate: successes / total, avgTime, avgTokens, timeouts, timeoutRate: timeouts / total, rateLimits, rateLimitFreq: rateLimits / total, avgQuality: qualityScores.reduce((s,v)=>s+v,0)/total }
}

const summarizeRunsByTask = (runs, task) => {
  const total = runs.length
  const successes = runs.filter(r => r.ok).length
  const avgTime = runs.reduce((s, r) => s + (r.durationMs || 0), 0) / total
  const avgTokens = runs.reduce((s, r) => s + (r.tokensUsed || 0), 0) / total
  const timeouts = runs.filter(r => r.error && (r.error.errorType === 'timeout' || (r.error && /timeout|timed out|AbortError/i.test(r.error.message || '')))).length
  const rateLimits = runs.filter(r => r.error && /rate|429/.test(String(r.error.message || '') || '')).length
  const qualityScores = runs.map(r => scoreQuality(task, r.text))
  return { total, successes, successRate: successes / total, avgTime, avgTokens, timeouts, timeoutRate: timeouts / total, rateLimits, rateLimitFreq: rateLimits / total, avgQuality: qualityScores.reduce((s,v)=>s+v,0)/total }
}

const main = async () => {
  const providers = loadProviders()
  // expect providers to contain objects identified by provider_name 'openrouter' and 'groq'
  const openrouter = providers.find(p => p.provider_name === 'openrouter')
  const groq = providers.find(p => p.provider_name === 'groq')
  if (!openrouter || !groq) {
    console.error('providers.json must include provider entries with provider_name openrouter and groq')
    process.exit(2)
  }

  const iterations = Number(process.env.ITERATIONS || DEFAULT_ITERATIONS)

  const results = { metadata: { iterations, timestamp: new Date().toISOString() }, providers: {} }

  console.log('Running', iterations, 'iterations for OpenRouter AI Draft...')
  const orDraftRuns = await runIterations(openrouter, 'aiDraft', draftPrompt, iterations)
  console.log('Running', iterations, 'iterations for OpenRouter SEO...')
  const orSeoRuns = await runIterations(openrouter, 'seo', seoPrompt, iterations)

  console.log('Running', iterations, 'iterations for Groq AI Draft...')
  const groqDraftRuns = await runIterations(groq, 'aiDraft', draftPrompt, iterations)
  console.log('Running', iterations, 'iterations for Groq SEO...')
  const groqSeoRuns = await runIterations(groq, 'seo', seoPrompt, iterations)

  results.providers.openrouter = {
    aiDraft: orDraftRuns,
    seo: orSeoRuns,
    summary: {
      aiDraft: summarizeRunsByTask(orDraftRuns, 'aiDraft'),
      seo: summarizeRunsByTask(orSeoRuns, 'seo')
    }
  }

  results.providers.groq = {
    aiDraft: groqDraftRuns,
    seo: groqSeoRuns,
    summary: {
      aiDraft: summarizeRunsByTask(groqDraftRuns, 'aiDraft'),
      seo: summarizeRunsByTask(groqSeoRuns, 'seo')
    }
  }

  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2))
  console.log('Results written to', RESULTS_FILE)
}

main().catch((err) => { console.error(err); process.exit(1) })

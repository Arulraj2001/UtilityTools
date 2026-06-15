import React, { useState, useCallback, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import {
  Brain, Key, CheckCircle2, XCircle, AlertCircle, RefreshCw,
  Eye, EyeOff, Zap, Shield, Info, GripVertical, Activity,
  Globe, ChevronDown, ChevronUp,
} from 'lucide-react'
import {
  getAiProviders, updateAiProvider, upsertAiProvider,
  recordProviderCall, saveProviderModels, getProviderAnalytics, getProviderFailures,
} from '@/api/supabaseApi'
import { testProvider, fetchProviderModels, PROVIDER_MODELS } from '@/lib/aiProvider'
import { isDevMode } from '@/api/adminOperationsApi'

// ── Provider metadata ─────────────────────────────────────────────────────────

const PROVIDER_META = {
  gemini: {
    label: 'Google Gemini',
    color: 'from-blue-500 to-cyan-400',
    hint: 'Free at aistudio.google.com',
    docsUrl: 'https://aistudio.google.com/apikey',
    hasBaseUrl: false,
    defaultModel: 'gemini-2.5-flash',
  },
  openai: {
    label: 'OpenAI',
    color: 'from-sky-500 to-blue-400',
    hint: 'OpenAI API key from platform.openai.com',
    docsUrl: 'https://platform.openai.com/account/api-keys',
    hasBaseUrl: false,
    defaultModel: 'gpt-4o-mini',
  },
  groq: {
    label: 'Groq',
    color: 'from-orange-500 to-amber-400',
    hint: 'Free tier at console.groq.com',
    docsUrl: 'https://console.groq.com/keys',
    hasBaseUrl: false,
    defaultModel: 'llama-3.1-8b-instant',
  },
  deepseek: {
    label: 'DeepSeek',
    color: 'from-teal-500 to-green-400',
    hint: 'API at platform.deepseek.com',
    docsUrl: 'https://platform.deepseek.com/api_keys',
    hasBaseUrl: true,
    defaultBaseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
  },
  openrouter: {
    label: 'OpenRouter',
    color: 'from-purple-500 to-pink-400',
    hint: 'Free models at openrouter.ai',
    docsUrl: 'https://openrouter.ai/keys',
    hasBaseUrl: false,
    defaultModel: 'meta-llama/llama-3.1-8b-instruct:free',
  },
  cerebras: {
    label: 'Cerebras',
    color: 'from-rose-500 to-red-400',
    hint: 'Ultra-fast inference at inference.cerebras.ai',
    docsUrl: 'https://cloud.cerebras.ai/platform',
    hasBaseUrl: true,
    defaultBaseUrl: 'https://api.cerebras.ai/v1',
    defaultModel: 'llama-3.3-70b',
  },
  huggingface: {
    label: 'HuggingFace',
    color: 'from-yellow-500 to-orange-400',
    hint: 'Free inference API at huggingface.co',
    docsUrl: 'https://huggingface.co/settings/tokens',
    hasBaseUrl: false,
    defaultModel: 'mistralai/Mistral-7B-Instruct-v0.2',
  },
}

// Ordered display list
const PROVIDER_ORDER = ['deepseek', 'gemini', 'openai', 'groq', 'openrouter', 'huggingface', 'cerebras']

// ── Health indicator ──────────────────────────────────────────────────────────

function HealthDot({ status }) {
  const map = {
    healthy:  { color: 'bg-green-500',  label: 'Healthy' },
    degraded: { color: 'bg-yellow-500', label: 'Degraded' },
    down:     { color: 'bg-red-500',    label: 'Down' },
    unknown:  { color: 'bg-gray-400',   label: 'Not tested' },
  }
  const m = map[status] || map.unknown
  return (
    <span title={m.label} className={`inline-block w-2.5 h-2.5 rounded-full ${m.color} shrink-0`} />
  )
}

// ── Provider Card ─────────────────────────────────────────────────────────────

const CUSTOM_MODEL_SENTINEL = '__custom__'

function ProviderCard({ provider, onUpdate, onCreate, index, dragHandleProps = {} }) {
  const savedModel = provider.model || ''
  const [showKey, setShowKey]         = useState(false)
  const [localKey, setLocalKey]       = useState('')
  const [localModel, setLocalModel]   = useState(savedModel)
  const [customModel, setCustomModel] = useState('')
  const [localBase, setLocalBase]     = useState(provider.base_url || '')
  const [dirty, setDirty]             = useState(false)
  const [keyDirty, setKeyDirty]       = useState(false)
  const [testing, setTesting]         = useState(false)
  const [testResult, setTestResult]   = useState(null)
  const [refreshing, setRefreshing]   = useState(false)
  const [saving, setSaving]           = useState(false)
  const [expanded, setExpanded]       = useState(false)
  const [liveModels, setLiveModels]   = useState(
    provider.available_models?.length ? provider.available_models : (PROVIDER_MODELS[provider.provider_name] || [])
  )
  const isMissing = !provider.id || String(provider.id).startsWith('missing-')

  // Effective model: if custom sentinel selected, use text field value
  const effectiveModel = localModel === CUSTOM_MODEL_SENTINEL
    ? customModel.trim()
    : localModel

  // Ensure saved model appears in dropdown even if not in the model list
  const savedModelInList = liveModels.some(m => (m.value || m) === savedModel)
  const dropdownModels = savedModel && !savedModelInList
    ? [{ value: savedModel, label: `${savedModel} (saved)` }, ...liveModels]
    : liveModels

  const meta = PROVIDER_META[provider.provider_name] || {}
  const stats = provider.stats || { requests: 0, successes: 0, failures: 0, avg_latency_ms: 0 }
  const successRate = stats.requests > 0 ? Math.round((stats.successes / stats.requests) * 100) : null

  const mark = (v) => { setDirty(true); return v }
  const markKey = (v) => { setDirty(true); setKeyDirty(true); return v }
  const hasSavedKey = !!provider.has_api_key

  const handleTest = async () => {
    if (!localKey && !hasSavedKey) { toast.error('Enter an API key first'); return }
    if (localModel === CUSTOM_MODEL_SENTINEL && !customModel.trim()) {
      toast.error('Enter a custom model ID first'); return
    }
    setTesting(true)
    setTestResult(null)
    const p = { ...provider, transientKey: localKey || null, model: effectiveModel || meta.defaultModel, base_url: localBase || meta.defaultBaseUrl || null }
    const result = await testProvider(p)
    setTestResult(result)
    setTesting(false)
    // Record stats in DB
    if (provider.id) {
      await recordProviderCall(provider.id, {
        success: result.ok,
        latencyMs: result.durationMs,
        error: result.error || null,
      }).catch(() => {}) // silent — new columns may not exist yet
    }
    if (result.ok) toast.success(`${meta.label} — ${result.durationMs}ms`)
    else toast.error(`${meta.label} failed: ${result.error?.slice(0, 120)}`)
  }

  const handleRefreshModels = async () => {
    if (!localKey && !hasSavedKey) { toast.error('Enter an API key first'); return }
    setRefreshing(true)
    const p = { ...provider, transientKey: localKey || null, base_url: localBase || meta.defaultBaseUrl || null }
    const models = await fetchProviderModels(p)
    setLiveModels(models)
    if (provider.id && models.length) {
      await saveProviderModels(provider.id, models).catch(() => {})
    }
    toast.success(`Found ${models.length} models for ${meta.label}`)
    setRefreshing(false)
  }

  const handleSave = async () => {
    if (localModel === CUSTOM_MODEL_SENTINEL && !customModel.trim()) {
      toast.error('Enter a custom model ID'); return
    }
    const payload = {
      model: effectiveModel || meta.defaultModel,
      base_url: localBase || meta.defaultBaseUrl || null,
    }
    if (keyDirty) payload.providerSecret = localKey

    if (isMissing) {
      setSaving(true)
      try {
        await onCreate(provider.provider_name, payload)
        toast.success(`${meta.label} created`)
      } catch (err) {
        toast.error(`Unable to create ${meta.label}: ${err?.message || 'Unknown error'}`)
      } finally {
        setSaving(false)
      }
    } else {
      onUpdate(provider.id, payload)
      toast.success(`${meta.label} saved`)
    }

    setDirty(false)
    setKeyDirty(false)
    setLocalKey('')
  }

  const handleToggle = async () => {
    if (isMissing) {
      setSaving(true)
      try {
        await onCreate(provider.provider_name, {
          model: localModel || meta.defaultModel,
          base_url: localBase || meta.defaultBaseUrl || null,
          is_active: true,
          ...(keyDirty ? { providerSecret: localKey } : {}),
        })
      } catch (err) {
        toast.error(`Unable to activate ${meta.label}: ${err?.message || 'Unknown error'}`)
      } finally {
        setSaving(false)
      }
    } else {
      onUpdate(provider.id, { is_active: !provider.is_active })
    }
  }

  return (
    <div className={`rounded-[24px] border bg-card/80 backdrop-blur-sm overflow-hidden transition-all ${provider.is_active ? 'border-primary/30 shadow-sm' : 'border-border/50 opacity-75'}`}>
      {/* Gradient top bar */}
      <div className={`bg-gradient-to-r ${meta.color} p-0.5`}>
        <div className="bg-card rounded-t-[23px] px-4 py-3 flex items-center gap-3">
          {/* Drag handle */}
          <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors shrink-0">
            <GripVertical className="w-4 h-4" />
          </div>

          {/* Icon + name */}
          <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${meta.color} flex items-center justify-center shrink-0`}>
            <Brain className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-bold text-sm">{meta.label}</p>
              <HealthDot status={provider.health_status || 'unknown'} />
            </div>
            <p className="text-xs text-muted-foreground">Priority {index + 1}</p>
          </div>

          {/* Stats (collapsed view) */}
          {stats.requests > 0 && (
            <div className="hidden sm:flex flex-col items-end text-xs text-muted-foreground shrink-0">
              <span className={successRate >= 90 ? 'text-green-500 font-medium' : successRate >= 60 ? 'text-yellow-500 font-medium' : 'text-red-500 font-medium'}>
                {successRate}% ok
              </span>
              <span>{stats.avg_latency_ms}ms avg</span>
            </div>
          )}

          {/* Toggle */}
          <button
            onClick={handleToggle}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 ${provider.is_active ? 'bg-primary' : 'bg-muted'}`}
          >
            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${provider.is_active ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </button>

          {/* Expand button */}
          <button onClick={() => setExpanded(!expanded)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted transition-colors shrink-0">
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Collapsible body */}
      {expanded && (
        <div className="px-4 py-4 space-y-3">
          {isMissing && (
            <div className="rounded-xl bg-yellow-50 border border-yellow-200 px-3 py-2 text-xs text-yellow-800">
              Provider row is not created yet. Enter configuration below and click Save to add this provider.
            </div>
          )}

          {/* API Key */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">API Key</label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type={showKey ? 'text' : 'password'}
                value={localKey}
                onChange={e => { setLocalKey(e.target.value); markKey(e.target.value) }}
                placeholder={hasSavedKey ? 'Saved server-side - paste to replace' : 'Paste API key...'}
                className="w-full pl-8 pr-9 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button onClick={() => setShowKey(!showKey)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <a href={meta.docsUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline mt-1 inline-flex items-center gap-1">
              <Info className="w-3 h-3" />{meta.hint}
            </a>
          </div>

          {/* Base URL (DeepSeek, Cerebras only) */}
          {meta.hasBaseUrl && (
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Base URL <span className="font-normal">(optional, defaults to {meta.defaultBaseUrl})</span>
              </label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  type="text"
                  value={localBase}
                  onChange={e => { setLocalBase(e.target.value); mark(e.target.value) }}
                  placeholder={meta.defaultBaseUrl}
                  className="w-full pl-8 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
          )}

          {/* Model selection */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-muted-foreground">Model</label>
              <button
                onClick={handleRefreshModels}
                disabled={refreshing || (!localKey && !hasSavedKey) || isDevMode()}
                title={isDevMode() ? 'Model refresh requires Vercel deployment' : 'Fetch available models from provider API'}
                className="flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh models
              </button>
            </div>
            <select
              value={localModel}
              onChange={e => { setLocalModel(e.target.value); mark(e.target.value) }}
              className="w-full py-2 px-3 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {dropdownModels.length > 0
                ? dropdownModels.map(m => <option key={m.value || m} value={m.value || m}>{m.label || m.value || m}</option>)
                : <option value="">— no models loaded —</option>
              }
              <option value={CUSTOM_MODEL_SENTINEL}>— type custom model ID —</option>
            </select>
            {localModel === CUSTOM_MODEL_SENTINEL && (
              <input
                type="text"
                value={customModel}
                onChange={e => { setCustomModel(e.target.value); mark(e.target.value) }}
                placeholder={`e.g. ${meta.defaultModel || 'model-id'}`}
                className="mt-2 w-full px-3 py-2 text-sm rounded-xl border border-primary/40 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
                autoFocus
              />
            )}
            {localModel === CUSTOM_MODEL_SENTINEL && (
              <p className="text-xs text-muted-foreground mt-1">Enter any valid model ID from {meta.label}. Check the provider docs for available IDs.</p>
            )}
          </div>

          {/* Test result */}
          {testResult && (
            <div className={`rounded-xl px-3 py-2 text-xs flex items-start gap-2 ${testResult.ok ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-500'}`}>
              {testResult.ok ? <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" /> : <XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
              <span>{testResult.ok ? `Connected in ${testResult.durationMs}ms — "${testResult.response}"` : testResult.error}</span>
            </div>
          )}

          {/* Stats row */}
          {stats.requests > 0 && (
            <div className="rounded-xl bg-muted/30 px-3 py-2 grid grid-cols-4 gap-2 text-xs text-center">
              <div><p className="font-bold">{stats.requests}</p><p className="text-muted-foreground">Total</p></div>
              <div><p className="font-bold text-green-500">{stats.successes}</p><p className="text-muted-foreground">OK</p></div>
              <div><p className="font-bold text-red-500">{stats.failures}</p><p className="text-muted-foreground">Fail</p></div>
              <div><p className="font-bold">{stats.avg_latency_ms}ms</p><p className="text-muted-foreground">Avg</p></div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleTest}
              disabled={testing || (!localKey && !hasSavedKey)}
              className="flex items-center gap-1.5 h-8 px-3 rounded-xl border border-border text-xs font-medium hover:border-primary/40 hover:text-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {testing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              Test
            </button>
            {dirty && (
              <button
              onClick={handleSave}
              disabled={saving || (!dirty && !isMissing)}
              className="flex items-center gap-1.5 h-8 px-3 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <span>Save</span>}
              </button>
            )}
            {!dirty && hasSavedKey && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Shield className="w-3 h-3" />Key saved server-side
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Health Dashboard ──────────────────────────────────────────────────────────

function HealthDashboard({ providers }) {
  return (
    <div className="rounded-[24px] border border-border/50 bg-card/80 overflow-hidden mb-6">
      <div className="px-5 py-3 border-b border-border/50">
        <h3 className="font-bold text-sm">Provider Health</h3>
      </div>
      <div className="divide-y divide-border/30">
        {PROVIDER_ORDER.map(name => {
          const p = providers.find(x => x.provider_name === name)
          if (!p) return null
          const meta = PROVIDER_META[name]
          const stats = p.stats || {}
          const successRate = stats.requests > 0 ? Math.round((stats.successes / stats.requests) * 100) : null
          const statusMap = { healthy: '🟢', degraded: '🟡', down: '🔴', unknown: '⚪' }
          return (
            <div key={name} className="px-5 py-2.5 flex items-center gap-3">
              <span className="text-base leading-none">{statusMap[p.health_status || 'unknown']}</span>
              <p className="font-medium text-sm w-28 shrink-0">{meta?.label}</p>
              <div className="flex-1 flex items-center gap-4 text-xs text-muted-foreground">
                {p.is_active && p.has_api_key
                  ? <span className="text-green-600 font-medium">Active</span>
                  : <span>Inactive</span>
                }
                {p.last_latency_ms && <span>{p.last_latency_ms}ms</span>}
                {successRate !== null && (
                  <span className={successRate >= 90 ? 'text-green-600' : successRate >= 60 ? 'text-yellow-600' : 'text-red-500'}>
                    {successRate}% success
                  </span>
                )}
                {stats.requests > 0 && <span>{stats.requests} calls</span>}
                {p.health_status === 'down' && stats.last_error && (
                  <span className="text-red-500 truncate max-w-[200px]">{String(stats.last_error).slice(0, 80)}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AiSettings() {
  const queryClient = useQueryClient()
  const [testingAll, setTestingAll] = useState(false)
  const [showHealth, setShowHealth] = useState(false)

  const { data: providers = [], isLoading } = useQuery({
    queryKey: ['ai-providers'],
    queryFn: getAiProviders,
    retry: false,
  })

  const { data: analytics = [], isFetching: analyticsLoading, refetch: refetchAnalytics } = useQuery({
    queryKey: ['provider-analytics'],
    queryFn: getProviderAnalytics,
    enabled: !isLoading,
    retry: false,
  })

  const { data: failures = [], isFetching: failuresLoading, refetch: refetchFailures } = useQuery({
    queryKey: ['provider-failures'],
    queryFn: () => getProviderFailures({ limit: 50 }),
    enabled: !isLoading,
    retry: false,
  })

  const [seededProviders, setSeededProviders] = useState(false)

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateAiProvider(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai-providers'] }),
    onError: err => toast.error(err.message),
  })

  const handleUpdate = useCallback((id, data) => {
    updateMutation.mutate({ id, data })
  }, [updateMutation])

  const handleCreate = useCallback(async (providerName, data) => {
    try {
      const row = await upsertAiProvider(providerName, {
        model: data.model,
        base_url: data.base_url,
        priority: PROVIDER_ORDER.indexOf(providerName) + 1,
      })
      if (!row) throw new Error(`Failed to create ${providerName}`)
      await updateAiProvider(row.id, data)
      queryClient.invalidateQueries({ queryKey: ['ai-providers'] })
    } catch (err) {
      throw new Error(err.message || `Failed to create ${providerName}`)
    }
  }, [queryClient])

  useEffect(() => {
    if (isLoading || seededProviders) return
    const missingProviders = PROVIDER_ORDER.filter(name => !providers.some(p => p.provider_name === name))
    if (missingProviders.length === 0) {
      setSeededProviders(true)
      return
    }

    let cancelled = false
    const seedProviders = async () => {
      await Promise.all(missingProviders.map((providerName) =>
        upsertAiProvider(providerName, {
          model: PROVIDER_META[providerName]?.defaultModel || '',
          base_url: PROVIDER_META[providerName]?.defaultBaseUrl || null,
          priority: PROVIDER_ORDER.indexOf(providerName) + 1,
        })
      ))
      if (!cancelled) {
        queryClient.invalidateQueries({ queryKey: ['ai-providers'] })
        setSeededProviders(true)
      }
    }

    seedProviders().catch(() => {
      if (!cancelled) setSeededProviders(true)
    })
    return () => { cancelled = true }
  }, [isLoading, providers, queryClient, seededProviders])

  // Drag-and-drop reorder
  const handleDragEnd = (result) => {
    if (!result.destination) return
    const { source, destination } = result
    if (source.index === destination.index) return

    const sorted = [...providers].sort((a, b) => a.priority - b.priority)
    const [moved] = sorted.splice(source.index, 1)
    sorted.splice(destination.index, 0, moved)

    // Update priorities sequentially
    sorted.forEach((provider, idx) => {
      const newPriority = idx + 1
      if (provider.priority !== newPriority) {
        handleUpdate(provider.id, { priority: newPriority })
      }
    })
  }

  // Test all active providers sequentially
  const handleTestAll = async () => {
    const active = providers.filter(p => p.is_active && p.has_api_key)
    if (!active.length) { toast.error('No active providers to test'); return }

    setTestingAll(true)
    let passed = 0

    for (const p of active) {
      const result = await testProvider(p)
      await recordProviderCall(p.id, {
        success: result.ok,
        latencyMs: result.durationMs,
        error: result.error || null,
      }).catch(() => {})
      if (result.ok) { passed++; toast.success(`${PROVIDER_META[p.provider_name]?.label}: ${result.durationMs}ms`) }
      else toast.error(`${PROVIDER_META[p.provider_name]?.label}: ${result.error?.slice(0, 80)}`)
    }

    queryClient.invalidateQueries({ queryKey: ['ai-providers'] })
    toast.success(`Test complete: ${passed}/${active.length} providers healthy`)
    setTestingAll(false)
  }

  const sorted = [...providers].sort((a, b) => a.priority - b.priority)
  const missingProviderNames = PROVIDER_ORDER.filter(name => !providers.some(p => p.provider_name === name))
  const visibleProviders = [
    ...sorted,
    ...missingProviderNames.map((providerName) => ({
      id: `missing-${providerName}`,
      provider_name: providerName,
      model: PROVIDER_META[providerName]?.defaultModel || '',
      base_url: PROVIDER_META[providerName]?.defaultBaseUrl || '',
      available_models: PROVIDER_MODELS[providerName] || [],
      stats: { requests: 0, successes: 0, failures: 0, avg_latency_ms: 0 },
      is_active: false,
      has_api_key: false,
      health_status: 'unknown',
      priority: PROVIDER_ORDER.indexOf(providerName) + 1,
    })),
  ]
  const activeCount = providers.filter(p => p.is_active && p.has_api_key).length
  const configuredCount = providers.filter(p => p.has_api_key).length

  return (
    <main className="max-w-[1200px] mx-auto px-4 lg:px-8 py-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-3">
            <Brain className="w-3.5 h-3.5" />AI Job Intelligence
          </div>
          <h1 className="text-4xl font-black tracking-tight">AI Provider Settings</h1>
          <p className="text-muted-foreground mt-2">
            Configure 6 AI providers with automatic fallback. Drag to reorder the fallback chain.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => setShowHealth(!showHealth)}
            className="flex items-center gap-2 h-10 px-4 rounded-2xl border border-border font-medium text-sm hover:bg-muted/50 transition-all"
          >
            <Activity className="w-4 h-4" />Health
          </button>
          <button
            onClick={handleTestAll}
            disabled={testingAll || !activeCount}
            className="flex items-center gap-2 h-10 px-4 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-50"
          >
            {testingAll ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Test All
          </button>
        </div>
      </div>

      {/* System status banner */}
      <div className={`mb-5 rounded-2xl px-5 py-3 flex items-center gap-3 text-sm border ${activeCount > 0 ? 'bg-green-500/10 border-green-500/20 text-green-700' : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-700'}`}>
        {activeCount > 0 ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
        <span>
          {activeCount > 0
            ? `${activeCount} of ${configuredCount} configured provider(s) active. AI generation ready.`
            : 'No active providers. Enable at least one and add an API key.'}
        </span>
      </div>

      {/* Health dashboard (toggle) */}
      {showHealth && !isLoading && <HealthDashboard providers={visibleProviders} />}

      {/* Usage statistics and failure logs */}
      {!isLoading && (
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div className="rounded-[24px] border border-border/50 bg-card/80 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm">Usage Statistics</h3>
              <button onClick={() => refetchAnalytics()} className="text-xs text-primary">Refresh</button>
            </div>
            <div className="space-y-2 text-xs">
              {analytics.length === 0 && <p className="text-muted-foreground">No analytics yet</p>}
              {analytics.map(a => (
                <div key={a.provider_name} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{PROVIDER_META[a.provider_name]?.label || a.provider_name}</p>
                    <p className="text-muted-foreground text-xs">{a.health_status || 'unknown'} — priority {a.priority}</p>
                  </div>
                  <div className="text-right text-xs">
                    <p className="font-bold">{(a.stats?.requests || 0)} calls</p>
                    <p className="text-muted-foreground">avg {a.stats?.avg_latency_ms || 0}ms</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-border/50 bg-card/80 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm">Recent Provider Failures</h3>
              <button onClick={() => refetchFailures()} className="text-xs text-primary">Refresh</button>
            </div>
            <div className="space-y-2 text-xs">
              {failuresLoading && <p className="text-muted-foreground">Loading…</p>}
              {!failuresLoading && failures.length === 0 && <p className="text-muted-foreground">No failures recorded</p>}
              {failures.map((f, i) => (
                <div key={f.id || i} className="rounded-xl p-2 bg-muted/20">
                  <p className="font-medium">{f.provider_name || f.provider || f.event_data?.provider_name || f.event_data?.provider || 'unknown'}</p>
                  <p className="text-rose-600 text-xs truncate">{String(f.error || f.event_data?.error || f.event_data?.message || f.message || '').slice(0, 200)}</p>
                  <p className="text-muted-foreground text-xs">{new Date(f.created_at || f.occurred_at || f.event_time || Date.now()).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* How it works */}
      <div className="mb-5 rounded-2xl border border-border/50 bg-card/40 px-5 py-4">
        <p className="text-sm font-medium mb-1">Fallback chain</p>
        <p className="text-xs text-muted-foreground">
          Providers are tried top-to-bottom. <strong>Drag</strong> cards to reorder. The first active provider with a valid key is used; on failure the system moves to the next automatically. Click the card to expand and configure.
        </p>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {sorted.filter(p => p.is_active && p.has_api_key).map((p, i) => {
            const meta = PROVIDER_META[p.provider_name]
            return (
              <span key={p.id} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                {i + 1}. {meta?.label}
              </span>
            )
          })}
          {!activeCount && <span className="text-xs text-muted-foreground">No active providers</span>}
        </div>
      </div>

      {/* Provider cards with drag-and-drop */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="h-14 rounded-[24px] bg-muted/30 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="providers">
              {provided => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-3">
                  {sorted.map((provider, index) => (
                    <Draggable key={provider.id} draggableId={provider.id} index={index}>
                      {(drag, snapshot) => (
                        <div
                          ref={drag.innerRef}
                          {...drag.draggableProps}
                          className={snapshot.isDragging ? 'opacity-90 scale-[1.01]' : ''}
                        >
                          <ProviderCard
                            provider={provider}
                            index={index}
                            onUpdate={handleUpdate}
                            dragHandleProps={drag.dragHandleProps}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
          {missingProviderNames.length > 0 && (
            <div className="space-y-3 mt-4">
              {missingProviderNames.map((providerName, index) => (
                <ProviderCard
                  key={`missing-${providerName}`}
                  provider={{
                    id: `missing-${providerName}`,
                    provider_name: providerName,
                    model: PROVIDER_META[providerName]?.defaultModel || '',
                    base_url: PROVIDER_META[providerName]?.defaultBaseUrl || '',
                    available_models: PROVIDER_MODELS[providerName] || [],
                    stats: { requests: 0, successes: 0, failures: 0, avg_latency_ms: 0 },
                    is_active: false,
                    has_api_key: false,
                    health_status: 'unknown',
                    priority: PROVIDER_ORDER.indexOf(providerName) + 1,
                  }}
                  index={sorted.length + index}
                  onUpdate={handleUpdate}
                  onCreate={handleCreate}
                  dragHandleProps={{}}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Note */}
      <div className="mt-6 rounded-2xl border border-border/50 bg-muted/20 px-5 py-4">
        <p className="text-xs text-muted-foreground">
          <strong>Tip:</strong> Keep provider keys out of <code className="font-mono">VITE_*</code> variables. Add keys here only after login, or keep them in server-only environment variables for scripts such as provider monitoring.
        </p>
      </div>
    </main>
  )
}

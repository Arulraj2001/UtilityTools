'use client';
import React, { useState, useMemo } from 'react'
import { Plus, Trash2, Copy, Check, Download, Bot, Settings2 } from 'lucide-react'
import { toast } from 'sonner'

export default function RobotsTxtGenerator() {
  const [sitemap, setSitemap] = useState('https://example.com/sitemap.xml')
  const [rules, setRules] = useState([
    { id: 1, userAgent: '*', type: 'disallow', path: '/admin' },
    { id: 2, userAgent: '*', type: 'disallow', path: '/api' },
    { id: 3, userAgent: 'Googlebot', type: 'allow', path: '/api/public' },
  ])

  // New rule form states
  const [newAgent, setNewAgent] = useState('*')
  const [newType, setNewType] = useState('disallow')
  const [newPath, setNewPath] = useState('')
  const [copied, setCopied] = useState(false)

  // Generate robots.txt string
  const robotsTxt = useMemo(() => {
    // Group rules by user-agent
    const grouped = {}
    rules.forEach((rule) => {
      const agent = rule.userAgent.trim() || '*'
      if (!grouped[agent]) grouped[agent] = []
      grouped[agent].push(rule)
    })

    let content = ''
    Object.keys(grouped).forEach((agent) => {
      content += `User-agent: ${agent}\n`
      grouped[agent].forEach((rule) => {
        const typeStr = rule.type === 'allow' ? 'Allow' : 'Disallow'
        content += `${typeStr}: ${rule.path || '/'}\n`
      })
      content += '\n'
    })

    if (sitemap) {
      content += `Sitemap: ${sitemap}\n`
    }

    return content.trim()
  }, [rules, sitemap])

  const addRule = (e) => {
    e.preventDefault()
    if (!newPath.trim()) {
      toast.error('Path is required')
      return
    }

    const path = newPath.trim().startsWith('/') ? newPath.trim() : '/' + newPath.trim()
    setRules((prev) => [
      ...prev,
      {
        id: Date.now(),
        userAgent: newAgent,
        type: newType,
        path,
      },
    ])
    setNewPath('')
    toast.success('Crawler rule added!')
  }

  const deleteRule = (id) => {
    setRules((prev) => prev.filter((r) => r.id !== id))
    toast.success('Crawler rule deleted')
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(robotsTxt)
    setCopied(true)
    toast.success('robots.txt copied to clipboard!')
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadFile = () => {
    const element = document.createElement('a')
    const file = new Blob([robotsTxt], { type: 'text/plain;charset=utf-8' })
    element.href = URL.createObjectURL(file)
    element.download = 'robots.txt'
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
    toast.success('robots.txt downloaded!')
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Configuration column */}
      <div className="lg:col-span-6 space-y-5">
        {/* Form add rules */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4">
          <h2 className="text-base font-semibold flex items-center gap-2 text-foreground">
            <Settings2 className="w-4.5 h-4.5 text-primary" />
            Manage Crawler Rules
          </h2>

          <form onSubmit={addRule} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* User Agent */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">User-Agent</label>
                <select
                  value={newAgent}
                  onChange={(e) => setNewAgent(e.target.value)}
                  className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-xl outline-none text-sm transition-all focus:border-primary/50"
                >
                  <option value="*">* (All Bots)</option>
                  <option value="Googlebot">Googlebot</option>
                  <option value="Bingbot">Bingbot</option>
                  <option value="YandexBot">YandexBot</option>
                  <option value="facebot">Facebot</option>
                </select>
              </div>

              {/* Rule Type */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Access Type</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-xl outline-none text-sm transition-all focus:border-primary/50"
                >
                  <option value="disallow">Disallow</option>
                  <option value="allow">Allow</option>
                </select>
              </div>

              {/* Path */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Target Path</label>
                <input
                  type="text"
                  value={newPath}
                  onChange={(e) => setNewPath(e.target.value)}
                  className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-xl outline-none text-sm transition-all focus:border-primary/50"
                  placeholder="e.g. /private"
                />
              </div>
            </div>

            <button
              type="submit"
              className="flex items-center gap-1 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium transition-all shadow-md shadow-primary/10 hover:brightness-105"
            >
              <Plus className="w-4 h-4" />
              Add Rule
            </button>
          </form>
        </div>

        {/* List of rules */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Current Rules ({rules.length})</h3>

          {rules.length > 0 ? (
            <div className="border border-border/40 rounded-xl overflow-hidden text-xs">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-muted/50 text-muted-foreground font-semibold border-b border-border/40 text-left">
                    <th className="p-3">User-Agent</th>
                    <th className="p-3">Rule</th>
                    <th className="p-3">Path</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {rules.map((rule) => (
                    <tr key={rule.id} className="hover:bg-muted/20 text-muted-foreground">
                      <td className="p-3 font-mono font-medium text-foreground">{rule.userAgent}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full font-semibold uppercase text-[10px] ${rule.type === 'allow' ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'}`}>
                          {rule.type}
                        </span>
                      </td>
                      <td className="p-3 font-mono">{rule.path}</td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => deleteRule(rule.id)}
                          className="p-1 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">No crawler rules configured. All crawlers will have full access.</p>
          )}

          {/* Sitemap path */}
          <div className="space-y-1.5 border-t border-border/40 pt-4">
            <label className="text-xs font-semibold text-muted-foreground">XML Sitemap URL (Optional)</label>
            <input
              type="url"
              value={sitemap}
              onChange={(e) => setSitemap(e.target.value)}
              className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-xl outline-none text-sm transition-all focus:border-primary/50"
              placeholder="e.g. https://mywebsite.com/sitemap.xml"
            />
          </div>
        </div>
      </div>

      {/* Output Column */}
      <div className="lg:col-span-6 space-y-6">
        <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <Bot className="w-4 h-4 text-primary" />
              robots.txt File Preview
            </h3>
            <div className="flex gap-2">
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold transition-all"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              <button
                onClick={downloadFile}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold transition-all hover:brightness-105"
              >
                <Download className="w-3.5 h-3.5" />
                Download
              </button>
            </div>
          </div>
          <pre className="p-4 rounded-xl bg-background border border-border/40 text-xs font-mono overflow-x-auto text-left text-muted-foreground leading-relaxed min-h-[300px]">
            <code>{robotsTxt || '# Allow all crawlers\nUser-agent: *\nDisallow:'}</code>
          </pre>
        </div>
      </div>
    </div>
  )
}

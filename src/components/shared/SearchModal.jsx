import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Search, Wrench, BookOpen, ArrowRight } from 'lucide-react'
import { searchTools, searchWorkflowPages } from '@/api/supabaseApi'
import { trackWorkflowSearch } from '@/lib/analytics'
import { motion, AnimatePresence } from 'framer-motion'

export default function SearchModal({ open, onClose }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState({ tools: [], workflows: [] })
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (!open) {
      setQuery('')
      setResults({ tools: [], workflows: [] })
    }
  }, [open])

  useEffect(() => {
    if (query.length < 2) {
      setResults({ tools: [], workflows: [] })
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      const [tools, workflows] = await Promise.all([
        searchTools(query),
        searchWorkflowPages(query)
      ])
      setResults({ tools: tools || [], workflows: workflows || [] })
      setLoading(false)
      
      const totalCount = (tools?.length || 0) + (workflows?.length || 0)
      trackWorkflowSearch({ query, resultCount: totalCount, source: 'quick_search' })
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  const handleSelectTool = (tool) => {
    navigate(`/tool/${encodeURIComponent(tool.slug)}`)
    onClose()
  }

  const handleSelectWorkflow = (workflow) => {
    navigate(`/workflow/${encodeURIComponent(workflow.slug)}`)
    onClose()
  }

  const hasResults = results.tools.length > 0 || results.workflows.length > 0

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl p-0 gap-0 overflow-hidden">
        <div className="flex items-center gap-3 px-4 border-b">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search tools and workflows..."
            className="border-0 focus-visible:ring-0 text-base h-12"
            autoFocus
          />
          <kbd className="hidden sm:inline text-xs text-muted-foreground bg-muted px-2 py-1 rounded">ESC</kbd>
        </div>

        <div className="max-h-96 overflow-y-auto p-2">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          <AnimatePresence>
            {/* Tools Section */}
            {results.tools.length > 0 && (
              <div className="mb-4">
                <p className="text-xs uppercase font-semibold text-muted-foreground px-2 py-2">Tools</p>
                {results.tools.map((tool, i) => (
                  <motion.button
                    key={tool.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => handleSelectTool(tool)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors text-left group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Wrench className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{tool.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{tool.description}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </motion.button>
                ))}
              </div>
            )}

            {/* Workflows Section */}
            {results.workflows.length > 0 && (
              <div className="mb-4">
                <p className="text-xs uppercase font-semibold text-muted-foreground px-2 py-2">Workflows</p>
                {results.workflows.map((workflow, i) => (
                  <motion.button
                    key={workflow.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: (results.tools.length + i) * 0.03 }}
                    onClick={() => handleSelectWorkflow(workflow)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors text-left group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                      <BookOpen className="w-4 h-4 text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{workflow.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{workflow.excerpt || 'Workflow guide'}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </motion.button>
                ))}
              </div>
            )}
          </AnimatePresence>

          {query.length >= 2 && !loading && !hasResults && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No tools or workflows found for "{query}"
            </div>
          )}

          {query.length < 2 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Type to search tools and workflows...
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

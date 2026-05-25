// @ts-nocheck
import React, { useState, useRef, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Eye, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import WorkflowEditor from '@/components/admin/WorkflowEditor'
import { getWorkflowPages, deleteWorkflowPage, updateWorkflowPage } from '@/api/supabaseApi'

// TODO: add workflow categories, workflow analytics expansion, and workflow indexing queue support
const filterOptions = [
  { key: 'all', label: 'All' },
  { key: 'published', label: 'Published' },
  { key: 'draft', label: 'Draft' },
  { key: 'featured', label: 'Featured' },
]

export default function AdminWorkflowPages() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [editingPage, setEditingPage] = useState(null)
  const [showEditor, setShowEditor] = useState(false)
  const [highlightedPageId, setHighlightedPageId] = useState(null)
  const scrollPosition = useRef(0)
  const queryClient = useQueryClient()

  const { data: pages = [], isLoading, isFetching } = useQuery({
    queryKey: ['workflow-pages'],
    queryFn: async () => getWorkflowPages({ published: false, orderBy: 'updated_at', ascending: false, limit: 200 }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id) => deleteWorkflowPage(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['workflow-pages'] })
      toast.success('Workflow page deleted')
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (payload) => updateWorkflowPage(payload.id, payload.data),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['workflow-pages'] })
      if (variables?.id) {
        setHighlightedPageId(variables.id)
        window.setTimeout(() => setHighlightedPageId(null), 4000)
      }
      toast.success('Workflow page updated')
    },
  })

  const handleSearchChange = (value) => {
    setSearch(value)
  }

  const handleFilterChange = (filter) => {
    setStatusFilter(filter)
  }

  const openEditor = (page = null) => {
    if (typeof window !== 'undefined') {
      scrollPosition.current = window.scrollY
    }
    setEditingPage(page)
    setShowEditor(true)
  }

  const closeEditor = () => {
    setShowEditor(false)
    setEditingPage(null)
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: scrollPosition.current, behavior: 'auto' })
    }
  }

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()

    return pages
      .filter((page) => {
        if (statusFilter === 'published') return page.status === 'published'
        if (statusFilter === 'draft') return !page.status || page.status === 'draft'
        if (statusFilter === 'featured') return page.is_featured
        return true
      })
      .filter((page) => {
        if (!query) return true
        return (
          page.title?.toLowerCase().includes(query) ||
          page.slug?.toLowerCase().includes(query) ||
          page.excerpt?.toLowerCase().includes(query)
        )
      })
  }, [pages, statusFilter, search])

  const toggleStatus = (page) => {
    updateMutation.mutate({ id: page.id, data: { status: page.status === 'published' ? 'draft' : 'published' } })
  }

  const toggleFeatured = (page) => {
    updateMutation.mutate({ id: page.id, data: { is_featured: !page.is_featured } })
  }

  if (showEditor) {
    return (
      <WorkflowEditor
        page={editingPage}
        onSave={() => {
          closeEditor()
          queryClient.invalidateQueries({ queryKey: ['workflow-pages'] })
        }}
        onCancel={closeEditor}
      />
    )
  }

  const emptyStateMessage = isLoading
    ? 'Loading workflow pages...'
    : search || statusFilter !== 'all'
      ? 'No workflow pages match this filter. Try clearing search or selecting All.'
      : 'No workflow pages available. Create one to get started.'

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Workflow Pages</h1>
          <p className="text-sm text-muted-foreground mt-1">Create SEO-focused landing pages for intent-driven workflow content.</p>
          <p className="text-xs text-muted-foreground mt-2">
            Active filters and search remain while you edit workflows for reliable list state.
          </p>
        </div>
        <Button onClick={() => openEditor(null)} className="rounded-xl">
          <Plus className="w-4 h-4 mr-2" /> New Workflow Page
        </Button>
      </div>

      <div className="flex flex-col gap-3 mb-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          {filterOptions.map((option) => (
            <Button
              key={option.key}
              variant={statusFilter === option.key ? 'secondary' : 'outline'}
              size="sm"
              className="rounded-full"
              onClick={() => handleFilterChange(option.key)}
            >
              {option.label}
            </Button>
          ))}
        </div>

        <div className="relative w-full md:w-80">
          <Input
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search workflow pages..."
            className="pl-10 rounded-xl"
          />
        </div>
      </div>

      <div className="rounded-xl border border-border overflow-hidden bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 font-medium">Title</th>
              <th className="text-left p-3 font-medium hidden sm:table-cell">Status</th>
              <th className="text-left p-3 font-medium hidden lg:table-cell">Featured</th>
              <th className="text-left p-3 font-medium hidden lg:table-cell">Tools / Blogs</th>
              <th className="text-right p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((page) => (
              <tr
                key={page.id}
                className={`border-t border-border/50 ${page.id === highlightedPageId ? 'bg-primary/10' : 'hover:bg-muted/30'}`}
              >
                <td className="p-3 font-medium">
                  <div className="truncate max-w-xs">{page.title || 'Untitled workflow'}</div>
                  <div className="text-muted-foreground text-xs mt-1">{page.slug || 'no-slug'}</div>
                </td>
                <td className="p-3 hidden sm:table-cell">
                  <Badge variant={page.status === 'published' ? 'default' : 'secondary'} className="text-xs">{page.status || 'draft'}</Badge>
                </td>
                <td className="p-3 hidden lg:table-cell">
                  <div className="flex items-center gap-2">
                    <Sparkles className={`w-4 h-4 ${page.is_featured ? 'text-amber-400' : 'text-muted-foreground'}`} />
                    <span className="text-xs text-muted-foreground">{page.is_featured ? 'Featured' : 'Regular'}</span>
                  </div>
                </td>
                <td className="p-3 hidden lg:table-cell text-muted-foreground text-xs">
                  {Array.isArray(page.related_tools) ? page.related_tools.length : 0} tools
                  <span className="mx-2">·</span>
                  {Array.isArray(page.related_blogs) ? page.related_blogs.length : 0} blogs
                </td>
                <td className="p-3 text-right">
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => toggleStatus(page)}>
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => toggleFeatured(page)}>
                      <Sparkles className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditor(page)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => { if (confirm('Delete this workflow page?')) deleteMutation.mutate(page.id) }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                  {emptyStateMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isFetching && !isLoading && (
        <div className="mt-3 text-xs text-muted-foreground">Refreshing workflow list…</div>
      )}
    </div>
  )
}

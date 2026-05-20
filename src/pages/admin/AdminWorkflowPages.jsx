import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Eye, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import WorkflowEditor from '@/components/admin/WorkflowEditor'
import { getWorkflowPages, deleteWorkflowPage, updateWorkflowPage } from '@/api/supabaseApi'

export default function AdminWorkflowPages() {
  const [search, setSearch] = useState('')
  const [editingPage, setEditingPage] = useState(null)
  const [showEditor, setShowEditor] = useState(false)
  const queryClient = useQueryClient()

  const { data: pages = [], isLoading } = useQuery({
    queryKey: ['workflow-pages'],
    queryFn: () => getWorkflowPages({ published: false, orderBy: 'updated_at', ascending: false, limit: 200 }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteWorkflowPage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-pages'] })
      toast.success('Workflow page deleted')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateWorkflowPage(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-pages'] })
      toast.success('Workflow page updated')
    },
  })

  const filtered = pages.filter((page) => {
    const value = search.toLowerCase()
    return (
      page.title?.toLowerCase().includes(value) ||
      page.slug?.toLowerCase().includes(value) ||
      page.excerpt?.toLowerCase().includes(value)
    )
  })

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
          setShowEditor(false)
          setEditingPage(null)
          queryClient.invalidateQueries({ queryKey: ['workflow-pages'] })
        }}
        onCancel={() => {
          setShowEditor(false)
          setEditingPage(null)
        }}
      />
    )
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Workflow Pages</h1>
          <p className="text-sm text-muted-foreground mt-1">Create SEO-focused landing pages for intent-driven workflow content.</p>
        </div>
        <Button onClick={() => { setEditingPage(null); setShowEditor(true) }} className="rounded-xl">
          <Plus className="w-4 h-4 mr-2" /> New Workflow Page
        </Button>
      </div>

      <div className="relative mb-4">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search workflow pages..." className="pl-10 rounded-xl" />
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
              <tr key={page.id} className="border-t border-border/50 hover:bg-muted/30">
                <td className="p-3 font-medium">
                  <div className="truncate max-w-xs">{page.title}</div>
                  <div className="text-muted-foreground text-xs mt-1">{page.slug}</div>
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
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditingPage(page); setShowEditor(true) }}>
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
                  {isLoading ? 'Loading workflow pages...' : 'No workflow pages found.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

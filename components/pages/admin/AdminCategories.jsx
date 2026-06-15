'use client';
import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { getCategories, createCategory, updateCategory, deleteCategory } from '@/api/supabaseApi'

export default function AdminCategories() {
  const [editing, setEditing] = useState(null)
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState('basic')
  const queryClient = useQueryClient()
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => getCategories({ orderBy: 'sort_order', ascending: true, limit: 200 }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      toast.success('Deleted')
    },
  })

  const saveMutation = useMutation({
    mutationFn: async ({ id, payload }) => {
      return id ? updateCategory(id, payload) : createCategory(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      setOpen(false)
      toast.success('Saved')
    },
  })

  const [form, setForm] = useState({
    name: '', slug: '', description: '', icon: 'code', color: '#6366f1', sort_order: 0, is_featured: false, tool_count: 0,
    seo_title: '', seo_description: '', seo_keywords: '', seo_content: '', featured_image: '', canonical_url: ''
  })

  const openNew = () => {
    setForm({
      name: '', slug: '', description: '', icon: 'code', color: '#6366f1', sort_order: 0, is_featured: false, tool_count: 0,
      seo_title: '', seo_description: '', seo_keywords: '', seo_content: '', featured_image: '', canonical_url: ''
    })
    setEditing(null)
    setTab('basic')
    setOpen(true)
  }

  const openEdit = (cat) => {
    setForm({
      ...cat,
      seo_title: cat.seo_title || '',
      seo_description: cat.seo_description || '',
      seo_keywords: cat.seo_keywords || '',
      seo_content: cat.seo_content || '',
      featured_image: cat.featured_image || '',
      canonical_url: cat.canonical_url || ''
    })
    setEditing(cat)
    setTab('basic')
    setOpen(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.slug) {
      toast.error('Name and slug required')
      return
    }
    await saveMutation.mutateAsync({ id: editing?.id, payload: form })
  }

  const autoSlug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Categories</h1>
        <Button onClick={openNew} className="rounded-xl">
          <Plus className="w-4 h-4 mr-2" /> New Category
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map(cat => (
          <div key={cat.id} className="p-4 rounded-xl border border-border bg-card hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-semibold">{cat.name}</h3>
                <p className="text-xs text-muted-foreground">/{cat.slug}</p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(cat)}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { if (confirm('Delete?')) deleteMutation.mutate(cat.id) }}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">{cat.description}</p>
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <span>{cat.tool_count || 0} tools</span>
              <span>�</span>
              <span>Order: {cat.sort_order}</span>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Category' : 'New Category'}</DialogTitle>
          </DialogHeader>

          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic</TabsTrigger>
              <TabsTrigger value="seo">SEO</TabsTrigger>
              <TabsTrigger value="content">Content</TabsTrigger>
            </TabsList>

            {/* Basic Tab */}
            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">Name</Label>
                  <Input value={form.name} onChange={e => { setForm({ ...form, name: e.target.value, slug: editing ? form.slug : autoSlug(e.target.value) }) }} className="rounded-lg" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Slug</Label>
                  <Input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} className="rounded-lg" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">Description</Label>
                <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="rounded-lg" placeholder="Short description for listing pages" />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">Icon</Label>
                  <Input value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} className="rounded-lg" placeholder="code" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Color</Label>
                  <Input type="color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} className="rounded-lg h-10" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Sort Order</Label>
                  <Input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} className="rounded-lg" />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch checked={form.is_featured} onCheckedChange={v => setForm({ ...form, is_featured: v })} />
                <Label className="text-sm">Featured Category</Label>
              </div>
            </TabsContent>

            {/* SEO Tab */}
            <TabsContent value="seo" className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm">SEO Title</Label>
                <div>
                  <Input value={form.seo_title} onChange={e => setForm({ ...form, seo_title: e.target.value })} className="rounded-lg" placeholder={form.name} />
                  <p className="text-xs text-muted-foreground mt-1">{(form.seo_title || form.name).length}/60 characters</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">SEO Description</Label>
                <div>
                  <Input value={form.seo_description} onChange={e => setForm({ ...form, seo_description: e.target.value })} className="rounded-lg" placeholder="Compelling description for search results" />
                  <p className="text-xs text-muted-foreground mt-1">{form.seo_description.length}/160 characters</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">SEO Keywords</Label>
                <Input value={form.seo_keywords} onChange={e => setForm({ ...form, seo_keywords: e.target.value })} className="rounded-lg" placeholder="comma, separated, keywords" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">Featured Image URL</Label>
                <Input value={form.featured_image} onChange={e => setForm({ ...form, featured_image: e.target.value })} className="rounded-lg" placeholder="https://..." />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">Canonical URL</Label>
                <Input value={form.canonical_url} onChange={e => setForm({ ...form, canonical_url: e.target.value })} className="rounded-lg" placeholder="https://www.quickutils.page/category/..." />
              </div>
            </TabsContent>

            {/* Content Tab */}
            <TabsContent value="content" className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm">SEO Content (HTML)</Label>
                <textarea
                  value={form.seo_content}
                  onChange={e => setForm({ ...form, seo_content: e.target.value })}
                  className="w-full p-2 rounded-lg border border-border bg-background text-foreground font-mono text-xs"
                  rows={12}
                  placeholder={`<h2>About ${form.name}</h2>\n<p>Rich content for this category...</p>\n<h3>Common workflows</h3>\n<ul>\n  <li>Workflow 1</li>\n  <li>Workflow 2</li>\n</ul>`}
                />
                <p className="text-xs text-muted-foreground mt-1">Supports HTML. Use semantic headings (h2, h3). Avoid inline scripts.</p>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex gap-2 mt-6">
            <Button onClick={handleSave} className="flex-1 rounded-xl" disabled={saveMutation.isPending}>
              <Save className="w-4 h-4 mr-2" /> Save Category
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl">Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

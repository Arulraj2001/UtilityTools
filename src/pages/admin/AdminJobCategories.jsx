import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { getJobCategories, createJobCategory, updateJobCategory, deleteJobCategory } from '@/api/supabaseApi'

export default function AdminJobCategories() {
  const [editing, setEditing] = useState(null)
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['job-categories'],
    queryFn: () => getJobCategories({ orderBy: 'sort_order', ascending: true, limit: 200 }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteJobCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-categories'] })
      toast.success('Category deleted')
    },
  })

  const saveMutation = useMutation({
    mutationFn: async ({ id, payload }) => {
      return id ? updateJobCategory(id, payload) : createJobCategory(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-categories'] })
      setOpen(false)
      toast.success('Category saved')
    },
    onError: (error) => {
      toast.error(error?.message || 'Unable to save category')
    },
  })

  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    icon: 'briefcase',
    color: '#6366f1',
    featured: false,
    sort_order: 0,
    seo_title: '',
    seo_description: '',
    seo_keywords: '',
    canonical_url: '',
    og_image: '',
    intro_content: '',
  })
  const [searchTerm, setSearchTerm] = useState('')

  const autoSlug = (value) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

  const openNew = () => {
    setForm({
      name: '',
      slug: '',
      description: '',
      icon: 'briefcase',
      color: '#6366f1',
      featured: false,
      sort_order: 0,
      seo_title: '',
      seo_description: '',
      seo_keywords: '',
      canonical_url: '',
      og_image: '',
      intro_content: '',
    })
    setEditing(null)
    setOpen(true)
  }

  const openEdit = (category) => {
    setForm({
      name: category.name || '',
      slug: category.slug || '',
      description: category.description || '',
      icon: category.icon || 'briefcase',
      color: category.color || '#6366f1',
      featured: category.featured || false,
      sort_order: category.sort_order || 0,
      seo_title: category.seo_title || '',
      seo_description: category.seo_description || '',
      seo_keywords: category.seo_keywords || '',
      canonical_url: category.canonical_url || '',
      og_image: category.og_image || '',
      intro_content: category.intro_content || '',
      id: category.id,
    })
    setEditing(category)
    setOpen(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.slug) {
      toast.error('Name and slug are required')
      return
    }
    await saveMutation.mutateAsync({ id: editing?.id, payload: form })
  }

  const filtered = categories.filter((cat) =>
    cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (cat.slug || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Job Categories</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage reusable job categories, SEO settings, and featured collections.</p>
        </div>
        <Button onClick={openNew} className="rounded-xl">
          <Plus className="w-4 h-4 mr-2" /> New Category
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 mb-6">
        {categories.slice(0, 6).map((category) => (
          <div key={category.id} className="rounded-3xl border border-border/50 bg-card p-5 shadow-sm transition hover:shadow-md">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: category.color }}></span>
                  {category.name}
                </div>
                <p className="mt-3 text-sm font-semibold">/{category.slug}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => openEdit(category)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => { if (confirm('Delete this category?')) deleteMutation.mutate(category.id) }}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <p className="mt-4 text-sm text-muted-foreground line-clamp-3">{category.description || 'No description yet.'}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span>{category.featured ? 'Featured' : 'Standard'}</span>
              <span>Order {category.sort_order || 0}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-3xl border border-border/50 bg-card overflow-hidden">
        <div className="p-4 border-b border-border/50 bg-muted/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">All Job Categories</h2>
              <p className="text-sm text-muted-foreground">Search, edit, and organize your category library.</p>
            </div>
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search categories..."
              className="max-w-sm rounded-xl"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-4 font-medium">Name</th>
                <th className="p-4 font-medium hidden md:table-cell">Description</th>
                <th className="p-4 font-medium hidden lg:table-cell">Status</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((category) => (
                <tr key={category.id} className="border-t border-border/50 hover:bg-muted/30">
                  <td className="p-4">
                    <div className="font-semibold">{category.name}</div>
                    <div className="text-xs text-muted-foreground">/{category.slug}</div>
                  </td>
                  <td className="p-4 hidden md:table-cell text-muted-foreground line-clamp-2">{category.description}</td>
                  <td className="p-4 hidden lg:table-cell text-sm text-muted-foreground">
                    {category.featured ? 'Featured' : 'Standard'}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => openEdit(category)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => { if (confirm('Delete this category?')) deleteMutation.mutate(category.id) }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-muted-foreground">
                    {isLoading ? 'Loading categories...' : 'No job categories found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[min(92vw,56rem)] max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Job Category' : 'New Job Category'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 mt-2 overflow-y-auto pr-1 max-h-[calc(90vh-9rem)]">
            <div className="rounded-3xl border border-border/50 bg-muted/5 p-4">
              <h3 className="text-base font-semibold">Basic Info</h3>
              <p className="text-sm text-muted-foreground mt-1">Name, slug, description, and category visibility.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-sm">Name</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => {
                      const value = e.target.value
                      setForm({
                        ...form,
                        name: value,
                        slug: editing ? form.slug : autoSlug(value),
                      })
                    }}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Slug</Label>
                  <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: autoSlug(e.target.value) })} className="rounded-xl" />
                </div>
              </div>
              <div className="space-y-1.5 mt-4">
                <Label className="text-sm">Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-xl h-24" />
              </div>
            </div>

            <div className="rounded-3xl border border-border/50 bg-muted/5 p-4">
              <h3 className="text-base font-semibold">SEO</h3>
              <p className="text-sm text-muted-foreground mt-1">Metadata used for search engines and social previews.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-sm">SEO Title</Label>
                  <Input value={form.seo_title} onChange={(e) => setForm({ ...form, seo_title: e.target.value })} className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">SEO Keywords</Label>
                  <Input value={form.seo_keywords} onChange={(e) => setForm({ ...form, seo_keywords: e.target.value })} className="rounded-xl" placeholder="comma separated keywords" />
                </div>
              </div>
              <div className="space-y-1.5 mt-4">
                <Label className="text-sm">SEO Description</Label>
                <Textarea value={form.seo_description} onChange={(e) => setForm({ ...form, seo_description: e.target.value })} className="rounded-xl h-24" />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-sm">Canonical URL</Label>
                  <Input value={form.canonical_url} onChange={(e) => setForm({ ...form, canonical_url: e.target.value })} className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Open Graph Image</Label>
                  <Input value={form.og_image} onChange={(e) => setForm({ ...form, og_image: e.target.value })} className="rounded-xl" placeholder="Image URL" />
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-border/50 bg-muted/5 p-4">
              <h3 className="text-base font-semibold">Appearance</h3>
              <p className="text-sm text-muted-foreground mt-1">Visual settings for featured collections and category cards.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-sm">Icon</Label>
                  <Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} className="rounded-xl" placeholder="briefcase" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Color</Label>
                  <Input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="rounded-xl h-10" />
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 items-end">
                <div className="space-y-1.5">
                  <Label className="text-sm">Sort Order</Label>
                  <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} className="rounded-xl" />
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.featured} onCheckedChange={(value) => setForm({ ...form, featured: value })} />
                  <Label className="text-sm">Featured</Label>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-border/50 bg-muted/5 p-4">
              <h3 className="text-base font-semibold">Intro Content</h3>
              <p className="text-sm text-muted-foreground mt-1">Optional introductory content shown on the category page.</p>
              <Textarea value={form.intro_content} onChange={(e) => setForm({ ...form, intro_content: e.target.value })} className="rounded-xl h-36 mt-4" />
            </div>

            <Button type="button" onClick={handleSave} disabled={saveMutation.isLoading} className="w-full rounded-xl">
              <Save className="w-4 h-4 mr-2" /> Save Category
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

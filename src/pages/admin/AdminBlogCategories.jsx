import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { getBlogCategories, createBlogCategory, updateBlogCategory, deleteBlogCategory } from '@/api/supabaseApi'

export default function AdminBlogCategories() {
  const [editing, setEditing] = useState(null)
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['blog-categories'],
    queryFn: () => getBlogCategories({ orderBy: 'sort_order', ascending: true, limit: 200 }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteBlogCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-categories'] })
      toast.success('Category deleted')
    },
  })

  const saveMutation = useMutation({
    mutationFn: async ({ id, payload }) => {
      return id ? updateBlogCategory(id, payload) : createBlogCategory(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-categories'] })
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
    seo_title: '',
    seo_description: '',
    seo_keywords: '',
    featured_image: '',
    icon: 'bookmark',
    color: '#6366f1',
    featured: false,
    sort_order: 0,
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
      seo_title: '',
      seo_description: '',
      seo_keywords: '',
      featured_image: '',
      icon: 'bookmark',
      color: '#6366f1',
      featured: false,
      sort_order: 0,
    })
    setEditing(null)
    setOpen(true)
  }

  const openEdit = (category) => {
    setForm({ ...category })
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
    cat.slug.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Blog Categories</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage reusable categories, SEO settings, and featured collections.</p>
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
              <h2 className="text-lg font-semibold">All Blog Categories</h2>
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
                <th className="p-4 font-medium hidden md:table-cell">SEO Title</th>
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
                  <td className="p-4 hidden md:table-cell text-muted-foreground line-clamp-2">{category.seo_title || category.description}</td>
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
                    {isLoading ? 'Loading categories...' : 'No blog categories found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Blog Category' : 'New Blog Category'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid gap-3 sm:grid-cols-2">
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
            <div className="space-y-1.5">
              <Label className="text-sm">Description</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-xl" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-sm">SEO Title</Label>
                <Input value={form.seo_title} onChange={(e) => setForm({ ...form, seo_title: e.target.value })} className="rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Keywords</Label>
                <Input value={form.seo_keywords} onChange={(e) => setForm({ ...form, seo_keywords: e.target.value })} className="rounded-xl" placeholder="tool, seo, productivity" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">SEO Description</Label>
              <Input value={form.seo_description} onChange={(e) => setForm({ ...form, seo_description: e.target.value })} className="rounded-xl" />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Featured Image URL</Label>
                <Input value={form.featured_image} onChange={(e) => setForm({ ...form, featured_image: e.target.value })} className="rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Icon</Label>
                <Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} className="rounded-xl" placeholder="bookmark" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Color</Label>
                <Input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="rounded-xl h-10" />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-sm">Sort Order</Label>
                <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} className="rounded-xl" />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.featured} onCheckedChange={(value) => setForm({ ...form, featured: value })} />
                <Label className="text-sm">Featured</Label>
              </div>
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

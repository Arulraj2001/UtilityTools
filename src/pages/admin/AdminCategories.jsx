import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { getCategories, createCategory, updateCategory, deleteCategory } from '@/api/supabaseApi'

export default function AdminCategories() {
  const [editing, setEditing] = useState(null)
  const [open, setOpen] = useState(false)
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

  const [form, setForm] = useState({ name: '', slug: '', description: '', icon: 'code', color: '#6366f1', sort_order: 0, is_featured: false, tool_count: 0 })

  const openNew = () => {
    setForm({ name: '', slug: '', description: '', icon: 'code', color: '#6366f1', sort_order: 0, is_featured: false, tool_count: 0 })
    setEditing(null)
    setOpen(true)
  }

  const openEdit = (cat) => {
    setForm({ ...cat })
    setEditing(cat)
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
              <span>•</span>
              <span>Order: {cat.sort_order}</span>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Category' : 'New Category'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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
              <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="rounded-lg" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Icon name</Label>
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
              <Label className="text-sm">Featured</Label>
            </div>
            <Button onClick={handleSave} className="w-full rounded-xl">
              <Save className="w-4 h-4 mr-2" /> Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

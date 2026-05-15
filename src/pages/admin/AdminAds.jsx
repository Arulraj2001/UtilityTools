import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { getAdPlacements, createAdPlacement, updateAdPlacement, deleteAdPlacement } from '@/api/supabaseApi'

export default function AdminAds() {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const queryClient = useQueryClient()

  const { data: ads = [] } = useQuery({
    queryKey: ['ads'],
    queryFn: () => getAdPlacements({ orderBy: 'created_at', ascending: false, limit: 200 }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteAdPlacement(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ads'] })
      toast.success('Deleted')
    },
  })

  const saveMutation = useMutation({
    mutationFn: async ({ id, payload }) => {
      return id ? updateAdPlacement(id, payload) : createAdPlacement(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ads'] })
      setOpen(false)
      toast.success('Saved')
    },
  })

  const [form, setForm] = useState({ name: '', slot_id: '', ad_code: '', placement: 'in_content', is_active: true, page_type: 'all' })

  const openForm = (ad = null) => {
    setForm(ad || { name: '', slot_id: '', ad_code: '', placement: 'in_content', is_active: true, page_type: 'all' })
    setEditing(ad)
    setOpen(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.slot_id) {
      toast.error('Name and slot ID required')
      return
    }
    await saveMutation.mutateAsync({ id: editing?.id, payload: form })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Ad Placements</h1>
        <Button onClick={() => openForm()} className="rounded-xl">
          <Plus className="w-4 h-4 mr-2" /> New Ad
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {ads.map(ad => (
          <div key={ad.id} className="p-4 rounded-xl border border-border bg-card">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-semibold">{ad.name}</h3>
                <p className="text-xs text-muted-foreground">{ad.slot_id}</p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openForm(ad)}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { if (confirm('Delete?')) deleteMutation.mutate(ad.id) }}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              <Badge variant="secondary" className="text-xs">{ad.placement}</Badge>
              <Badge variant={ad.is_active ? 'default' : 'secondary'} className="text-xs">{ad.is_active ? 'Active' : 'Inactive'}</Badge>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit Ad' : 'New Ad'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="rounded-lg" /></div>
              <div className="space-y-1.5"><Label>Slot ID</Label><Input value={form.slot_id} onChange={e => setForm({ ...form, slot_id: e.target.value })} className="rounded-lg" /></div>
            </div>
            <div className="space-y-1.5">
              <Label>Ad Code (HTML/JS)</Label>
              <Textarea value={form.ad_code} onChange={e => setForm({ ...form, ad_code: e.target.value })} rows={4} className="rounded-lg font-mono text-xs" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Placement</Label>
                <Select value={form.placement} onValueChange={v => setForm({ ...form, placement: v })}>
                  <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['header', 'sidebar', 'in_content', 'footer', 'tool_top', 'tool_bottom', 'blog_top', 'blog_bottom', 'sticky_bottom'].map(p => (
                      <SelectItem key={p} value={p}>{p.replace(/_/g, ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Page Type</Label>
                <Select value={form.page_type} onValueChange={v => setForm({ ...form, page_type: v })}>
                  <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['all', 'home', 'tool', 'blog', 'category'].map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
              <Label>Active</Label>
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

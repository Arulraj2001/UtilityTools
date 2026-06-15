'use client';
import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { getRedirects, createRedirect, deleteRedirect } from '@/api/supabaseApi'

export default function AdminRedirects() {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const { data: redirects = [] } = useQuery({
    queryKey: ['redirects'],
    queryFn: () => getRedirects({ orderBy: 'created_at', ascending: false, limit: 200 }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteRedirect(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['redirects'] })
      toast.success('Deleted')
    },
  })

  const createMutation = useMutation({
    mutationFn: (payload) => createRedirect(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['redirects'] })
      setOpen(false)
      toast.success('Redirect created')
    },
  })

  const [form, setForm] = useState({ from_path: '', to_path: '', status_code: 301, is_active: true })

  const handleSave = async () => {
    if (!form.from_path || !form.to_path) {
      toast.error('Both paths required')
      return
    }
    await createMutation.mutateAsync(form)
    setForm({ from_path: '', to_path: '', status_code: 301, is_active: true })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Redirects</h1>
        <Button onClick={() => setOpen(true)} className="rounded-xl">
          <Plus className="w-4 h-4 mr-2" /> New Redirect
        </Button>
      </div>

      <div className="rounded-xl border border-border overflow-hidden bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 font-medium">From</th>
              <th className="text-left p-3 font-medium">To</th>
              <th className="text-left p-3 font-medium hidden sm:table-cell">Code</th>
              <th className="text-left p-3 font-medium hidden sm:table-cell">Status</th>
              <th className="text-right p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {redirects.map(r => (
              <tr key={r.id} className="border-t border-border/50">
                <td className="p-3 font-mono text-xs">{r.from_path}</td>
                <td className="p-3 font-mono text-xs">{r.to_path}</td>
                <td className="p-3 hidden sm:table-cell"><Badge variant="secondary" className="text-xs">{r.status_code}</Badge></td>
                <td className="p-3 hidden sm:table-cell"><Badge variant={r.is_active ? 'default' : 'secondary'} className="text-xs">{r.is_active ? 'Active' : 'Inactive'}</Badge></td>
                <td className="p-3 text-right">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { if (confirm('Delete?')) deleteMutation.mutate(r.id) }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
            {redirects.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">No redirects</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Redirect</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>From Path</Label>
              <Input value={form.from_path} onChange={e => setForm({ ...form, from_path: e.target.value })} placeholder="/old-page" className="rounded-lg font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label>To Path</Label>
              <Input value={form.to_path} onChange={e => setForm({ ...form, to_path: e.target.value })} placeholder="/new-page" className="rounded-lg font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label>Status Code</Label>
              <Select value={String(form.status_code)} onValueChange={v => setForm({ ...form, status_code: parseInt(v) })}>
                <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="301">301 (Permanent)</SelectItem>
                  <SelectItem value="302">302 (Temporary)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
              <Label>Active</Label>
            </div>
            <Button onClick={handleSave} className="w-full rounded-xl">
              <Save className="w-4 h-4 mr-2" /> Create
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

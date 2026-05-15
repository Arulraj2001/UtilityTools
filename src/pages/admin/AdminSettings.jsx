import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Save, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { getSiteSettings, createSiteSetting, updateSiteSetting, deleteSiteSetting } from '@/api/supabaseApi'

export default function AdminSettings() {
  const queryClient = useQueryClient()

  const { data: settings = [] } = useQuery({
    queryKey: ['settings'],
    queryFn: () => getSiteSettings(),
  })

  const createMutation = useMutation({
    mutationFn: (payload) => createSiteSetting(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      toast.success('Setting created')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => updateSiteSetting(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      toast.success('Updated')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteSiteSetting(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      toast.success('Deleted')
    },
  })

  const [newSetting, setNewSetting] = useState({ key: '', value: '', type: 'text', group: 'general' })

  const handleCreate = async () => {
    if (!newSetting.key) {
      toast.error('Key required')
      return
    }
    await createMutation.mutateAsync(newSetting)
    setNewSetting({ key: '', value: '', type: 'text', group: 'general' })
  }

  const handleUpdate = async (setting, newValue) => {
    await updateMutation.mutateAsync({ id: setting.id, payload: { value: newValue } })
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this setting?')) return
    await deleteMutation.mutateAsync(id)
  }

  const groups = ['general', 'seo', 'analytics', 'social', 'monetization']
  const grouped = groups.map(g => ({
    name: g,
    items: settings.filter(s => s.group === g || (!s.group && g === 'general')),
  })).filter(g => g.items.length > 0)

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Site Settings</h1>

      <Card className="mb-8">
        <CardHeader><CardTitle className="text-base">Add Setting</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <Input value={newSetting.key} onChange={e => setNewSetting({ ...newSetting, key: e.target.value })} placeholder="Key" className="rounded-lg" />
            <Input value={newSetting.value} onChange={e => setNewSetting({ ...newSetting, value: e.target.value })} placeholder="Value" className="rounded-lg" />
            <Select value={newSetting.type} onValueChange={v => setNewSetting({ ...newSetting, type: v })}>
              <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['text', 'html', 'json', 'boolean', 'number'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={newSetting.group} onValueChange={v => setNewSetting({ ...newSetting, group: v })}>
              <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent>
                {groups.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={handleCreate} className="rounded-lg"><Plus className="w-4 h-4 mr-1" /> Add</Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {grouped.map(group => (
          <Card key={group.name}>
            <CardHeader>
              <CardTitle className="text-base capitalize">{group.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {group.items.map(setting => (
                <SettingRow key={setting.id} setting={setting} onUpdate={handleUpdate} onDelete={handleDelete} />
              ))}
            </CardContent>
          </Card>
        ))}

        {grouped.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">No settings yet. Add one above.</div>
        )}
      </div>
    </div>
  )
}

function SettingRow({ setting, onUpdate, onDelete }) {
  const [value, setValue] = useState(setting.value)
  const changed = value !== setting.value

  return (
    <div className="flex items-center gap-3">
      <div className="w-40 shrink-0">
        <p className="text-sm font-medium">{setting.key}</p>
        <p className="text-xs text-muted-foreground">{setting.type}</p>
      </div>
      <Input value={value} onChange={e => setValue(e.target.value)} className="rounded-lg flex-1" />
      {changed && (
        <Button size="sm" onClick={() => onUpdate(setting, value)} className="rounded-lg">
          <Save className="w-3.5 h-3.5" />
        </Button>
      )}
      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete(setting.id)}>
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  )
}

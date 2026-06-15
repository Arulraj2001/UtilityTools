'use client';
import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Save, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
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
  const [themeControls, setThemeControls] = useState({
    spotlight_enabled: true,
    spotlight_color_light: '#d6283d',
    spotlight_color_dark: '#ffffff',
    spotlight_intensity: '1',
    spotlight_blur: '38',
    spotlight_opacity: '0.88',
    spotlight_hover_strength: '1.1',
  })

  const getSettingValue = (key, fallback) => {
    const setting = settings.find((item) => item.key === key)
    if (!setting || setting.value === undefined || setting.value === null) {
      return fallback
    }

    if (setting.type === 'boolean') {
      return String(setting.value) === 'true'
    }
    if (setting.type === 'number') {
      return String(Number(setting.value) || fallback)
    }

    return setting.value
  }

  React.useEffect(() => {
    if (!settings.length) return
    setThemeControls({
      spotlight_enabled: getSettingValue('spotlight_enabled', true),
      spotlight_color_light: getSettingValue('spotlight_color_light', '#d6283d'),
      spotlight_color_dark: getSettingValue('spotlight_color_dark', '#ffffff'),
      spotlight_intensity: getSettingValue('spotlight_intensity', '1'),
      spotlight_blur: getSettingValue('spotlight_blur', '38'),
      spotlight_opacity: getSettingValue('spotlight_opacity', '0.88'),
      spotlight_hover_strength: getSettingValue('spotlight_hover_strength', '1.1'),
    })
  }, [settings])

  const upsertSetting = async (key, value, type = 'text') => {
    const existing = settings.find((item) => item.key === key)
    if (existing) {
      return await updateSiteSetting(existing.id, { value: String(value) })
    }
    return await createSiteSetting({ key, value: String(value), type, group: 'appearance' })
  }

  const handleSaveThemeSettings = async () => {
    await Promise.all([
      upsertSetting('spotlight_enabled', themeControls.spotlight_enabled ? 'true' : 'false', 'boolean'),
      upsertSetting('spotlight_color_light', themeControls.spotlight_color_light, 'text'),
      upsertSetting('spotlight_color_dark', themeControls.spotlight_color_dark, 'text'),
      upsertSetting('spotlight_intensity', themeControls.spotlight_intensity || '1', 'number'),
      upsertSetting('spotlight_blur', themeControls.spotlight_blur || '38', 'number'),
      upsertSetting('spotlight_opacity', themeControls.spotlight_opacity || '0.88', 'number'),
      upsertSetting('spotlight_hover_strength', themeControls.spotlight_hover_strength || '1.1', 'number'),
    ])

    queryClient.invalidateQueries({ queryKey: ['settings'] })
    toast.success('Spotlight appearance saved')
  }

  const handleThemeControlChange = (key, value) => {
    setThemeControls((prev) => ({ ...prev, [key]: value }))
  }

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

  const groups = ['general', 'appearance', 'seo', 'analytics', 'social', 'monetization']
  const grouped = groups.map(g => ({
    name: g,
    items: settings.filter(s => s.group === g || (!s.group && g === 'general')),
  })).filter(g => g.items.length > 0)

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Site Settings</h1>

      <Card className="mb-8">
        <CardHeader>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <CardTitle className="text-base">Theme Appearance</CardTitle>
              <p className="text-sm text-muted-foreground">Manage spotlight glow and theme lighting for premium card styles.</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-[1.55fr_1fr]">
            <div className="grid gap-4">
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">Spotlight glow</p>
                    <p className="text-xs text-muted-foreground">Enable premium corner lighting on spotlight cards.</p>
                  </div>
                  <Switch
                    checked={themeControls.spotlight_enabled}
                    onCheckedChange={(checked) => handleThemeControlChange('spotlight_enabled', checked)}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium">Light theme color</span>
                  <Input
                    type="color"
                    value={themeControls.spotlight_color_light}
                    onChange={(e) => handleThemeControlChange('spotlight_color_light', e.target.value)}
                    className="h-11 w-full rounded-lg px-2"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium">Dark theme color</span>
                  <Input
                    type="color"
                    value={themeControls.spotlight_color_dark}
                    onChange={(e) => handleThemeControlChange('spotlight_color_dark', e.target.value)}
                    className="h-11 w-full rounded-lg px-2"
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium">Glow intensity</span>
                  <Input
                    type="number"
                    step="0.05"
                    min="0.4"
                    max="2"
                    value={themeControls.spotlight_intensity}
                    onChange={(e) => handleThemeControlChange('spotlight_intensity', e.target.value)}
                    className="rounded-lg"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium">Blur amount</span>
                  <Input
                    type="number"
                    step="1"
                    min="10"
                    max="120"
                    value={themeControls.spotlight_blur}
                    onChange={(e) => handleThemeControlChange('spotlight_blur', e.target.value)}
                    className="rounded-lg"
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium">Opacity</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.2"
                    max="1"
                    value={themeControls.spotlight_opacity}
                    onChange={(e) => handleThemeControlChange('spotlight_opacity', e.target.value)}
                    className="rounded-lg"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium">Hover glow strength</span>
                  <Input
                    type="number"
                    step="0.05"
                    min="1"
                    max="1.5"
                    value={themeControls.spotlight_hover_strength}
                    onChange={(e) => handleThemeControlChange('spotlight_hover_strength', e.target.value)}
                    className="rounded-lg"
                  />
                </label>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-3xl border border-border bg-card p-4">
                <p className="text-sm font-semibold mb-3">Live preview</p>
                <div className="relative overflow-hidden rounded-3xl border border-border bg-background/80 p-4" style={{ minHeight: 200 }}>
                  <div className="text-sm text-muted-foreground">Spotlight ready</div>
                  <div className="mt-3 rounded-2xl bg-card p-3 text-sm text-foreground">Top-right glow effect adapts to theme controls in real time.</div>
                </div>
              </div>

              <div className="rounded-3xl border border-border bg-card p-4">
                <p className="text-sm font-semibold mb-2">Spotlight info</p>
                <p className="text-sm leading-6 text-muted-foreground">These settings affect the global spotlight styling for all cards using premium glow effects. Values are stored in site settings and persist across reloads.</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSaveThemeSettings} className="rounded-lg">
              <Save className="w-4 h-4 mr-2" /> Save spotlight settings
            </Button>
          </div>
        </CardContent>
      </Card>

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

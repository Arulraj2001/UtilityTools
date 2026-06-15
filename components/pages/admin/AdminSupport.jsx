'use client';
import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Coffee, Save, Eye, EyeOff, ExternalLink, Settings, Palette, Layout } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { getSiteSettings, createSiteSetting, updateSiteSetting } from '@/api/supabaseApi'

const SETTING_KEYS = {
  ENABLED: 'bmac_enabled',
  USERNAME: 'bmac_username',
  COLOR: 'bmac_color',
  EMOJI: 'bmac_emoji',
  TEXT: 'bmac_text',
  DESCRIPTION: 'bmac_description',
  SIDEBAR_ENABLED: 'bmac_sidebar_enabled',
  FLOATING_ENABLED: 'bmac_floating_enabled',
  WIDGET_POSITION: 'bmac_widget_position',
}

const COLOR_PRESETS = [
  { label: 'Yellow (default)', value: '#FFDD00' },
  { label: 'Orange', value: '#FF813F' },
  { label: 'Purple', value: '#7C3AED' },
  { label: 'Blue', value: '#2563EB' },
  { label: 'Green', value: '#16A34A' },
  { label: 'Pink', value: '#EC4899' },
]

const EMOJI_OPTIONS = ['☕', '🍺', '🍕', '🍩', '🎮', '❤️', '⭐', '🚀']

export default function AdminSupport() {
  const queryClient = useQueryClient()

  const { data: settings = [] } = useQuery({
    queryKey: ['settings'],
    queryFn: () => getSiteSettings(),
  })

  const [form, setForm] = useState({
    enabled: true,
    username: '',
    color: '#FFDD00',
    emoji: '☕',
    text: 'Buy me a coffee',
    description: 'If you find these tools useful, consider supporting development!',
    sidebarEnabled: true,
    floatingEnabled: false,
    widgetPosition: 'bottom-right',
  })

  const [preview, setPreview] = useState(false)

  // Load saved settings
  useEffect(() => {
    if (!settings.length) return
    const get = (key, fallback) => {
      const s = settings.find(x => x.key === key)
      if (!s) return fallback
      if (key === SETTING_KEYS.ENABLED || key === SETTING_KEYS.SIDEBAR_ENABLED || key === SETTING_KEYS.FLOATING_ENABLED) {
        return String(s.value) === 'true'
      }
      return s.value || fallback
    }
    setForm({
      enabled: get(SETTING_KEYS.ENABLED, true),
      username: get(SETTING_KEYS.USERNAME, ''),
      color: get(SETTING_KEYS.COLOR, '#FFDD00'),
      emoji: get(SETTING_KEYS.EMOJI, '☕'),
      text: get(SETTING_KEYS.TEXT, 'Buy me a coffee'),
      description: get(SETTING_KEYS.DESCRIPTION, 'If you find these tools useful, consider supporting development!'),
      sidebarEnabled: get(SETTING_KEYS.SIDEBAR_ENABLED, true),
      floatingEnabled: get(SETTING_KEYS.FLOATING_ENABLED, false),
      widgetPosition: get(SETTING_KEYS.WIDGET_POSITION, 'bottom-right'),
    })
  }, [settings])

  const upsertSetting = async (key, value, type = 'text') => {
    const existing = settings.find(x => x.key === key)
    if (existing) {
      await updateSiteSetting(existing.id, { value: String(value) })
    } else {
      await createSiteSetting({ key, value: String(value), type, group: 'monetization' })
    }
  }

  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!form.username.trim()) {
      toast.error('Buy Me a Coffee username is required')
      return
    }
    setSaving(true)
    try {
      await Promise.all([
        upsertSetting(SETTING_KEYS.ENABLED, form.enabled, 'boolean'),
        upsertSetting(SETTING_KEYS.USERNAME, form.username.trim(), 'text'),
        upsertSetting(SETTING_KEYS.COLOR, form.color, 'text'),
        upsertSetting(SETTING_KEYS.EMOJI, form.emoji, 'text'),
        upsertSetting(SETTING_KEYS.TEXT, form.text, 'text'),
        upsertSetting(SETTING_KEYS.DESCRIPTION, form.description, 'text'),
        upsertSetting(SETTING_KEYS.SIDEBAR_ENABLED, form.sidebarEnabled, 'boolean'),
        upsertSetting(SETTING_KEYS.FLOATING_ENABLED, form.floatingEnabled, 'boolean'),
        upsertSetting(SETTING_KEYS.WIDGET_POSITION, form.widgetPosition, 'text'),
      ])
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      toast.success('Support settings saved!')
    } catch (err) {
      toast.error('Failed to save: ' + (err.message || 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }))

  const bmacUrl = form.username ? `https://www.buymeacoffee.com/${form.username}` : null

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Coffee className="w-6 h-6 text-yellow-500" />
            Support & Donations
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your "Buy Me a Coffee" button and support widget
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPreview(!preview)}
            className="rounded-xl gap-2"
          >
            {preview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {preview ? 'Hide Preview' : 'Preview'}
          </Button>
          <Button onClick={handleSave} disabled={saving} className="rounded-xl gap-2">
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>

      {/* Live Preview */}
      {preview && form.username && (
        <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50/30 dark:bg-yellow-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4 py-4">
              <a
                href={bmacUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ backgroundColor: form.color }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-black hover:opacity-90 transition-opacity shadow-md hover:shadow-lg"
              >
                <span className="text-xl">{form.emoji}</span>
                <span>{form.text}</span>
              </a>
              {form.description && (
                <p className="text-sm text-muted-foreground text-center max-w-sm">{form.description}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enable / Disable */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Enable Support Button</CardTitle>
              <CardDescription>Show the Buy Me a Coffee button across your site</CardDescription>
            </div>
            <Switch checked={form.enabled} onCheckedChange={v => update('enabled', v)} />
          </div>
        </CardHeader>
      </Card>

      {/* Account Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Account Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Buy Me a Coffee Username *</Label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  buymeacoffee.com/
                </span>
                <Input
                  value={form.username}
                  onChange={e => update('username', e.target.value)}
                  placeholder="your-username"
                  className="rounded-xl pl-[170px]"
                />
              </div>
              {bmacUrl && (
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-xl shrink-0"
                  onClick={() => window.open(bmacUrl, '_blank')}
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Your unique username from buymeacoffee.com. Find it in your profile URL.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Support Description</Label>
            <Textarea
              value={form.description}
              onChange={e => update('description', e.target.value)}
              placeholder="Tell supporters why their contribution matters..."
              rows={3}
              className="rounded-xl"
            />
          </div>
        </CardContent>
      </Card>

      {/* Button Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Button Appearance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Button Text</Label>
            <Input
              value={form.text}
              onChange={e => update('text', e.target.value)}
              placeholder="Buy me a coffee"
              className="rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label>Emoji / Icon</Label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_OPTIONS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => update('emoji', emoji)}
                  className={`w-10 h-10 text-xl rounded-xl border-2 transition-all ${
                    form.emoji === emoji
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Button Color</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map(preset => (
                <button
                  key={preset.value}
                  onClick={() => update('color', preset.value)}
                  title={preset.label}
                  className={`w-8 h-8 rounded-lg border-2 transition-all ${
                    form.color === preset.value ? 'border-foreground scale-110' : 'border-transparent hover:border-border'
                  }`}
                  style={{ backgroundColor: preset.value }}
                />
              ))}
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.color}
                  onChange={e => update('color', e.target.value)}
                  className="w-8 h-8 rounded-lg border border-border cursor-pointer"
                  title="Custom color"
                />
                <span className="text-xs text-muted-foreground">{form.color}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Display Options */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Layout className="w-4 h-4" />
            Display Options
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-border p-4">
            <div>
              <p className="text-sm font-medium">Show in Admin Sidebar</p>
              <p className="text-xs text-muted-foreground">Display the support link at the bottom of the admin sidebar</p>
            </div>
            <Switch checked={form.sidebarEnabled} onCheckedChange={v => update('sidebarEnabled', v)} />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border p-4">
            <div>
              <p className="text-sm font-medium">Floating Button on Public Site</p>
              <p className="text-xs text-muted-foreground">Show a floating "Buy Me a Coffee" button on your public-facing pages</p>
            </div>
            <Switch checked={form.floatingEnabled} onCheckedChange={v => update('floatingEnabled', v)} />
          </div>

          {form.floatingEnabled && (
            <div className="space-y-2">
              <Label>Floating Button Position</Label>
              <Select value={form.widgetPosition} onValueChange={v => update('widgetPosition', v)}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bottom-right">Bottom Right</SelectItem>
                  <SelectItem value="bottom-left">Bottom Left</SelectItem>
                  <SelectItem value="top-right">Top Right</SelectItem>
                  <SelectItem value="top-left">Top Left</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Integration Guide */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Setup Guide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-3">
            <Badge variant="outline" className="shrink-0 mt-0.5">1</Badge>
            <p>Create a free account at <a href="https://www.buymeacoffee.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">buymeacoffee.com</a></p>
          </div>
          <div className="flex items-start gap-3">
            <Badge variant="outline" className="shrink-0 mt-0.5">2</Badge>
            <p>Copy your unique username from your profile URL (e.g., buymeacoffee.com/<strong>yourname</strong>)</p>
          </div>
          <div className="flex items-start gap-3">
            <Badge variant="outline" className="shrink-0 mt-0.5">3</Badge>
            <p>Enter your username above, customize the button, and click Save Settings</p>
          </div>
          <div className="flex items-start gap-3">
            <Badge variant="outline" className="shrink-0 mt-0.5">4</Badge>
            <p>The support button will appear in the admin sidebar and optionally as a floating widget on your public site</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

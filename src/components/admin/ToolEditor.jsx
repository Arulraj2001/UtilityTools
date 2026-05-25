import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { getCategories, createTool, updateTool } from '@/api/supabaseApi'

export default function ToolEditor({ tool, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: tool?.name || '',
    slug: tool?.slug || '',
    description: tool?.description || '',
    long_description: tool?.long_description || '',
    category_id: tool?.category_id || '',
    icon: tool?.icon || 'wrench',
    status: tool?.status || 'draft',
    is_featured: tool?.is_featured || false,
    is_trending: tool?.is_trending || false,
    formula_type: tool?.formula_type || 'text_transform',
    formula_config: tool?.formula_config || '',
    output_type: tool?.output_type || 'text',
    seo_title: tool?.seo_title || '',
    seo_description: tool?.seo_description || '',
    seo_keywords: tool?.seo_keywords || '',
    featured_image: tool?.featured_image || '',
    seo_content: tool?.seo_content || '',
    input_fields: tool?.input_fields || [],
    faq: tool?.faq || [],
    sort_order: tool?.sort_order || 0,
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => getCategories({ orderBy: 'sort_order', ascending: true, limit: 200 }),
  })

  const [saving, setSaving] = useState(false)

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }))
  const autoSlug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  const handleSave = async () => {
    if (!form.name || !form.slug) {
      toast.error('Name and slug are required')
      return
    }
    setSaving(true)
    try {
      if (tool?.id) {
        await updateTool(tool.id, form)
        toast.success('Tool updated')
      } else {
        await createTool(form)
        toast.success('Tool created')
      }
      onSave()
    } catch (error) {
      toast.error(error.message || 'Unable to save tool')
    } finally {
      setSaving(false)
    }
  }

  const addField = () => {
    update('input_fields', [...form.input_fields, { name: '', label: '', type: 'text', placeholder: '', required: false, options: [] }])
  }
  const removeField = (idx) => {
    update('input_fields', form.input_fields.filter((_, i) => i !== idx))
  }
  const updateField = (idx, key, value) => {
    const fields = [...form.input_fields]
    fields[idx] = { ...fields[idx], [key]: value }
    update('input_fields', fields)
  }

  const addFaq = () => update('faq', [...form.faq, { question: '', answer: '' }])
  const removeFaq = (idx) => update('faq', form.faq.filter((_, i) => i !== idx))
  const updateFaq = (idx, key, value) => {
    const faqs = [...form.faq]
    faqs[idx] = { ...faqs[idx], [key]: value }
    update('faq', faqs)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onCancel} className="h-8 w-8">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-2xl font-bold">{tool ? 'Edit Tool' : 'New Tool'}</h1>
        </div>
        <Button onClick={handleSave} disabled={saving} className="rounded-xl">
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Tool'}
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="inputs">Input Fields</TabsTrigger>
          <TabsTrigger value="formula">Formula</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
          <TabsTrigger value="seo-content">SEO Content</TabsTrigger>
          <TabsTrigger value="faq">FAQ</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tool Name</Label>
              <Input value={form.name} onChange={e => { update('name', e.target.value); if (!tool) update('slug', autoSlug(e.target.value)); }} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input value={form.slug} onChange={e => update('slug', e.target.value)} className="rounded-xl" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Icon Name (Lucide)</Label>
            <Input value={form.icon} onChange={e => update('icon', e.target.value)} className="rounded-xl" placeholder="e.g. Calculator, FileText, Zap" />
            <p className="text-xs text-muted-foreground">Use exact Lucide React icon name. See lucide.dev for options.</p>
          </div>
          <div className="space-y-2">
            <Label>Short Description</Label>
            <Textarea value={form.description} onChange={e => update('description', e.target.value)} rows={2} className="rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label>Long Description (HTML)</Label>
            <Textarea value={form.long_description} onChange={e => update('long_description', e.target.value)} rows={6} className="rounded-xl font-mono text-xs" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.category_id} onValueChange={v => update('category_id', v)}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => update('status', v)}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sort Order</Label>
              <Input type="number" value={form.sort_order} onChange={e => update('sort_order', parseInt(e.target.value) || 0)} className="rounded-xl" />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch checked={form.is_featured} onCheckedChange={v => update('is_featured', v)} />
              <Label>Featured</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_trending} onCheckedChange={v => update('is_trending', v)} />
              <Label>Trending</Label>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="inputs" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Define the input fields users will fill in</p>
            <Button variant="outline" size="sm" onClick={addField} className="rounded-lg">
              <Plus className="w-4 h-4 mr-1" /> Add Field
            </Button>
          </div>
          {form.input_fields.map((field, idx) => (
            <div key={idx} className="p-4 rounded-xl border border-border space-y-3 bg-card">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Field {idx + 1}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeField(idx)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Input placeholder="Field name" value={field.name} onChange={e => updateField(idx, 'name', e.target.value)} className="rounded-lg text-sm" />
                <Input placeholder="Label" value={field.label} onChange={e => updateField(idx, 'label', e.target.value)} className="rounded-lg text-sm" />
                <Select value={field.type} onValueChange={v => updateField(idx, 'type', v)}>
                  <SelectTrigger className="rounded-lg text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['text', 'number', 'textarea', 'select', 'color', 'date'].map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input placeholder="Placeholder" value={field.placeholder} onChange={e => updateField(idx, 'placeholder', e.target.value)} className="rounded-lg text-sm" />
              </div>
              {field.type === 'select' && (
                <div className="space-y-1">
                  <Label className="text-xs">Options (comma-separated)</Label>
                  <Input
                    value={(field.options || []).join(', ')}
                    onChange={e => updateField(idx, 'options', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                    placeholder="Option 1, Option 2, Option 3"
                    className="rounded-lg text-sm"
                  />
                </div>
              )}
            </div>
          ))}
          {form.input_fields.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">No input fields. Click "Add Field" to start.</div>
          )}
        </TabsContent>

        <TabsContent value="formula" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Formula Type</Label>
              <Select value={form.formula_type} onValueChange={v => update('formula_type', v)}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="builtin">Builtin (slug-based)</SelectItem>
                  <SelectItem value="text_transform">Text Transform</SelectItem>
                  <SelectItem value="math">Math Formula</SelectItem>
                  <SelectItem value="conversion">Unit Conversion</SelectItem>
                  <SelectItem value="generator">Generator</SelectItem>
                  <SelectItem value="javascript">Custom JavaScript</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Output Type</Label>
              <Select value={form.output_type} onValueChange={v => update('output_type', v)}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="html">HTML</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Formula Configuration (JSON)</Label>
            <Textarea
              value={form.formula_config}
              onChange={e => update('formula_config', e.target.value)}
              rows={10}
              className="rounded-xl font-mono text-xs"
              placeholder='{"transform": "word_count"} or {"formula": "{a} + {b}"}'
            />
          </div>
          <div className="p-4 rounded-xl bg-muted/50 text-xs text-muted-foreground space-y-1">
            <p><strong>Math:</strong> {`{"formula": "{field_name} * 2 + {other_field}"}`}</p>
            <p><strong>Text Transform:</strong> {`{"transform": "uppercase|lowercase|word_count|reverse|slug|base64_encode|..."}`}</p>
            <p><strong>Conversion:</strong> {`{"conversions": {"km": 1, "miles": 1.60934, "meters": 0.001}}`}</p>
            <p><strong>Generator:</strong> {`{"generator_type": "color_palette"}`}</p>
          </div>
        </TabsContent>

        <TabsContent value="seo" className="space-y-4">
          <div className="space-y-2">
            <Label>SEO Title</Label>
            <Input value={form.seo_title} onChange={e => update('seo_title', e.target.value)} className="rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label>SEO Description</Label>
            <Textarea value={form.seo_description} onChange={e => update('seo_description', e.target.value)} rows={3} className="rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label>SEO Keywords (comma-separated)</Label>
            <Input value={form.seo_keywords} onChange={e => update('seo_keywords', e.target.value)} className="rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label>Featured Image URL</Label>
            <Input value={form.featured_image} onChange={e => update('featured_image', e.target.value)} className="rounded-xl" />
          </div>
          <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 text-xs text-muted-foreground space-y-1">
            <p><strong>Current fields control:</strong> Meta tags, social previews, Google snippets</p>
            <p><strong>Note:</strong> Use the SEO Content tab below for visible educational content on the tool page</p>
          </div>
        </TabsContent>

        <TabsContent value="seo-content" className="space-y-4">
          <div className="space-y-2">
            <Label>SEO Content (HTML)</Label>
            <Textarea 
              value={form.seo_content} 
              onChange={e => update('seo_content', e.target.value)} 
              rows={12} 
              className="rounded-xl font-mono text-xs" 
              placeholder={`<h2>How to Use This Tool</h2>
<p>Best practices and tips...</p>

<h2>Common Use Cases</h2>
<p>Real-world examples...</p>

<h2>Best File Sizes & Formats</h2>
<p>Recommended specifications...</p>`}
            />
            <p className="text-xs text-muted-foreground">Characters: {(form.seo_content || '').length}</p>
          </div>
          <div className="p-4 rounded-xl bg-muted/50 space-y-3">
            <p className="text-xs font-semibold text-foreground">Purpose of SEO Content:</p>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
              <li><strong>Visible Content:</strong> Rendered below tool UI, FAQ, and featured image</li>
              <li><strong>Educational:</strong> How-to guides, best practices, workflow explanations</li>
              <li><strong>SEO Benefits:</strong> Topical authority, long-tail keywords, improved rankings</li>
              <li><strong>User Value:</strong> Creator guidance, examples, keyword-rich content</li>
              <li><strong>Format:</strong> Use semantic HTML (h2, h3, p, ul, li, strong, em)</li>
            </ul>
          </div>
          <div className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
            <p className="text-xs font-semibold text-amber-900 dark:text-amber-200 mb-2">Example Structure:</p>
            <pre className="text-xs bg-white dark:bg-black p-3 rounded overflow-auto max-h-48">{`<h2>Best Practices for Using This Tool</h2>
<p>Use medium compression for the best balance between file size and quality.</p>

<h2>Common File Size Recommendations</h2>
<ul>
  <li>Email attachments: under 20MB</li>
  <li>Web uploads: under 10MB</li>
  <li>Archival: no limit</li>
</ul>

<h2>Related Workflows</h2>
<p>This tool works great with our PDF merger...</p>`}</pre>
          </div>
        </TabsContent>

        <TabsContent value="faq" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">FAQ items appear on the tool page and generate FAQ schema</p>
            <Button variant="outline" size="sm" onClick={addFaq} className="rounded-lg">
              <Plus className="w-4 h-4 mr-1" /> Add FAQ
            </Button>
          </div>
          {form.faq.map((item, idx) => (
            <div key={idx} className="p-4 rounded-xl border border-border space-y-3 bg-card">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">FAQ {idx + 1}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeFaq(idx)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
              <Input placeholder="Question" value={item.question} onChange={e => updateFaq(idx, 'question', e.target.value)} className="rounded-lg" />
              <Textarea placeholder="Answer" value={item.answer} onChange={e => updateFaq(idx, 'answer', e.target.value)} rows={3} className="rounded-lg" />
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}

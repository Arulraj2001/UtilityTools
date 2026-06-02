import React, { useState, useEffect } from 'react'
import { Sparkles, BookOpen, Trash2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'
import { toast } from 'sonner'
import { createWorkflowPage, getBlogPosts, getToolsAll, getWorkflowPageBySlug, updateWorkflowPage } from '@/api/supabaseApi'
import { estimateReadingTime, getKeywordDensity, buildSeoScore, slugifyText } from '@/lib/seoUtils'
import { sanitizeHtml } from '@/lib/sanitizeHtml'
import { formatQualityIssues, validateContentQuality } from '@/lib/contentQuality'

// TODO: consider workflow category metadata and workflow conversion tracking in future releases
const rendererStyles = `
  .workflow-preview { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.8; color: #111827; }
  .workflow-preview h1, .workflow-preview h2, .workflow-preview h3 { margin: 1.5em 0 0.5em; font-weight: 700; }
  .workflow-preview h1 { font-size: 2.4rem; }
  .workflow-preview h2 { font-size: 1.9rem; }
  .workflow-preview h3 { font-size: 1.4rem; }
  .workflow-preview p { margin: 1em 0; }
  .workflow-preview a { color: #2563eb; text-decoration: underline; }
  .workflow-preview ul, .workflow-preview ol { margin: 1em 0 1em 1.5em; }
  .workflow-preview li { margin: 0.5em 0; }
  .workflow-preview img { max-width: 100%; height: auto; border-radius: 12px; margin: 1.5em 0; }
  .workflow-preview code { background: #f3f4f6; padding: 0.2em 0.4em; border-radius: 6px; }
  .react-quill .ql-editor { min-height: 420px; }
`

const cleanContent = (value) => {
  if (!value) return ''
  return value
    .replace(/<p><br><\/p>/gi, '')
    .replace(/<p>\s*<\/p>/gi, '')
    .trim()
}

export default function WorkflowEditor({ page, onSave, onCancel }) {
  const [form, setForm] = useState({
    title: page?.title || '',
    slug: page?.slug || '',
    excerpt: page?.excerpt || '',
    content: page?.content || '',
    category: page?.category || '',
    tags: Array.isArray(page?.tags) ? page.tags.join(', ') : page?.tags || '',
    status: page?.status || 'draft',
    featured_image: page?.featured_image || '',
    canonical_url: page?.canonical_url || '',
    faq_items: Array.isArray(page?.faq_items) ? page.faq_items : [],
    related_tools: Array.isArray(page?.related_tools) ? page.related_tools : [],
    related_blogs: Array.isArray(page?.related_blogs) ? page.related_blogs : [],
    is_featured: page?.is_featured || false,
    seo_title: page?.seo_title || '',
    seo_description: page?.seo_description || '',
    seo_keywords: page?.seo_keywords || '',
  })
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('edit')
  const [slugTouched, setSlugTouched] = useState(Boolean(page?.slug))

  const { data: tools = [] } = useQuery({
    queryKey: ['workflow-tools'],
    queryFn: () => getToolsAll({ orderBy: 'name', ascending: true, limit: 200 }),
  })

  const { data: blogs = [] } = useQuery({
    queryKey: ['workflow-related-blogs'],
    queryFn: () => getBlogPosts({ published: false, orderBy: 'created_at', ascending: false, limit: 200 }),
  })

  useEffect(() => {
    if (!slugTouched && form.title) {
      setForm((prev) => ({ ...prev, slug: slugifyText(form.title) }))
    }
  }, [form.title, slugTouched])

  const updateField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

  const keywordDensity = getKeywordDensity(form.content, form.seo_keywords)
  const seoScore = buildSeoScore({
    title: form.seo_title || form.title,
    description: form.seo_description || form.excerpt,
    keywords: form.seo_keywords,
    canonical_url: form.canonical_url,
    og_image: form.featured_image,
    content: form.content,
    categoryId: form.category ? 'workflow' : null,
    schema_type: 'HowTo',
  })

  const toggleTool = (id) => {
    setForm((prev) => {
      const selected = new Set(prev.related_tools || [])
      if (selected.has(id)) selected.delete(id)
      else selected.add(id)
      return { ...prev, related_tools: Array.from(selected) }
    })
  }

  const toggleBlog = (id) => {
    setForm((prev) => {
      const selected = new Set(prev.related_blogs || [])
      if (selected.has(id)) selected.delete(id)
      else selected.add(id)
      return { ...prev, related_blogs: Array.from(selected) }
    })
  }

  const addFaqItem = () => {
    setForm((prev) => ({
      ...prev,
      faq_items: [...(prev.faq_items || []), { question: '', answer: '' }],
    }))
  }

  const updateFaqItem = (index, key, value) => {
    setForm((prev) => ({
      ...prev,
      faq_items: prev.faq_items.map((item, idx) => idx === index ? { ...item, [key]: value } : item),
    }))
  }

  const removeFaqItem = (index) => {
    setForm((prev) => ({
      ...prev,
      faq_items: prev.faq_items.filter((_, idx) => idx !== index),
    }))
  }

  const handleSave = async () => {
    if (!form.title || !form.slug) {
      toast.error('Title and slug are required')
      return
    }

    setSaving(true)

    try {
      if (form.slug) {
        const existing = await getWorkflowPageBySlug(form.slug)
        if (existing && existing.id !== page?.id) {
          throw new Error('A workflow page with this slug already exists. Choose a unique slug.')
        }
      }

      const payload = {
        title: form.title,
        slug: form.slug,
        excerpt: form.excerpt,
        content: sanitizeHtml(cleanContent(form.content)),
        category: form.category,
        tags: form.tags.split(/\s*,\s*/).filter(Boolean),
        status: form.status,
        featured_image: form.featured_image,
        canonical_url: form.canonical_url,
        faq_items: form.faq_items,
        related_tools: form.related_tools,
        related_blogs: form.related_blogs,
        is_featured: form.is_featured,
        seo_title: form.seo_title,
        seo_description: form.seo_description,
        seo_keywords: form.seo_keywords,
        view_count: page?.view_count || 0,
        updated_at: new Date(),
      }

      if (payload.status === 'published') {
        const quality = validateContentQuality(payload, {
          type: 'workflow',
          existingItems: blogs,
        })
        if (!quality.ok) {
          toast.error(formatQualityIssues(quality))
          return
        }
        if (quality.warnings.length) {
          toast.warning(formatQualityIssues({ ...quality, blockers: [] }))
        }
      }

      if (page?.id) {
        await updateWorkflowPage(page.id, payload)
        toast.success('Workflow page updated successfully')
      } else {
        await createWorkflowPage(payload)
        toast.success('Workflow page created successfully')
      }

      onSave()
    } catch (error) {
      console.error('WorkflowEditor save error:', error)
      toast.error(error.message || 'Unable to save workflow page')
    } finally {
      setSaving(false)
    }
  }

  const renderPreview = () => {
    if (!form.content) {
      return <div className="text-center text-muted-foreground py-12">No content available yet.</div>
    }

    return <div className="workflow-preview" dangerouslySetInnerHTML={{ __html: sanitizeHtml(form.content) }} />
  }

  return (
    <>
      <style>{rendererStyles}</style>
      <div className="space-y-6 bg-white rounded-3xl shadow-sm p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between pb-4 border-b">
          <div>
            <h1 className="text-2xl font-bold">{page ? 'Edit Workflow Page' : 'Create Workflow Page'}</h1>
            <p className="text-sm text-muted-foreground mt-1">Build an intent-focused landing page that drives search traffic and supports internal linking.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={onCancel} className="rounded-xl">Cancel</Button>
            <Button onClick={handleSave} className="rounded-xl" disabled={saving}>{saving ? 'Saving...' : 'Save Workflow'}</Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
            <TabsTrigger value="edit">Edit</TabsTrigger>
            <TabsTrigger value="seo">SEO</TabsTrigger>
            <TabsTrigger value="faq">FAQ</TabsTrigger>
            <TabsTrigger value="related">Related</TabsTrigger>
          </TabsList>

          <TabsContent value="edit" className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="grid gap-4">
                  <div>
                    <Label>Title *</Label>
                    <Input value={form.title} onChange={(e) => updateField('title', e.target.value)} placeholder="Compress PDF below 200kb" />
                  </div>
                  <div>
                    <Label>Slug *</Label>
                    <Input
                      value={form.slug}
                      onChange={(e) => { setSlugTouched(true); updateField('slug', slugifyText(e.target.value)) }}
                      placeholder="compress-pdf-below-200kb"
                    />
                  </div>
                  <div>
                    <Label>Excerpt</Label>
                    <Textarea value={form.excerpt} onChange={(e) => updateField('excerpt', e.target.value)} placeholder="Short summary for search snippets" rows={4} />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Input value={form.category} onChange={(e) => updateField('category', e.target.value)} placeholder="Workflow category" />
                  </div>
                  <div>
                    <Label>Tags</Label>
                    <Input value={form.tags} onChange={(e) => updateField('tags', e.target.value)} placeholder="pdf, compression, optimize" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>Featured image URL</Label>
                  <Input value={form.featured_image} onChange={(e) => updateField('featured_image', e.target.value)} placeholder="https://example.com/image.jpg" />
                </div>
                <div>
                  <Label>Canonical URL</Label>
                  <Input value={form.canonical_url} onChange={(e) => updateField('canonical_url', e.target.value)} placeholder="https://yourdomain.com/workflow/slug" />
                </div>
                <div className="flex items-center gap-4">
                  <Switch checked={form.is_featured} onCheckedChange={(checked) => updateField('is_featured', checked)} />
                  <span className="text-sm text-muted-foreground">Mark as featured</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium">Publish status</span>
                  <Button variant="outline" size="sm" onClick={() => updateField('status', form.status === 'published' ? 'draft' : 'published')}>
                    {form.status === 'published' ? 'Published' : 'Draft'}
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <Label>Workflow Content</Label>
              <ReactQuill value={form.content} modules={{ toolbar: [['bold','italic','underline','strike'], [{ header: [1,2,3,false] }], [{ list: 'ordered' }, { list: 'bullet' }], ['link', 'image'], ['clean']] }} onChange={(value) => updateField('content', cleanContent(value))} />
            </div>

            <div className="rounded-3xl border border-border/70 bg-muted p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">Reading time</p>
                  <p className="mt-1 text-lg font-semibold">{estimateReadingTime(form.content)} min</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Keyword density</p>
                  <p className="mt-1 text-lg font-semibold">{keywordDensity}%</p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="seo" className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div>
                <Label>SEO title</Label>
                <Input value={form.seo_title} onChange={(e) => updateField('seo_title', e.target.value)} placeholder="Compress PDF under 200kb with free online tools" />
              </div>
              <div>
                <Label>SEO description</Label>
                <Textarea value={form.seo_description} onChange={(e) => updateField('seo_description', e.target.value)} placeholder="A search-optimized landing page describing how to reduce PDF size below 200kb." rows={4} />
              </div>
            </div>
            <div>
              <Label>SEO keywords</Label>
              <Input value={form.seo_keywords} onChange={(e) => updateField('seo_keywords', e.target.value)} placeholder="compress pdf, reduce pdf size, small pdf" />
            </div>
            <div className="rounded-3xl border border-border/70 bg-background p-4">
              <p className="text-sm text-muted-foreground">SEO score</p>
              <div className="mt-3 flex items-center justify-between gap-4">
                <span className="text-3xl font-semibold">{seoScore.score}</span>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{seoScore.label}</span>
              </div>
              {seoScore.warnings.length > 0 && (
                <ul className="mt-4 space-y-2 text-xs text-muted-foreground">
                  {seoScore.warnings.map((warning, index) => (<li key={index}>• {warning}</li>))}
                </ul>
              )}
            </div>
          </TabsContent>

          <TabsContent value="faq" className="space-y-6">
            <div className="space-y-4">
              {(form.faq_items || []).map((item, index) => (
                <div key={index} className="rounded-3xl border border-border/70 bg-background p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex-1">
                      <Label>Question</Label>
                      <Input value={item.question} onChange={(e) => updateFaqItem(index, 'question', e.target.value)} placeholder="What is the best way to compress a PDF?" />
                    </div>
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => removeFaqItem(index)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div>
                    <Label>Answer</Label>
                    <Textarea value={item.answer} onChange={(e) => updateFaqItem(index, 'answer', e.target.value)} rows={4} placeholder="Use a PDF compressor tool, choose a lower quality setting, and save the smaller file." />
                  </div>
                </div>
              ))}
              <Button onClick={addFaqItem} variant="outline" className="rounded-xl">
                Add FAQ item
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="related" className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="rounded-3xl border border-border/70 bg-background p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold">Related tools</h3>
                </div>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {tools.map((tool) => (
                    <label key={tool.id} className="flex items-center gap-3 rounded-2xl border border-border/70 p-3 cursor-pointer hover:bg-muted">
                      <input type="checkbox" checked={form.related_tools.includes(tool.id)} onChange={() => toggleTool(tool.id)} className="h-4 w-4 text-primary" />
                      <span>{tool.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="rounded-3xl border border-border/70 bg-background p-4">
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold">Related blogs</h3>
                </div>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {blogs.map((blog) => (
                    <label key={blog.id} className="flex items-center gap-3 rounded-2xl border border-border/70 p-3 cursor-pointer hover:bg-muted">
                      <input type="checkbox" checked={form.related_blogs.includes(blog.id)} onChange={() => toggleBlog(blog.id)} className="h-4 w-4 text-primary" />
                      <span>{blog.title}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="rounded-3xl border border-border/70 bg-muted p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold">Live preview</p>
              <p className="text-xs text-muted-foreground">Rendered HTML content for the workflow landing page.</p>
            </div>
            <span className="text-sm text-muted-foreground">{form.title || 'Untitled workflow'}</span>
          </div>
          <div className="mt-4 overflow-hidden rounded-3xl bg-white p-4">{renderPreview()}</div>
        </div>
      </div>
    </>
  )
}

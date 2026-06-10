import React, { useState, useEffect, useMemo } from 'react'
import { ArrowLeft, Save, Eye, Edit2, Plus, Trash2, Code } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import ReactQuill from '@/lib/reactQuillShim'
import 'react-quill/dist/quill.snow.css'

import { toast } from 'sonner'
import { createBlogPost, getBlogPostSeoMetadata, getBlogPosts, getBlogCategories, updateBlogPost } from '@/api/supabaseApi'
import { estimateReadingTime, getKeywordDensity, buildSeoScore, slugifyText } from '@/lib/seoUtils'
import { sanitizeHtml } from '@/lib/sanitizeHtml'
import { DEFAULT_AUTHOR } from '@/lib/authors'
import { formatQualityIssues, validateContentQuality } from '@/lib/contentQuality'

// Custom styles for rendered content and editor
const rendererStyles = `
  .blog-preview {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    line-height: 1.8;
    color: #1a202c;
  }
  .blog-preview h1 { font-size: 2.5em; font-weight: 700; margin: 1.5em 0 0.5em; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.3em; }
  .blog-preview h2 { font-size: 2em; font-weight: 600; margin: 1.3em 0 0.5em; }
  .blog-preview h3 { font-size: 1.5em; font-weight: 600; margin: 1em 0 0.5em; color: #2d3748; }
  .blog-preview p { margin: 1em 0; line-height: 1.8; }
  .blog-preview a { color: #3182ce; text-decoration: underline; }
  .blog-preview a:hover { color: #2c5282; }
  .blog-preview ul, .blog-preview ol { margin: 1em 0; padding-left: 2em; }
  .blog-preview li { margin: 0.5em 0; }
  .blog-preview blockquote {
    border-left: 4px solid #3182ce;
    margin: 1em 0;
    padding: 0.5em 0 0.5em 1em;
    background: #f7fafc;
    font-style: italic;
    color: #4a5568;
  }
  .blog-preview pre {
    background: #2d3748;
    color: #e2e8f0;
    padding: 1em;
    border-radius: 8px;
    overflow-x: auto;
    margin: 1em 0;
  }
  .blog-preview code {
    background: #edf2f7;
    padding: 0.2em 0.4em;
    border-radius: 4px;
    font-size: 0.9em;
    font-family: 'Courier New', monospace;
  }
  .blog-preview pre code {
    background: none;
    padding: 0;
    color: inherit;
  }
  .blog-preview img {
    max-width: 100%;
    height: auto;
    border-radius: 8px;
    margin: 1.5em 0;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  }
  .blog-preview table {
    width: 100%;
    border-collapse: collapse;
    margin: 1em 0;
  }
  .blog-preview th, .blog-preview td {
    border: 1px solid #e2e8f0;
    padding: 0.75em;
    text-align: left;
  }
  .blog-preview th {
    background: #f7fafc;
    font-weight: 600;
  }

  /* Fix for Quill editor to show all content */
  .quill {
    display: flex;
    flex-direction: column;
    height: auto !important;
    min-height: 500px;
  }
  
  .ql-container {
    flex: 1;
    min-height: 400px;
    height: auto !important;
  }
  
  .ql-editor {
    min-height: 400px;
    height: auto !important;
    overflow-y: auto;
    max-height: 70vh;
  }
`

// HTML Validation and Utilities
const validateHtmlStructure = (html) => {
  if (!html || !html.trim()) return { isValid: true, errors: [], warnings: [] }
  
  const errors = []
  const warnings = []
  
  // Check for unclosed tags (basic check)
  const tagRegex = /<([a-z][a-z0-9]*)\b[^>]*>/gi
  const closingTagRegex = /<\/([a-z][a-z0-9]*)\s*>/gi
  
  const openTags = {}
  let match
  
  // Count opening tags
  while ((match = tagRegex.exec(html)) !== null) {
    const tagName = match[1].toLowerCase()
    // Self-closing tags
    if (!['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'].includes(tagName)) {
      openTags[tagName] = (openTags[tagName] || 0) + 1
    }
  }
  
  // Count closing tags
  while ((match = closingTagRegex.exec(html)) !== null) {
    const tagName = match[1].toLowerCase()
    openTags[tagName] = (openTags[tagName] || 0) - 1
  }
  
  // Check for mismatched tags
  Object.entries(openTags).forEach(([tag, count]) => {
    if (count > 0) {
      warnings.push(`Unclosed <${tag}> tag (${count} open)`)
    } else if (count < 0) {
      errors.push(`Extra closing </${tag}> tag`)
    }
  })
  
  // Check for script tags (security)
  if (/<script/gi.test(html)) {
    errors.push('Script tags detected and will be removed for security')
  }
  
  // Check for event handlers (security)
  if (/on\w+\s*=/gi.test(html)) {
    warnings.push('Event handlers detected (onclick, onload, etc.) - these will be removed')
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

// Format HTML with proper indentation for readability
const formatHtml = (html) => {
  if (!html) return ''
  
  let formatted = html
  let indent = 0
  const indentStr = '  '
  
  // Basic formatting - add newlines and indentation
  formatted = formatted
    .replace(/></g, '>\n<')
    .split('\n')
    .map(line => {
      const trimmed = line.trim()
      
      if (trimmed.startsWith('</')) {
        indent = Math.max(0, indent - 1)
      }
      
      const result = indentStr.repeat(indent) + trimmed
      
      if (trimmed.startsWith('<') && !trimmed.startsWith('</') && !trimmed.endsWith('/>') && !trimmed.includes('</')) {
        indent++
      }
      
      return result
    })
    .join('\n')
    .replace(/\n\s*\n/g, '\n') // Remove extra blank lines
  
  return formatted
}

export default function BlogEditor({ post, onSave, onCancel }) {
  const [form, setForm] = useState({
    title: post?.title || '',
    slug: post?.slug || '',
    excerpt: post?.excerpt || '',
    content: post?.content || '',
    category_id: post?.category_id || '',
    tags: post?.tags || [],
    status: post?.status || 'draft',
    featured_image: post?.featured_image || '',
    og_image: post?.og_image || post?.featured_image || '',
    canonical_url: post?.canonical_url || '',
    schema_type: post?.schema_type || 'BlogPosting',
    featured: post?.featured || false,
    meta_robots: post?.meta_robots || 'index,follow',
    author_name: post?.author_name || DEFAULT_AUTHOR.name,
    reading_time: post?.reading_time || 0,
    seo_title: post?.seo_title || '',
    seo_description: post?.seo_description || '',
    seo_keywords: post?.seo_keywords || '',
    og_title: post?.og_title || '',
    og_description: post?.og_description || '',
    twitter_title: post?.twitter_title || '',
    twitter_description: post?.twitter_description || '',
    author_image: post?.author_image || '',
    author_title: post?.author_title || DEFAULT_AUTHOR.title,
    author_bio: post?.author_bio || DEFAULT_AUTHOR.bio,
    faq_items: post?.faq_items || [],
  })

  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('edit')
  const [slugTouched, setSlugTouched] = useState(Boolean(post?.slug))
  const [htmlValidation, setHtmlValidation] = useState({ isValid: true, errors: [], warnings: [] })
  const [lastEditor, setLastEditor] = useState('quill') // Track which editor last modified content

  const { data: categories = [] } = useQuery({
    queryKey: ['blog-categories'],
    queryFn: () => getBlogCategories({ orderBy: 'featured desc, sort_order', ascending: false, limit: 200 }),
  })

  const { data: seoMetaPosts = [] } = useQuery({
    queryKey: ['blog-post-seo-metadata'],
    queryFn: () => getBlogPostSeoMetadata({ published: false, orderBy: 'created_at', ascending: false, limit: 1000 }),
  })

  const { data: suggestions = [] } = useQuery({
    queryKey: ['blog-suggestions'],
    queryFn: () => getBlogPosts({ published: true, orderBy: 'views_count', ascending: false, limit: 20 }),
  })

  const update = (key, value) =>
    setForm(prev => ({ ...prev, [key]: value }))

  const addFaqItem = () =>
    update('faq_items', [...(form.faq_items || []), { question: '', answer: '' }])

  const updateFaqItem = (index, key, value) =>
    update('faq_items', form.faq_items.map((item, idx) => idx === index ? { ...item, [key]: value } : item))

  const removeFaqItem = (index) =>
    update('faq_items', form.faq_items.filter((_, idx) => idx !== index))

  const autoSlug = (title) => slugifyText(title)

  useEffect(() => {
    if (!slugTouched && form.title) {
      update('slug', autoSlug(form.title))
    }
  }, [form.title, slugTouched])

  // Enhanced clean content function
  const cleanContent = value => {
    if (!value) return ''
    
    // Remove empty paragraphs and normalize
    let cleaned = value
      .replace(/<p><br><\/p>/gi, '')
      .replace(/<p>\s*<\/p>/gi, '')
      .replace(/^\s+|\s+$/g, '')
      
    return cleaned
  }

  // Handle content change with better cleaning
  const handleContentChange = (value) => {
    const cleaned = cleanContent(value)
    update('content', cleaned)
    setLastEditor('quill')
  }

  // Handle HTML content changes
  const handleHtmlChange = (value) => {
    update('content', value)
    setLastEditor('html')
    
    // Validate HTML in real-time
    const validation = validateHtmlStructure(value)
    setHtmlValidation(validation)
  }

  // Handle tab switching with validation
  const handleTabChange = (tab) => {
    if (tab === 'html' && form.content) {
      // Validate when switching to HTML tab
      const validation = validateHtmlStructure(form.content)
      setHtmlValidation(validation)
    }
    setActiveTab(tab)
  }

  const keywordDensity = getKeywordDensity(form.content, form.seo_keywords)
  const seoScore = buildSeoScore({
    title: form.seo_title || form.title,
    description: form.seo_description || form.excerpt,
    keywords: form.seo_keywords,
    canonical_url: form.canonical_url,
    og_image: form.og_image || form.featured_image,
    content: form.content,
    categoryId: form.category_id,
    schema_type: form.schema_type,
  })

  const internalSuggestions = useMemo(() => {
    if (!suggestions.length || !form.title) return []
    return suggestions
      .filter((suggestion) => suggestion.slug !== post?.slug)
      .sort((a, b) => {
        const aScore = (a.tags || []).filter((tag) => form.tags.includes(tag)).length
        const bScore = (b.tags || []).filter((tag) => form.tags.includes(tag)).length
        return bScore - aScore
      })
      .slice(0, 4)
  }, [suggestions, form.tags, form.title, post?.slug])

  const duplicateSeoDescriptionWarning = useMemo(() => {
    // Check SEO description against other posts' SEO descriptions (exact match = warning)
    if (form.seo_description?.trim()) {
      const normalizedSeoDesc = form.seo_description.trim().toLowerCase()
      const duplicate = seoMetaPosts.find((other) => (
        other.slug !== post?.slug &&
        other.seo_description?.trim().toLowerCase() === normalizedSeoDesc
      ))
      if (duplicate) {
        return `This SEO description matches an existing post: "${duplicate.title || duplicate.slug}". Use a unique SEO description.`
      }
    }

    // Check excerpt against other posts' excerpts only (not mixing with SEO descriptions)
    if (form.excerpt?.trim()) {
      const normalizedExcerpt = form.excerpt.trim().toLowerCase()
      const excerptDuplicate = seoMetaPosts.find((other) => (
        other.slug !== post?.slug &&
        other.excerpt?.trim().toLowerCase() === normalizedExcerpt
      ))
      if (excerptDuplicate && !form.seo_description?.trim()) {
        return `This excerpt matches an existing post: "${excerptDuplicate.title || excerptDuplicate.slug}". Add a unique SEO description to avoid duplicate metadata.`
      }
    }

    return null
  }, [form.seo_description, form.excerpt, seoMetaPosts, post?.slug])

  const handleSave = async () => {
    if (!form.title || !form.slug) {
      toast.error('Title and slug are required')
      return
    }

    setSaving(true)

    try {
      const selectedCategory = categories.find((cat) => cat.id === form.category_id)
      const data = {
        ...form,
        category: selectedCategory?.name || '',
        category_id: form.category_id || null,
        content: sanitizeHtml(cleanContent(form.content)),
        reading_time: estimateReadingTime(form.content),
        faq_items: form.faq_items,
        og_title: form.og_title,
        og_description: form.og_description,
        twitter_title: form.twitter_title,
        twitter_description: form.twitter_description,
      }

      if (data.status === 'published') {
        const quality = validateContentQuality(data, {
          type: 'blog',
          existingItems: seoMetaPosts,
        })
        if (!quality.ok) {
          toast.error(formatQualityIssues(quality))
          return
        }
        if (quality.warnings.length) {
          toast.warning(formatQualityIssues({ ...quality, blockers: [] }))
        }
      }

      if (post?.id) {
        await updateBlogPost(post.id, data)
        toast.success('Post updated successfully')
      } else {
        await createBlogPost(data)
        toast.success('Post created successfully')
      }

      onSave()
    } catch (error) {
      toast.error(error.message || 'Unable to save post')
    } finally {
      setSaving(false)
    }
  }

  // Enhanced Quill modules configuration
  const modules = {
    toolbar: {
      container: [
        [{ header: [1, 2, 3, 4, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ color: [] }, { background: [] }],
        [{ list: 'ordered' }, { list: 'bullet' }, { list: 'check' }],
        [{ indent: '-1' }, { indent: '+1' }],
        [{ align: [] }],
        ['blockquote', 'code-block'],
        ['link', 'image', 'video'],
        ['clean'],
      ],
    },
    clipboard: {
      matchVisual: false,
    },
    keyboard: {
      bindings: {
        tab: false,
      },
    },
  }

  const formats = [
    'header',
    'font',
    'size',
    'bold',
    'italic',
    'underline',
    'strike',
    'color',
    'background',
    'list',
    'bullet',
    'check',
    'indent',
    'align',
    'blockquote',
    'code-block',
    'link',
    'image',
    'video',
  ]

  // Render HTML content safely
  const renderPreview = () => {
    if (!form.content) {
      return (
        <div className="text-center text-gray-400 py-12">
          No content to preview. Start writing in the editor tab.
        </div>
      )
    }

    return (
      <div 
        className="blog-preview prose prose-lg max-w-none"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(form.content) }}
      />
    )
  }

  return (
    <>
      <style>{rendererStyles}</style>
      
      <div className="space-y-6 bg-white rounded-xl shadow-sm p-6">
        {/* HEADER */}
        <div className="flex items-center justify-between pb-4 border-b">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={onCancel}
              className="h-9 w-9 rounded-lg hover:bg-gray-100"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>

            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {post ? 'Edit Post' : 'Create New Post'}
              </h1>
              {post && (
                <p className="text-sm text-gray-500 mt-1">
                  Last edited: {new Date().toLocaleDateString()}
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onCancel}
              className="rounded-lg"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-blue-600 hover:bg-blue-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Post'}
            </Button>
          </div>
        </div>

        {/* FORM */}
        <div className="space-y-6">
          {/* Basic Information Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Title *</Label>
                <Input
                  value={form.title}
                  onChange={e => {
                    update('title', e.target.value)
                  }}
                  placeholder="Enter post title"
                  className="rounded-lg"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Slug *</Label>
                <Input
                  value={form.slug}
                  onChange={e => {
                    update('slug', slugifyText(e.target.value))
                    setSlugTouched(true)
                  }}
                  placeholder="post-url-slug"
                  className="rounded-lg font-mono text-sm"
                />
                <p className="text-xs text-gray-500">URL-friendly version of the title</p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Author</Label>
                <Input
                  value={form.author_name}
                  onChange={e => update('author_name', e.target.value)}
                  placeholder="Author name"
                  className="rounded-lg"
                />
                <p className="text-xs text-gray-500">Display name shown on the blog post page.</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Excerpt</Label>
              <Textarea
                rows={3}
                value={form.excerpt}
                onChange={e =>
                  update('excerpt', e.target.value)
                }
                placeholder="Brief summary of your post..."
                className="rounded-lg resize-none"
              />
              <p className="text-xs text-gray-500">
                {form.excerpt.length} / 300 characters
              </p>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-lg font-semibold text-gray-900">Author Details</h3>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Author Name</Label>
                  <Input
                    value={form.author_name}
                    onChange={e => update('author_name', e.target.value)}
                    placeholder="Author name"
                    className="rounded-lg"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Author Title</Label>
                  <Input
                    value={form.author_title}
                    onChange={e => update('author_title', e.target.value)}
                    placeholder="e.g. Senior Editor, Content Strategist"
                    className="rounded-lg"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Author Image URL</Label>
                  <Input
                    value={form.author_image}
                    onChange={e => update('author_image', e.target.value)}
                    placeholder="https://example.com/author.jpg"
                    className="rounded-lg font-mono text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Author Bio / Experience</Label>
                <Textarea
                  rows={3}
                  value={form.author_bio}
                  onChange={e => update('author_bio', e.target.value)}
                  placeholder="Short author bio and experience details."
                  className="rounded-lg resize-none"
                />
                <p className="text-xs text-gray-500">This appears in the author block below the article.</p>
              </div>
            </div>
          </div>

          {/* Content Section with Tabs */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Content</Label>
            
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <TabsList className="grid w-full max-w-[300px] grid-cols-3 mb-4">
                <TabsTrigger value="edit" className="flex items-center gap-2">
                  <Edit2 className="w-3 h-3" />
                  Edit
                </TabsTrigger>
                <TabsTrigger value="html" className="flex items-center gap-2">
                  <Code className="w-3 h-3" />
                  HTML
                </TabsTrigger>
                <TabsTrigger value="preview" className="flex items-center gap-2">
                  <Eye className="w-3 h-3" />
                  Preview
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="edit" className="mt-0">
                <div className="rounded-xl overflow-hidden border border-gray-200 bg-white">
                  <ReactQuill
                    value={form.content}
                    onChange={handleContentChange}
                    modules={modules}
                    formats={formats}
                    theme="snow"
                    placeholder="Write your blog content here... Use the toolbar above to format your text."
                    className="min-h-[400px]"
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="html" className="mt-0">
                <div className="rounded-xl overflow-hidden border border-gray-200 bg-white space-y-3">
                  {/* HTML Validation Feedback */}
                  {htmlValidation.errors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-xs font-semibold text-red-700 mb-2">❌ HTML Issues Found:</p>
                      <ul className="space-y-1">
                        {htmlValidation.errors.map((error, idx) => (
                          <li key={idx} className="text-xs text-red-600">• {error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {htmlValidation.warnings.length > 0 && htmlValidation.errors.length === 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <p className="text-xs font-semibold text-yellow-700 mb-2">⚠️ Warnings:</p>
                      <ul className="space-y-1">
                        {htmlValidation.warnings.map((warning, idx) => (
                          <li key={idx} className="text-xs text-yellow-600">• {warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {htmlValidation.isValid && htmlValidation.errors.length === 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-xs font-semibold text-green-700">✅ HTML is valid</p>
                    </div>
                  )}
                  
                  {/* HTML Editor */}
                  <textarea
                    value={form.content}
                    onChange={(e) => handleHtmlChange(e.target.value)}
                    placeholder="Paste or write your HTML content here..."
                    className="w-full h-[400px] p-4 font-mono text-sm border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  
                  {/* Character Count and Info */}
                  <div className="flex justify-between items-center text-xs text-gray-500 px-2">
                    <span>{form.content.length} characters</span>
                    <span>Last edited in: {lastEditor === 'html' ? '📝 HTML Editor' : '✏️ Visual Editor'}</span>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="preview" className="mt-0">
                <div className="border border-gray-200 rounded-xl bg-gray-50 p-6 min-h-[400px] max-h-[600px] overflow-y-auto">
                  {renderPreview()}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Categories and Metadata Section */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-lg font-semibold text-gray-900">Categories & Metadata</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Blog Category *</Label>
                <Select
                  value={form.category_id}
                  onValueChange={(value) => update('category_id', value)}
                >
                  <SelectTrigger className="rounded-lg">
                    <SelectValue placeholder="Choose a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        <div className="flex items-center justify-between gap-2">
                          <span>{category.name}</span>
                          <span className="text-[11px] text-muted-foreground">/{category.slug}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">Assign this post to an SEO-optimized blog category.</p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => update('status', v)}
                >
                  <SelectTrigger className="rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Featured</Label>
                <div className="flex items-center gap-3">
                  <Switch checked={form.featured} onCheckedChange={(value) => update('featured', value)} />
                  <span className="text-sm text-muted-foreground">Show on category hero and featured sections</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Canonical URL</Label>
                <Input
                  value={form.canonical_url}
                  onChange={(e) => update('canonical_url', e.target.value)}
                  placeholder="https://yourdomain.com/blog/post-slug"
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Open Graph image</Label>
                <Input
                  value={form.og_image}
                  onChange={(e) => update('og_image', e.target.value)}
                  placeholder="https://.../og-image.jpg"
                  className="rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Schema Type</Label>
                <Select
                  value={form.schema_type}
                  onValueChange={(value) => update('schema_type', value)}
                >
                  <SelectTrigger className="rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BlogPosting">BlogPosting</SelectItem>
                    <SelectItem value="Article">Article</SelectItem>
                    <SelectItem value="NewsArticle">NewsArticle</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Meta Robots</Label>
                <Input
                  value={form.meta_robots}
                  onChange={(e) => update('meta_robots', e.target.value)}
                  placeholder="index,follow"
                  className="rounded-lg"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">SEO Keywords</Label>
                <Input
                  value={form.seo_keywords}
                  onChange={(e) => update('seo_keywords', e.target.value)}
                  placeholder="productivity, AI tools, guide"
                  className="rounded-lg"
                />
                <p className="text-xs text-muted-foreground">Comma-separated keyword targets.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-3xl border border-border/50 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">SEO Score</p>
                <p className="text-3xl font-semibold text-slate-900">{seoScore.score}</p>
                <p className="mt-2 text-sm text-muted-foreground">{seoScore.label}</p>
                {seoScore.warnings.length > 0 && (
                  <ul className="mt-3 space-y-1 text-xs text-red-600">
                    {seoScore.warnings.slice(0, 3).map((warning) => (
                      <li key={warning}>• {warning}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-3xl border border-border/50 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Keyword Density</p>
                <p className="text-3xl font-semibold text-slate-900">{keywordDensity}%</p>
                <p className="mt-2 text-sm text-muted-foreground">Based on content and keyword targets.</p>
              </div>

              <div className="rounded-3xl border border-border/50 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Reading Time</p>
                <p className="text-3xl font-semibold text-slate-900">{estimateReadingTime(form.content)} min</p>
                <p className="mt-2 text-sm text-muted-foreground">Auto-calculated from content length.</p>
              </div>
            </div>
          </div>

          {/* SEO Section */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-lg font-semibold text-gray-900">SEO Settings</h3>
            
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">SEO Title</Label>
                <Input
                  value={form.seo_title}
                  onChange={e =>
                    update('seo_title', e.target.value)
                  }
                  placeholder="Optimized title for search engines"
                  className="rounded-lg"
                />
                <p className="text-xs text-gray-500">Recommended: 50-60 characters</p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">SEO Description</Label>
                <Textarea
                  rows={2}
                  value={form.seo_description}
                  onChange={e =>
                    update(
                      'seo_description',
                      e.target.value
                    )
                  }
                  placeholder="Brief description for search results"
                  className="rounded-lg resize-none"
                />
                <p className="text-xs text-gray-500">Recommended: 150-160 characters</p>
                {duplicateSeoDescriptionWarning && (
                  <p className="text-xs text-amber-700">{duplicateSeoDescriptionWarning}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Open Graph Title</Label>
                <Input
                  value={form.og_title}
                  onChange={e =>
                    update('og_title', e.target.value)
                  }
                  placeholder="Title for social media sharing"
                  className="rounded-lg"
                />
                <p className="text-xs text-gray-500">Used for Facebook, LinkedIn, and other platforms</p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Open Graph Description</Label>
                <Textarea
                  rows={2}
                  value={form.og_description}
                  onChange={e =>
                    update('og_description', e.target.value)
                  }
                  placeholder="Summary for social media preview"
                  className="rounded-lg resize-none"
                />
                <p className="text-xs text-gray-500">Shown when post is shared on social media</p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Twitter Title</Label>
                <Input
                  value={form.twitter_title}
                  onChange={e =>
                    update('twitter_title', e.target.value)
                  }
                  placeholder="Title for Twitter/X Card"
                  className="rounded-lg"
                />
                <p className="text-xs text-gray-500">Optimized for Twitter/X sharing</p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Twitter Description</Label>
                <Textarea
                  rows={2}
                  value={form.twitter_description}
                  onChange={e =>
                    update('twitter_description', e.target.value)
                  }
                  placeholder="Summary for Twitter/X Card"
                  className="rounded-lg resize-none"
                />
                <p className="text-xs text-gray-500">Appears on Twitter/X when post is shared</p>
              </div>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="space-y-4 pt-4 border-t">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Frequently Asked Questions</h3>
                <p className="text-sm text-muted-foreground">Add FAQ items to show on the blog post page and generate FAQ structured data.</p>
              </div>
              <Button variant="outline" size="sm" onClick={addFaqItem} className="rounded-xl gap-2">
                <Plus className="w-4 h-4" /> Add FAQ item
              </Button>
            </div>

            <div className="space-y-4">
              {(form.faq_items || []).map((item, index) => (
                <div key={index} className="rounded-3xl border border-border/50 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">FAQ {index + 1}</p>
                      <p className="text-sm font-medium text-slate-900">Question and answer</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => removeFaqItem(index)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 gap-4 mt-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Question</Label>
                      <Input
                        value={item.question}
                        onChange={(e) => updateFaqItem(index, 'question', e.target.value)}
                        placeholder="What is the best way to compress a PDF?"
                        className="rounded-lg"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Answer</Label>
                      <Textarea
                        rows={4}
                        value={item.answer}
                        onChange={(e) => updateFaqItem(index, 'answer', e.target.value)}
                        placeholder="Use a PDF compressor tool, choose a lower quality setting, and save the smaller file."
                        className="rounded-lg resize-none"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {form.faq_items?.length === 0 && (
                <div className="rounded-3xl border border-dashed border-border/60 bg-slate-50 p-6 text-sm text-muted-foreground">
                  No FAQ items yet. Click "Add FAQ item" to create the first question and answer.
                </div>
              )}
            </div>
          </div>

          {/* Media Section */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-lg font-semibold text-gray-900">Media</h3>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Featured Image URL</Label>
              <Input
                value={form.featured_image}
                onChange={e =>
                  update(
                    'featured_image',
                    e.target.value
                  )
                }
                placeholder="https://example.com/image.jpg"
                className="rounded-lg font-mono text-sm"
              />
              {form.featured_image && (
                <div className="mt-2">
                  <img 
                    src={form.featured_image} 
                    alt="Featured image preview"
                    className="max-w-full h-32 object-cover rounded-lg border"
                    onError={(e) => {
                      e.target.style.display = 'none'
                      const parent = e.target.parentElement
                      const errorMsg = document.createElement('p')
                      errorMsg.className = 'text-red-500 text-sm mt-1'
                      errorMsg.textContent = 'Invalid image URL'
                      parent.appendChild(errorMsg)
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Reading Time Display */}
          <div className="bg-gray-50 rounded-lg p-4 border">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Reading Time:</span>
              <span className="text-sm text-gray-600">
                {estimateReadingTime(form.content)} minute read
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

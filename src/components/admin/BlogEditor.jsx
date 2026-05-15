import React, { useState, useEffect, useMemo } from 'react'
import { ArrowLeft, Save, Eye, Edit2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'

import { toast } from 'sonner'
import { createBlogPost, getBlogPosts, getBlogCategories, updateBlogPost } from '@/api/supabaseApi'
import { estimateReadingTime, getKeywordDensity, buildSeoScore, slugifyText } from '@/lib/seoUtils'

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
    author_name: post?.author_name || 'Admin',
    reading_time: post?.reading_time || 0,
    seo_title: post?.seo_title || '',
    seo_description: post?.seo_description || '',
    seo_keywords: post?.seo_keywords || '',
  })

  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('edit')
  const [slugTouched, setSlugTouched] = useState(Boolean(post?.slug))

  const { data: categories = [] } = useQuery({
    queryKey: ['blog-categories'],
    queryFn: () => getBlogCategories({ orderBy: 'featured desc, sort_order', ascending: false, limit: 200 }),
  })

  const { data: suggestions = [] } = useQuery({
    queryKey: ['blog-suggestions'],
    queryFn: () => getBlogPosts({ published: true, orderBy: 'views_count', ascending: false, limit: 20 }),
  })

  const update = (key, value) =>
    setForm(prev => ({ ...prev, [key]: value }))

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
        content: cleanContent(form.content),
        reading_time: estimateReadingTime(form.content),
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
        dangerouslySetInnerHTML={{ __html: form.content }}
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>

          {/* Content Section with Tabs */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Content</Label>
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full max-w-[200px] grid-cols-2 mb-4">
                <TabsTrigger value="edit" className="flex items-center gap-2">
                  <Edit2 className="w-3 h-3" />
                  Edit
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
              </div>
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
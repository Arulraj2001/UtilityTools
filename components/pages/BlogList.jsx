'use client';
import React, { useMemo, useState, useEffect } from 'react'
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { 
  BookOpen, Search, ChevronDown, Calendar, Clock, Tag as TagIcon, 
  Sparkles, FileText, Image as ImageIcon, GraduationCap, 
  Calculator, Cpu, Folder, ArrowRight, Mail, ShieldCheck,
  TrendingUp, RotateCcw
} from 'lucide-react'
import { getBlogPosts, getBlogCategories } from '@/api/supabaseApi'
import { filterPosts } from '@/lib/blogFilterUtils'
import { mergeBlogCategories, mergeBlogPosts } from '@/lib/staticBlogPosts'
import BlogCard from '@/components/blog/BlogCard'
import StaticPageSEO, { SITE_URL, buildBreadcrumbSchema } from '@/components/seo/StaticPageSEO'
import { robotsForSearchParams } from '@/lib/indexation'
import { toast } from 'sonner'

const blogDescription =
  'Helpful QuickUtils guides for calculators, PDF tools, image tools, text tools, developer utilities, and practical productivity workflows.'

const blogSchema = {
  '@context': 'https://schema.org',
  '@type': 'Blog',
  name: 'QuickUtils Blog',
  url: `${SITE_URL}/blog`,
  description: blogDescription,
  publisher: {
    '@type': 'Organization',
    name: 'QuickUtils',
    logo: {
      '@type': 'ImageObject',
      url: `${SITE_URL}/logo.png`,
    },
  },
}

const getCategoryIcon = (slug) => {
  switch (slug) {
    case 'ai-tool-workflows':
    case 'ai-tools':
    case 'ai':
      return Sparkles;
    case 'pdf-tools':
    case 'pdf-document-workflows':
      return FileText;
    case 'image-tools':
    case 'image-resize-format-guides':
      return ImageIcon;
    case 'education':
    case 'student-calculators-exam-forms':
      return GraduationCap;
    case 'finance':
    case 'everyday-calculators-converters':
      return Calculator;
    case 'developer-tools':
      return Cpu;
    case 'productivity-challenges':
      return TrendingUp;
    default:
      return Folder;
  }
}

function BlogEmptyState() {
  return (
    <div className="py-16 bg-card border border-border/50 rounded-2xl p-8 text-center max-w-2xl mx-auto">
      <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
        <BookOpen className="w-8 h-8 text-primary" />
      </div>
      <h3 className="text-xl font-semibold mb-2">Guides coming soon</h3>
      <p className="text-muted-foreground mb-6 leading-relaxed">
        The blog is ready for publishing, but no articles are live yet. Until then,
        browse our tools and categories to get started.
      </p>
      <div className="flex flex-wrap gap-3 justify-center">
        <Link href="/tools" className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">Browse All Tools</Link>
        <Link href="/categories" className="px-5 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">View Categories</Link>
      </div>
    </div>
  )
}

export default function BlogList() {
  const searchParams = useSearchParams()
  const router = useRouter()

  // State for search and sorting
  const [searchQuery, setSearchQuery] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [sortBy, setSortBy] = useState('newest') // 'newest' | 'oldest' | 'reading_time'
  const [email, setEmail] = useState('')

  // Get active filters from URL
  const activeCategory = useMemo(() => searchParams.get('category') || '', [searchParams.toString()])
  const activeTags = useMemo(() => searchParams.getAll('tag') || [], [searchParams.toString()])
  const activeTagsKey = useMemo(() => activeTags.join(','), [activeTags])

  const { data: remotePosts = [], isLoading } = useQuery({
    queryKey: ['blog-published'],
    queryFn: () => getBlogPosts({ published: true, orderBy: 'created_at', ascending: false, limit: 100 }),
    retry: false,
  })

  const { data: remoteCategories = [] } = useQuery({
    queryKey: ['blog-categories'],
    queryFn: () => getBlogCategories({ orderBy: 'sort_order', ascending: true, limit: 100 }),
    retry: false,
  })

  const posts = useMemo(() => mergeBlogPosts(remotePosts), [remotePosts])
  const categories = useMemo(() => mergeBlogCategories(remoteCategories), [remoteCategories])

  // Extract all unique tags
  const allTags = useMemo(() => {
    const tagSet = new Set()
    posts.forEach(post => {
      if (post.tags && Array.isArray(post.tags)) {
        post.tags.forEach(tag => tagSet.add(tag))
      }
    })
    return Array.from(tagSet).sort()
  }, [posts])

  // Get active counts for sidebar categories
  const categoryCounts = useMemo(() => {
    return posts.reduce((counts, post) => {
      if (post.status && post.status !== 'published') return counts
      const postCategoryId = post.category_id || post.blog_categories?.id
      if (!postCategoryId) return counts
      counts[postCategoryId] = (counts[postCategoryId] || 0) + 1
      return counts
    }, {})
  }, [posts])

  // Scroll to top on filter change
  useEffect(() => {
    if (activeCategory || activeTags.length > 0) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [activeCategory, activeTagsKey])

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [])

  // Navigation handlers
  const handleCategoryChange = (categorySlug) => {
    const params = new URLSearchParams(searchParams.toString())
    if (categorySlug === 'all') {
      params.delete('category')
    } else {
      params.set('category', categorySlug)
    }
    router.push(`/blog?${params.toString()}`)
  }

  const handleTagToggle = (tag) => {
    const params = new URLSearchParams(searchParams.toString())
    const currentTags = params.getAll('tag')

    if (currentTags.includes(tag)) {
      params.delete('tag')
      currentTags.filter(t => t !== tag).forEach(t => params.append('tag', t))
    } else {
      params.append('tag', tag)
    }
    router.push(`/blog?${params.toString()}`)
  }

  const handleClearAllFilters = () => {
    router.push('/blog')
    setSearchInput('')
    setSearchQuery('')
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    setSearchQuery(searchInput)
  }

  const handleSubscribe = (e) => {
    e.preventDefault()
    if (email) {
      toast.success('Thank you for subscribing to QuickUtils Blog!')
      setEmail('')
    }
  }

  // Derived Filtered and Sorted list
  const filteredPosts = useMemo(() => {
    let list = filterPosts(posts, {
      category: activeCategory,
      tags: activeTags,
    })

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter(post => 
        post.title?.toLowerCase().includes(q) ||
        post.excerpt?.toLowerCase().includes(q) ||
        (post.tags && post.tags.some(tag => tag.toLowerCase().includes(q))) ||
        (post.blog_categories?.name && post.blog_categories.name.toLowerCase().includes(q))
      )
    }

    // Sort order
    if (sortBy === 'newest') {
      list = [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    } else if (sortBy === 'oldest') {
      list = [...list].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    } else if (sortBy === 'reading_time') {
      list = [...list].sort((a, b) => (parseInt(b.reading_time) || 0) - (parseInt(a.reading_time) || 0))
    }

    return list
  }, [posts, activeCategory, activeTagsKey, searchQuery, sortBy])

  return (
    <>
      <StaticPageSEO
        title="QuickUtils Blog - Practical Guides for Online Tools"
        description={blogDescription}
        path="/blog"
        ogTitle="QuickUtils Blog - Tool Guides and Practical Tutorials"
        ogDescription="Learn how to use calculators, PDF tools, image tools, text tools, and developer utilities with clear examples."
        robots={robotsForSearchParams(searchParams)}
        jsonLd={[
          blogSchema,
          buildBreadcrumbSchema([
            { name: 'Home', url: SITE_URL },
            { name: 'Blog', url: `${SITE_URL}/blog` },
          ]),
        ]}
      />
      
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          
          {/* Header Section */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center mb-12">
            
            {/* Left Column (Search and Text) */}
            <div className="lg:col-span-8 space-y-6">
              <div className="space-y-3">
                <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground">
                  QuickUtils Blog
                </h1>
                <p className="text-muted-foreground text-base sm:text-lg max-w-2xl leading-relaxed">
                  Practical guides to help you understand calculators, PDF tools, image tools,
                  text tools, developer utilities, and everyday productivity workflows.
                </p>
              </div>

              {/* Search Bar Form */}
              <form onSubmit={handleSearchSubmit} className="flex gap-2 max-w-xl">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search articles, topics, or keywords..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-card border border-border/60 hover:border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all shadow-sm"
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 py-3 bg-primary hover:bg-primary/95 text-primary-foreground font-semibold text-sm rounded-xl transition-all shadow-md shadow-primary/10"
                >
                  Search
                </button>
              </form>
            </div>

            {/* Right Column (Illustration) */}
            <div className="lg:col-span-4 flex justify-center lg:justify-end">
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                className="w-60 h-60 relative flex items-center justify-center"
              >
                <img 
                  src="/blog_illustration.png" 
                  alt="QuickUtils Blog Illustration" 
                  className="w-full h-full object-contain pointer-events-none"
                />
              </motion.div>
            </div>

          </div>

          {/* Controls & Pagination info Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-4 border-b border-border/40">
            <div className="flex flex-wrap items-center gap-3">
              
              {/* Category Filter Dropdown */}
              <div className="relative">
                <select
                  value={activeCategory || 'all'}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="appearance-none bg-card hover:bg-muted/30 border border-border/60 rounded-xl pl-4 pr-10 py-2.5 text-sm font-medium text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                >
                  <option value="all">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.slug}>{cat.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>

              {/* Sorting Dropdown */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="appearance-none bg-card hover:bg-muted/30 border border-border/60 rounded-xl pl-4 pr-10 py-2.5 text-sm font-medium text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="reading_time">Longest Read</option>
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>

              {/* Reset Filters button */}
              {(activeCategory || activeTags.length > 0 || searchQuery) && (
                <button
                  onClick={handleClearAllFilters}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-all border border-border/40 bg-transparent"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset
                </button>
              )}
            </div>

            {/* Pagination / Count summary */}
            <div className="text-sm text-muted-foreground font-medium sm:text-right shrink-0">
              {filteredPosts.length > 0 ? (
                <span>Showing 1-{filteredPosts.length} of {posts.length} articles</span>
              ) : (
                <span>Showing 0 articles</span>
              )}
            </div>
          </div>

          {/* Main Layout Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Column: Blog Content */}
            <div className="lg:col-span-8 space-y-6">
              {isLoading && posts.length === 0 ? (
                <div className="space-y-6">
                  {Array(4).fill(0).map((_, i) => (
                    <div key={i} className="h-44 rounded-2xl bg-muted animate-pulse" />
                  ))}
                </div>
              ) : filteredPosts.length > 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6"
                >
                  {filteredPosts.map((post, i) => (
                    <BlogCard key={post.id} post={post} index={i} />
                  ))}
                </motion.div>
              ) : posts.length === 0 ? (
                <BlogEmptyState />
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center bg-card border border-border/50 rounded-2xl p-6">
                  <span className="text-4xl mb-3">🔍</span>
                  <h3 className="text-lg font-semibold mb-1">No articles match your filters</h3>
                  <p className="text-muted-foreground text-sm mb-5">Try resetting the search or filters to see other guides.</p>
                  <button
                    onClick={handleClearAllFilters}
                    className="px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:bg-primary/95 transition-all"
                  >
                    Clear Filters
                  </button>
                </div>
              )}
            </div>

            {/* Right Column: Sidebar */}
            <aside className="lg:col-span-4 space-y-6">
              
              {/* Card 1: Categories list */}
              {categories.length > 0 && (
                <div className="p-6 rounded-2xl bg-card border border-border/50 shadow-sm space-y-4">
                  <h3 className="font-bold text-base text-foreground pb-2 border-b border-border/30">
                    Categories
                  </h3>
                  <div className="space-y-1">
                    {categories.slice(0, 6).map((cat) => {
                      const IconComponent = getCategoryIcon(cat.slug)
                      const isActive = activeCategory === cat.slug
                      return (
                        <button
                          key={cat.id}
                          onClick={() => handleCategoryChange(cat.slug)}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all text-sm group/item ${
                            isActive
                              ? 'bg-primary/10 text-primary font-bold'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <IconComponent className={`w-4 h-4 transition-colors ${
                              isActive ? 'text-primary' : 'text-muted-foreground/80 group-hover/item:text-foreground'
                            }`} />
                            <span>{cat.name}</span>
                          </div>
                          <span className="text-xs bg-muted group-hover/item:bg-border/60 text-muted-foreground px-2 py-0.5 rounded-full font-medium transition-colors">
                            {categoryCounts[cat.id] ?? cat.post_count ?? 0}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                  <button
                    onClick={handleClearAllFilters}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors pt-2 px-3"
                  >
                    View all categories
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Card 2: Popular Tags */}
              {allTags.length > 0 && (
                <div className="p-6 rounded-2xl bg-card border border-border/50 shadow-sm space-y-4">
                  <h3 className="font-bold text-base text-foreground pb-2 border-b border-border/30">
                    Popular Tags
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {allTags.slice(0, 10).map((tag) => {
                      const isActive = activeTags.includes(tag)
                      return (
                        <button
                          key={tag}
                          onClick={() => handleTagToggle(tag)}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                            isActive
                              ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/10'
                              : 'bg-primary/5 hover:bg-primary/10 text-primary border border-primary/10'
                          }`}
                        >
                          {tag.replace(/-/g, ' ')}
                        </button>
                      )
                    })}
                  </div>
                  <button
                    onClick={handleClearAllFilters}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors pt-2"
                  >
                    View all tags
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Card 3: Stay in the loop */}
              <div className="p-6 rounded-2xl bg-card border border-border/50 shadow-sm space-y-4">
                <h3 className="font-bold text-base text-foreground pb-2 border-b border-border/30">
                  Stay in the loop
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Get the latest guides, tool updates, and productivity tips straight to your inbox.
                </p>
                
                <form onSubmit={handleSubscribe} className="space-y-3">
                  <input
                    type="email"
                    required
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2.5 bg-background border border-border/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all"
                  />
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-primary hover:bg-primary/95 text-primary-foreground text-sm font-semibold rounded-xl transition-all shadow-sm"
                  >
                    Subscribe
                  </button>
                </form>

                <div className="flex items-center gap-2 text-[11px] text-muted-foreground/80 pt-2 border-t border-border/30">
                  <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
                  <span>No spam. Unsubscribe anytime.</span>
                </div>
              </div>

            </aside>

          </div>

        </div>
      </div>
    </>
  )
}

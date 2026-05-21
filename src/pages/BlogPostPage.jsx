import React, { useMemo, useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ChevronRight, Clock, Calendar, User, Tag, BookOpen, Share2, Heart, Copy, Facebook, Twitter, Linkedin } from 'lucide-react'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import AdBanner from '../components/shared/AdBanner'
import BlogSidebar from '@/components/blog/BlogSidebar'
import BlogFilterDrawer from '@/components/blog/BlogFilterDrawer'
import { getBlogPostBySlug, getBlogPosts, getBlogCategories, getTools, getCategories } from '@/api/supabaseApi'
import KeywordSuggestions from '@/components/seo/KeywordSuggestions'
import { suggestLinksFromText } from '@/lib/semanticLinker'
import BlogSEO from '@/components/seo/BlogSEO'

export default function BlogPostPage() {
  const { slug } = useParams()
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  const {
    data: post,
    isLoading: isLoadingPost,
    isError: isPostError,
  } = useQuery({
    queryKey: ['blog-post', slug],
    queryFn: () => getBlogPostBySlug(slug),
    enabled: !!slug,
    retry: false,
  })

  const { data: posts = [], isLoading: isLoadingPosts } = useQuery({
    queryKey: ['blog-published'],
    queryFn: () => getBlogPosts({ published: true, orderBy: 'created_at', ascending: false, limit: 100 }),
    retry: false,
  })

  const { data: tools = [], isLoading: isLoadingTools } = useQuery({
    queryKey: ['tools-published'],
    queryFn: () => getTools({ published: true, orderBy: 'sort_order', ascending: true, limit: 200 }),
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['blog-categories'],
    queryFn: () => getBlogCategories({ orderBy: 'sort_order', ascending: true, limit: 100 }),
  })

  const { data: toolCategories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => getCategories({ orderBy: 'sort_order', ascending: true, limit: 200 }),
  })

  // Load like status from localStorage
  useEffect(() => {
    if (post?.id) {
      const likedPosts = JSON.parse(localStorage.getItem('liked_posts') || '{}')
      setLiked(!!likedPosts[post.id])
      setLikeCount(post.likes_count || 0)
    }
  }, [post])

  const relatedPosts = useMemo(() => {
    if (!post) return []
    const currentCategory = post.blog_categories?.name || post.category
    const sameCategory = posts.filter(
      (p) => p.slug !== post.slug && (p.blog_categories?.name || p.category) === currentCategory
    )
    return sameCategory.length > 0 ? sameCategory.slice(0, 2) : posts.filter(p => p.slug !== post.slug).slice(0, 2)
  }, [post, posts])

  const relatedTools = useMemo(() => {
    if (!post || !tools || tools.length === 0) return []

    const postKeywords = (post.seo_keywords || '').toLowerCase().split(/[,\s]+/).filter(Boolean)
    const postTitleParts = (post.title || '').toLowerCase().split(/\s+/).filter(Boolean)

    const scored = tools.map(t => {
      let score = 0
      if (t.category_id && post.category_id && t.category_id === post.category_id) score += 3

      const toolKeywords = (t.seo_keywords || '').toLowerCase().split(/[,\s]+/).filter(Boolean)
      const kwOverlap = toolKeywords.filter(k => postKeywords.includes(k)).length
      score += kwOverlap * 2

      const slugMatch = (t.slug && post.slug) && (t.slug.includes(post.slug) || post.slug.includes(t.slug))
      if (slugMatch) score += 2

      const titleOverlap = (t.name || '').toLowerCase().split(/\s+/).filter(Boolean).filter(w => postTitleParts.includes(w)).length
      score += titleOverlap

      return { tool: t, score }
    })

    return scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score).slice(0, 6).map(s => s.tool)
  }, [post, tools])

  const allTags = useMemo(() => {
    const tagSet = new Set()
    posts.forEach(p => {
      if (p.tags && Array.isArray(p.tags)) {
        p.tags.forEach(tag => tagSet.add(tag))
      }
    })
    return Array.from(tagSet).sort()
  }, [posts])

  // Handle Like functionality
  const handleLike = async () => {
    if (!post?.id) return

    try {
      const likedPosts = JSON.parse(localStorage.getItem('liked_posts') || '{}')
      
      if (liked) {
        delete likedPosts[post.id]
        setLikeCount(prev => prev - 1)
        setLiked(false)
        toast.success('Removed like from this post')
      } else {
        likedPosts[post.id] = true
        setLikeCount(prev => prev + 1)
        setLiked(true)
        toast.success('You liked this post!')
      }
      
      localStorage.setItem('liked_posts', JSON.stringify(likedPosts))
    } catch {
      toast.error('Failed to update like')
    }
  }

  // Handle Share functionality
  const handleShare = async (platform) => {
    const url = window.location.href
    const text = post?.excerpt || 'Interesting article I found'

    try {
      switch (platform) {
        case 'copy':
          await navigator.clipboard.writeText(url)
          toast.success('Link copied to clipboard!')
          break
        case 'facebook':
          window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank', 'width=600,height=400')
          toast.success('Opening Facebook share dialog')
          break
        case 'twitter':
          window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank', 'width=600,height=400')
          toast.success('Opening Twitter share dialog')
          break
        case 'linkedin':
          window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank', 'width=600,height=400')
          toast.success('Opening LinkedIn share dialog')
          break
        default:
          break
      }
    } catch {
      toast.error('Failed to share')
    }
  }

  // Handle native share (mobile)
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: post?.title,
          text: post?.excerpt,
          url: window.location.href,
        })
        toast.success('Shared successfully!')
      } catch (error) {
        if (error.name !== 'AbortError') {
          toast.error('Failed to share')
        }
      }
    } else {
      await navigator.clipboard.writeText(window.location.href)
      toast.success('Link copied to clipboard!')
    }
  }

  if (isLoadingPost || (isLoadingPosts && !post)) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="mt-4 text-muted-foreground">Loading article...</p>
      </div>
    )
  }

  if (!post || isPostError) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="bg-red-50 dark:bg-red-950/20 rounded-2xl p-8">
          <p className="text-2xl font-bold mb-3 text-red-600 dark:text-red-400">Article not found</p>
          <p className="text-muted-foreground mb-6">The article you requested does not exist or has been removed.</p>
          <Link to="/blog">
            <Button className="rounded-xl">Back to Blog</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-b from-background to-secondary/20 min-h-screen">
      {post && <BlogSEO post={post} />}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 lg:py-12">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
          <Link to="/" className="hover:text-foreground transition-all hover:translate-x-0.5 inline-flex items-center gap-1">
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link to="/blog" className="hover:text-foreground transition-all hover:translate-x-0.5 inline-flex items-center gap-1">
            Blog
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-foreground font-medium truncate">{post.title}</span>
        </nav>

        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block lg:col-span-1">
            <div className="sticky top-24 rounded-2xl border border-border/50 bg-card/40 backdrop-blur p-6 space-y-6 max-h-[calc(100vh-120px)] overflow-y-auto">
              <BlogSidebar categories={categories} tags={allTags} posts={posts} />
            </div>
          </aside>

          {/* Article Content */}
          <motion.article 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-3"
          >
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-4">
              {(post.blog_categories?.name || post.category) && (
                post.blog_categories?.slug ? (
                  <Link
                    to={`/blog?category=${encodeURIComponent(post.blog_categories.slug)}`}
                    className="inline-block"
                  >
                    <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 transition-colors rounded-full px-3 py-1">
                      {post.blog_categories?.name || post.category}
                    </Badge>
                  </Link>
                ) : (
                  <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 transition-colors rounded-full px-3 py-1">
                    {post.blog_categories?.name || post.category}
                  </Badge>
                )
              )}
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {format(new Date(post.created_at), 'MMMM d, yyyy')}
              </span>
              {post.reading_time && (
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {post.reading_time} min read
                </span>
              )}
              {post.author_name && (
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  {post.author_name}
                </span>
              )}
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-5 leading-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              {post.title}
            </h1>

            {post.excerpt && (
              <p className="text-lg sm:text-xl text-muted-foreground mb-8 leading-relaxed border-l-4 border-primary pl-4 italic">
                {post.excerpt}
              </p>
            )}
          </div>

          {/* Featured Image */}
          {post.featured_image && (
            <div className="mb-10 rounded-2xl overflow-hidden shadow-xl">
              <img
                src={post.featured_image}
                alt={post.title}
                className="w-full object-cover max-h-[500px] hover:scale-105 transition-transform duration-500"
              />
            </div>
          )}

          {/* Top Ad */}
          <AdBanner placement="blog_top" className="mb-10" />

          {/* Content */}
          <div className="relative">
            <div
              className="prose prose-lg max-w-none dark:prose-invert 
                prose-headings:font-bold prose-headings:text-foreground 
                prose-p:text-muted-foreground prose-p:leading-relaxed
                prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                prose-strong:text-foreground prose-strong:font-semibold
                prose-code:bg-secondary prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-sm
                prose-pre:bg-secondary prose-pre:border prose-pre:rounded-xl
                prose-img:rounded-xl prose-img:shadow-lg
                prose-blockquote:border-l-primary prose-blockquote:bg-secondary/30 prose-blockquote:p-4 prose-blockquote:rounded-r-xl
                prose-li:text-muted-foreground
                prose-table:border prose-table:rounded-xl
                prose-th:bg-secondary prose-th:p-3
                prose-td:p-3 prose-td:border-border"
              dangerouslySetInnerHTML={{ __html: post.content || '' }}
            />
          </div>

          {/* Bottom Ad */}
          <AdBanner placement="blog_bottom" className="mt-10 mb-8" />

          {/* Tags Section */}
          {post.tags?.length > 0 && (
            <div className="mt-10 pt-8 border-t">
              <div className="flex items-center gap-2 mb-4">
                <Tag className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Tags:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {post.tags.map(tag => (
                  <Badge key={tag} variant="outline" className="text-xs px-3 py-1 rounded-full hover:bg-primary/10 transition-colors cursor-pointer">
                    #{tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Share Section - Working */}
          <div className="mt-8 pt-6 border-t flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              {/* Like Button */}
              <Button 
                variant={liked ? "default" : "ghost"} 
                size="sm" 
                className={`rounded-full transition-all duration-300 ${liked ? 'bg-red-500 hover:bg-red-600' : 'hover:bg-red-50'}`}
                onClick={handleLike}
              >
                <Heart className={`w-4 h-4 mr-2 ${liked ? 'fill-white' : ''}`} />
                {likeCount} {likeCount === 1 ? 'Like' : 'Likes'}
              </Button>

              {/* Share Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="rounded-full hover:bg-blue-50">
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuItem onClick={() => handleShare('facebook')} className="cursor-pointer">
                    <Facebook className="w-4 h-4 mr-2 text-blue-600" />
                    Facebook
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleShare('twitter')} className="cursor-pointer">
                    <Twitter className="w-4 h-4 mr-2 text-sky-500" />
                    Twitter
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleShare('linkedin')} className="cursor-pointer">
                    <Linkedin className="w-4 h-4 mr-2 text-blue-700" />
                    LinkedIn
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleShare('copy')} className="cursor-pointer">
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Link
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Native Share for Mobile */}
              {navigator.share && (
                <Button variant="ghost" size="sm" className="rounded-full" onClick={handleNativeShare}>
                  <Share2 className="w-4 h-4 mr-2" />
                  Share via...
                </Button>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{post.reading_time || 5} minute read</span>
            </div>
          </div>

          {/* Related & Recent Articles - With Small/Medium Images */}
          <div className="mt-12 space-y-10">
            {/* Related Articles */}
            {relatedPosts.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-1 h-6 bg-primary rounded-full"></div>
                  <h2 className="text-xl font-semibold">Related articles</h2>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {relatedPosts.map(related => (
                    <Link 
                      key={related.id} 
                      to={`/blog/${encodeURIComponent(related.slug)}`} 
                      className="group block rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-md transition-all duration-300 overflow-hidden premium-card panel-highlight glow-border"
                    >
                      <div className="flex gap-3 p-3">
                        {related.featured_image && (
                          <div className="flex-shrink-0">
                            <img 
                              src={related.featured_image} 
                              alt={related.title}
                              className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-lg group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold mb-1 group-hover:text-primary transition-colors line-clamp-2">
                            {related.title}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                            {related.excerpt || 'Click to read more about this topic...'}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(related.created_at), 'MMM d, yyyy')}
                            <Clock className="w-3 h-3 ml-1" />
                            {related.reading_time || 3} min
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Related Tools */}
            {relatedTools.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-1 h-6 bg-primary rounded-full"></div>
                  <h2 className="text-xl font-semibold">Related tools</h2>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {relatedTools.map(t => (
                    <div key={t.id} className="rounded-xl border border-border bg-card p-3 flex items-start gap-3 hover:shadow-md transition-all">
                      <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                        <img src={t.featured_image || t.icon} alt={t.name} className="w-8 h-8 object-contain" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link to={`/tool/${encodeURIComponent(t.slug)}`} className="text-sm font-semibold hover:text-primary block line-clamp-2">{t.name}</Link>
                        <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>
                      </div>
                      <div className="text-xs text-muted-foreground">{toolCategories.find(c => c.id === t.category_id)?.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Keyword suggestions (non-invasive) */}
            {post && (
              (() => {
                const plain = `${post.title} ${post.excerpt || ''} ${post.content || ''}`.replace(/<[^>]*>/g, '')
                const suggested = suggestLinksFromText(plain, tools, { keywordField: 'seo_keywords', titleField: 'name', maxResults: 5 })
                const mapped = suggested.map(s => ({ ...s, title: s.name, type: 'tool' }))
                return <KeywordSuggestions items={mapped} title="Suggested tools" />
              })()
            )}

            
          </div>

         

          {/* Back to Blog Button */}
          <div className="mt-8 text-center">
            <Link to="/blog">
              <Button variant="outline" className="rounded-full px-6">
                <BookOpen className="w-4 h-4 mr-2" />
                Browse All Articles
              </Button>
            </Link>
          </div>
          </motion.article>
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      <BlogFilterDrawer
        categories={categories}
        tags={allTags}
        posts={posts}
        isOpen={isDrawerOpen}
        setIsOpen={setIsDrawerOpen}
      />
    </div>
  )
}
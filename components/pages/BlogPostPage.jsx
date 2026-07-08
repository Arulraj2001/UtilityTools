'use client';
import React, { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { 
  ChevronRight, Clock, Calendar, Tag, BookOpen, Share2, Heart, Copy, 
  Facebook, Twitter, Linkedin, Sparkles, FileText, Image as ImageIcon, 
  GraduationCap, Calculator, Cpu, Folder, ArrowRight, Mail, ShieldCheck, 
  TrendingUp, RotateCcw
} from 'lucide-react'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { getIcon } from '@/lib/iconMap'
import AdBanner from '@/components/shared/AdBanner'
import FAQAccordion from '@/components/shared/FAQAccordion'
import { getBlogPostBySlug, getBlogPosts, getBlogCategories, getTools, getCategories } from '@/api/supabaseApi'
import { getStaticBlogPostBySlug, mergeBlogCategories, mergeBlogPosts } from '@/lib/staticBlogPosts'
import { sanitizeHtml } from '@/lib/sanitizeHtml'
import { getAuthorForPost } from '@/lib/authors'
import PageNotFound from '@/lib/PageNotFound'
import { rankBlogPosts, rankTools } from '@/lib/relevance'

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

const formatPostDate = (value, pattern = 'MMMM d, yyyy') => {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : format(date, pattern)
}

const FALLBACK_BLOG_IMAGE = '/blog_illustration.png'

function BlogImage({ src, alt, className, ...props }) {
  const [imageSrc, setImageSrc] = useState(src || FALLBACK_BLOG_IMAGE)

  useEffect(() => {
    setImageSrc(src || FALLBACK_BLOG_IMAGE)
  }, [src])

  const handleError = () => {
    setImageSrc((current) => (current === FALLBACK_BLOG_IMAGE ? current : FALLBACK_BLOG_IMAGE))
  }

  return <img src={imageSrc} alt={alt} onError={handleError} className={className} {...props} />
}

const getAuthorHref = (url) => {
  if (!url) return null
  if (url.startsWith('/')) return url

  try {
    return new URL(url).pathname
  } catch {
    return null
  }
}

const LIKED_POSTS_EVENT = 'quickutils-liked-posts'

const getLikedPostsSnapshot = () => {
  if (typeof window === 'undefined') return '{}'
  return window.localStorage.getItem('liked_posts') || '{}'
}

const subscribeLikedPosts = (callback) => {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener('storage', callback)
  window.addEventListener(LIKED_POSTS_EVENT, callback)
  return () => {
    window.removeEventListener('storage', callback)
    window.removeEventListener(LIKED_POSTS_EVENT, callback)
  }
}

const parseLikedPosts = (snapshot) => {
  try {
    return JSON.parse(snapshot || '{}')
  } catch {
    return {}
  }
}

const notifyLikedPostsChanged = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(LIKED_POSTS_EVENT))
  }
}

export default function BlogPostPage({
  slug,
  initialPost = null,
  initialPosts = [],
  initialCategories = [],
  initialTools = [],
  initialToolCategories = [],
}) {
  const likedPostsSnapshot = useSyncExternalStore(
    subscribeLikedPosts,
    getLikedPostsSnapshot,
    () => '{}'
  )
  const likedPosts = useMemo(() => parseLikedPosts(likedPostsSnapshot), [likedPostsSnapshot])
  const [likeDelta, setLikeDelta] = useState(0)
  const [email, setEmail] = useState('')
  const staticPost = useMemo(() => initialPost || getStaticBlogPostBySlug(slug), [initialPost, slug])

  const {
    data: remotePost,
    isLoading: isLoadingPost,
    isError: isRemotePostError,
  } = useQuery({
    queryKey: ['blog-post', slug],
    queryFn: () => getBlogPostBySlug(slug),
    enabled: !!slug && !staticPost,
    initialData: initialPost || undefined,
    retry: false,
  })

  const post = staticPost || remotePost
  const isPostError = !staticPost && isRemotePostError
  const authorProfile = useMemo(() => (post ? getAuthorForPost(post) : null), [post])

  const { data: remotePosts = [], isLoading: isLoadingPosts } = useQuery({
    queryKey: ['blog-published'],
    queryFn: () => getBlogPosts({ published: true, orderBy: 'created_at', ascending: false, limit: 100 }),
    initialData: initialPosts,
    retry: false,
  })

  const { data: tools = [] } = useQuery({
    queryKey: ['tools-published'],
    queryFn: () => getTools({ published: true, orderBy: 'sort_order', ascending: true, limit: 200 }),
    initialData: initialTools,
  })

  const { data: remoteCategories = [] } = useQuery({
    queryKey: ['blog-categories'],
    queryFn: () => getBlogCategories({ orderBy: 'sort_order', ascending: true, limit: 100 }),
    initialData: initialCategories,
    retry: false,
  })

  const { data: toolCategories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => getCategories({ orderBy: 'sort_order', ascending: true, limit: 200 }),
    initialData: initialToolCategories,
  })

  const posts = useMemo(() => mergeBlogPosts(remotePosts), [remotePosts])
  const categories = useMemo(() => mergeBlogCategories(remoteCategories), [remoteCategories])

  const categoryCounts = useMemo(() => {
    return posts.reduce((counts, post) => {
      if (post.status && post.status !== 'published') return counts
      const postCategoryId = post.category_id || post.blog_categories?.id
      if (!postCategoryId) return counts
      counts[postCategoryId] = (counts[postCategoryId] || 0) + 1
      return counts
    }, {})
  }, [posts])

  const handleSubscribe = (e) => {
    e.preventDefault()
    if (email) {
      toast.success('Thank you for subscribing to QuickUtils Blog!')
      setEmail('')
    }
  }

  const currentPostIndex = useMemo(() => {
    if (!post || !posts.length) return -1
    return posts.findIndex((p) => p.slug === post.slug)
  }, [post, posts])

  const nextPost = useMemo(() => {
    if (currentPostIndex <= 0) return null
    return posts[currentPostIndex - 1]
  }, [posts, currentPostIndex])

  const prevPost = useMemo(() => {
    if (currentPostIndex === -1 || currentPostIndex >= posts.length - 1) return null
    return posts[currentPostIndex + 1]
  }, [posts, currentPostIndex])

  const relatedPosts = useMemo(() => {
    return rankBlogPosts(post, posts, 2)
  }, [post, posts])

  const relatedTools = useMemo(() => {
    return rankTools(post, tools, 6)
  }, [post, tools])

  const relatedCategoryLinks = useMemo(() => {
    if (!post || !toolCategories.length) return []
    const postCatId = post.category_id || post.blog_categories?.id
    const relatedCatIds = new Set(relatedTools.map(t => t.category_id).filter(Boolean))
    
    return [...toolCategories]
      .sort((a, b) => {
        if (a.id === postCatId) return -1
        if (b.id === postCatId) return 1
        const aHas = relatedCatIds.has(a.id)
        const bHas = relatedCatIds.has(b.id)
        if (aHas && !bHas) return -1
        if (!aHas && bHas) return 1
        return (a.sort_order || 0) - (b.sort_order || 0)
      })
      .slice(0, 4)
  }, [post, relatedTools, toolCategories])

  const allTags = useMemo(() => {
    const tagSet = new Set()
    posts.forEach(p => {
      if (p.tags && Array.isArray(p.tags)) {
        p.tags.forEach(tag => tagSet.add(tag))
      }
    })
    return Array.from(tagSet).sort()
  }, [posts])

  const authorName = post?.author_name || authorProfile?.name || 'QuickUtils Editorial Team'
  const authorTitle = post?.author_title || authorProfile?.title
  const authorBio = post?.author_bio || authorProfile?.bio
  const authorImage = post?.author_image || authorProfile?.image
  const featuredImage = post?.featured_image || post?.og_image
  const authorHref = getAuthorHref(post?.author_url || authorProfile?.url)
  const publishedDate = formatPostDate(post?.created_at)
  const updatedDate = formatPostDate(post?.updated_at || post?.created_at)
  const sanitizedContent = useMemo(() => sanitizeHtml(post?.content || ''), [post?.content])
  const liked = post?.id ? !!likedPosts[post.id] : false
  const likeCount = Math.max(0, (post?.likes_count || 0) + likeDelta)

  const handleLike = async () => {
    if (!post?.id) return
    try {
      const likedPosts = JSON.parse(localStorage.getItem('liked_posts') || '{}')
      if (liked) {
        delete likedPosts[post.id]
        setLikeDelta(prev => prev - 1)
        toast.success('Removed like from this post')
      } else {
        likedPosts[post.id] = true
        setLikeDelta(prev => prev + 1)
        toast.success('You liked this post!')
      }
      localStorage.setItem('liked_posts', JSON.stringify(likedPosts))
      notifyLikedPostsChanged()
    } catch {
      toast.error('Failed to update like')
    }
  }

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
      </div>
    )
  }

  if (!post || isPostError) return (
    <PageNotFound
      title="Article not found"
      message="The article you requested does not exist, has been removed, or is not published."
      primaryHref="/blog"
      primaryLabel="Back to Blog"
    />
  )

  return (
    <div className="bg-background min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 lg:py-12">
        {/* Breadcrumb */}
        <nav className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground mb-8 pb-4 border-b border-border/40">
          <Link href="/" className="hover:text-foreground transition-all hover:translate-x-0.5 inline-flex items-center gap-0.5">
            Home
          </Link>
          <ChevronRight className="w-3 h-3 text-muted-foreground/60" />
          <Link href="/blog" className="hover:text-foreground transition-all hover:translate-x-0.5 inline-flex items-center gap-0.5">
            Blog
          </Link>
          <ChevronRight className="w-3 h-3 text-muted-foreground/60" />
          <span className="text-foreground font-medium truncate max-w-[150px] sm:max-w-xs">{post.title}</span>
        </nav>

        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Desktop/Mobile Sidebar */}
          <aside className="lg:col-span-1 space-y-6 order-last lg:order-first">
            <div className="sticky top-24 space-y-6 max-h-[calc(100vh-120px)] lg:overflow-y-auto pr-1">
              
              {/* Card 1: Categories list */}
              {categories.length > 0 && (
                <div className="p-5 rounded-2xl bg-card border border-border/50 shadow-sm space-y-4">
                  <h3 className="font-bold text-sm text-foreground pb-2 border-b border-border/30">
                    Categories
                  </h3>
                  <div className="space-y-1">
                    {categories.slice(0, 8).map((cat) => {
                      const IconComponent = getCategoryIcon(cat.slug)
                      return (
                        <Link
                          key={cat.id}
                          href={`/blog?category=${encodeURIComponent(cat.slug)}`}
                          className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl transition-all text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 group/item"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <IconComponent className="w-3.5 h-3.5 text-muted-foreground/80 group-hover/item:text-foreground shrink-0" />
                            <span className="truncate">{cat.name}</span>
                          </div>
                          <span className="text-[10px] bg-muted group-hover/item:bg-border/60 text-muted-foreground px-1.5 py-0.5 rounded-full font-medium transition-colors">
                            {categoryCounts[cat.id] ?? cat.post_count ?? 0}
                          </span>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Card 2: Popular Tags */}
              {allTags.length > 0 && (
                <div className="p-5 rounded-2xl bg-card border border-border/50 shadow-sm space-y-4">
                  <h3 className="font-bold text-sm text-foreground pb-2 border-b border-border/30">
                    Popular Tags
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {allTags.slice(0, 12).map((tag) => (
                      <Link
                        key={tag}
                        href={`/blog?tag=${encodeURIComponent(tag)}`}
                        className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-primary/5 hover:bg-primary/10 text-primary border border-primary/10 transition-all"
                      >
                        {tag.replace(/-/g, ' ')}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Card 3: Stay in the loop */}
              <div className="p-5 rounded-2xl bg-card border border-border/50 shadow-sm space-y-4">
                <h3 className="font-bold text-sm text-foreground pb-2 border-b border-border/30">
                  Stay in the loop
                </h3>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Get the latest guides, tool updates, and productivity tips straight to your inbox.
                </p>
                
                <form onSubmit={handleSubscribe} className="space-y-2.5">
                  <input
                    type="email"
                    required
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border/60 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all"
                  />
                  <button
                    type="submit"
                    className="w-full py-2 bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-semibold rounded-xl transition-all shadow-sm"
                  >
                    Subscribe
                  </button>
                </form>

                <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground/80 pt-2 border-t border-border/30">
                  <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>No spam. Unsubscribe anytime.</span>
                </div>
              </div>

            </div>
          </aside>

          {/* Article Content */}
          <motion.article 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-3 space-y-8 order-first lg:order-last"
          >
            {/* Header Section */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {(post.blog_categories?.name || post.category) && (
                  post.blog_categories?.slug ? (
                    <Link href={`/blog?category=${encodeURIComponent(post.blog_categories.slug)}`}>
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-all">
                        {post.blog_categories?.name || post.category}
                      </span>
                    </Link>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                      {post.blog_categories?.name || post.category}
                    </span>
                  )
                )}
                {authorName && (
                  <span className="flex items-center gap-1">
                    By {authorHref ? (
                      <Link href={authorHref} className="hover:text-foreground transition-colors">
                        {authorName}
                      </Link>
                    ) : (
                      authorName
                    )}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Published {publishedDate}
                </span>
                {post.reading_time && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {post.reading_time} min read
                  </span>
                )}
                {updatedDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Updated {post.last_updated_label || updatedDate}
                  </span>
                )}
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-foreground leading-tight">
                {post.title}
              </h1>

              {post.excerpt && (
                <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed border-l-4 border-primary/60 pl-5 italic bg-primary/5 py-4 pr-4 rounded-r-2xl">
                  {post.excerpt}
                </p>
              )}
            </div>

            {/* Featured Image */}
            {featuredImage && (
              <div className="rounded-2xl overflow-hidden border border-border/50 bg-card shadow-sm">
                <BlogImage
                  src={featuredImage}
                  alt={post.title}
                  className="w-full object-cover max-h-[480px]"
                />
              </div>
            )}

            {/* Top Ad */}
            <AdBanner placement="blog_top" className="mb-2" />

            {/* Content */}
            <div className="relative">
              <div
                className="prose prose-lg max-w-none dark:prose-invert 
                  prose-headings:font-bold prose-headings:text-foreground prose-headings:tracking-tight
                  prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4
                  prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:mb-5
                  prose-a:text-primary prose-a:underline hover:prose-a:text-primary/80
                  prose-strong:text-foreground prose-strong:font-bold
                  prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-primary prose-code:font-mono prose-code:text-sm prose-code:before:content-none prose-code:after:content-none
                  prose-pre:bg-muted prose-pre:border prose-pre:border-border/60 prose-pre:rounded-xl prose-pre:p-4
                  prose-img:rounded-2xl prose-img:shadow-md prose-img:border prose-img:border-border/50
                  prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:bg-primary/5 prose-blockquote:pl-5 prose-blockquote:py-1 prose-blockquote:pr-4 prose-blockquote:rounded-r-xl prose-blockquote:italic
                  prose-li:text-muted-foreground prose-li:mb-1
                  prose-table:border prose-table:border-border/60 prose-table:rounded-xl prose-table:overflow-hidden
                  prose-th:bg-muted prose-th:p-3 prose-th:text-foreground prose-th:font-semibold
                  prose-td:p-3 prose-td:border-border/60"
                dangerouslySetInnerHTML={{ __html: sanitizedContent }}
              />
            </div>

            {/* Author Profile */}
            <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm flex flex-col sm:flex-row gap-5 items-start sm:items-center">
              <Avatar className="h-16 w-16 border border-border ring-4 ring-primary/5">
                <AvatarImage src={authorImage} alt={authorName || 'Author'} />
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                  {(authorName || 'A').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {authorHref ? (
                    <Link href={authorHref} className="text-base font-bold text-foreground hover:text-primary transition-colors">
                      {authorName}
                    </Link>
                  ) : (
                    <span className="text-base font-bold text-foreground">{authorName}</span>
                  )}
                  {authorTitle && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {authorTitle}
                    </span>
                  )}
                </div>
                {authorBio && (
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {authorBio}
                  </p>
                )}
              </div>
            </div>

            {/* FAQ Accordion */}
            {post.faq_items?.length > 0 && (
              <div className="pt-4 border-t border-border/40">
                <FAQAccordion items={post.faq_items} />
              </div>
            )}

            {/* Bottom Ad */}
            <AdBanner placement="blog_bottom" className="my-2" />

            {/* Tags Section */}
            {post.tags?.length > 0 && (
              <div className="pt-6 border-t border-border/40">
                <div className="flex flex-wrap gap-2">
                  {post.tags.map(tag => (
                    <Link key={tag} href={`/blog?tag=${encodeURIComponent(tag)}`}>
                      <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-primary/5 hover:bg-primary/10 text-primary border border-primary/10 transition-all cursor-pointer">
                        #{tag.replace(/-/g, ' ')}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Share and Likes Row */}
            <div className="pt-6 border-t border-border/40 flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-2">
                {/* Like Button */}
                <Button 
                  variant={liked ? "default" : "outline"} 
                  size="sm" 
                  className={`rounded-full transition-all duration-300 ${
                    liked 
                      ? 'bg-red-500 hover:bg-red-600 text-white border-red-500 shadow-sm shadow-red-500/10' 
                      : 'hover:bg-red-50/50 hover:text-red-500 hover:border-red-200'
                  }`}
                  onClick={handleLike}
                >
                  <Heart className={`w-4 h-4 mr-2 ${liked ? 'fill-white' : ''}`} />
                  {likeCount} {likeCount === 1 ? 'Like' : 'Likes'}
                </Button>

                {/* Share Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="rounded-full hover:bg-primary/5 hover:text-primary hover:border-primary/20 transition-all">
                      <Share2 className="w-4 h-4 mr-2" />
                      Share
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48 rounded-xl shadow-lg border border-border/60">
                    <DropdownMenuItem onClick={() => handleShare('facebook')} className="cursor-pointer rounded-lg m-1 text-sm font-medium">
                      <Facebook className="w-4 h-4 mr-2 text-blue-600" />
                      Facebook
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleShare('twitter')} className="cursor-pointer rounded-lg m-1 text-sm font-medium">
                      <Twitter className="w-4 h-4 mr-2 text-sky-500" />
                      Twitter
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleShare('linkedin')} className="cursor-pointer rounded-lg m-1 text-sm font-medium">
                      <Linkedin className="w-4 h-4 mr-2 text-blue-700" />
                      LinkedIn
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleShare('copy')} className="cursor-pointer rounded-lg m-1 text-sm font-medium">
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Link
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Native Share for Mobile */}
                {typeof navigator !== 'undefined' && navigator.share && (
                  <Button variant="outline" size="sm" className="rounded-full" onClick={handleNativeShare}>
                    <Share2 className="w-4 h-4 mr-2" />
                    Share via...
                  </Button>
                )}
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                <BookOpen className="w-4 h-4 text-primary" />
                <span>{post.reading_time || 5} minute read</span>
              </div>
            </div>

            {/* Next & Previous Post Navigation */}
            {(prevPost || nextPost) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-8 border-t border-border/40">
                {prevPost ? (
                  <Link 
                    href={`/blog/${encodeURIComponent(prevPost.slug)}`}
                    className="group flex flex-col p-4 rounded-2xl border border-border/50 bg-card hover:border-primary/40 hover:shadow-md transition-all duration-300 text-left min-w-0"
                  >
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1 group-hover:text-primary transition-colors">
                      <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                      Previous Post
                    </span>
                    <span className="text-sm font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                      {prevPost.title}
                    </span>
                  </Link>
                ) : (
                  <div className="hidden sm:block" />
                )}

                {nextPost ? (
                  <Link 
                    href={`/blog/${encodeURIComponent(nextPost.slug)}`}
                    className="group flex flex-col p-4 rounded-2xl border border-border/50 bg-card hover:border-primary/40 hover:shadow-md transition-all duration-300 text-right min-w-0 sm:items-end"
                  >
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1 group-hover:text-primary transition-colors sm:flex-row-reverse">
                      <ArrowRight className="w-3.5 h-3.5" />
                      Next Post
                    </span>
                    <span className="text-sm font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                      {nextPost.title}
                    </span>
                  </Link>
                ) : (
                  <div className="hidden sm:block" />
                )}
              </div>
            )}

            {/* Related & Recent Articles */}
            <div className="pt-8 border-t border-border/40 space-y-10">
              
              {/* Related Articles */}
              {relatedPosts.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-5 bg-primary rounded-full"></div>
                    <h3 className="text-lg font-bold text-foreground">Related Articles</h3>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {relatedPosts.map(related => (
                      <Link key={related.id} 
                        href={`/blog/${encodeURIComponent(related.slug)}`} 
                        className="group flex gap-4 p-4 rounded-2xl border border-border/50 bg-card hover:border-primary/40 hover:shadow-md transition-all duration-300"
                      >
                        {related.featured_image && (
                          <div className="w-20 h-20 shrink-0 rounded-xl overflow-hidden border border-border/50 bg-muted">
                            <img 
                              src={related.featured_image} 
                              alt={related.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0 space-y-1.5 flex flex-col justify-center">
                          <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                            {related.title}
                          </h4>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground font-medium">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {format(new Date(related.created_at), 'MMM d')}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {related.reading_time || 3}m
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Related Tools */}
              {relatedTools.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-5 bg-primary rounded-full"></div>
                    <h3 className="text-lg font-bold text-foreground">Related Tools</h3>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {relatedTools.map(t => (
                      <Link key={t.id} 
                        href={`/tool/${encodeURIComponent(t.slug)}`}
                        className="group p-4 rounded-2xl border border-border/50 bg-card hover:border-primary/40 hover:shadow-md transition-all duration-300 flex items-start gap-4"
                      >
                        <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center shrink-0 border border-primary/10 group-hover:bg-primary/10 transition-colors overflow-hidden">
                          {t.featured_image ? (
                            <img src={t.featured_image} alt={t.name} className="w-8 h-8 object-contain" />
                          ) : (
                            <DynamicIcon name={t.icon} className="w-5 h-5 text-primary" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate">{t.name}</h4>
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{t.description}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {relatedCategoryLinks.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-5 bg-primary rounded-full"></div>
                    <h3 className="text-lg font-bold text-foreground">Related Categories</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {relatedCategoryLinks.map((category) => (
                      <Link key={category.id}
                        href={`/category/${encodeURIComponent(category.slug)}`}
                        className="rounded-full border border-border/60 bg-card px-4 py-2 text-xs font-semibold text-muted-foreground hover:border-primary/50 hover:text-primary transition-all"
                      >
                        {category.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}


            </div>

            {/* Back to Blog Button */}
            <div className="pt-8 text-center">
              <Link href="/blog" scroll={true}>
                <Button variant="outline" className="rounded-full px-6 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all font-semibold text-sm">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Browse All Articles
                </Button>
              </Link>
            </div>
          </motion.article>

        </div>
      </div>
    </div>
  )
}

const DynamicIcon = ({ name, ...props }) => {
  return React.createElement(getIcon(name), props)
}

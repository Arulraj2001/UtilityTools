import React, { memo, useState } from 'react'
import Link from 'next/link';
import { motion } from 'framer-motion'
import { Clock, Calendar, ArrowRight, Star, ZoomIn, Tag } from 'lucide-react'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'

const formatDate = (value, pattern = 'MMM d, yyyy') => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return format(date, pattern)
}

function BlogCard({ post, index = 0, compact = false }) {
  const [previewOpen, setPreviewOpen] = useState(false)

  if (!post) return null

  const imageUrl = post.featured_image || post.og_image
  const publishedDate = formatDate(post.published_at || post.created_at)
  const updatedDate = formatDate(post.updated_at)
  const compactDate = formatDate(post.published_at || post.created_at, 'MMM d')
  const authorName = post.author_name || post.author || 'QuickUtils Editorial Team'

  const handlePreviewOpen = (event) => {
    event.preventDefault()
    event.stopPropagation()
    if (imageUrl) {
      setPreviewOpen(true)
    }
  }

  const primaryTag = post.tags && post.tags.length > 0 ? post.tags[0] : null
  const formatTag = (tag) => {
    if (!tag) return ''
    return tag.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }

  return (
    <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
      >
        <Link href={`/blog/${encodeURIComponent(post.slug)}`} className="group block">
          {compact ? (
            <article className="p-4 rounded-2xl bg-card border border-border/50 hover:border-primary/30 hover:shadow-xl transition-all duration-300 flex items-start gap-4 premium-card panel-highlight">
              {/* Featured Image */}
              {imageUrl ? (
                <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-border/40 shrink-0 flex items-center justify-center">
                  <img
                    src={imageUrl}
                    alt={post.title || 'Blog featured image'}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
              ) : (
                <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-900 border border-border/40 shrink-0 flex items-center justify-center">
                  <span className="text-[10px] text-muted-foreground px-1 text-center">
                    No image
                  </span>
                </div>
              )}
              {/* Content */}
              <div className="flex-1 min-w-0 flex flex-col justify-between h-20 py-0.5">
                <div>
                  <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                    {post.title}
                  </h3>
                  {post.excerpt && (
                    <p className="text-muted-foreground text-xs line-clamp-1 mt-1 leading-relaxed">
                      {post.excerpt}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1.5 border-t border-border/30">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 opacity-70" />
                    {compactDate || 'Updated'}
                  </span>
                  {post.reading_time && (
                    <span>{post.reading_time} min read</span>
                  )}
                </div>
              </div>
            </article>
          ) : (
            <article className="p-5 rounded-2xl bg-card border border-border/50 hover:border-primary/30 hover:shadow-xl transition-all duration-300 flex flex-col md:flex-row gap-6 premium-card panel-highlight">
              
              {/* Featured Image Column */}
              <div className="relative w-full md:w-56 h-40 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-border/40 shrink-0 flex items-center justify-center">
                {imageUrl ? (
                  <>
                    <img
                      src={imageUrl}
                      alt={post.title || 'Blog featured image'}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <button
                      type="button"
                      onClick={handlePreviewOpen}
                      className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/20 transition-colors group/btn"
                      aria-label="Open image preview"
                    >
                      <ZoomIn className="w-6 h-6 text-white/90 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
                    </button>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground px-2 text-center">
                    No image available
                  </span>
                )}
              </div>

              {/* Content Column */}
              <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    {/* Category Badge */}
                    {(post.blog_categories?.name || post.category) && (
                      <Badge 
                        variant="secondary" 
                        className="text-xs bg-primary/10 text-primary hover:bg-primary/20 border-0 font-medium px-2.5 py-0.5 rounded-md"
                      >
                        {post.blog_categories?.name || post.category}
                      </Badge>
                    )}
                    {/* Featured Icon */}
                    {post.is_featured && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                        <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">Featured</span>
                      </div>
                    )}
                  </div>

                  {/* Title */}
                  <h2 className="text-base sm:text-lg font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2 mb-2 leading-snug">
                    {post.title}
                  </h2>

                  {/* Excerpt */}
                  <p className="text-muted-foreground text-sm line-clamp-2 leading-relaxed mb-4">
                    {post.excerpt}
                  </p>
                </div>

                {/* Footer Metadata Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-border/30">
                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 opacity-70" />
                      {publishedDate || 'Date reviewed'}
                    </span>

                    <span>By {authorName}</span>

                    {updatedDate && updatedDate !== publishedDate && (
                      <span>Updated {updatedDate}</span>
                    )}
                    
                    {post.reading_time && (
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 opacity-70" />
                        {post.reading_time} min read
                      </span>
                    )}

                    {primaryTag && (
                      <span className="flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 opacity-70" />
                        {formatTag(primaryTag)}
                      </span>
                    )}
                  </div>

                  <div className="text-sm font-semibold text-primary flex items-center gap-1 shrink-0 group-hover:text-primary/95">
                    Read more
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

              </div>
            </article>
          )}
        </Link>
      </motion.div>

      {imageUrl && (
        <DialogContent className="max-w-5xl max-h-[90vh] p-0 bg-transparent shadow-none border-0">
          <DialogTitle className="sr-only">Enlarged image preview</DialogTitle>
          <DialogDescription className="sr-only">
            Opens a larger preview of the blog post image in a modal overlay.
          </DialogDescription>
          <div className="relative rounded-[32px] overflow-hidden bg-background shadow-2xl ring-1 ring-border/20">
            <img
              src={imageUrl}
              alt={post.title || 'Blog featured image'}
              className="w-full h-auto max-h-[85vh] object-contain"
              loading="lazy"
            />
          </div>
        </DialogContent>
      )}
    </Dialog>
  )
}

export default memo(BlogCard)

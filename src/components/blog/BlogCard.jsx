import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Clock, Calendar, ArrowRight, Star, ZoomIn } from 'lucide-react'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'

export default function BlogCard({ post, index = 0 }) {
  const [previewOpen, setPreviewOpen] = useState(false)

  if (!post) return null

  const imageUrl = post.featured_image || post.og_image

  const handlePreviewOpen = (event) => {
    event.preventDefault()
    event.stopPropagation()
    if (imageUrl) {
      setPreviewOpen(true)
    }
  }

  return (
    <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
      >
        <Link to={`/blog/${encodeURIComponent(post.slug)}`} className="group block h-full">
          <article className="h-full p-6 rounded-2xl bg-card border border-border/50 hover:border-primary/30 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col premium-card panel-highlight">
            {/* Featured Badge */}
            {post.is_featured && (
              <div className="mb-3 flex items-center gap-1">
                <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">Featured</span>
              </div>
            )}

            {/* Category Badge */}
            {(post.blog_categories?.name || post.category) && (
              <div className="mb-3">
                <Badge 
                  variant="secondary" 
                  className="text-xs bg-primary/10 text-primary hover:bg-primary/20"
                >
                  {post.blog_categories?.name || post.category}
                </Badge>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_112px] items-start mb-4">
              <div className="min-w-0">
                {/* Title */}
                <h2 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors line-clamp-2">
                  {post.title}
                </h2>

                {/* Excerpt */}
                <p className="text-muted-foreground text-sm line-clamp-2">
                  {post.excerpt}
                </p>
              </div>

              <div className="relative w-full sm:w-28 h-28 rounded-3xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-border/40 flex items-center justify-center transition-transform duration-500 group-hover:scale-[1.01]">
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
                      className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/20 transition-colors"
                      aria-label="Open image preview"
                    >
                      <ZoomIn className="w-5 h-5 text-white/90 opacity-0 transition-opacity duration-300 hover:opacity-100" />
                    </button>
                  </>
                ) : (
                  <span className="text-[11px] text-muted-foreground px-2 text-center">
                    No image available
                  </span>
                )}
              </div>
            </div>

            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-4 py-3 border-t border-border/50">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {format(new Date(post.created_at), 'MMM d, yyyy')}
              </span>
              {post.reading_time && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {post.reading_time} min read
                </span>
              )}
            </div>

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {post.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="px-2 py-0.5 text-xs bg-muted text-muted-foreground rounded-full">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Read More Link */}
            <div className="flex items-center text-sm text-primary font-medium mt-auto">
              Read more
              <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </div>
          </article>
        </Link>
      </motion.div>

      {imageUrl && (
        <DialogContent className="max-w-5xl max-h-[90vh] p-0 bg-transparent shadow-none">
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

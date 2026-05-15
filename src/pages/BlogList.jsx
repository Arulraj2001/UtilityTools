import React, { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { getBlogPosts, getBlogCategories } from '@/api/supabaseApi'
import BlogSidebar from '@/components/blog/BlogSidebar'
import BlogFilterDrawer from '@/components/blog/BlogFilterDrawer'
import BlogCard from '@/components/blog/BlogCard'

export default function BlogList() {
  const [searchParams] = useSearchParams()
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  // Get filter parameters from URL
  const activeCategory = searchParams.get('category') || ''
  const activeTags = searchParams.getAll('tag') || []
  const activeFilter = searchParams.get('filter') || ''

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['blog-published'],
    queryFn: () => getBlogPosts({ published: true, orderBy: 'created_at', ascending: false, limit: 100 }),
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['blog-categories'],
    queryFn: () => getBlogCategories({ orderBy: 'sort_order', ascending: true, limit: 100 }),
  })

  // Extract all unique tags from posts
  const allTags = useMemo(() => {
    const tagSet = new Set()
    posts.forEach(post => {
      if (post.tags && Array.isArray(post.tags)) {
        post.tags.forEach(tag => tagSet.add(tag))
      }
    })
    return Array.from(tagSet).sort()
  }, [posts])

  // Filter posts based on active filters
  const filteredPosts = useMemo(() => {
    let result = [...posts]

    // Filter by category
    if (activeCategory) {
      result = result.filter(post =>
        post.blog_categories?.slug === activeCategory
      )
    }

    // Filter by tags (AND operation - post must have all selected tags)
    if (activeTags.length > 0) {
      result = result.filter(post =>
        post.tags && activeTags.every(tag => post.tags.includes(tag))
      )
    }

    // Filter by quick filters
    if (activeFilter) {
      switch (activeFilter) {
        case 'featured':
          result = result.filter(post => post.is_featured)
          break
        case 'trending':
          result = result.sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0)).slice(0, 20)
          break
        case 'recent':
          result = result.slice(0, 10)
          break
        case 'ai-tools':
        case 'tutorials':
        case 'seo':
        case 'programming':
          // Filter by category name containing the filter keyword
          result = result.filter(post =>
            post.blog_categories?.name?.toLowerCase().includes(activeFilter.replace('-', ' '))
          )
          break
        default:
          break
      }
    }

    return result
  }, [posts, activeCategory, activeTags, activeFilter])

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold mb-2">Blog</h1>
          <p className="text-muted-foreground text-lg">Tips, tutorials, and tool guides</p>
        </div>

        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block lg:col-span-1">
            <div className="sticky top-24 rounded-2xl border border-border/50 bg-card/40 backdrop-blur p-6 space-y-6 max-h-[calc(100vh-120px)] overflow-y-auto">
              <BlogSidebar categories={categories} tags={allTags} posts={posts} />
            </div>
          </aside>

          {/* Blog Content */}
          <div className="lg:col-span-3">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Array(6)
                  .fill(0)
                  .map((_, i) => (
                    <div key={i} className="h-80 rounded-2xl bg-muted animate-pulse" />
                  ))}
              </div>
            ) : filteredPosts.length > 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                {filteredPosts.map((post, i) => (
                  <BlogCard key={post.id} post={post} index={i} />
                ))}
              </motion.div>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <h3 className="text-lg font-semibold mb-2">No blog posts found</h3>
                <p className="text-muted-foreground">Try adjusting your filters to find what you're looking for.</p>
              </div>
            )}
          </div>
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

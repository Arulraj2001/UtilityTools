'use client';
import React, { useState, useMemo, useCallback } from 'react'
import { useSearchParams as useNextSearchParams, useRouter, usePathname } from 'next/navigation'
import { X, Search, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { motion } from 'framer-motion'

function BlogSidebar({ categories = [], tags = [], posts = [], onClose = null, isMobile = false }) {
  const router = useRouter()
  const pathnameVal = usePathname()
  const searchParams = useNextSearchParams()

  const setSearchParams = (newParams) => {
    // If setting empty object
    if (Object.keys(newParams).length === 0) {
      router.push(pathnameVal)
    } else {
      router.push(`${pathnameVal}?${newParams.toString()}`)
    }
  }

  const [categorySearch, setCategorySearch] = useState('')
  const [tagSearch, setTagSearch] = useState('')

  const searchParamsString = useMemo(() => searchParams.toString(), [searchParams])

  // Get active filters from URL using stable memoization
  const activeCategory = useMemo(() => searchParams.get('category') || '', [searchParamsString])
  const activeTags = useMemo(() => searchParams.getAll('tag') || [], [searchParamsString])
  const activeTagsKey = useMemo(() => activeTags.join(','), [activeTags])

  const categoryCounts = useMemo(() => {
    return posts.reduce((counts, post) => {
      if (post.status && post.status !== 'published') return counts
      const postCategoryId = post.category_id || post.blog_categories?.id
      if (!postCategoryId) return counts
      counts[postCategoryId] = (counts[postCategoryId] || 0) + 1
      return counts
    }, {})
  }, [posts])

  // Filter categories and tags
  const filteredCategories = useMemo(() => {
    return categories.filter(cat =>
      cat.name.toLowerCase().includes(categorySearch.toLowerCase())
    )
  }, [categories, categorySearch])

  const filteredTags = useMemo(() => {
    if (!tags.length) return []
    return tags.filter(tag =>
      tag.toLowerCase().includes(tagSearch.toLowerCase())
    )
  }, [tags, tagSearch])

  const isOnBlogPage = pathnameVal === '/blog'

  const currentSearchParams = useMemo(() => new URLSearchParams(searchParams), [searchParamsString])

  const navigateToBlog = useCallback((params) => {
    const queryString = params.toString()
    const path = `/blog${queryString ? `?${queryString}` : ''}`
    if (isOnBlogPage) {
      setSearchParams(params)
    } else {
      router.push(path)
    }
  }, [isOnBlogPage, router, setSearchParams])

  const handleCategorySelect = useCallback((categorySlug) => {
    const params = new URLSearchParams(currentSearchParams)
    if (activeCategory === categorySlug) {
      params.delete('category')
    } else {
      params.set('category', categorySlug)
    }
    navigateToBlog(params)
  }, [activeCategory, currentSearchParams, navigateToBlog])

  const handleTagToggle = useCallback((tag) => {
    const params = new URLSearchParams(currentSearchParams)
    const currentTags = params.getAll('tag')

    if (currentTags.includes(tag)) {
      params.delete('tag')
      currentTags.filter(t => t !== tag).forEach(t => params.append('tag', t))
    } else {
      params.append('tag', tag)
    }
    navigateToBlog(params)
  }, [currentSearchParams, navigateToBlog])

  const handleClearFilters = useCallback(() => {
    setSearchParams({})
    setCategorySearch('')
    setTagSearch('')
  }, [setSearchParams])

  const hasActiveFilters = activeCategory || activeTags.length > 0

  const sidebarContent = (
    <div className="space-y-6">
      {/* Header with Close Button (Mobile) */}
      {isMobile && onClose && (
        <div className="flex items-center justify-between pb-4 border-b border-border/50">
          <h3 className="font-semibold">Filters</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Button
            onClick={handleClearFilters}
            variant="outline"
            size="sm"
            className="w-full gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Clear Filters
          </Button>
        </motion.div>
      )}

      {/* Categories Section */}
      {categories.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold text-sm text-foreground">Categories</h4>
          
          {categories.length > 5 && (
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search categories..."
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
          )}

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {filteredCategories.map((category) => {
              const isActive = activeCategory === category.slug
              return (
                <motion.button
                  key={category.id}
                  onClick={() => handleCategorySelect(category.slug)}
                  whileHover={{ x: 4 }}
                  className={`
                    w-full text-left px-3 py-2 rounded-lg transition-all text-sm
                    ${isActive
                      ? 'bg-primary/10 text-primary font-medium border border-primary/30'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <span>{category.name}</span>
                    <span className="text-xs rounded-full bg-muted px-2 py-0.5">
                      {categoryCounts[category.id] ?? category.post_count ?? 0}
                    </span>
                  </div>
                </motion.button>
              )
            })}
          </div>
        </div>
      )}

      {/* Tags Section */}
      {tags && tags.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold text-sm text-foreground">Tags</h4>
          
          {tags.length > 8 && (
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search tags..."
                value={tagSearch}
                onChange={(e) => setTagSearch(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
          )}

          <div className="flex flex-wrap gap-2 max-h-56 overflow-y-auto">
            {filteredTags.map((tag) => {
              const isActive = activeTags.includes(tag)
              return (
                <motion.button
                  key={tag}
                  onClick={() => handleTagToggle(tag)}
                  whileHover={{ scale: 1.05 }}
                  className={`
                    px-3 py-1 rounded-full text-xs transition-all font-medium
                    ${isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                    }
                  `}
                >
                  {tag}
                </motion.button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )

  return sidebarContent
}

export default React.memo(BlogSidebar)

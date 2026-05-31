import React, { useMemo, useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { getBlogPosts, getBlogCategories } from '@/api/supabaseApi'
import { filterPosts } from '@/lib/blogFilterUtils'
import BlogSidebar from '@/components/blog/BlogSidebar'
import { mergeBlogCategories, mergeBlogPosts } from '@/lib/staticBlogPosts'
import BlogFilterDrawer from '@/components/blog/BlogFilterDrawer'
import BlogCard from '@/components/blog/BlogCard'
import StaticPageSEO, { SITE_URL, buildBreadcrumbSchema } from '@/components/seo/StaticPageSEO'

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

const blogQuickLinks = [
  { to: '/tool/sgpa-calculator', label: 'SGPA Calculator' },
  { to: '/tool/image-compressor', label: 'Image Compressor' },
  { to: '/tool/merge-pdf', label: 'Merge PDF' },
  { to: '/tool/json-formatter', label: 'JSON Formatter' },
  { to: '/category/pdf-tools', label: 'PDF Tools' },
  { to: '/category/image-tools', label: 'Image Tools' },
]

export default function BlogList() {
  const [searchParams] = useSearchParams()
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  // Get filter parameters from URL
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

  useEffect(() => {
    if (activeCategory || activeTags.length > 0) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [activeCategory, activeTagsKey])

  // Filter posts using a stable derived pipeline
  const filteredPosts = useMemo(() => {
    return filterPosts(posts, {
      category: activeCategory,
      tags: activeTags,
    })
  }, [posts, activeCategory, activeTagsKey])

  return (
    <>
      <StaticPageSEO
        title="QuickUtils Blog - Practical Guides for Online Tools"
        description={blogDescription}
        path="/blog"
        ogTitle="QuickUtils Blog - Tool Guides and Practical Tutorials"
        ogDescription="Learn how to use calculators, PDF tools, image tools, text tools, and developer utilities with clear examples."
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
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-3">QuickUtils Blog</h1>
            <p className="text-muted-foreground text-lg max-w-3xl leading-relaxed">
              Practical guides that help you understand calculators, PDF tools, image tools,
              text tools, developer utilities, and everyday productivity workflows before you
              use the tools.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {blogQuickLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="rounded-full border border-border/60 bg-card px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
                >
                  {link.label}
                </Link>
              ))}
            </div>
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
              <div className="mb-5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Browse by category or tag:</span>
                <span>use the filters to find student, image, PDF, writing, and developer guides.</span>
              </div>
              {isLoading && posts.length === 0 ? (
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
    </>
  )
}

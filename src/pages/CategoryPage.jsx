import React, { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import { getCategories, getTools } from '@/api/supabaseApi'
import ToolCard from '../components/shared/ToolCard'

export default function CategoryPage() {
  const { slug } = useParams()

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => getCategories({ orderBy: 'sort_order', ascending: true, limit: 200 }),
  })

  const { data: tools = [] } = useQuery({
    queryKey: ['tools-published'],
    queryFn: () => getTools({ published: true, orderBy: 'sort_order', ascending: true, limit: 200 }),
  })

  const category = useMemo(() => categories.find(c => c.slug === slug), [categories, slug])
  const categoryTools = useMemo(() => tools.filter(t => t.category_id === category?.id), [tools, category])

  if (categories.length > 0 && !category) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <p className="text-2xl font-bold mb-2">Category not found</p>
        <p className="text-muted-foreground mb-6">This category doesn't exist.</p>
        <Link to="/categories" className="text-primary hover:underline">Browse all categories</Link>
      </div>
    )
  }

  if (!category) {
    return <div className="max-w-7xl mx-auto px-4 py-20 text-center text-muted-foreground">Loading...</div>
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link to="/categories" className="hover:text-foreground transition-colors">Categories</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-foreground">{category.name}</span>
      </nav>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold mb-2">{category.name}</h1>
        <p className="text-muted-foreground mb-8">{category.description || `Browse all ${category.name} tools`}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {categoryTools.map((tool, i) => (
            <ToolCard key={tool.id} tool={tool} index={i} categoryName={category.name} />
          ))}
        </div>

        {categoryTools.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">No tools in this category yet.</div>
        )}
      </motion.div>
    </div>
  )
}

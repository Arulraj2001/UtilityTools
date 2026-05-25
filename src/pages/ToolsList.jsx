import React, { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Filter } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getTools, getCategories } from '@/api/supabaseApi'
import { trackWorkflowSearch } from '@/lib/analytics'
import ToolCard from '../components/shared/ToolCard'
import AdBanner from '../components/shared/AdBanner'

export default function ToolsList() {
  const [search, setSearch] = useState(() => new URLSearchParams(window.location.search).get('q') || '')
  const [selectedCategory, setSelectedCategory] = useState('all')

  const { data: tools = [], isLoading } = useQuery({
    queryKey: ['tools-published'],
    queryFn: () => getTools({ published: true, orderBy: 'sort_order', ascending: true, limit: 200 }),
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => getCategories({ orderBy: 'sort_order', ascending: true, limit: 50 }),
  })

  const filtered = useMemo(() => {
    return tools.filter(tool => {
      const matchesSearch = !search ||
        tool.name?.toLowerCase().includes(search.toLowerCase()) ||
        tool.description?.toLowerCase().includes(search.toLowerCase())
      const matchesCat = selectedCategory === 'all' || tool.category_id === selectedCategory
      return matchesSearch && matchesCat
    })
  }, [tools, search, selectedCategory])

  useEffect(() => {
    if (!search.trim()) return

    const timer = setTimeout(() => {
      trackWorkflowSearch({
        query: search.trim(),
        resultCount: filtered.length,
        source: selectedCategory === 'all' ? 'tools_list' : 'tools_list_category',
      })
    }, 800)

    return () => clearTimeout(timer)
  }, [search, filtered.length, selectedCategory])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">All Tools</h1>
        <p className="text-muted-foreground">Browse our complete collection of free online tools</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tools..."
            className="pl-10 h-11 rounded-xl"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-48 h-11 rounded-xl">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array(8).fill(0).map((_, i) => (
            <div key={i} className="h-48 rounded-3xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground mb-5">{filtered.length} tools found</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((tool, i) => {
              const cat = categories.find(c => c.id === tool.category_id)
              return (
                <React.Fragment key={tool.id}>
                  <ToolCard tool={tool} index={i} categoryName={cat?.name} />
                  {(i + 1) % 8 === 0 && <div className="col-span-full"><AdBanner placement="in_content" /></div>}
                </React.Fragment>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

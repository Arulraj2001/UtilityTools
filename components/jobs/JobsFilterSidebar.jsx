'use client';
import React, { useMemo } from 'react'
import { useSearchParams as useNextSearchParams, useRouter, usePathname } from 'next/navigation'
import { useJobCategories } from '@/hooks/jobs/useJobCategories'
import { Button } from '@/components/ui/button'

const quickFilters = [
  { key: 'featured', label: 'Featured' },
  { key: 'recent', label: 'Recent' },
  { key: 'freshers', label: 'Freshers' },
  { key: 'remote', label: 'Remote' },
  { key: 'government', label: 'Government' },
  { key: 'private', label: 'Private' },
  { key: 'tech', label: 'Tech' },
]

export default function JobsFilterSidebar({ onClear = () => {} }) {
  const { data: categories = [] } = useJobCategories()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useNextSearchParams()

  const setSearchParams = (newParams) => {
    router.push(`${pathname}?${newParams.toString()}`)
  }

  const selectedCategory = searchParams.get('category') || ''
  const activeFilters = useMemo(
    () => quickFilters.filter((filter) => searchParams.has(filter.key)),
    [searchParams]
  )

  const handleCategorySelect = (slug) => {
    const params = new URLSearchParams(searchParams)
    if (!slug) {
      params.delete('category')
    } else {
      params.set('category', slug)
    }
    setSearchParams(params)
  }

  const toggleFilter = (key) => {
    const params = new URLSearchParams(searchParams)
    if (params.has(key)) {
      params.delete(key)
    } else {
      params.set(key, '1')
    }
    setSearchParams(params)
  }

  const clearFilters = () => {
    const params = new URLSearchParams(searchParams)
    params.delete('featured')
    params.delete('recent')
    params.delete('freshers')
    params.delete('remote')
    params.delete('government')
    params.delete('private')
    params.delete('tech')
    if (onClear) onClear()
    setSearchParams(params)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-card p-4">
        <div className="flex items-center justify-between gap-2">
          <h4 className="font-semibold">Categories</h4>
          <Button variant="ghost" size="sm" onClick={() => handleCategorySelect('')}>All</Button>
        </div>
        <div className="mt-3 grid gap-2">
          {categories.slice(0, 12).map((c) => (
            <Button
              key={c.id}
              variant={selectedCategory === c.slug ? 'secondary' : 'ghost'}
              onClick={() => handleCategorySelect(c.slug)}
              className="justify-start text-sm"
            >
              <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: c.color }} />
              {c.name}
            </Button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h4 className="font-semibold">Quick Filters</h4>
            <p className="text-xs text-muted-foreground mt-1">Tap to toggle</p>
          </div>
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear
          </Button>
        </div>
        <div className="mt-3 grid gap-2">
          {quickFilters.map((filter) => (
            <Button
              key={filter.key}
              variant={searchParams.has(filter.key) ? 'secondary' : 'ghost'}
              onClick={() => toggleFilter(filter.key)}
              className="justify-start text-sm"
            >
              {filter.label}
            </Button>
          ))}
        </div>
        {activeFilters.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
            {activeFilters.map((filter) => (
              <span key={filter.key} className="inline-flex items-center gap-1 rounded-full border px-2 py-1 bg-muted/50">
                {filter.label}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

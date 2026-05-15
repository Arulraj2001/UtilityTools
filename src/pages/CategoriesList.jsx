import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { getCategories, getTools } from '@/api/supabaseApi'
import CategoriesGrid from '../components/home/CategoriesGrid'

export default function CategoriesList() {
  const {
    data: tools = [],
    isLoading: isLoadingTools,
  } = useQuery({
    queryKey: ['tools-published'],
    queryFn: () => getTools({ published: true, orderBy: 'created_at', ascending: false, limit: 500 }),
    retry: false,
  })

  const {
    data: categories = [],
    isLoading: isLoadingCategories,
  } = useQuery({
    queryKey: ['categories'],
    queryFn: () => getCategories({ orderBy: 'sort_order', ascending: true, limit: 50 }),
    retry: false,
  })

  if (isLoadingTools || isLoadingCategories) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 min-h-[60vh] flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading categories…</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-3xl font-bold mb-2">All Categories</h1>
      <p className="text-muted-foreground mb-8">Browse tools by category</p>
      <CategoriesGrid categories={categories} tools={tools} />
    </div>
  )
}

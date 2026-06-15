'use client';
import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PREBUILT_TOOLS } from '@/lib/toolsData'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Download, CheckCircle, Loader2, AlertCircle, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { getCategories, getToolsAll, createTool, createCategory, deleteTool } from '@/api/supabaseApi'

const CATEGORY_DEFAULTS = {
  finance: { name: 'Finance', slug: 'finance', description: 'Finance tools for calculations and money management.', icon: 'IndianRupee', color: '#0f766e', sort_order: 10, is_featured: true, tool_count: 0 },
  education: { name: 'Education', slug: 'education', description: 'Education and learning tools for students and teachers.', icon: 'GraduationCap', color: '#2563eb', sort_order: 20, is_featured: true, tool_count: 0 },
  'text-tools': { name: 'Text Tools', slug: 'text-tools', description: 'Text processing tools for formatting, counting, and converting text.', icon: 'TextCursorInput', color: '#9333ea', sort_order: 30, is_featured: true, tool_count: 0 },
  'developer-tools': { name: 'Developer Tools', slug: 'developer-tools', description: 'Developer utilities for code and web development.', icon: 'Terminal', color: '#047857', sort_order: 40, is_featured: true, tool_count: 0 },
  'daily-life': { name: 'Daily Life', slug: 'daily-life', description: 'Everyday tools for schedules, utilities, and small tasks.', icon: 'Sparkles', color: '#ea580c', sort_order: 50, is_featured: true, tool_count: 0 },
  'pdf-tools': { name: 'PDF Tools', slug: 'pdf-tools', description: 'PDF manipulation tools for merging, splitting, converting, and editing PDFs.', icon: 'FileText', color: '#dc2626', sort_order: 60, is_featured: true, tool_count: 0 },
  'image-tools': { name: 'Image Tools', slug: 'image-tools', description: 'Tools for resizing, converting, analyzing and optimizing images.', icon: 'Image', color: '#2563eb', sort_order: 55, is_featured: true, tool_count: 0 },
  'government-exam-tools': { name: 'Government Exam Tools', slug: 'government-exam-tools', description: 'Tools for government exam photo, document, and PDF preparation.', icon: 'FileBadge', color: '#0f766e', sort_order: 65, is_featured: true, tool_count: 0 },
  'health-fitness': { name: 'Health & Fitness Tools', slug: 'health-fitness', description: 'Free online health and fitness calculators for body measurements, calories, sleep, pregnancy tracking and wellness planning.', icon: 'HeartPulse', color: '#ef4444', sort_order: 70, is_featured: true, tool_count: 0 },
  'relationship-tools': { name: 'Relationship & Lifestyle Tools', slug: 'relationship-tools', description: 'Fun viral relationship, compatibility and lifestyle calculators with share-worthy love meters, zodiac sparks, friendship scores and baby name numerology.', icon: 'Heart', color: '#ec4899', sort_order: 75, is_featured: true, tool_count: 0 },
  'creator-tools': { name: 'Creator & Social Media Tools', slug: 'creator-tools', description: 'Professional creator economy tools for YouTube, Instagram, TikTok, social media analytics and creator growth.', icon: 'Youtube', color: '#ff0000', sort_order: 76, is_featured: true, tool_count: 0 },
  'ecommerce-seller-tools': { name: 'E-commerce Seller Tools', slug: 'ecommerce-seller-tools', description: 'Seller-focused e-commerce calculators and operational tools for Amazon, Flipkart, pricing, inventory, invoices, ROI and profit estimation.', icon: 'ShoppingBag', color: '#0ea5e9', sort_order: 79, is_featured: true, tool_count: 0 },
  'date-time-tools': { name: 'Date & Time Tools', slug: 'date-time-tools', description: 'Free online date and time calculators, converters and productivity tools for schedules, business days, timestamps and timezone calculations.', icon: 'Clock3', color: '#0d9488', sort_order: 80, is_featured: true, tool_count: 0 },
  'seo-tools': { name: 'SEO Tools', slug: 'seo-tools', description: 'Professional SEO tools for meta tags, structured data, sitemaps, minification, keyword analysis and technical optimization.', icon: 'SearchCode', color: '#059669', sort_order: 90, is_featured: true, tool_count: 0 },
  'logistics-shipping': { name: 'Logistics & Shipping Tools', slug: 'logistics-shipping', description: 'Industry-ready logistics calculators for parcel dimensions, volumetric weight, CBM and chargeable shipping weight.', icon: 'Package', color: '#0f766e', sort_order: 95, is_featured: true, tool_count: 0 },
}

export default function AdminToolSeeder() {
  const [seeding, setSeeding] = useState(false)
  const [seeded, setSeeded] = useState([])
  const [errors, setErrors] = useState([])
  const queryClient = useQueryClient()

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => getCategories({ orderBy: 'sort_order', ascending: true, limit: 200 }),
  })

  const { data: existingTools = [] } = useQuery({
    queryKey: ['tools-all'],
    queryFn: () => getToolsAll({ orderBy: 'created_at', ascending: false, limit: 200 }),
  })

  const existingSlugs = new Set(existingTools.map(t => t.slug))
  const catMap = Object.fromEntries(categories.map(c => [c.slug, c.id]))

  const seedAll = async () => {
    setSeeding(true)
    setSeeded([])
    setErrors([])

    const toCreate = PREBUILT_TOOLS.filter(t => !existingSlugs.has(t.slug))
    const missingSlugs = [...new Set(toCreate.map(t => t.category_slug).filter((slug) => !catMap[slug]))]
    const seededSlugs = []
    const errorSlugs = []

    for (const slug of missingSlugs) {
      const defaultCategory = CATEGORY_DEFAULTS[slug] || {
        name: slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        slug,
        description: `Category for ${slug.replace(/-/g, ' ')}`,
        icon: 'Folder',
        color: '#64748b',
        sort_order: 100,
        is_featured: false,
        tool_count: 0,
      }

      try {
        const createdCategory = await createCategory(defaultCategory)
        const newCategory = Array.isArray(createdCategory) ? createdCategory[0] : createdCategory
        if (newCategory?.id) {
          catMap[slug] = newCategory.id
        }
      } catch (error) {
        toast.error(`Could not create category ${slug}: ${error.message || error}`)
        errorSlugs.push(`category:${slug}`)
      }
    }

    for (const toolDef of toCreate) {
      const { category_slug, ...rest } = toolDef
      const category_id = catMap[category_slug]
      if (!category_id) {
        errorSlugs.push(toolDef.slug)
        toast.error(`Skipping ${toolDef.slug}: category ${category_slug} not found`)
        continue
      }

      try {
        await createTool({
          ...rest,
          category_id,
          formula_config: rest.formula_config || {},
        })
        seededSlugs.push(toolDef.slug)
      } catch (error) {
        console.error('Seed tool failed', toolDef.slug, error)
        errorSlugs.push(toolDef.slug)
        toast.error(`Failed to seed ${toolDef.slug}: ${error.message || error}`)
      }
    }

    setSeeded(seededSlugs)
    setErrors(errorSlugs)
    queryClient.invalidateQueries({ queryKey: ['tools-all'] })
    queryClient.invalidateQueries({ queryKey: ['tools-published'] })
    queryClient.invalidateQueries({ queryKey: ['tool-by-slug'] })
    setSeeding(false)
    const successCount = seededSlugs.length
    toast.success(`Seed complete: ${successCount} tools imported, ${errorSlugs.length} failures.`)
  }

  const deleteAll = async () => {
    if (!confirm(`Delete ALL ${existingTools.length} tools? This cannot be undone.`)) return
    for (const t of existingTools) {
      await deleteTool(t.id)
    }
    queryClient.invalidateQueries({ queryKey: ['tools-all'] })
    queryClient.invalidateQueries({ queryKey: ['tools-published'] })
    queryClient.invalidateQueries({ queryKey: ['tool-by-slug'] })
    toast.success('All tools deleted')
  }

  const newTools = PREBUILT_TOOLS.filter(t => !existingSlugs.has(t.slug))

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">Tool Seeder</h1>
        <p className="text-muted-foreground text-sm">Import prebuilt production-ready tools into the database.</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 rounded-xl border border-border bg-card text-center">
          <p className="text-2xl font-bold text-primary">{PREBUILT_TOOLS.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Prebuilt Tools</p>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card text-center">
          <p className="text-2xl font-bold text-green-500">{existingTools.length}</p>
          <p className="text-xs text-muted-foreground mt-1">In Database</p>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card text-center">
          <p className="text-2xl font-bold text-accent">{newTools.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Ready to Import</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 mb-6 sm:flex-row">
        <Button onClick={seedAll} disabled={seeding || newTools.length === 0} className="rounded-xl gap-2">
          {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {seeding ? 'Seeding…' : `Import ${newTools.length} Tools`}
        </Button>
        {existingTools.length > 0 && (
          <Button variant="destructive" onClick={deleteAll} className="rounded-xl gap-2">
            <Trash2 className="w-4 h-4" /> Delete All Tools
          </Button>
        )}
      </div>

      {errors.length > 0 && (
        <div className="mb-6 rounded-xl border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
          <p className="font-medium">Seeding errors:</p>
          <p>{errors.join(', ')}</p>
        </div>
      )}

      <div className="space-y-2">
        {PREBUILT_TOOLS.map((tool, i) => {
          const exists = existingSlugs.has(tool.slug)
          const justSeeded = seeded.includes(tool.slug)
          const hasError = errors.includes(tool.slug)
          return (
            <motion.div
              key={tool.slug}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.02 }}
              className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card"
            >
              <div className="flex-1">
                <p className="text-sm font-medium">{tool.name}</p>
                <p className="text-xs text-muted-foreground">/tool/{tool.slug}</p>
              </div>
              <Badge variant="secondary" className="text-xs">{tool.category_slug}</Badge>
              {exists && !justSeeded && <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />}
              {justSeeded && <CheckCircle className="w-4 h-4 text-green-500 shrink-0 animate-bounce" />}
              {hasError && <AlertCircle className="w-4 h-4 text-destructive shrink-0" />}
              {!exists && !justSeeded && !hasError && (
                <div className="w-4 h-4 rounded-full border-2 border-muted shrink-0" />
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

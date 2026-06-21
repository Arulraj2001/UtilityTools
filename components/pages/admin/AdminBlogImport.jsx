'use client';
import React, { useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useDropzone } from 'react-dropzone'
import { toast } from 'sonner'
import { format } from 'date-fns'
import {
  Upload, FileSpreadsheet, FileJson, FileCode, FileText,
  CheckCircle2, XCircle, AlertTriangle, Download, Trash2,
  RotateCcw, RefreshCw, ArrowRight, ArrowLeft, BarChart3,
  ChevronDown, ChevronUp, Eye, EyeOff,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  getBlogPosts, getBlogCategories,
  checkExistingBlogSlugs, bulkCreateBlogPosts,
  updateBlogPost,
  createImportHistory, getImportHistory, updateImportHistory,
  deleteImportHistory, rollbackImport,
} from '@/api/supabaseApi'
import { supabase } from '@/api/supabaseClient'
import {
  parseExcelFile, parseCsvFile, parseJsonFile, parseHtmlFile,
  processImportData, prepareForInsert,
} from '@/lib/blogImportEngine'
import {
  exportToExcel, exportToCsv, exportToJson, exportToHtml, downloadTemplate,
} from '@/lib/blogExportEngine'

// ── Helpers ───────────────────────────────────────────────────────────────────

const FILE_ICONS = {
  xlsx: FileSpreadsheet,
  csv: FileText,
  json: FileJson,
  html: FileCode,
}

const getFileType = (name) => {
  const ext = String(name).split('.').pop().toLowerCase()
  if (['xlsx', 'xls'].includes(ext)) return 'xlsx'
  if (ext === 'csv') return 'csv'
  if (ext === 'json') return 'json'
  if (['html', 'htm'].includes(ext)) return 'html'
  return null
}

const StatCard = ({ label, value, color = 'text-foreground' }) => (
  <div className="rounded-xl border border-border bg-card p-4 text-center">
    <p className={`text-2xl font-bold ${color}`}>{value}</p>
    <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
  </div>
)

const StepIndicator = ({ current }) => {
  const steps = ['Upload', 'Review', 'Import', 'Done']
  return (
    <div className="flex items-center gap-2 mb-6">
      {steps.map((label, idx) => {
        const num = idx + 1
        const done = current > num
        const active = current === num
        return (
          <React.Fragment key={label}>
            <div className="flex items-center gap-1.5">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors
                ${done ? 'bg-primary border-primary text-primary-foreground'
                  : active ? 'border-primary text-primary'
                  : 'border-border text-muted-foreground'}`}>
                {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : num}
              </div>
              <span className={`text-sm hidden sm:block ${active ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                {label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div className={`flex-1 h-0.5 rounded-full ${done ? 'bg-primary' : 'bg-border'}`} />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AdminBlogImport() {
  const queryClient = useQueryClient()

  // Import wizard state
  const [step, setStep] = useState(1)        // 1=upload, 2=review, 3=importing, 4=done
  const [rawFile, setRawFile] = useState(null)
  const [fileType, setFileType] = useState(null)
  const [validationResult, setValidationResult] = useState(null)
  const [rowFilter, setRowFilter] = useState('all')
  const [expandedErrors, setExpandedErrors] = useState({})
  const [importOptions, setImportOptions] = useState({
    duplicateAction: 'skip',   // 'skip' | 'overwrite'
    statusOverride: 'keep',    // 'keep' | 'draft' | 'published'
  })
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [importResult, setImportResult] = useState(null)
  const [isImporting, setIsImporting] = useState(false)

  // Export state
  const [exportFilter, setExportFilter] = useState('all')
  const [exportCategory, setExportCategory] = useState('')
  const [exportFormat, setExportFormat] = useState('xlsx')

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: categories = [] } = useQuery({
    queryKey: ['blog-categories'],
    queryFn: () => getBlogCategories(),
  })

  const { data: allPosts = [], isLoading: postsLoading } = useQuery({
    queryKey: ['all-posts'],
    queryFn: () => getBlogPosts({ published: false, limit: 5000 }),
  })

  const { data: importHistory = [], refetch: refetchHistory } = useQuery({
    queryKey: ['import-history'],
    queryFn: () => getImportHistory({ limit: 50 }),
    retry: false,
  })

  // ── File parsing ───────────────────────────────────────────────────────────

  const parseFile = useCallback(async (file) => {
    const type = getFileType(file.name)
    if (!type) {
      toast.error('Unsupported format. Use .xlsx, .csv, .json, or .html')
      return
    }
    setRawFile(file)
    setFileType(type)

    try {
      let rows = []

      if (type === 'xlsx') {
        const buf = await file.arrayBuffer()
        rows = parseExcelFile(buf)
      } else if (type === 'csv') {
        const text = await file.text()
        rows = parseCsvFile(text)
      } else if (type === 'json') {
        const text = await file.text()
        rows = parseJsonFile(text)
      } else if (type === 'html') {
        const text = await file.text()
        rows = parseHtmlFile(text)
      }

      if (rows.length === 0) {
        toast.error('No data rows found in file')
        return
      }

      // Check existing slugs in DB
      const slugs = rows.map((r) => r.slug).filter(Boolean)
      const existing = slugs.length ? await checkExistingBlogSlugs(slugs) : []
      const existingSlugsList = existing.map((p) => p.slug)

      // Validate & generate
      const result = processImportData(rows, categories, existingSlugsList, allPosts)
      setValidationResult(result)
      setStep(2)
    } catch (err) {
      console.error('Parse error:', err)
      toast.error(`Parse failed: ${err.message}`)
    }
  }, [categories, allPosts])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: ([file]) => { if (file) parseFile(file) },
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
      'application/json': ['.json'],
      'text/html': ['.html', '.htm'],
    },
    multiple: false,
    maxSize: 10 * 1024 * 1024,
    onDropRejected: ([rej]) => {
      if (rej.errors[0]?.code === 'file-too-large') toast.error('File exceeds 10 MB limit')
      else toast.error(`Rejected: ${rej.errors[0]?.message}`)
    },
  })

  // ── Import execution ───────────────────────────────────────────────────────

  const handleImport = async () => {
    if (!validationResult) return

    const rows = validationResult.rows
    const toImport = rows.filter((r) => {
      if (!r._isValid) return false
      if (r._isDuplicate && importOptions.duplicateAction === 'skip') return false
      return true
    })

    if (toImport.length === 0) {
      toast.error('No valid posts to import after applying options')
      return
    }

    setStep(3)
    setProgress({ current: 0, total: toImport.length })
    setIsImporting(true)

    let historyId = null
    const importedIds = []
    const errors = []
    let imported = 0
    let updated = 0
    let skipped = 0

    try {
      // Record start of import (table may not exist yet — degrade gracefully)
      try {
        const hist = await createImportHistory({
          filename: rawFile?.name,
          file_type: fileType,
          total_rows: rows.length,
          status: 'processing',
          options: importOptions,
        })
        historyId = hist?.[0]?.id ?? null
      } catch { /* table not created yet */ }

      // Split into new posts and duplicates
      const newPosts = toImport.filter((r) => !r._isDuplicate)
      const overwritePosts = toImport.filter(
        (r) => r._isDuplicate && importOptions.duplicateAction === 'overwrite'
      )

      // ── Batch-insert new posts ──────────────────────────────────────────
      if (newPosts.length) {
        const prepared = newPosts.map((r) => {
          const p = prepareForInsert(r)
          if (importOptions.statusOverride !== 'keep') p.status = importOptions.statusOverride
          return p
        })

        const { inserted, errors: batchErrors } = await bulkCreateBlogPosts(
          prepared,
          (n) => setProgress((prev) => ({ ...prev, current: Math.min(prev.current + n, toImport.length) }))
        )
        inserted.forEach((d) => importedIds.push(d.id))
        imported += inserted.length
        errors.push(...batchErrors)
      }

      // ── Overwrite duplicates one-by-one ────────────────────────────────
      for (const row of overwritePosts) {
        try {
          const post = prepareForInsert(row)
          if (importOptions.statusOverride !== 'keep') post.status = importOptions.statusOverride

          const { data: existing } = await supabase
            .from('blog_posts')
            .select('id')
            .eq('slug', post.slug)
            .maybeSingle()

          if (existing?.id) {
            await updateBlogPost(existing.id, post)
            updated++
          } else {
            skipped++
          }
        } catch (err) {
          errors.push({ title: row.title, error: err.message })
        }
        setProgress((prev) => ({ ...prev, current: Math.min(prev.current + 1, toImport.length) }))
      }

      // Update history
      try {
        if (historyId) {
          await updateImportHistory(historyId, {
            status: errors.length === toImport.length ? 'failed' : 'completed',
            imported,
            updated,
            skipped,
            failed: errors.length,
            errors: errors.slice(0, 100),
            imported_ids: importedIds,
          })
          refetchHistory()
        }
      } catch { /* silent */ }

      setImportResult({ imported, updated, skipped, failed: errors.length, errors, importedIds, historyId })
      queryClient.invalidateQueries({ queryKey: ['all-posts'] })
      toast.success(`Import complete: ${imported} created, ${updated} updated`)
    } catch (err) {
      toast.error(`Import failed: ${err.message}`)
    } finally {
      setStep(4)
      setIsImporting(false)
    }
  }

  // ── Rollback ───────────────────────────────────────────────────────────────

  const handleRollback = async (histId, ids) => {
    if (!ids?.length) { toast.error('No posts to rollback'); return }
    if (!confirm(`Delete ${ids.length} imported post(s)? This cannot be undone.`)) return
    try {
      await rollbackImport(histId, ids)
      toast.success(`Rolled back ${ids.length} post(s)`)
      queryClient.invalidateQueries({ queryKey: ['all-posts'] })
      refetchHistory()
    } catch (err) {
      toast.error(`Rollback failed: ${err.message}`)
    }
  }

  const handleDeleteHistory = async (id) => {
    if (!confirm('Remove this import record?')) return
    try {
      await deleteImportHistory(id)
      refetchHistory()
      toast.success('Record removed')
    } catch (err) {
      toast.error(err.message)
    }
  }

  // ── Export ─────────────────────────────────────────────────────────────────

  const handleExport = () => {
    let posts = allPosts
    if (exportFilter === 'published') posts = allPosts.filter((p) => p.status === 'published')
    else if (exportFilter === 'draft') posts = allPosts.filter((p) => p.status !== 'published')
    else if (exportFilter === 'category' && exportCategory) {
      posts = allPosts.filter((p) => p.category_id === exportCategory)
    }

    if (!posts.length) { toast.error('No posts match the selected filter'); return }

    const stamp = format(new Date(), 'yyyy-MM-dd')
    const base = `blog-posts-${stamp}`
    try {
      if (exportFormat === 'xlsx') exportToExcel(posts, `${base}.xlsx`)
      else if (exportFormat === 'csv') exportToCsv(posts, `${base}.csv`)
      else if (exportFormat === 'json') exportToJson(posts, `${base}.json`)
      else if (exportFormat === 'html') exportToHtml(posts, `${base}.html`)
      toast.success(`Exported ${posts.length} posts as ${exportFormat.toUpperCase()}`)
    } catch (err) {
      toast.error(`Export failed: ${err.message}`)
    }
  }

  // ── Reset wizard ───────────────────────────────────────────────────────────

  const resetImport = () => {
    setStep(1)
    setRawFile(null)
    setFileType(null)
    setValidationResult(null)
    setImportResult(null)
    setProgress({ current: 0, total: 0 })
    setRowFilter('all')
    setExpandedErrors({})
  }

  // ── Derived state ──────────────────────────────────────────────────────────

  const rows = validationResult?.rows ?? []
  const filteredRows = rows.filter((r) => {
    if (rowFilter === 'valid')     return r._isValid && !r._isDuplicate
    if (rowFilter === 'error')     return !r._isValid
    if (rowFilter === 'duplicate') return r._isDuplicate
    return true
  })

  const FileIcon = FILE_ICONS[fileType] ?? FileText
  const progressPct = progress.total ? Math.round((progress.current / progress.total) * 100) : 0

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Blog Import &amp; Export</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Bulk-import posts from Excel, CSV, JSON, or HTML — or export existing posts for backup or editing.
        </p>
      </div>

      <Tabs defaultValue="import">
        <TabsList className="mb-6">
          <TabsTrigger value="import">
            <Upload className="w-4 h-4 mr-2" />Import
          </TabsTrigger>
          <TabsTrigger value="export">
            <Download className="w-4 h-4 mr-2" />Export
          </TabsTrigger>
          <TabsTrigger value="history">
            <BarChart3 className="w-4 h-4 mr-2" />History
          </TabsTrigger>
        </TabsList>

        {/* ══════════════════ IMPORT TAB ══════════════════ */}
        <TabsContent value="import">
          <StepIndicator current={step} />

          {/* ── Step 1: Upload ─────────────────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-4">
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors
                  ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30'}`}
              >
                <input {...getInputProps()} />
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium mb-1">
                  {isDragActive ? 'Drop your file here' : 'Drop a file or click to browse'}
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Supports <strong>.xlsx</strong>, <strong>.csv</strong>,{' '}
                  <strong>.json</strong>, <strong>.html</strong> — max 10 MB
                </p>
                <Button variant="outline" className="rounded-xl">Browse files</Button>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">or</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-sm font-medium mb-2">Download import template</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Get a blank Excel template with all supported columns pre-filled as headers.
                </p>
                <Button variant="outline" size="sm" className="rounded-xl" onClick={downloadTemplate}>
                  <Download className="w-3.5 h-3.5 mr-2" />
                  Download Template (.xlsx)
                </Button>
              </div>

              {/* Supported columns reference */}
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-sm font-medium mb-2">Supported columns</p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Title','Slug','Category','Excerpt','Content HTML',
                    'Author Name','Author Title','Author Bio','Author Image',
                    'SEO Title','SEO Description','SEO Keywords',
                    'Open Graph Title','Open Graph Description','OG Image',
                    'Twitter Title','Twitter Description',
                    'Canonical URL','Featured Image URL',
                    'Schema Type','Meta Robots','FAQ JSON',
                    'Status','Featured','Tags',
                  ].map((col) => (
                    <Badge key={col} variant="secondary" className="text-xs font-normal">{col}</Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Column names are flexible — spaces, underscores, or case variations all work.
                </p>
              </div>
            </div>
          )}

          {/* ── Step 2: Review ─────────────────────────────────────────────── */}
          {step === 2 && validationResult && (
            <div className="space-y-5">
              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label="Total rows" value={validationResult.totalRows} />
                <StatCard label="Valid" value={validationResult.totalValid} color="text-green-500" />
                <StatCard label="Errors" value={validationResult.totalInvalid} color="text-destructive" />
                <StatCard label="Duplicates" value={validationResult.totalDuplicates} color="text-yellow-500" />
              </div>

              {/* File info bar */}
              <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3">
                <FileIcon className="w-5 h-5 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium truncate flex-1">{rawFile?.name}</span>
                <Badge variant="outline" className="uppercase text-xs">{fileType}</Badge>
                <Button variant="ghost" size="sm" onClick={resetImport} className="rounded-xl">
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Change file
                </Button>
              </div>

              {/* Import options */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-4">
                <p className="text-sm font-medium">Import Options</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">When a duplicate slug is found</Label>
                    <Select
                      value={importOptions.duplicateAction}
                      onValueChange={(v) => setImportOptions((prev) => ({ ...prev, duplicateAction: v }))}
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="skip">Skip duplicate</SelectItem>
                        <SelectItem value="overwrite">Overwrite existing post</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Post status override</Label>
                    <Select
                      value={importOptions.statusOverride}
                      onValueChange={(v) => setImportOptions((prev) => ({ ...prev, statusOverride: v }))}
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="keep">Keep status from file</SelectItem>
                        <SelectItem value="draft">Force all to Draft</SelectItem>
                        <SelectItem value="published">Force all to Published</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Row filter + table */}
              <div className="rounded-xl border border-border overflow-hidden bg-card">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
                  <span className="text-sm font-medium flex-1">Preview</span>
                  <div className="flex gap-1">
                    {[
                      { label: 'All', value: 'all' },
                      { label: 'Valid', value: 'valid' },
                      { label: 'Errors', value: 'error' },
                      { label: 'Duplicates', value: 'duplicate' },
                    ].map(({ label, value }) => (
                      <Button
                        key={value}
                        variant={rowFilter === value ? 'default' : 'ghost'}
                        size="sm"
                        className="rounded-xl h-7 text-xs"
                        onClick={() => setRowFilter(value)}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 sticky top-0">
                      <tr>
                        <th className="text-left p-3 font-medium w-12">#</th>
                        <th className="text-left p-3 font-medium">Title</th>
                        <th className="text-left p-3 font-medium hidden sm:table-cell">Category</th>
                        <th className="text-left p-3 font-medium hidden md:table-cell">Status</th>
                        <th className="text-left p-3 font-medium">Validation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.slice(0, 200).map((row) => (
                        <React.Fragment key={row._rowIndex}>
                          <tr
                            className={`border-t border-border/50 cursor-pointer
                              ${!row._isValid ? 'bg-destructive/5 hover:bg-destructive/10' : 'hover:bg-muted/30'}
                              ${row._isDuplicate && row._isValid ? 'bg-yellow-50/5' : ''}`}
                            onClick={() =>
                              setExpandedErrors((prev) => ({
                                ...prev,
                                [row._rowIndex]: !prev[row._rowIndex],
                              }))
                            }
                          >
                            <td className="p-3 text-muted-foreground text-xs">{row._rowIndex}</td>
                            <td className="p-3">
                              <span className="font-medium line-clamp-1">{row.title || <em className="text-muted-foreground">untitled</em>}</span>
                              {row.slug && <span className="text-xs text-muted-foreground block">/{row.slug}</span>}
                            </td>
                            <td className="p-3 text-muted-foreground hidden sm:table-cell text-xs">
                              {row.category_name || '—'}
                            </td>
                            <td className="p-3 hidden md:table-cell">
                              <Badge variant={row.status === 'published' ? 'default' : 'secondary'} className="text-xs">
                                {row.status}
                              </Badge>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-1.5">
                                {!row._isValid && <XCircle className="w-4 h-4 text-destructive shrink-0" />}
                                {row._isDuplicate && row._isValid && <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />}
                                {row._isValid && !row._isDuplicate && row._warnings.length === 0 && (
                                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                                )}
                                {row._warnings.length > 0 && row._isValid && !row._isDuplicate && (
                                  <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />
                                )}
                                <span className="text-xs text-muted-foreground">
                                  {!row._isValid
                                    ? `${row._errors.length} error(s)`
                                    : row._isDuplicate
                                    ? 'Duplicate'
                                    : row._warnings.length > 0
                                    ? `${row._warnings.length} warning(s)`
                                    : 'OK'}
                                </span>
                                {(row._errors.length > 0 || row._warnings.length > 0) && (
                                  expandedErrors[row._rowIndex]
                                    ? <ChevronUp className="w-3 h-3 ml-auto text-muted-foreground" />
                                    : <ChevronDown className="w-3 h-3 ml-auto text-muted-foreground" />
                                )}
                              </div>
                            </td>
                          </tr>
                          {/* Expanded errors/warnings */}
                          {expandedErrors[row._rowIndex] && (row._errors.length > 0 || row._warnings.length > 0) && (
                            <tr className="border-t border-border/30">
                              <td colSpan={5} className="px-6 pb-3">
                                {row._errors.map((e, i) => (
                                  <div key={i} className="flex items-start gap-1.5 text-xs text-destructive mt-1">
                                    <XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                    {e}
                                  </div>
                                ))}
                                {row._warnings.map((w, i) => (
                                  <div key={i} className="flex items-start gap-1.5 text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                    {w}
                                  </div>
                                ))}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                      {filteredRows.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-muted-foreground text-sm">
                            No rows match this filter.
                          </td>
                        </tr>
                      )}
                      {filteredRows.length > 200 && (
                        <tr>
                          <td colSpan={5} className="p-3 text-center text-xs text-muted-foreground border-t border-border/50">
                            Showing first 200 of {filteredRows.length} rows
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Import CTA */}
              <div className="flex items-center justify-between gap-4 pt-2">
                <Button variant="outline" className="rounded-xl" onClick={resetImport}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
                <div className="flex items-center gap-2">
                  {validationResult.totalValid === 0 && (
                    <span className="text-sm text-destructive">No valid rows to import</span>
                  )}
                  <Button
                    className="rounded-xl"
                    disabled={validationResult.totalValid === 0}
                    onClick={handleImport}
                  >
                    Import{' '}
                    {validationResult.totalValid > 0
                      ? `${validationResult.totalValid} post(s)`
                      : ''}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3: Importing ──────────────────────────────────────────── */}
          {step === 3 && (
            <div className="rounded-xl border border-border bg-card p-8 text-center space-y-6">
              <RefreshCw className="w-12 h-12 mx-auto text-primary animate-spin" />
              <div>
                <p className="font-medium text-lg">Importing posts…</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {progress.current} of {progress.total} processed
                </p>
              </div>
              <div className="max-w-sm mx-auto space-y-1">
                <Progress value={progressPct} className="h-2" />
                <p className="text-xs text-muted-foreground text-right">{progressPct}%</p>
              </div>
              <p className="text-xs text-muted-foreground">Please keep this page open until the import completes.</p>
            </div>
          )}

          {/* ── Step 4: Done ───────────────────────────────────────────────── */}
          {step === 4 && importResult && (
            <div className="space-y-5">
              <div className="rounded-xl border border-border bg-card p-6">
                <div className="flex items-center gap-3 mb-5">
                  <CheckCircle2 className="w-8 h-8 text-green-500 shrink-0" />
                  <div>
                    <p className="font-semibold text-lg">Import Complete</p>
                    <p className="text-sm text-muted-foreground">{rawFile?.name}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatCard label="Created" value={importResult.imported} color="text-green-500" />
                  <StatCard label="Updated" value={importResult.updated} color="text-blue-500" />
                  <StatCard label="Skipped" value={importResult.skipped} color="text-muted-foreground" />
                  <StatCard label="Failed" value={importResult.failed} color="text-destructive" />
                </div>
              </div>

              {/* Errors */}
              {importResult.errors.length > 0 && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                  <p className="text-sm font-medium text-destructive mb-2">
                    {importResult.errors.length} post(s) failed
                  </p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {importResult.errors.map((e, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <XCircle className="w-3.5 h-3.5 text-destructive mt-0.5 shrink-0" />
                        <span className="text-destructive font-medium">{e.title || `Row ${e.rowIndex}`}:</span>
                        <span className="text-muted-foreground">{e.error}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" className="rounded-xl" onClick={resetImport}>
                  <Upload className="w-4 h-4 mr-2" /> New Import
                </Button>
                {importResult.importedIds?.length > 0 && importResult.historyId && (
                  <Button
                    variant="outline"
                    className="rounded-xl text-destructive hover:text-destructive"
                    onClick={() => handleRollback(importResult.historyId, importResult.importedIds)}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Rollback ({importResult.importedIds.length} posts)
                  </Button>
                )}
                <Button
                  variant="default"
                  className="rounded-xl"
                  onClick={() => window.open('/admin/blog', '_self')}
                >
                  View Blog Posts
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ══════════════════ EXPORT TAB ══════════════════ */}
        <TabsContent value="export">
          <div className="space-y-5">
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <p className="text-sm font-medium">What to export</p>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Filter posts</Label>
                  <Select value={exportFilter} onValueChange={setExportFilter}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All posts ({allPosts.length})</SelectItem>
                      <SelectItem value="published">
                        Published ({allPosts.filter((p) => p.status === 'published').length})
                      </SelectItem>
                      <SelectItem value="draft">
                        Drafts ({allPosts.filter((p) => p.status !== 'published').length})
                      </SelectItem>
                      <SelectItem value="category">By category</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {exportFilter === 'category' && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Category</Label>
                    <Select value={exportCategory} onValueChange={setExportCategory}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Select category…" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Export format</Label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'xlsx', label: 'Excel (.xlsx)', icon: FileSpreadsheet },
                    { value: 'csv',  label: 'CSV (.csv)',   icon: FileText },
                    { value: 'json', label: 'JSON (.json)', icon: FileJson },
                    { value: 'html', label: 'HTML (.html)', icon: FileCode },
                  ].map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => setExportFormat(value)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-colors
                        ${exportFormat === value
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:bg-muted/50'}`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <Button className="rounded-xl" onClick={handleExport} disabled={postsLoading}>
              <Download className="w-4 h-4 mr-2" />
              {postsLoading ? 'Loading…' : `Export${exportFilter === 'category' && exportCategory
                ? ` ${allPosts.filter((p) => p.category_id === exportCategory).length}`
                : ` ${exportFilter === 'all' ? allPosts.length
                    : exportFilter === 'published' ? allPosts.filter((p) => p.status === 'published').length
                    : allPosts.filter((p) => p.status !== 'published').length}`} posts`}
            </Button>
          </div>
        </TabsContent>

        {/* ══════════════════ HISTORY TAB ══════════════════ */}
        <TabsContent value="history">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{importHistory.length} import record(s)</p>
              <Button variant="ghost" size="sm" className="rounded-xl" onClick={() => refetchHistory()}>
                <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
              </Button>
            </div>

            {importHistory.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-10 text-center">
                <BarChart3 className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No import history yet.</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Make sure you have run <code className="font-mono text-xs">supabase_blog_import_migration.sql</code> first.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-border overflow-hidden bg-card">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="text-left p-3 font-medium">File</th>
                      <th className="text-left p-3 font-medium hidden sm:table-cell">Date</th>
                      <th className="text-left p-3 font-medium hidden md:table-cell">Results</th>
                      <th className="text-left p-3 font-medium">Status</th>
                      <th className="text-right p-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importHistory.map((h) => (
                      <tr key={h.id} className="border-t border-border/50 hover:bg-muted/20">
                        <td className="p-3">
                          <p className="font-medium truncate max-w-[180px]">{h.filename || 'Unknown'}</p>
                          <Badge variant="outline" className="text-xs uppercase mt-0.5">{h.file_type}</Badge>
                        </td>
                        <td className="p-3 text-muted-foreground text-xs hidden sm:table-cell">
                          {h.created_at ? format(new Date(h.created_at), 'MMM d, yyyy HH:mm') : '—'}
                        </td>
                        <td className="p-3 hidden md:table-cell">
                          <div className="flex gap-3 text-xs">
                            <span className="text-green-500 font-medium">{h.imported} created</span>
                            {h.updated > 0 && <span className="text-blue-500">{h.updated} updated</span>}
                            {h.failed > 0 && <span className="text-destructive">{h.failed} failed</span>}
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge
                            variant={
                              h.status === 'completed' ? 'default'
                              : h.status === 'failed' ? 'destructive'
                              : 'secondary'
                            }
                            className="text-xs"
                          >
                            {h.status}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-end gap-1">
                            {h.imported_ids?.length > 0 && h.status === 'completed' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-yellow-600 hover:text-yellow-700"
                                title={`Rollback ${h.imported_ids.length} posts`}
                                onClick={() => handleRollback(h.id, h.imported_ids)}
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              title="Delete record"
                              onClick={() => handleDeleteHistory(h.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

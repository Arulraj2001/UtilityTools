import React, { useCallback, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useDropzone } from 'react-dropzone'
import { format } from 'date-fns'
import { toast } from 'sonner'
import {
  AlertTriangle, ArrowLeft, ArrowRight, BarChart3, CheckCircle2, ChevronDown,
  ChevronUp, Download, FileArchive, FileCode, FileJson, FileSpreadsheet,
  FileText, RefreshCw, RotateCcw, Trash2, Upload, XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  bulkUpdateTools,
  createToolSeoImportHistory,
  deleteToolSeoImportHistory,
  getCategories,
  getToolSeoImportHistory,
  getToolsWithCategories,
  rollbackToolSeoImport,
  updateToolSeoImportHistory,
} from '@/api/supabaseApi'
import {
  buildToolSeoRollbackData,
  getToolSeoImportFileType,
  parseToolSeoCsvFile,
  parseToolSeoExcelFile,
  parseToolSeoHtmlFile,
  parseToolSeoJsonFile,
  parseToolSeoZipFile,
  prepareToolSeoUpdate,
  processToolSeoImportData,
} from '@/lib/toolSeoImportEngine'
import {
  downloadToolSeoTemplate,
  exportToolSeoToCsv,
  exportToolSeoToExcel,
  exportToolSeoToHtml,
  exportToolSeoToJson,
} from '@/lib/toolSeoExportEngine'

const FILE_ICONS = {
  xlsx: FileSpreadsheet,
  csv: FileText,
  json: FileJson,
  html: FileCode,
  zip: FileArchive,
}

const StatCard = ({ label, value, color = 'text-foreground' }) => (
  <div className="rounded-lg border border-border bg-card p-4 text-center">
    <p className={`text-2xl font-bold ${color}`}>{value}</p>
    <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
  </div>
)

const StepIndicator = ({ current }) => {
  const steps = ['Upload', 'Preview', 'Import', 'Done']
  return (
    <div className="mb-6 flex items-center gap-2">
      {steps.map((label, idx) => {
        const num = idx + 1
        const done = current > num
        const active = current === num
        return (
          <React.Fragment key={label}>
            <div className="flex items-center gap-1.5">
              <div className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold ${
                done ? 'border-primary bg-primary text-primary-foreground'
                  : active ? 'border-primary text-primary'
                  : 'border-border text-muted-foreground'
              }`}>
                {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : num}
              </div>
              <span className={`hidden text-sm sm:block ${active ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                {label}
              </span>
            </div>
            {idx < steps.length - 1 && <div className={`h-0.5 flex-1 rounded-full ${done ? 'bg-primary' : 'bg-border'}`} />}
          </React.Fragment>
        )
      })}
    </div>
  )
}

const FieldValue = ({ value }) => {
  const text = typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value ?? '')
  return <span className="break-words font-mono text-xs">{text || 'empty'}</span>
}

export default function AdminToolSeoImport() {
  const queryClient = useQueryClient()
  const [step, setStep] = useState(1)
  const [rawFile, setRawFile] = useState(null)
  const [fileType, setFileType] = useState(null)
  const [validationResult, setValidationResult] = useState(null)
  const [rowFilter, setRowFilter] = useState('all')
  const [expandedRows, setExpandedRows] = useState({})
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [importResult, setImportResult] = useState(null)
  const [isImporting, setIsImporting] = useState(false)
  const [exportFilter, setExportFilter] = useState('all')
  const [exportCategory, setExportCategory] = useState('')
  const [exportStatus, setExportStatus] = useState('published')
  const [exportFormat, setExportFormat] = useState('xlsx')
  const [importOptions, setImportOptions] = useState({
    updateOnlyEmpty: false,
    overwriteExisting: true,
    skipExistingSeo: false,
    updateSeoOnly: false,
    updateContentOnly: false,
    dryRun: false,
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => getCategories({ orderBy: 'sort_order', ascending: true, limit: 500 }),
  })

  const { data: tools = [], isLoading: toolsLoading } = useQuery({
    queryKey: ['tool-seo-import-tools'],
    queryFn: () => getToolsWithCategories({ published: false, orderBy: 'created_at', ascending: false, limit: 5000 }),
  })

  const { data: importHistory = [], refetch: refetchHistory } = useQuery({
    queryKey: ['tool-seo-import-history'],
    queryFn: () => getToolSeoImportHistory({ limit: 50 }),
    retry: false,
  })

  const parseFile = useCallback(async (file) => {
    const type = getToolSeoImportFileType(file.name)
    if (!type) {
      toast.error('Unsupported format. Use .xlsx, .csv, .json, .html, or .zip')
      return
    }

    setRawFile(file)
    setFileType(type)

    try {
      let rows = []
      if (type === 'xlsx') rows = parseToolSeoExcelFile(await file.arrayBuffer())
      if (type === 'csv') rows = parseToolSeoCsvFile(await file.text())
      if (type === 'json') rows = parseToolSeoJsonFile(await file.text())
      if (type === 'html') rows = parseToolSeoHtmlFile(await file.text(), file.name)
      if (type === 'zip') rows = await parseToolSeoZipFile(await file.arrayBuffer())

      if (!rows.length) {
        toast.error('No importable rows found')
        return
      }

      setValidationResult(processToolSeoImportData(rows, tools, categories, importOptions))
      setExpandedRows({})
      setStep(2)
    } catch (error) {
      console.error('Tool SEO import parse error:', error)
      toast.error(`Parse failed: ${error.message}`)
    }
  }, [categories, importOptions, tools])

  const revalidate = (nextOptions) => {
    setImportOptions(nextOptions)
    if (!validationResult) return
    const rawRows = validationResult.rows.map(({ _rowIndex, _errors, _warnings, _isValid, _matchedTool, _matchedBy, _patch, _changes, _faqError, ...row }) => row)
    setValidationResult(processToolSeoImportData(rawRows, tools, categories, nextOptions))
  }

  const setOption = (key, value) => {
    const next = { ...importOptions, [key]: value }
    if (key === 'updateOnlyEmpty' && value) next.overwriteExisting = false
    if (key === 'overwriteExisting' && value) next.updateOnlyEmpty = false
    if (key === 'updateSeoOnly' && value) next.updateContentOnly = false
    if (key === 'updateContentOnly' && value) next.updateSeoOnly = false
    revalidate(next)
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: ([file]) => { if (file) parseFile(file) },
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
      'application/json': ['.json'],
      'text/html': ['.html', '.htm'],
      'application/zip': ['.zip'],
    },
    multiple: false,
    maxSize: 25 * 1024 * 1024,
    onDropRejected: ([rejection]) => toast.error(rejection?.errors?.[0]?.message || 'File rejected'),
  })

  const rows = validationResult?.rows ?? []
  const filteredRows = rows.filter((row) => {
    if (rowFilter === 'valid') return row._isValid
    if (rowFilter === 'error') return !row._isValid
    if (rowFilter === 'changed') return row._changes.length > 0
    return true
  })
  const progressPct = progress.total ? Math.round((progress.current / progress.total) * 100) : 0
  const FileIcon = FILE_ICONS[fileType] ?? FileText

  const importableRows = useMemo(
    () => rows.filter((row) => row._isValid && row._changes.length > 0),
    [rows]
  )

  const handleImport = async () => {
    if (!validationResult) return
    if (!importableRows.length) {
      toast.error('No valid changed rows to import')
      return
    }

    setStep(3)
    setProgress({ current: 0, total: importableRows.length })
    setIsImporting(true)

    let historyId = null
    const rollbackData = importableRows.map(buildToolSeoRollbackData)
    const updates = importableRows.map((row) => ({
      id: row._matchedTool.id,
      slug: row._matchedTool.slug,
      patch: prepareToolSeoUpdate(row),
    }))

    try {
      try {
        const history = await createToolSeoImportHistory({
          file_name: rawFile?.name,
          import_type: fileType,
          rows_processed: rows.length,
          rows_updated: 0,
          rows_failed: 0,
          status: importOptions.dryRun ? 'dry_run' : 'processing',
          options: importOptions,
          rollback_data: rollbackData,
        })
        historyId = history?.[0]?.id ?? null
      } catch {
        historyId = null
      }

      if (importOptions.dryRun) {
        setProgress({ current: importableRows.length, total: importableRows.length })
        setImportResult({ updated: 0, failed: 0, dryRun: true, errors: [], historyId, rollbackData })
        if (historyId) await updateToolSeoImportHistory(historyId, { status: 'completed', rows_updated: 0 })
        toast.success(`Dry run complete: ${importableRows.length} row(s) validated`)
      } else {
        const result = await bulkUpdateTools(updates, (n) => {
          setProgress((prev) => ({ ...prev, current: Math.min(prev.current + n, prev.total) }))
        })
        if (historyId) {
          await updateToolSeoImportHistory(historyId, {
            status: result.errors.length === updates.length ? 'failed' : 'completed',
            rows_updated: result.updated.length,
            rows_failed: result.errors.length,
            errors: result.errors.slice(0, 100),
            rollback_data: rollbackData,
          })
          refetchHistory()
        }

        setImportResult({ updated: result.updated.length, failed: result.errors.length, dryRun: false, errors: result.errors, historyId, rollbackData })
        queryClient.invalidateQueries({ queryKey: ['tool-seo-import-tools'] })
        queryClient.invalidateQueries({ queryKey: ['all-tools'] })
        queryClient.invalidateQueries({ queryKey: ['tools-published'] })
        queryClient.invalidateQueries({ queryKey: ['tool-by-slug'] })
        toast.success(`Tool SEO import complete: ${result.updated.length} updated`)
      }
    } catch (error) {
      toast.error(`Import failed: ${error.message}`)
      setImportResult({ updated: 0, failed: importableRows.length, dryRun: false, errors: [{ error: error.message }], historyId, rollbackData })
    } finally {
      setIsImporting(false)
      setStep(4)
    }
  }

  const handleRollback = async (historyId, rollbackData) => {
    if (!rollbackData?.length) {
      toast.error('No rollback data available')
      return
    }
    if (!confirm(`Rollback ${rollbackData.length} tool update(s)?`)) return

    try {
      const result = await rollbackToolSeoImport(historyId, rollbackData)
      toast.success(`Rolled back ${result.updated} tool(s)`)
      queryClient.invalidateQueries({ queryKey: ['tool-seo-import-tools'] })
      queryClient.invalidateQueries({ queryKey: ['all-tools'] })
      queryClient.invalidateQueries({ queryKey: ['tools-published'] })
      queryClient.invalidateQueries({ queryKey: ['tool-by-slug'] })
      refetchHistory()
    } catch (error) {
      toast.error(`Rollback failed: ${error.message}`)
    }
  }

  const handleDeleteHistory = async (id) => {
    if (!confirm('Remove this import history record?')) return
    await deleteToolSeoImportHistory(id)
    refetchHistory()
    toast.success('History record removed')
  }

  const handleExport = () => {
    let selected = tools
    if (exportFilter === 'category' && exportCategory) selected = selected.filter((tool) => tool.category_id === exportCategory)
    if (exportFilter === 'status') selected = selected.filter((tool) => (tool.status || 'draft') === exportStatus)

    if (!selected.length) {
      toast.error('No tools match the selected export filter')
      return
    }

    const base = `tool-seo-${format(new Date(), 'yyyy-MM-dd')}`
    if (exportFormat === 'xlsx') exportToolSeoToExcel(selected, `${base}.xlsx`)
    if (exportFormat === 'csv') exportToolSeoToCsv(selected, `${base}.csv`)
    if (exportFormat === 'json') exportToolSeoToJson(selected, `${base}.json`)
    if (exportFormat === 'html') exportToolSeoToHtml(selected, `${base}.html`)
    toast.success(`Exported ${selected.length} tool(s)`)
  }

  const resetImport = () => {
    setStep(1)
    setRawFile(null)
    setFileType(null)
    setValidationResult(null)
    setImportResult(null)
    setProgress({ current: 0, total: 0 })
    setRowFilter('all')
    setExpandedRows({})
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Tool SEO Import</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Bulk update SEO and content fields for existing tools only. Tools are matched by slug first, then tool name.
        </p>
      </div>

      <Tabs defaultValue="import">
        <TabsList className="mb-6">
          <TabsTrigger value="import"><Upload className="mr-2 h-4 w-4" />Import</TabsTrigger>
          <TabsTrigger value="export"><Download className="mr-2 h-4 w-4" />Export</TabsTrigger>
          <TabsTrigger value="history"><BarChart3 className="mr-2 h-4 w-4" />History</TabsTrigger>
        </TabsList>

        <TabsContent value="import">
          <StepIndicator current={step} />

          {step === 1 && (
            <div className="space-y-5">
              <div
                {...getRootProps()}
                className={`cursor-pointer rounded-lg border-2 border-dashed p-10 text-center transition-colors ${
                  isDragActive ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-muted/30'
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                <p className="font-medium">Drop an SEO import file here, or click to browse</p>
                <p className="mt-1 text-sm text-muted-foreground">CSV, Excel, JSON, HTML, or ZIP containing HTML files</p>
              </div>

              <div className="rounded-lg border border-border bg-card p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">Import options</p>
                  <Button variant="outline" size="sm" className="rounded-lg" onClick={downloadToolSeoTemplate}>
                    <Download className="mr-2 h-4 w-4" />Download Template
                  </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    ['updateOnlyEmpty', 'Update only empty fields'],
                    ['overwriteExisting', 'Overwrite existing fields'],
                    ['skipExistingSeo', 'Skip existing SEO'],
                    ['updateSeoOnly', 'Update SEO only'],
                    ['updateContentOnly', 'Update content only'],
                    ['dryRun', 'Dry run'],
                  ].map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm">
                      <Checkbox checked={!!importOptions[key]} onCheckedChange={(value) => setOption(key, !!value)} />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && validationResult && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
                <FileIcon className="h-8 w-8 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{rawFile?.name}</p>
                  <p className="text-xs text-muted-foreground">{validationResult.totalRows} row(s) parsed</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                <StatCard label="Rows" value={validationResult.totalRows} />
                <StatCard label="Matched" value={validationResult.totalMatched} color="text-blue-500" />
                <StatCard label="Changed" value={validationResult.totalChanged} color="text-primary" />
                <StatCard label="Valid" value={validationResult.totalValid} color="text-green-500" />
                <StatCard label="Errors" value={validationResult.totalInvalid} color="text-destructive" />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <Select value={rowFilter} onValueChange={setRowFilter}>
                  <SelectTrigger className="w-44 rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All rows</SelectItem>
                    <SelectItem value="valid">Valid rows</SelectItem>
                    <SelectItem value="changed">Changed rows</SelectItem>
                    <SelectItem value="error">Rows with errors</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Preview shows current value, new value, and validation state before any update.</p>
              </div>

              <div className="overflow-hidden rounded-lg border border-border bg-card">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="p-3 text-left font-medium">Tool</th>
                      <th className="hidden p-3 text-left font-medium md:table-cell">Matched By</th>
                      <th className="p-3 text-left font-medium">Changes</th>
                      <th className="p-3 text-left font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.slice(0, 200).map((row) => (
                      <React.Fragment key={row._rowIndex}>
                        <tr
                          className="cursor-pointer border-t border-border/50 hover:bg-muted/20"
                          onClick={() => setExpandedRows((prev) => ({ ...prev, [row._rowIndex]: !prev[row._rowIndex] }))}
                        >
                          <td className="p-3">
                            <p className="font-medium">{row._matchedTool?.name || row.name || 'Unmatched tool'}</p>
                            <p className="text-xs text-muted-foreground">/{row._matchedTool?.slug || row.slug || 'no-slug'}</p>
                          </td>
                          <td className="hidden p-3 text-muted-foreground md:table-cell">{row._matchedBy || 'none'}</td>
                          <td className="p-3">{row._changes.length}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              {!row._isValid ? <XCircle className="h-4 w-4 text-destructive" />
                                : row._warnings.length ? <AlertTriangle className="h-4 w-4 text-yellow-500" />
                                : <CheckCircle2 className="h-4 w-4 text-green-500" />}
                              <span className="text-xs text-muted-foreground">
                                {!row._isValid ? `${row._errors.length} error(s)` : row._warnings.length ? `${row._warnings.length} warning(s)` : 'OK'}
                              </span>
                              {expandedRows[row._rowIndex] ? <ChevronUp className="ml-auto h-3 w-3" /> : <ChevronDown className="ml-auto h-3 w-3" />}
                            </div>
                          </td>
                        </tr>
                        {expandedRows[row._rowIndex] && (
                          <tr className="border-t border-border/30">
                            <td colSpan={4} className="p-4">
                              <div className="space-y-3">
                                {row._errors.map((error, index) => (
                                  <p key={index} className="text-xs text-destructive">{error}</p>
                                ))}
                                {row._warnings.map((warning, index) => (
                                  <p key={index} className="text-xs text-yellow-600 dark:text-yellow-400">{warning}</p>
                                ))}
                                {row._changes.length > 0 && (
                                  <div className="overflow-hidden rounded-lg border border-border">
                                    <table className="w-full text-xs">
                                      <thead className="bg-muted/40">
                                        <tr>
                                          <th className="p-2 text-left font-medium">Field</th>
                                          <th className="p-2 text-left font-medium">Current Value</th>
                                          <th className="p-2 text-left font-medium">New Value</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {row._changes.map((change) => (
                                          <tr key={change.field} className="border-t border-border/40">
                                            <td className="p-2 font-medium">{change.field}</td>
                                            <td className="max-w-[260px] p-2 align-top text-muted-foreground"><FieldValue value={change.current} /></td>
                                            <td className="max-w-[260px] p-2 align-top"><FieldValue value={change.next} /></td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between gap-4">
                <Button variant="outline" className="rounded-lg" onClick={resetImport}>
                  <ArrowLeft className="mr-2 h-4 w-4" />Back
                </Button>
                <Button className="rounded-lg" disabled={!importableRows.length} onClick={handleImport}>
                  {importOptions.dryRun ? 'Run Dry Run' : `Import ${importableRows.length} update(s)`}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 rounded-lg border border-border bg-card p-8 text-center">
              <RefreshCw className="mx-auto h-12 w-12 animate-spin text-primary" />
              <div>
                <p className="text-lg font-medium">{isImporting ? 'Processing tool SEO import' : 'Finishing import'}</p>
                <p className="mt-1 text-sm text-muted-foreground">{progress.current} of {progress.total} processed</p>
              </div>
              <div className="mx-auto max-w-sm space-y-1">
                <Progress value={progressPct} className="h-2" />
                <p className="text-right text-xs text-muted-foreground">{progressPct}%</p>
              </div>
            </div>
          )}

          {step === 4 && importResult && (
            <div className="space-y-5">
              <div className="rounded-lg border border-border bg-card p-6">
                <div className="mb-5 flex items-center gap-3">
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                  <div>
                    <p className="text-lg font-semibold">{importResult.dryRun ? 'Dry Run Complete' : 'Import Complete'}</p>
                    <p className="text-sm text-muted-foreground">{rawFile?.name}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <StatCard label="Updated" value={importResult.updated} color="text-green-500" />
                  <StatCard label="Failed" value={importResult.failed} color="text-destructive" />
                  <StatCard label="Rollback Rows" value={importResult.rollbackData?.length || 0} />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" className="rounded-lg" onClick={resetImport}>
                  <Upload className="mr-2 h-4 w-4" />New Import
                </Button>
                {!importResult.dryRun && importResult.historyId && importResult.rollbackData?.length > 0 && (
                  <Button variant="outline" className="rounded-lg text-destructive hover:text-destructive" onClick={() => handleRollback(importResult.historyId, importResult.rollbackData)}>
                    <RotateCcw className="mr-2 h-4 w-4" />Rollback
                  </Button>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="export">
          <div className="space-y-5">
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Export tools</Label>
                  <Select value={exportFilter} onValueChange={setExportFilter}>
                    <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All tools ({tools.length})</SelectItem>
                      <SelectItem value="category">By category</SelectItem>
                      <SelectItem value="status">By status</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {exportFilter === 'category' && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Category</Label>
                    <Select value={exportCategory} onValueChange={setExportCategory}>
                      <SelectTrigger className="rounded-lg"><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {exportFilter === 'status' && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Status</Label>
                    <Select value={exportStatus} onValueChange={setExportStatus}>
                      <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <div className="mt-4 space-y-1.5">
                <Label className="text-xs">Format</Label>
                <div className="flex flex-wrap gap-2">
                  {[
                    ['xlsx', 'Excel', FileSpreadsheet],
                    ['csv', 'CSV', FileText],
                    ['json', 'JSON', FileJson],
                    ['html', 'HTML', FileCode],
                  ].map(([value, label, Icon]) => (
                    <button key={value} onClick={() => setExportFormat(value)} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${
                      exportFormat === value ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted/50'
                    }`}>
                      <Icon className="h-4 w-4" />{label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button className="rounded-lg" onClick={handleExport} disabled={toolsLoading}>
                <Download className="mr-2 h-4 w-4" />Export Existing SEO
              </Button>
              <Button variant="outline" className="rounded-lg" onClick={downloadToolSeoTemplate}>
                Download Template
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{importHistory.length} import record(s)</p>
              <Button variant="ghost" size="sm" className="rounded-lg" onClick={() => refetchHistory()}>
                <RefreshCw className="mr-1 h-3.5 w-3.5" />Refresh
              </Button>
            </div>
            {importHistory.length === 0 ? (
              <div className="rounded-lg border border-border bg-card p-10 text-center">
                <BarChart3 className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No Tool SEO Import history yet.</p>
                <p className="mt-1 text-xs text-muted-foreground">Run <code>supabase_tool_seo_import_migration.sql</code> before production imports.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-border bg-card">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="p-3 text-left font-medium">File</th>
                      <th className="hidden p-3 text-left font-medium sm:table-cell">Date</th>
                      <th className="hidden p-3 text-left font-medium md:table-cell">Results</th>
                      <th className="p-3 text-left font-medium">Status</th>
                      <th className="p-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importHistory.map((history) => (
                      <tr key={history.id} className="border-t border-border/50 hover:bg-muted/20">
                        <td className="p-3">
                          <p className="max-w-[180px] truncate font-medium">{history.file_name || 'Unknown'}</p>
                          <Badge variant="outline" className="mt-0.5 text-xs uppercase">{history.import_type}</Badge>
                        </td>
                        <td className="hidden p-3 text-xs text-muted-foreground sm:table-cell">
                          {history.created_at ? format(new Date(history.created_at), 'MMM d, yyyy HH:mm') : 'empty'}
                        </td>
                        <td className="hidden p-3 md:table-cell">
                          <div className="flex gap-3 text-xs">
                            <span className="font-medium text-green-500">{history.rows_updated || 0} updated</span>
                            {history.rows_failed > 0 && <span className="text-destructive">{history.rows_failed} failed</span>}
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge variant={history.status === 'completed' ? 'default' : history.status === 'failed' ? 'destructive' : 'secondary'} className="text-xs">
                            {history.status}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-end gap-1">
                            {history.rollback_data?.length > 0 && history.status === 'completed' && (
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-yellow-600 hover:text-yellow-700" onClick={() => handleRollback(history.id, history.rollback_data)}>
                                <RotateCcw className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteHistory(history.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
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

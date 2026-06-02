import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import ToolEditor from '../../components/admin/ToolEditor'
import { getToolsAll, deleteTool, getCategories } from '@/api/supabaseApi'

export default function AdminTools() {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [editingTool, setEditingTool] = useState(null)
  const [showEditor, setShowEditor] = useState(false)
  const queryClient = useQueryClient()

  const { data: tools = [], isLoading } = useQuery({
    queryKey: ['all-tools'],
    queryFn: () => getToolsAll({ orderBy: 'created_at', ascending: false, limit: 200 }),
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => getCategories({ limit: 500 }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteTool(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-tools'] })
      queryClient.invalidateQueries({ queryKey: ['tools-published'] })
      queryClient.invalidateQueries({ queryKey: ['tool-by-slug'] })
      toast.success('Tool deleted')
    },
  })

  const filtered = tools.filter(t => {
    const matchesSearch = t.name?.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || t.category_id === selectedCategory
    return matchesSearch && matchesCategory
  })

  const handleNew = () => {
    setEditingTool(null)
    setShowEditor(true)
  }

  const handleEdit = (tool) => {
    setEditingTool(tool)
    setShowEditor(true)
  }

  const handleSaved = () => {
    setShowEditor(false)
    setEditingTool(null)
    queryClient.invalidateQueries({ queryKey: ['all-tools'] })
    queryClient.invalidateQueries({ queryKey: ['tools-published'] })
    queryClient.invalidateQueries({ queryKey: ['tool-by-slug'] })
  }

  if (showEditor) {
    return <ToolEditor tool={editingTool} onSave={handleSaved} onCancel={() => setShowEditor(false)} />
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Tools</h1>
        <Button onClick={handleNew} className="rounded-xl">
          <Plus className="w-4 h-4 mr-2" />
          New Tool
        </Button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search tools..."
          className="pl-10 rounded-xl"
        />
      </div>

      <div className="mb-4 flex gap-3 items-center">
        <label className="text-sm font-medium">Filter by Category:</label>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48 rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(category => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-border overflow-hidden bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 font-medium">Name</th>
              <th className="text-left p-3 font-medium hidden sm:table-cell">Slug</th>
              <th className="text-left p-3 font-medium hidden md:table-cell">Status</th>
              <th className="text-left p-3 font-medium hidden md:table-cell">Usage</th>
              <th className="text-right p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(tool => (
              <tr key={tool.id} className="border-t border-border/50 hover:bg-muted/30 transition-colors">
                <td className="p-3">
                  <div className="font-medium">{tool.name}</div>
                  <div className="text-xs text-muted-foreground sm:hidden">/{tool.slug}</div>
                </td>
                <td className="p-3 text-muted-foreground hidden sm:table-cell">/{tool.slug}</td>
                <td className="p-3 hidden md:table-cell">
                  <Badge variant={tool.status === 'published' ? 'default' : 'secondary'} className="text-xs">
                    {tool.status || 'draft'}
                  </Badge>
                </td>
                <td className="p-3 text-muted-foreground hidden md:table-cell">{tool.usage_count || 0}</td>
                <td className="p-3">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(tool)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => { if (confirm('Delete this tool?')) deleteMutation.mutate(tool.id) }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                  {isLoading ? 'Loading...' : 'No tools found'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

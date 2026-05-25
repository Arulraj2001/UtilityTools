import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import BlogEditor from '../../components/admin/BlogEditor'
import { getBlogPosts, deleteBlogPost } from '@/api/supabaseApi'

export default function AdminBlog() {
  const [search, setSearch] = useState('')
  const [editingPost, setEditingPost] = useState(null)
  const [showEditor, setShowEditor] = useState(false)
  const queryClient = useQueryClient()

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['all-posts'],
    queryFn: () => getBlogPosts({ published: false, orderBy: 'created_at', ascending: false, limit: 200 }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteBlogPost(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-posts'] })
      toast.success('Post deleted')
    },
  })

  const filtered = posts.filter(p => p.title?.toLowerCase().includes(search.toLowerCase()))

  if (showEditor) {
    return (
      <BlogEditor
        post={editingPost}
        onSave={() => { setShowEditor(false); setEditingPost(null); queryClient.invalidateQueries({ queryKey: ['all-posts'] }) }}
        onCancel={() => { setShowEditor(false); setEditingPost(null) }}
      />
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Blog Posts</h1>
        <Button onClick={() => { setEditingPost(null); setShowEditor(true) }} className="rounded-xl">
          <Plus className="w-4 h-4 mr-2" /> New Post
        </Button>
      </div>

      <div className="relative mb-4">
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search posts..." className="pl-10 rounded-xl" />
      </div>

      <div className="rounded-xl border border-border overflow-hidden bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 font-medium">Title</th>
              <th className="text-left p-3 font-medium hidden sm:table-cell">Status</th>
              <th className="text-left p-3 font-medium hidden md:table-cell">Category</th>
              <th className="text-right p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(post => (
              <tr key={post.id} className="border-t border-border/50 hover:bg-muted/30">
                <td className="p-3 font-medium">{post.title}</td>
                <td className="p-3 hidden sm:table-cell">
                  <Badge variant={post.status === 'published' ? 'default' : 'secondary'} className="text-xs">{post.status || 'draft'}</Badge>
                </td>
                <td className="p-3 text-muted-foreground hidden md:table-cell">{(post.blog_categories?.name || post.category) || '-'}</td>
                <td className="p-3">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingPost(post); setShowEditor(true) }}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { if (confirm('Delete?')) deleteMutation.mutate(post.id) }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-muted-foreground">
                  {isLoading ? 'Loading...' : 'No posts'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

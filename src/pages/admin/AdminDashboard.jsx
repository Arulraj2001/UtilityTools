import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Wrench, BookOpen, FolderOpen, Eye, TrendingUp, BarChart3 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { getToolsWithCategories, getBlogPosts, getCategories } from '@/api/supabaseApi'

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-background border border-border rounded-lg shadow-lg p-3 max-w-xs">
        <p className="font-semibold text-sm mb-1">{data.fullName}</p>
        <div className="space-y-1 text-xs">
          <p className="text-muted-foreground">Usage: <span className="font-medium text-foreground">{data.usage.toLocaleString()}</span></p>
          <p className="text-muted-foreground">Category: <span className="font-medium text-foreground">{data.category}</span></p>
          <p className="text-muted-foreground">Percentage: <span className="font-medium text-foreground">{data.percentage}%</span></p>
        </div>
      </div>
    );
  }
  return null;
};

const formatXAxisLabel = (label) => {
  if (!label) return '';
  
  // Truncate long labels to prevent overlap
  return label.length > 15 ? label.substring(0, 15) + '...' : label;
};

export default function AdminDashboard() {
  const { data: tools = [] } = useQuery({
    queryKey: ['all-tools'],
    queryFn: () => getToolsWithCategories({ published: false, orderBy: 'created_at', ascending: false, limit: 200 }),
  })
  const { data: posts = [] } = useQuery({
    queryKey: ['all-posts'],
    queryFn: () => getBlogPosts({ published: false, orderBy: 'created_at', ascending: false, limit: 200 }),
  })
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => getCategories({ orderBy: 'sort_order', ascending: true, limit: 200 }),
  })

  const publishedTools = tools.filter(t => t.status === 'published').length
  const totalUsage = tools.reduce((sum, t) => sum + (t.usage_count || 0), 0)

  const stats = [
    { label: 'Total Tools', value: tools.length, icon: Wrench, color: 'text-primary' },
    { label: 'Published', value: publishedTools, icon: Eye, color: 'text-green-500' },
    { label: 'Blog Posts', value: posts.length, icon: BookOpen, color: 'text-accent' },
    { label: 'Categories', value: categories.length, icon: FolderOpen, color: 'text-orange-500' },
    { label: 'Total Usage', value: totalUsage.toLocaleString(), icon: TrendingUp, color: 'text-blue-500' },
  ]

  const topTools = tools
    .filter(t => t.usage_count > 0)
    .sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0))
    .slice(0, 7)
    .map(t => ({
      name: t.name || t.slug || 'Unknown Tool',
      fullName: t.name || t.slug || 'Unknown Tool',
      usage: t.usage_count || 0,
      category: t.categories?.name || 'Unknown Category',
      percentage: totalUsage > 0 ? Math.round(((t.usage_count || 0) / totalUsage) * 100) : 0
    }))

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="bg-card border-border/50">
              <CardContent className="pt-5 pb-4 px-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
                    <stat.icon className={`w-4 h-4 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className="text-xl font-bold">{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Top Tools by Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topTools.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart 
                  data={topTools} 
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  barCategoryGap="15%"
                >
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    interval={0}
                    tickFormatter={(value) => formatXAxisLabel(value)}
                  />
                  <YAxis 
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(value) => value.toLocaleString()}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="usage" 
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                    cursor="pointer"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-60 flex items-center justify-center text-muted-foreground text-sm">
                No usage data yet
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Tools</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tools.slice(0, 6).map(tool => (
                <div key={tool.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{tool.name}</p>
                    <p className="text-xs text-muted-foreground">{tool.status}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{tool.usage_count || 0} uses</span>
                </div>
              ))}
              {tools.length === 0 && (
                <p className="text-sm text-muted-foreground">No tools yet. Create your first tool!</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

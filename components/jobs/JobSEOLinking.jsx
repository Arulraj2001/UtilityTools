import React from 'react'
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query'
import {
  BookOpen,
  Wrench,
  Lightbulb,
  FileText,
  Loader,
} from 'lucide-react'

import { matchRelatedBlogs, matchRelatedTools, matchRelatedWorkflows } from '@/lib/jobs/jobRelations'

import BlogCard from '@/components/blog/BlogCard'
import ToolCard from '@/components/shared/ToolCard'
import { RelatedJobsEmptyState } from '@/components/jobs/empty-states'

function SectionHeader({ icon: Icon, title, description }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
          <Icon className="w-3.5 h-3.5 text-primary" />
        </div>
        <h3 className="font-bold text-base">{title}</h3>
      </div>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  )
}

export default function JobSEOLinking({ job }) {
  const { data: relatedBlogs, isLoading: blogsLoading } = useQuery({
    queryKey: ['job', job?.id, 'seoLinked', 'blogs'],
    queryFn: () => matchRelatedBlogs(job, { limit: 3 }),
    enabled: !!job,
  })

  const { data: relatedTools, isLoading: toolsLoading } = useQuery({
    queryKey: ['job', job?.id, 'seoLinked', 'tools'],
    queryFn: () => matchRelatedTools(job, { limit: 3 }),
    enabled: !!job,
  })

  const { data: relatedWorkflows, isLoading: workflowsLoading } = useQuery({
    queryKey: ['job', job?.id, 'seoLinked', 'workflows'],
    queryFn: () => matchRelatedWorkflows(job, { limit: 3 }),
    enabled: !!job,
  })

  if (!job) return null

  const hasContent = (relatedBlogs?.length > 0) ||
    (relatedTools?.length > 0) ||
    (relatedWorkflows?.length > 0)

  if (!hasContent && !blogsLoading && !toolsLoading && !workflowsLoading) {
    return null
  }

  return (
    <section className="mt-12 space-y-8">
      {/* PREPARATION RESOURCES */}
      {(relatedBlogs?.length > 0 || blogsLoading) && (
        <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-6">
          <SectionHeader
            icon={BookOpen}
            title="Preparation Resources"
            description="Articles and guides to help you prepare for this position"
          />

          {blogsLoading ? (
            <div className="flex items-center justify-center h-20 text-muted-foreground">
              <Loader className="w-4 h-4 animate-spin mr-2" />
              Loading resources...
            </div>
          ) : relatedBlogs && relatedBlogs.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {relatedBlogs.map(blog => (
                <BlogCard key={blog.id} post={blog} compact />
              ))}
            </div>
          ) : (
            <RelatedJobsEmptyState />
          )}
        </div>
      )}

      {/* YOU MAY ALSO NEED */}
      {(relatedTools?.length > 0 || toolsLoading) && (
        <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-6">
          <SectionHeader
            icon={Wrench}
            title="You May Also Need"
            description="Utility tools that can help you in your job search and preparation"
          />

          {toolsLoading ? (
            <div className="flex items-center justify-center h-20 text-muted-foreground">
              <Loader className="w-4 h-4 animate-spin mr-2" />
              Loading tools...
            </div>
          ) : relatedTools && relatedTools.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {relatedTools.map(tool => (
                <ToolCard key={tool.id} tool={tool} compact />
              ))}
            </div>
          ) : (
            <RelatedJobsEmptyState />
          )}
        </div>
      )}

      {/* APPLICATION WORKFLOWS */}
      {(relatedWorkflows?.length > 0 || workflowsLoading) && (
        <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-6">
          <SectionHeader
            icon={Lightbulb}
            title="Application Workflows"
            description="Step-by-step guides for the application process"
          />

          {workflowsLoading ? (
            <div className="flex items-center justify-center h-20 text-muted-foreground">
              <Loader className="w-4 h-4 animate-spin mr-2" />
              Loading workflows...
            </div>
          ) : relatedWorkflows && relatedWorkflows.length > 0 ? (
            <div className="space-y-3">
              {relatedWorkflows.map(workflow => (
                <Link
                  key={workflow.id}
                  href={workflow.slug ? `/workflow/${encodeURIComponent(workflow.slug)}` : '/workflow'}
                  className="group block p-4 rounded-xl border border-border/50 bg-background/50 hover:border-primary/30 hover:bg-primary/5 transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors shrink-0">
                      <FileText className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm group-hover:text-primary transition-colors">
                        {workflow.title || workflow.name}
                      </p>
                      {workflow.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {workflow.description}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <RelatedJobsEmptyState />
          )}
        </div>
      )}

      {/* SEO NOTE */}
      <div className="text-xs text-muted-foreground text-center py-4 border-t border-border/30">
        These resources are contextually matched to help you prepare and succeed in your career journey.
      </div>
    </section>
  )
}

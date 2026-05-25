import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function PopularWorkflows({ workflows = [], className = '' }) {
  if (!workflows || workflows.length === 0) {
    return null
  }

  return (
    <section className={`py-16 px-4 sm:px-6 max-w-7xl mx-auto ${className}`}>
      <div className="mb-12">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">Popular Workflows</h2>
        <p className="text-muted-foreground max-w-2xl">
          Step-by-step guides to complete common tasks efficiently
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {workflows.map((workflow, index) => (
          <motion.div
            key={workflow.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Link
              to={`/workflow/${encodeURIComponent(workflow.slug)}`}
              className="group relative h-full"
            >
              <div className="h-full p-6 rounded-2xl border border-border bg-card hover:border-primary/50 hover:shadow-lg transition-all duration-300 premium-card panel-highlight flex flex-col">
                {/* Featured badge */}
                {workflow.is_featured && (
                  <div className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Featured
                  </div>
                )}

                {/* Content */}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors line-clamp-2">
                    {workflow.title}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                    {workflow.excerpt || workflow.content?.substring(0, 120)}
                  </p>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-border/50">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span>Learn more</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="mt-8 text-center">
        <Link to="/workflow">
          <Button variant="outline" className="rounded-xl">
            View All Workflows
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </Link>
      </div>
    </section>
  )
}

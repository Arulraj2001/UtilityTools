import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { getIcon } from '@/lib/iconMap';

export default function CategoriesGrid({ categories = [], tools = [], countByCategory = {} }) {
  // Compute counts from any lightweight tools data if provided, and merge with incoming counts.
  const countsFromTools = useMemo(() => {
    if (!tools || tools.length === 0) return {};
    const map = {};
    tools.forEach(t => {
      if (t.category_id) map[t.category_id] = (map[t.category_id] || 0) + 1;
    });
    return map;
  }, [tools]);

  const mergedCounts = useMemo(() => ({ ...countByCategory, ...countsFromTools }), [countByCategory, countsFromTools]);

  return (
    <section className="sm:py-20 opacity-100 rounded">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">Browse by Category</h2>
          <p className="text-muted-foreground">Find the perfect tool for every task</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {categories.map((cat, i) => {
            const Icon = getIcon(cat.icon);
            return (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}>
                
                <Link
                  to={`/category/${encodeURIComponent(cat.slug)}`}
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="group block p-5 rounded-3xl bg-card border border-border/50 hover:border-primary/25 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1 premium-card panel-highlight">
                  
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/15 to-accent/10 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:shadow-md transition-all duration-300 shadow-sm">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-sm mb-1 group-hover:text-primary transition-colors">{cat.name}</h3>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{mergedCounts[cat.id] ?? cat.tool_count ?? 0} tools</span>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </Link>
              </motion.div>);

          })}
        </div>
      </div>
    </section>);

}
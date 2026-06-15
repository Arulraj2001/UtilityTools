import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronRight } from 'lucide-react';
import { getIcon } from '@/lib/iconMap';

export default function CategoriesGrid({
  categories = [],
  tools = [],
  countByCategory = {},
  hideCounts = false,
  maxItems = null,
  title = 'Browse by Category',
  subtitle = 'Find the perfect tool for every task',
  viewAllLink = '/categories',
  viewAllLabel = 'View all categories',
  showViewAll = true,
}) {
  // Compute counts from any lightweight tools data if provided, and merge with incoming counts.
  const countsFromTools = useMemo(() => {
    if (!tools || tools.length === 0) return {};
    const map = {};
    tools.forEach(t => {
      if (t.category_id) map[t.category_id] = (map[t.category_id] || 0) + 1;
      if (t.category_slug) map[t.category_slug] = (map[t.category_slug] || 0) + 1;
    });
    return map;
  }, [tools]);

  const mergedCounts = useMemo(() => ({ ...countByCategory, ...countsFromTools }), [countByCategory, countsFromTools]);
  const visibleCategories = useMemo(
    () => (maxItems ? categories.slice(0, maxItems) : categories),
    [categories, maxItems]
  );
  const gridClass = visibleCategories.length <= 5
    ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4'
    : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4';

  return (
    <section className="py-12 sm:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="mb-8 sm:mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-primary mb-3">Tool categories</p>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{title}</h2>
            <p className="mt-3 text-muted-foreground max-w-2xl">{subtitle}</p>
          </div>
          {showViewAll && (
            <Link
              to={viewAllLink}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:rounded"
            >
              {viewAllLabel} <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>

        <div className={gridClass}>
          {visibleCategories.map((cat, i) => {
            const Icon = getIcon(cat.icon);
            const count = mergedCounts[cat.id] ?? mergedCounts[cat.slug] ?? cat.tool_count ?? 0;
            return (
              <div
                key={cat.id}
                className="animate-fade-in-up"
                style={{ animationDelay: `${i * 50}ms` }}>

                <Link
                  to={`/category/${encodeURIComponent(cat.slug)}`}
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="group flex min-h-[160px] flex-col rounded-2xl bg-card border border-border/50 p-4 hover:border-primary/25 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1 premium-card panel-highlight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2">

                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/15 to-accent/10 flex items-center justify-center mb-3 group-hover:scale-105 group-hover:shadow-md transition-all duration-300 shadow-sm">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-[15px] mb-1.5 group-hover:text-primary transition-colors line-clamp-1">{cat.name}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 flex-1">
                    {cat.description || `Focused QuickUtils tools for ${cat.name.toLowerCase()} tasks.`}
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    {!hideCounts && (
                      <span className="bg-muted px-2 py-0.5 rounded-full text-xs text-muted-foreground">{count} tools</span>
                    )}
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </Link>
              </div>);

          })}
        </div>
      </div>
    </section>);

}

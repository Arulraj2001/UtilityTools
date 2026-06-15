import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import ToolCard from '../shared/ToolCard';

export default function FeaturedTools({ tools = [], categories = [], title = "Featured Tools", subtitle, viewAllLink = '/tools', compact = false }) {
  const getCategoryName = (catId, categorySlug) => (
    categories.find((c) => c.id === catId || c.slug === catId || c.slug === categorySlug)?.name || ''
  );
  if (tools.length === 0) return null;

  return (
    <section className="py-12 sm:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-end justify-between mb-8 sm:mb-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="inline-block w-1 h-8 bg-primary/60 rounded-full" />
              <h2 className="text-2xl sm:text-3xl font-bold">{title}</h2>
            </div>
            {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
          </div>
          <Link
            to={viewAllLink}
            className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:rounded">
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {tools.slice(0, 6).map((tool, i) =>
          <ToolCard
            key={tool.id}
            tool={tool}
            index={i}
            categoryName={getCategoryName(tool.category_id, tool.category_slug)}
            compact={compact} />

          )}
        </div>

        <div className="mt-6 sm:hidden text-center">
          <Link
            to={viewAllLink}
            className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:rounded">
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>);

}

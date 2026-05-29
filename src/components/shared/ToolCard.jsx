import React from 'react';
import { Link } from 'react-router-dom';
import { Star, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useLocalStorage } from '@/lib/useLocalStorage';
import { getIcon } from '@/lib/iconMap';

export default function ToolCard({ tool, index = 0, categoryName }) {
  const [bookmarks, setBookmarks] = useLocalStorage('bookmarked_tools', []);
  const isBookmarked = bookmarks.includes(tool.id);
  const Icon = getIcon(tool.icon);

  const toggleBookmark = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setBookmarks(prev =>
      prev.includes(tool.id) ? prev.filter(id => id !== tool.id) : [...prev, tool.id]
    );
  };

  return (
    <div
      className="h-full animate-fade-in-up"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <Link
        to={`/tool/${encodeURIComponent(tool.slug)}`}
        className="group block h-full rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
      >
        <div className="relative h-full p-5 rounded-3xl bg-card border border-border/50 hover:border-primary/25 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1.5 overflow-hidden premium-card panel-highlight">
          {/* Hover gradient */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/4 to-accent/4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

          <div className="relative">
            <div className="flex items-start justify-between mb-4">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary/15 to-accent/10 flex items-center justify-center group-hover:scale-110 group-hover:shadow-md transition-all duration-300 shadow-sm">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex items-center gap-1.5">
                {tool.is_trending && (
                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5 bg-orange-500/10 text-orange-500 border-0 font-medium">
                    🔥 Hot
                  </Badge>
                )}
                {tool.is_featured && (
                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5 bg-primary/10 text-primary border-0 font-medium">
                    ⭐ Top
                  </Badge>
                )}
                <button
                  onClick={toggleBookmark}
                  aria-label={isBookmarked ? 'Remove from saved tools' : 'Save tool'}
                  className="min-h-11 min-w-11 flex items-center justify-center rounded-lg hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:rounded-lg"
                >
                  <Star className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/50'}`} />
                </button>
              </div>
            </div>

            <h3 className="font-semibold text-[15px] mb-2 group-hover:text-primary transition-colors line-clamp-1 leading-snug">
              {tool.name}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
              {tool.description}
            </p>

            <div className="flex items-center justify-between pt-4 border-t border-border/30">
              <div className="flex items-center gap-2">
                {categoryName && (
                  <span className="text-xs text-muted-foreground/80 bg-muted px-2.5 py-1 rounded-full border border-border/50 font-medium">
                    {categoryName}
                  </span>
                )}
                {categoryName && tool.usage_count > 100 && (
                  <span className="w-1 h-1 rounded-full bg-muted-foreground/40 flex-shrink-0" />
                )}
                {tool.usage_count > 100 && (
                  <span className="text-xs text-muted-foreground">
                    {tool.usage_count > 1000 ? `${(tool.usage_count/1000).toFixed(1)}k` : tool.usage_count} uses
                  </span>
                )}
              </div>
              <div className="w-6 h-6 rounded-lg bg-primary/0 group-hover:bg-primary/10 flex items-center justify-center transition-all">
                <ArrowRight className="w-3.5 h-3.5 text-primary opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}

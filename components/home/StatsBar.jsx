import React from 'react';
import { Zap, Shield, Users, Clock } from 'lucide-react';

export default function StatsBar({ toolCount, userCount }) {
  const formatCount = (count) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const STATS = [
    { icon: Zap, label: 'Tools Available', value: toolCount ? `${toolCount}+` : '50+', color: 'text-yellow-500' },
    { icon: Users, label: 'Tool Uses', value: userCount ? `${formatCount(userCount)}+` : 'Public Tools', color: 'text-blue-500' },
    { icon: Shield, label: 'Privacy Approach', value: 'Browser-First', color: 'text-green-500' },
    { icon: Clock, label: 'Task Flow', value: 'Quick', color: 'text-purple-500' },
  ];
  return (
    <div className="border-y border-border/50 bg-card/50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-0">
          {STATS.map((stat, i) => (
            <div
              key={stat.label}
              className="flex items-center gap-3 transition-opacity duration-300 sm:border-r sm:border-border/40 sm:pr-4 sm:last:border-0 sm:last:pr-0"
              style={{ opacity: 1 }}
            >
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold text-base leading-none">{stat.value}</p>
                  {stat.info ? (
                    <Badge className="bg-muted text-muted-foreground border-0 text-[10px] uppercase tracking-[0.12em]">
                      {stat.info}
                    </Badge>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

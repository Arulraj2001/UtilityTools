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
    { icon: Users, label: userCount ? 'Tool Uses' : 'Public Tools', value: userCount ? `${formatCount(userCount)}+` : 'No Sign-Up', color: 'text-blue-500' },
    { icon: Shield, label: 'Privacy Approach', value: 'Browser-First', color: 'text-green-500' },
    { icon: Clock, label: 'Task Flow', value: 'Quick', color: 'text-purple-500' },
  ];
  return (
    <div className="border-y border-border/50 bg-card/50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {STATS.map((stat, i) => (
            <div key={stat.label} className="flex items-center gap-3 transition-opacity duration-300" style={{ opacity: 1 }}>
              <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <div>
                <p className="font-bold text-sm leading-none">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

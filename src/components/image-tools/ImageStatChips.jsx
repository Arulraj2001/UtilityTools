import React from 'react';
import { motion } from 'framer-motion';

export default function ImageStatChips({ stats }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`grid gap-3 grid-cols-${Math.min(stats.length, 4)}`}
      style={{ gridTemplateColumns: `repeat(${Math.min(stats.length, 4)}, 1fr)` }}
    >
      {stats.map((s, i) => (
        <div
          key={i}
          className={`rounded-2xl p-3 text-center border ${
            s.highlight
              ? 'bg-green-500/10 border-green-500/20'
              : s.accent
              ? 'bg-primary/10 border-primary/20'
              : 'bg-muted/50 border-border/40'
          }`}
        >
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">{s.label}</p>
          <p className={`font-bold text-sm ${s.highlight ? 'text-green-600' : s.accent ? 'text-primary' : ''}`}>
            {s.value}
          </p>
        </div>
      ))}
    </motion.div>
  );
}
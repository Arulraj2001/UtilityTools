import React from 'react';
import { cn } from '@/lib/utils';

export default function PresetSelector({ presets, value, onChange }) {
  return (
    <div>
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Select Exam Preset</label>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {presets.map((p) => (
          <button
            key={p.id}
            onClick={() => onChange(p)}
            className={cn(
              'text-left px-3 py-2.5 rounded-xl border text-xs font-medium transition-all',
              value?.id === p.id
                ? 'bg-primary/10 border-primary/50 text-primary'
                : 'bg-muted/30 border-border hover:border-primary/30 hover:bg-muted'
            )}
          >
            <div className="font-semibold mb-0.5">{p.label}</div>
            <div className="text-muted-foreground text-[10px] leading-tight">{p.note}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
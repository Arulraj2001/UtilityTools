import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ResultTable({ rows = [], title = 'Schedule' }) {
  const [expanded, setExpanded] = useState(false);
  if (!rows || rows.length === 0) return null;

  const headers = Object.keys(rows[0]);
  const display = expanded ? rows : rows.slice(0, 6);

  const downloadCSV = () => {
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => r[h]).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'data.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="rounded-2xl border border-border/50 bg-card overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-muted/30">
        <span className="text-sm font-medium">{title}</span>
        <Button size="sm" variant="ghost" className="h-7 px-2 gap-1.5 text-xs" onClick={downloadCSV}>
          <Download className="w-3.5 h-3.5" /> Export CSV
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/20">
              {headers.map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {display.map((row, i) => (
              <tr key={i} className={`border-t border-border/30 hover:bg-muted/20 transition-colors ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
                {headers.map(h => (
                  <td key={h} className="px-4 py-2.5 font-mono text-xs">{row[h]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > 6 && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="w-full py-2.5 text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5 border-t border-border/30 hover:bg-muted/20 transition-colors"
        >
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {expanded ? 'Show less' : `Show all ${rows.length} rows`}
        </button>
      )}
    </motion.div>
  );
}
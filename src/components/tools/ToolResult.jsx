import React from 'react';
import ResultCards from './ResultCards';
import ResultText from './ResultText';
import ResultJSON from './ResultJSON';
import ResultChart from './ResultChart';
import ResultTable from './ResultTable';
import { AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ToolResult({ result }) {
  if (!result) return null;

  if (result.error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center gap-3 p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive"
      >
        <AlertCircle className="w-5 h-5 shrink-0" />
        <p className="text-sm font-medium">{result.error}</p>
      </motion.div>
    );
  }

  return (
    <div className="relative space-y-4">
      {result.extra?.confetti && <CelebrationOverlay />}
      {result.extra?.message && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="rounded-3xl border border-pink-300/30 bg-pink-500/10 p-4 text-sm font-medium text-pink-600 shadow-sm"
        >
          {result.extra.message}
        </motion.div>
      )}
      {/* Cards */}
      {result.type === 'cards' && result.cards?.length > 0 && (
        <ResultCards cards={result.cards} />
      )}

      {/* Single number */}
      {result.type === 'number' && (
        <ResultCards cards={[{
          label: result.label || 'Result',
          value: result.formatted || String(result.value),
          raw: result.value,
          highlight: true,
        }]} />
      )}

      {/* Text output */}
      {result.type === 'text' && (
        <ResultText value={String(result.value)} label={result.label || 'Result'} />
      )}

      {/* JSON output */}
      {result.type === 'json' && (
        <ResultJSON value={result.value} label={result.label || 'JSON Output'} />
      )}

      {/* Chart */}
      {result.chart && <ResultChart chart={result.chart} />}

      {/* Color preview */}
      {result.extra?.color && (
        <div className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card">
          <div
            className="w-14 h-14 rounded-xl shadow-md border border-white/10"
            style={{ background: result.extra.color }}
          />
          <span className="text-sm font-mono text-muted-foreground">Color Preview</span>
        </div>
      )}

      {result.extra?.previewImage && (
        <div className="rounded-3xl border border-border/50 bg-card p-4">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">Preview</p>
          <img
            src={result.extra.previewImage}
            alt="Preview"
            className="w-full rounded-3xl border border-border/50 object-cover"
          />
        </div>
      )}

      {/* Table */}
      {result.table?.length > 0 && (
        <ResultTable rows={result.table} title="Schedule / Details" />
      )}
    </div>
  );
}

function CelebrationOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 8 }).map((_, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 18, scale: 0.75 }}
          animate={{ opacity: 1, y: -38 - index * 10, scale: 1 }}
          transition={{ duration: 0.85, delay: index * 0.05, ease: 'easeOut' }}
          className="absolute rounded-full bg-pink-400/70 blur-sm"
          style={{ width: 10 + index * 2, height: 10 + index * 2, left: `${8 + index * 10}%`, top: '6%' }}
        />
      ))}
    </div>
  );
}
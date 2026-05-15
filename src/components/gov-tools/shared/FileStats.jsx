import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, TrendingDown } from 'lucide-react';
import { formatFileSize } from './ExamPresets';
import { cn } from '@/lib/utils';

export function StatChip({ label, value, highlight }) {
  return (
    <div className={cn(
      'flex flex-col items-center px-4 py-2.5 rounded-xl border text-center',
      highlight ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-muted/50 border-border'
    )}>
      <span className="text-xs text-muted-foreground mb-0.5">{label}</span>
      <span className={cn('font-bold text-sm', highlight && 'text-primary')}>{value}</span>
    </div>
  );
}

export function SizeComparison({ originalBytes, outputBytes, targetKB }) {
  if (!originalBytes || !outputBytes) return null;
  const saved = originalBytes - outputBytes;
  const savedPct = ((saved / originalBytes) * 100).toFixed(0);
  const outputKB = outputBytes / 1024;
  const withinTarget = targetKB ? outputKB <= targetKB : true;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/60 bg-card p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        {withinTarget ? (
          <CheckCircle2 className="w-4 h-4 text-green-500" />
        ) : (
          <AlertTriangle className="w-4 h-4 text-orange-400" />
        )}
        <span className="text-sm font-semibold">
          {withinTarget ? 'Ready for upload!' : 'Check size requirements'}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <StatChip label="Original" value={formatFileSize(originalBytes)} />
        <StatChip label="Output" value={formatFileSize(outputBytes)} highlight={withinTarget} />
        <StatChip label="Saved" value={`${savedPct}%`} highlight={saved > 0} />
      </div>
      {targetKB && (
        <p className={cn('text-xs mt-3 text-center font-medium', withinTarget ? 'text-green-600 dark:text-green-400' : 'text-orange-500')}>
          {withinTarget
            ? `✓ Within ${targetKB} KB limit`
            : `⚠ Output ${outputKB.toFixed(1)} KB exceeds ${targetKB} KB limit — try lower quality`}
        </p>
      )}
    </motion.div>
  );
}

export function DownloadButton({ blob, filename, label = 'Download', disabled }) {
  const handleDownload = () => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={handleDownload}
      disabled={disabled || !blob}
      className="w-full py-3 px-6 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
    >
      <TrendingDown className="w-4 h-4" />
      {label}
    </button>
  );
}
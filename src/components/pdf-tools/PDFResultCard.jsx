import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, Download, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export function formatSize(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function PDFResultCard({ originalBytes, outputBytes, targetKB, onDownload, filename, label = 'Download PDF' }) {
  const saved = originalBytes - outputBytes;
  const savedPct = Math.max(0, ((saved / originalBytes) * 100)).toFixed(1);
  const outputKB = outputBytes / 1024;
  const withinTarget = targetKB ? outputKB <= targetKB : true;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className={cn('rounded-2xl border p-5 space-y-4', withinTarget ? 'border-green-500/30 bg-green-500/8' : 'border-orange-400/30 bg-orange-400/8')}>
      <div className="flex items-center gap-2.5">
        {withinTarget
          ? <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
          : <AlertTriangle className="w-5 h-5 text-orange-400 shrink-0" />}
        <div>
          <p className={cn('font-semibold text-sm', withinTarget ? 'text-green-700 dark:text-green-400' : 'text-orange-600 dark:text-orange-400')}>
            {withinTarget ? 'Processing Complete!' : `Exceeds ${targetKB} KB target`}
          </p>
          {targetKB && !withinTarget && <p className="text-xs text-muted-foreground">Output: {outputKB.toFixed(1)} KB — try a higher compression level</p>}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Original', value: formatSize(originalBytes), highlight: false },
          { label: 'Output', value: formatSize(outputBytes), highlight: withinTarget },
          { label: 'Saved', value: `${savedPct}%`, highlight: saved > 0 },
        ].map(chip => (
          <div key={chip.label} className={cn('rounded-xl p-3 text-center border', chip.highlight ? 'bg-green-500/15 border-green-500/30' : 'bg-card border-border/50')}>
            <p className="text-xs text-muted-foreground mb-0.5">{chip.label}</p>
            <p className={cn('font-bold text-sm', chip.highlight && 'text-green-600 dark:text-green-400')}>{chip.value}</p>
          </div>
        ))}
      </div>

      <button onClick={onDownload}
        className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold text-sm transition-all active:scale-95 flex items-center justify-center gap-2">
        <Download className="w-4 h-4" />
        {label}
      </button>
    </motion.div>
  );
}

export function DownloadBtn({ blob, filename, label = 'Download', className }) {
  const handleDownload = () => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <button onClick={handleDownload} disabled={!blob}
      className={cn('py-3 px-6 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold text-sm transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50', className)}>
      <Download className="w-4 h-4" />
      {label}
    </button>
  );
}
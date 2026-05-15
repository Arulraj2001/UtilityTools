import React from 'react';
import { FileText, X, ArrowUp, ArrowDown } from 'lucide-react';
import { formatSize } from './PDFResultCard';

export function PDFFileCard({ file, pageCount, onRemove, onMoveUp, onMoveDown, index, total }) {
  return (
    <div className="flex items-center gap-3 p-3.5 rounded-xl border border-border/60 bg-card hover:border-primary/20 transition-colors">
      <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
        <FileText className="w-4.5 h-4.5 text-red-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{file.name}</p>
        <p className="text-xs text-muted-foreground">
          {formatSize(file.size)}{pageCount ? ` · ${pageCount} pages` : ''}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {onMoveUp && <button onClick={onMoveUp} disabled={index === 0} className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30 transition-colors"><ArrowUp className="w-3.5 h-3.5" /></button>}
        {onMoveDown && <button onClick={onMoveDown} disabled={index === total - 1} className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30 transition-colors"><ArrowDown className="w-3.5 h-3.5" /></button>}
        {onRemove && <button onClick={onRemove} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"><X className="w-3.5 h-3.5" /></button>}
      </div>
    </div>
  );
}

export function SingleFileCard({ file, pageCount, onRemove }) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-2xl border border-border/60 bg-card">
      <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
        <FileText className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{file.name}</p>
        <p className="text-xs text-muted-foreground">{formatSize(file.size)}{pageCount ? ` · ${pageCount} pages` : ''}</p>
      </div>
      {onRemove && (
        <button onClick={onRemove} className="p-2 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
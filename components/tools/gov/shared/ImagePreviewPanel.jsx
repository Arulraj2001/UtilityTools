import React from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { formatFileSize } from './ExamPresets';

export default function ImagePreviewPanel({ original, output, originalFile, onReset }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-1 sm:grid-cols-2 gap-4"
    >
      {/* Original */}
      <div className="rounded-xl border border-border overflow-hidden bg-muted/20">
        <div className="px-3 py-2 bg-muted/40 flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Original</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{originalFile ? formatFileSize(originalFile.size) : ''}</span>
            {onReset && (
              <button onClick={onReset} className="p-0.5 rounded hover:bg-border">
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
        <div className="aspect-[4/3] flex items-center justify-center bg-[repeating-conic-gradient(#f0f0f0_0%_25%,transparent_0%_50%)_0_0/16px_16px]">
          {original && <img src={original} alt="Original" className="max-w-full max-h-full object-contain" />}
        </div>
      </div>

      {/* Output */}
      <div className="rounded-xl border border-primary/30 overflow-hidden bg-primary/5">
        <div className="px-3 py-2 bg-primary/10 flex items-center justify-between">
          <span className="text-xs font-medium text-primary">Output</span>
          {output?.sizeBytes && (
            <span className="text-xs font-semibold text-primary">{formatFileSize(output.sizeBytes)}</span>
          )}
        </div>
        <div className="aspect-[4/3] flex items-center justify-center bg-[repeating-conic-gradient(#f0f0f0_0%_25%,transparent_0%_50%)_0_0/16px_16px]">
          {output?.dataUrl
            ? <img src={output.dataUrl} alt="Output" className="max-w-full max-h-full object-contain" />
            : <p className="text-xs text-muted-foreground">Output will appear here</p>
          }
        </div>
      </div>
    </motion.div>
  );
}
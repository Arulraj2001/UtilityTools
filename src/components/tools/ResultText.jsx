import React, { useState } from 'react';
import { Copy, Check, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function ResultText({ value, label = 'Result', type = 'text' }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const download = () => {
    const blob = new Blob([value], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `result.${type === 'json' ? 'json' : 'txt'}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/50 bg-card overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-muted/30">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" className="h-7 px-2 gap-1.5 text-xs" onClick={copy}>
            {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
          <Button size="sm" variant="ghost" className="h-7 px-2 gap-1.5 text-xs" onClick={download}>
            <Download className="w-3.5 h-3.5" />
            Download
          </Button>
        </div>
      </div>
      <pre className="p-4 text-sm font-mono whitespace-pre-wrap break-all text-foreground max-h-64 overflow-y-auto">
        {value}
      </pre>
    </motion.div>
  );
}
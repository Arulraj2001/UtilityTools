import React, { useState, useEffect } from 'react';
import { Copy, Check, Download, Minimize2, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

// Simple JSON syntax highlighter (no Prism dep issues)
function highlight(json) {
  return json
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
      let cls = 'text-blue-400'; // number
      if (/^"/.test(match)) {
        if (/:$/.test(match)) cls = 'text-purple-400'; // key
        else cls = 'text-green-400'; // string
      } else if (/true|false/.test(match)) {
        cls = 'text-yellow-400';
      } else if (/null/.test(match)) {
        cls = 'text-red-400';
      }
      return `<span class="${cls}">${match}</span>`;
    });
}

export default function ResultJSON({ value, label = 'JSON Output' }) {
  const [minified, setMinified] = useState(false);
  const [copied, setCopied] = useState(false);

  const display = minified
    ? (() => { try { return JSON.stringify(JSON.parse(value)); } catch { return value; } })()
    : value;

  const copy = () => {
    navigator.clipboard.writeText(display);
    setCopied(true);
    toast.success('Copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const download = () => {
    const blob = new Blob([display], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'output.json'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/50 bg-[#0d1117] overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5">
        <span className="text-sm font-medium text-white/60">{label}</span>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" className="h-7 px-2 gap-1.5 text-xs text-white/60 hover:text-white hover:bg-white/10" onClick={() => setMinified(m => !m)}>
            {minified ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
            {minified ? 'Beautify' : 'Minify'}
          </Button>
          <Button size="sm" variant="ghost" className="h-7 px-2 gap-1.5 text-xs text-white/60 hover:text-white hover:bg-white/10" onClick={copy}>
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
          <Button size="sm" variant="ghost" className="h-7 px-2 gap-1.5 text-xs text-white/60 hover:text-white hover:bg-white/10" onClick={download}>
            <Download className="w-3.5 h-3.5" /> Download
          </Button>
        </div>
      </div>
      <pre
        className="p-4 text-sm font-mono max-h-96 overflow-y-auto leading-relaxed"
        dangerouslySetInnerHTML={{ __html: highlight(display) }}
      />
    </motion.div>
  );
}
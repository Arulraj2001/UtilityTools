import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function ResultCards({ cards = [] }) {
  const highlight = cards.find(c => c.highlight);
  const rest = cards.filter(c => !c.highlight);
  const sorted = highlight ? [highlight, ...rest] : cards;
  const cols = sorted.length <= 2 ? sorted.length : sorted.length <= 4 ? 2 : 3;

  return (
    <div className={`grid gap-3 grid-cols-1 ${
      cols === 2 ? 'sm:grid-cols-2' : cols === 3 ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-4'
    }`}>
      {sorted.map((card, i) => (
        <ResultCard key={i} card={card} index={i} />
      ))}
    </div>
  );
}

function ResultCard({ card, index }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(String(card.value ?? card.raw));
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.05, type: 'spring', stiffness: 200, damping: 20 }}
      className={`relative group rounded-2xl p-5 border transition-all ${
        card.highlight
          ? 'bg-gradient-to-br from-primary/15 to-accent/10 border-primary/30 shadow-lg shadow-primary/10'
          : 'bg-card border-border/60 hover:border-border'
      }`}
    >
      <p className="text-[11px] font-semibold text-muted-foreground mb-2 uppercase tracking-widest">{card.label}</p>
      <p
        className={`font-bold text-xl break-all leading-tight ${
          card.highlight ? 'text-primary' : 'text-foreground'
        }`}
        style={card.color ? { color: card.color } : {}}
      >
        {card.value}
      </p>
      {card.description && (
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{card.description}</p>
      )}
      <button
        onClick={copy}
        title="Copy value"
        className="absolute top-3 right-3 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-muted transition-all duration-150"
      >
        {copied
          ? <Check className="w-3.5 h-3.5 text-green-500" />
          : <Copy className="w-3.5 h-3.5 text-muted-foreground" />
        }
      </button>
    </motion.div>
  );
}
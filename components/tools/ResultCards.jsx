import React, { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Copy, Check } from 'lucide-react'
import { toast } from 'sonner'

/**
 * @typedef {{
 *   label: string,
 *   value: string,
 *   raw?: any,
 *   highlight?: boolean,
 *   description?: string,
 *   color?: string,
 * }} ResultCardItem
 */

/**
 * @param {{ cards?: ResultCardItem[] }} props
 */
function ResultCards({ cards = [] }) {
  const sortedCards = useMemo(() => {
    const highlight = cards.find((c) => c.highlight)
    const rest = cards.filter((c) => !c.highlight)
    return highlight ? [highlight, ...rest] : cards
  }, [cards])

  const cols = sortedCards.length <= 2 ? sortedCards.length : sortedCards.length <= 4 ? 2 : 3

  return (
    <div
      className={`grid gap-4 grid-cols-1 ${
        cols === 2 ? 'sm:grid-cols-2' : cols === 3 ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-4'
      }`}
    >
      {sortedCards.map((card, index) => (
        <ResultCard key={index} card={card} index={index} />
      ))}
    </div>
  )
}

export default React.memo(ResultCards)

/* ================= CARD ================= */
/**
 * @param {{ card: ResultCardItem, index: number }} props
 */
function ResultCard({ card, index }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(String(card.value ?? card.raw ?? ''))
      setCopied(true)
      toast.success('Copied')
      setTimeout(() => setCopied(false), 1200)
    } catch {
      toast.error('Copy failed')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        delay: index * 0.05,
        type: 'spring',
        stiffness: 220,
        damping: 18,
      }}
      whileHover={{ y: -3 }}
      className={`group relative overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-lg ${
        card.highlight ? 'border-primary/20 bg-gradient-to-br from-white to-slate-100' : ''
      }`}
    >
      {/* LABEL */}
      <p className="text-[11px] font-semibold text-slate-500 mb-2 uppercase tracking-widest">
        {card.label}
      </p>

      {/* VALUE */}
      <p
        className={`
          font-bold
          text-lg sm:text-xl
          break-all
          leading-tight
          transition-colors
          ${card.highlight ? 'text-primary' : 'text-slate-950'}
        `}
        style={card.color ? { color: card.color } : {}}
      >
        {card.value}
      </p>

      {/* DESCRIPTION */}
      {card.description && (
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {card.description}
        </p>
      )}

      {/* COPY BUTTON */}
      <button
        onClick={copy}
        className="
          absolute top-3 right-3
          p-1.5
          rounded-lg
          opacity-0 group-hover:opacity-100
          bg-slate-100/90
          text-slate-500
          hover:bg-slate-200
          transition-all
          duration-200
        "
      >
        {copied ? (
          <Check className="w-3.5 h-3.5 text-green-500" />
        ) : (
          <Copy className="w-3.5 h-3.5 text-muted-foreground" />
        )}
      </button>
    </motion.div>
  )
}
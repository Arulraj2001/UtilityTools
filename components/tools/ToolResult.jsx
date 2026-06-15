import React from 'react'
import ResultCards from './ResultCards'
import ResultText from './ResultText'
import ResultJSON from './ResultJSON'
import ResultChart from './ResultChart'
import ResultTable from './ResultTable'
import ResultComparisonPanel from './ResultComparisonPanel'
import { AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'

export default function ToolResult({ result }) {
  if (!result) return null

  /* ================= ERROR STATE ================= */
  if (result.error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="
          flex items-start gap-3
          p-4 rounded-2xl
          bg-red-500/10
          border border-red-500/20
          text-red-500
        "
      >
        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
        <p className="text-sm font-medium leading-relaxed">
          {result.error}
        </p>
      </motion.div>
    )
  }

  return (
    <div className="relative space-y-6">

      {/* ================= MESSAGE BANNER ================= */}
      {result.extra?.message && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="
            rounded-2xl
            border border-pink-300/30
            bg-pink-500/10
            px-4 py-3
            text-sm font-medium
            text-pink-600
          "
        >
          {result.extra.message}
        </motion.div>
      )}

      {/* ================= COMPARISON ================= */}
      {result.extra?.variantScenario && (
        <ResultComparisonPanel
          baseScenario={result}
          variantScenario={result.extra.variantScenario}
        />
      )}

      {/* ================= MAIN RESULTS ================= */}
      {result.type === 'cards' &&
        result.cards?.length > 0 && (
          <section className="space-y-3">
            <ResultCards cards={result.cards} />
          </section>
        )}

      {/* ================= SINGLE NUMBER ================= */}
      {result.type === 'number' && (
        <section>
          <ResultCards
            cards={[
              {
                label: result.label || 'Result',
                value:
                  result.formatted ||
                  String(result.value),
                raw: result.value,
                highlight: true,
              },
            ]}
          />
        </section>
      )}

      {/* ================= TEXT OUTPUT ================= */}
      {result.type === 'text' && (
        <section>
          <ResultText
            value={String(result.value)}
            label={result.label || 'Result'}
          />
        </section>
      )}

      {/* ================= JSON OUTPUT ================= */}
      {result.type === 'json' && (
        <section>
          <ResultJSON
            value={result.value}
            label={result.label || 'JSON Output'}
          />
        </section>
      )}

      {/* ================= CHART ================= */}
      {result.chart && (
        <section className="rounded-2xl border border-border/50 bg-card p-4">
          <div className="mb-3">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Analytics
            </p>

            <h3 className="text-sm font-semibold">
              Visualization
            </h3>
          </div>

          <ResultChart chart={result.chart} />
        </section>
      )}

      {/* ================= COLOR PREVIEW ================= */}
      {result.extra?.color && (
        <div className="flex items-center gap-4 p-3 rounded-2xl border border-border/50 bg-card">
          <div
            className="w-12 h-12 rounded-xl shadow-md border border-white/10"
            style={{ background: result.extra.color }}
          />

          <div>
            <p className="text-sm font-medium">
              Color Preview
            </p>

            <p className="text-xs text-muted-foreground">
              {result.extra.color}
            </p>
          </div>
        </div>
      )}

      {/* ================= IMAGE PREVIEW ================= */}
      {result.extra?.previewImage && (
        <div className="rounded-2xl border border-border/50 bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-3">
            Preview
          </p>

          <img
            src={result.extra.previewImage}
            alt="Preview"
            className="
              w-full
              rounded-2xl
              border border-border/50
              object-cover
            "
          />
        </div>
      )}

      {/* ================= TABLE ================= */}
      {result.table?.length > 0 && (
        <section className="rounded-2xl border border-border/50 bg-card overflow-hidden">
          <ResultTable
            rows={result.table}
            title="Schedule / Details"
          />
        </section>
      )}

      {/* ================= CELEBRATION ================= */}
      {result.extra?.confetti && (
        <CelebrationOverlay />
      )}
    </div>
  )
}

/* ================= CONFETTI ================= */
function CelebrationOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 8 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20, scale: 0.7 }}
          animate={{
            opacity: 1,
            y: -40 - i * 12,
            scale: 1,
          }}
          transition={{
            duration: 0.8,
            delay: i * 0.05,
          }}
          className="
            absolute
            rounded-full
            bg-pink-400/70
            blur-sm
          "
          style={{
            width: 10 + i * 2,
            height: 10 + i * 2,
            left: `${8 + i * 10}%`,
            top: '6%',
          }}
        />
      ))}
    </div>
  )
}
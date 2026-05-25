import React, { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Download, ChevronDown, ChevronUp, Table2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function ResultTable({ rows = [], title = 'Schedule' }) {
  const [expanded, setExpanded] = useState(false)

  if (!rows || rows.length === 0) return null

  const headers = useMemo(() => Object.keys(rows[0]), [rows])
  const display = expanded ? rows : rows.slice(0, 6)

  const downloadCSV = () => {
    const csv = [
      headers.join(','),
      ...rows.map(r => headers.map(h => r[h]).join(',')),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = 'data.csv'
    a.click()

    URL.revokeObjectURL(url)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="
        rounded-3xl
        border
        border-border/60
        bg-card/95
        shadow-sm
        overflow-hidden
        backdrop-blur
      "
    >

      {/* HEADER */}
      <div className="flex items-center justify-between gap-3 px-4 py-4 border-b border-border/50 bg-muted/30">

        <div className="flex items-center gap-2">
          <div className="rounded-xl bg-primary/10 p-2 text-primary">
            <Table2 className="w-4 h-4" />
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Data Table
            </p>
            <h3 className="text-sm font-semibold">
              {title}
            </h3>
          </div>
        </div>

        <Button
          size="sm"
          variant="outline"
          className="rounded-2xl text-xs gap-1.5"
          onClick={downloadCSV}
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </Button>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto">

        <table className="w-full text-sm">

          {/* HEADER ROW */}
          <thead>
            <tr className="bg-muted/20">
              {headers.map(h => (
                <th
                  key={h}
                  className="
                    px-4
                    py-3
                    text-left
                    text-[11px]
                    font-semibold
                    uppercase
                    tracking-[0.12em]
                    text-muted-foreground
                  "
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          {/* BODY */}
          <tbody>
            {display.map((row, i) => (
              <tr
                key={i}
                className={`
                  border-t
                  border-border/30
                  transition-colors
                  hover:bg-muted/20
                  ${i % 2 === 0 ? 'bg-transparent' : 'bg-muted/10'}
                `}
              >
                {headers.map(h => (
                  <td
                    key={h}
                    className="
                      px-4
                      py-2.5
                      font-mono
                      text-xs
                      text-foreground/80
                    "
                  >
                    {row[h]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* FOOTER */}
      {rows.length > 6 && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="
            w-full
            py-3
            text-xs
            font-medium
            text-muted-foreground
            hover:text-foreground
            flex
            items-center
            justify-center
            gap-2
            border-t
            border-border/30
            hover:bg-muted/20
            transition-all
          "
        >
          {expanded ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              Show all {rows.length} rows
            </>
          )}
        </button>
      )}
    </motion.div>
  )
}
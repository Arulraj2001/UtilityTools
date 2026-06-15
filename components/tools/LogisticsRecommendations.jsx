import React from 'react'
import { Sparkles, Truck, PackageCheck, ShieldCheck, AlertTriangle } from 'lucide-react'

export default function LogisticsRecommendations({ recommendations = {} }) {
  if (!recommendations) return null
  const {
    cheapestOption,
    fastestOption,
    optimizedPackaging,
    warnings = [],
  } = recommendations

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Recommendations</p>
          <h2 className="text-lg font-semibold text-slate-950">Actionable shipment guidance</h2>
        </div>
        <div className="inline-flex items-center gap-2 rounded-2xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary">
          <Sparkles className="w-4 h-4" />
          Recommendation engine
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <ActionCard icon={Truck} label="Fastest route" value={fastestOption || 'N/A'} />
        <ActionCard icon={ShieldCheck} label="Cheapest approach" value={cheapestOption || 'N/A'} />
        <ActionCard icon={PackageCheck} label="Packaging tip" value={optimizedPackaging || 'Review packaging dimensions'} />
      </div>

      {warnings.length > 0 && (
        <div className="mt-5 rounded-3xl border border-amber-300/10 bg-amber-500/5 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-700">
            <AlertTriangle className="w-4 h-4" />
            Attention points
          </div>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {warnings.map((warning, index) => (
              <li key={index} className="rounded-2xl border border-amber-300/20 bg-amber-500/5 p-3">
                {warning}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

function ActionCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center gap-3">
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-3xl bg-white text-slate-900 shadow-sm">
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{label}</p>
          <p className="mt-2 text-sm font-semibold text-slate-950">{value}</p>
        </div>
      </div>
    </div>
  )
}

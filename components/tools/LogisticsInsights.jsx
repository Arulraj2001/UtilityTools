import React from 'react'
import { Info, AlertTriangle, Sparkles, TrendingUp } from 'lucide-react'

const typeMap = {
  warning: {
    label: 'Warning',
    icon: AlertTriangle,
    classes: 'from-rose-500 to-pink-500 text-white',
  },
  optimization: {
    label: 'Optimization',
    icon: TrendingUp,
    classes: 'from-emerald-500 to-cyan-500 text-white',
  },
  recommendation: {
    label: 'Recommendation',
    icon: Sparkles,
    classes: 'from-violet-500 to-fuchsia-500 text-white',
  },
  info: {
    label: 'Info',
    icon: Info,
    classes: 'from-sky-500 to-indigo-500 text-white',
  },
}

export default function LogisticsInsights({ insights = [] }) {
  if (!insights || insights.length === 0) return null

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Insights</p>
          <h2 className="text-lg font-semibold">Logistics intelligence</h2>
        </div>
        <span className="text-xs font-medium text-muted-foreground">Contextual guidance for your shipment</span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {insights.map((insight, index) => {
          const type = typeMap[insight.type] || typeMap.info
          const Icon = type.icon
          return (
            <article
              key={index}
              className="rounded-3xl border border-border/50 bg-card p-4 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className={`rounded-2xl p-3 bg-gradient-to-br ${type.classes}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{type.label}</p>
                  <h3 className="mt-1 text-sm font-semibold text-foreground">{insight.title}</h3>
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{insight.message}</p>
            </article>
          )
        })}
      </div>
    </section>
  )
}

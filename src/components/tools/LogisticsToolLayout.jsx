import React from 'react'

export default function LogisticsToolLayout({ children }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-slate-950/95 via-slate-900/90 to-slate-950/95 p-6 shadow-2xl shadow-slate-950/20 backdrop-blur-xl">
      <div className="space-y-6">
        <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/80 p-5 shadow-inner">
          <div className="text-sm text-muted-foreground">Logistics Analytics Workspace</div>
          <h1 className="mt-2 text-2xl font-semibold text-white">Freight performance and packaging insights</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Run shipments, compare scenarios, and review premium logistics recommendations in one dashboard.
          </p>
        </div>
        {children}
      </div>
    </div>
  )
}

import React from 'react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  BarChart,
  Bar,
} from 'recharts'

const COLORS = [
  'hsl(243,75%,59%)',
  'hsl(262,83%,58%)',
  '#22c55e',
  '#f59e0b',
  '#ef4444',
]

export default function DeferredChart({ chart }) {
  if (!chart) return null

  return (
    <div className="w-full h-full">
      {chart.type === 'pie' && (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={chart.data} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" paddingAngle={3}>
              {chart.data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      )}

      {chart.type === 'area' && (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chart.data}>
            <defs>
              {(chart.dataKeys || ['value']).map((k, i) => (
                <linearGradient key={k} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS[i]} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={COLORS[i]} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            {(chart.dataKeys || ['value']).map((k, i) => (
              <Area key={k} type="monotone" dataKey={k} name={(chart.labels || [])[i] || k} stroke={COLORS[i]} fill={`url(#grad-${i})`} strokeWidth={2} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      )}

      {chart.type === 'bar' && (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chart.data} barGap={10} barCategoryGap={20}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            {(chart.dataKeys || ['value']).map((k, i) => (
              <Bar key={k} dataKey={k} fill={COLORS[i]} barSize={18} radius={[10, 10, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}

      {chart.type === 'gauge' && (
        <div className="flex items-center justify-center h-full">
          <Gauge value={chart.value} min={chart.min} max={chart.max} zones={chart.zones} />
        </div>
      )}
    </div>
  )
}

function Gauge({ value = 0, min = 0, max = 100, zones = [] }) {
  const pct = Math.min(Math.max((value - min) / (max - min), 0), 1)
  const zone = zones.find((z) => value >= z.from && value <= z.to) || zones[zones.length - 1]

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <svg viewBox="0 0 200 120" className="w-full max-w-[260px]">
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="hsl(var(--muted))" strokeWidth="14" />
        <line x1="100" y1="100" x2={100 + 65 * Math.cos(Math.PI * (1 - pct))} y2={100 - 65 * Math.sin(Math.PI * (1 - pct))} stroke={zone?.color || '#6366f1'} strokeWidth="3" />
        <circle cx="100" cy="100" r="5" fill={zone?.color} />
        <text x="100" y="116" textAnchor="middle" fontSize="14" fontWeight="600">{value.toFixed(1)}</text>
      </svg>

      {zone && (
        <div className="mt-2 px-3 py-1 rounded-full text-xs font-medium" style={{ background: zone.color + '22', color: zone.color }}>{zone.label}</div>
      )}
    </div>
  )
}

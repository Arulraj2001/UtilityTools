/**
 * PremiumSellerCharts - Shared visualization and layout components for all seller tools
 */
import React, { memo, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, AreaChart, Area, Legend,
} from 'recharts'
import { TrendingUp, TrendingDown, DollarSign, Percent, Shield, AlertTriangle, Download, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'

export const COLORS = {
  primary: '#10b981',
  primaryLight: '#34d399',
  secondary: '#3b82f6',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#8b5cf6',
  chart: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'],
  profit: ['#10b981', '#34d399', '#6ee7b7'],
  fees: ['#ef4444', '#f97316', '#f59e0b', '#eab308'],
}

// ─── KPI Card ──────────────────────────────────────────────

export const KpiCard = memo(({ label, value, icon: Icon, trend, color, prefix = '₹', suffix = '', subtitle }) => (
  <motion.div
    whileHover={{ scale: 1.02 }}
    className="bg-gradient-to-br from-card/90 to-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-4 hover:border-primary/30 transition-all"
  >
    <div className="flex items-start justify-between">
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground mb-1 truncate">{label}</p>
        <p className={`text-xl font-bold ${color || 'text-foreground'} truncate`}>
          {prefix}{typeof value === 'number' ? value.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : value}{suffix}
        </p>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {Icon && (
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-primary" />
        </div>
      )}
    </div>
    {trend !== undefined && (
      <div className={`flex items-center gap-1 mt-2 text-xs ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
        {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        <span>{Math.abs(trend)}%</span>
      </div>
    )}
  </motion.div>
))

// ─── Donut Chart ───────────────────────────────────────────

export const DonutChart = memo(({ data, title, className }) => {
  const formatted = useMemo(() => data?.filter(d => d.value > 0) || [], [data])
  if (formatted.length === 0) return null
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      className={`bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm border border-border/50 rounded-xl p-4 ${className}`}>
      <h4 className="text-sm font-semibold text-muted-foreground mb-3">{title || 'Breakdown'}</h4>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={formatted} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value" animationBegin={200} animationDuration={1200}>
            {formatted.map((entry, i) => <Cell key={entry.name} fill={COLORS.chart[i % COLORS.chart.length]} stroke="transparent" />)}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend layout="vertical" align="right" verticalAlign="middle" iconType="circle" iconSize={8}
            formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>} />
        </PieChart>
      </ResponsiveContainer>
    </motion.div>
  )
})

// ─── Bar Chart ─────────────────────────────────────────────

export const BarChartComponent = memo(({ data, title, className }) => {
  if (!data || data.length === 0) return null
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm border border-border/50 rounded-xl p-4 ${className}`}>
      <h4 className="text-sm font-semibold text-muted-foreground mb-3">{title || 'Comparison'}</h4>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} barSize={28}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => <Cell key={i} fill={entry.color || COLORS.chart[i % COLORS.chart.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  )
})

// ─── Line Chart ────────────────────────────────────────────

export const LineChartComponent = memo(({ data, title, className }) => {
  if (!data || data.length === 0) return null
  const keys = Object.keys(data[0]).filter(k => k !== 'month' && k !== 'name')
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm border border-border/50 rounded-xl p-4 ${className}`}>
      <h4 className="text-sm font-semibold text-muted-foreground mb-3">{title || 'Trend'}</h4>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip content={<CustomTooltip />} />
          {keys.map((key, i) => (
            <Line key={key} type="monotone" dataKey={key} stroke={COLORS.chart[i % COLORS.chart.length]} strokeWidth={2} dot={{ r: 3 }} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  )
})

// ─── Area Chart ────────────────────────────────────────────

export const AreaChartComponent = memo(({ data, title, className }) => {
  if (!data || data.length === 0) return null
  const keys = Object.keys(data[0]).filter(k => k !== 'name' && k !== 'month')
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm border border-border/50 rounded-xl p-4 ${className}`}>
      <h4 className="text-sm font-semibold text-muted-foreground mb-3">{title || 'Area Trend'}</h4>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data}>
          <defs>{keys.map((key, i) => (
            <linearGradient key={key} id={`grad${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS.chart[i % COLORS.chart.length]} stopOpacity={0.3} />
              <stop offset="95%" stopColor={COLORS.chart[i % COLORS.chart.length]} stopOpacity={0} />
            </linearGradient>
          ))}</defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey={(keys.length > 1 ? 'month' : 'name')} tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip content={<CustomTooltip />} />
          {keys.map((key, i) => (
            <Area key={key} type="monotone" dataKey={key} stroke={COLORS.chart[i % COLORS.chart.length]} fill={`url(#grad${i})`} strokeWidth={2} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  )
})

// ─── Gauge Meter ───────────────────────────────────────────

export const GaugeMeter = memo(({ value, max = 100, label, color, size = 120 }) => {
  const pct = Math.min((value / max) * 100, 100)
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size / 2} cy={size / 2} r={size / 2 - 8} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
          <motion.circle cx={size / 2} cy={size / 2} r={size / 2 - 8} fill="none" stroke={color || COLORS.primary} strokeWidth="6" strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * (size / 2 - 8)}`}
            strokeDashoffset={`${2 * Math.PI * (size / 2 - 8) * (1 - pct / 100)}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            initial={{ strokeDashoffset: 2 * Math.PI * (size / 2 - 8) }}
            animate={{ strokeDashoffset: 2 * Math.PI * (size / 2 - 8) * (1 - pct / 100) }}
            transition={{ duration: 1.5, ease: 'easeOut' }} />
          <text x={size / 2} y={size / 2 - 4} textAnchor="middle" className="text-lg font-bold" fill="currentColor">{Math.round(pct)}%</text>
          <text x={size / 2} y={size / 2 + 14} textAnchor="middle" className="text-[8px]" fill="rgba(255,255,255,0.5)">{label}</text>
        </svg>
      </div>
    </motion.div>
  )
})

// ─── Progress Bar ──────────────────────────────────────────

export const ProgressBar = memo(({ value, label, color, max = 100 }) => {
  const pct = Math.min((value / max) * 100, 100)
  const barColor = color || (pct > 80 ? COLORS.primary : pct > 50 ? COLORS.warning : COLORS.danger)
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{Math.round(pct)}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <motion.div className="h-full rounded-full" style={{ backgroundColor: barColor }}
          initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, ease: 'easeOut' }} />
      </div>
    </div>
  )
})

// ─── Suggestion Card ───────────────────────────────────────

export const SuggestionCard = memo(({ suggestions }) => {
  if (!suggestions || suggestions.length === 0) return null
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="bg-gradient-to-br from-amber-500/5 to-amber-500/10 border border-amber-500/20 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-4 h-4 text-amber-400" />
        <h4 className="text-sm font-semibold text-amber-400">Smart Recommendations</h4>
      </div>
      <ul className="space-y-2">
        {suggestions.map((s, i) => (
          <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
            <span className="text-amber-400 mt-0.5">•</span>
            {s}
          </li>
        ))}
      </ul>
    </motion.div>
  )
})

// ─── Export Button ─────────────────────────────────────────

export const ExportButton = memo(({ onExport, label = 'Export' }) => (
  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
    onClick={onExport}
    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-all">
    <Download className="w-3.5 h-3.5" />
    {label}
  </motion.button>
))

// ─── Copy Button ───────────────────────────────────────────

export const CopyButton = memo(({ text, label = 'Copy' }) => {
  const [copied, setCopied] = React.useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(text || '')
    setCopied(true)
    toast.success('Copied!')
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/10 text-secondary text-xs font-medium hover:bg-secondary/20 transition-all">
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copied!' : label}
    </motion.button>
  )
})

// ─── Shimmer Loading ───────────────────────────────────────

export const Shimmer = memo(({ className }) => (
  <div className={`animate-pulse bg-gradient-to-r from-muted via-muted/50 to-muted rounded-lg ${className || 'h-4 w-full'}`} />
))

export const CardSkeleton = memo(({ lines = 3 }) => (
  <div className="bg-card border border-border/50 rounded-xl p-4 space-y-3">
    <Shimmer className="h-5 w-1/2" />
    {Array.from({ length: lines }).map((_, i) => (
      <Shimmer key={i} className={`h-4 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
    ))}
  </div>
))

// ─── Section Wrapper ───────────────────────────────────────

export const Section = memo(({ title, icon: Icon, children, className }) => (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
    className={`bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm border border-border/50 rounded-xl p-4 sm:p-5 ${className}`}>
    {title && (
      <div className="flex items-center gap-2 mb-4">
        {Icon && <Icon className="w-4 h-4 text-primary" />}
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
    )}
    {children}
  </motion.div>
))

// ─── Custom Tooltip ────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="bg-card/95 backdrop-blur-md border border-border rounded-lg p-3 shadow-xl text-xs">
      <p className="font-medium mb-1">{label || payload[0]?.name}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium">₹{typeof entry.value === 'number' ? entry.value.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : entry.value}</span>
        </div>
      ))}
    </div>
  )
}
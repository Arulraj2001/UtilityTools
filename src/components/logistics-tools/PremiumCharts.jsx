// @ts-nocheck
/**
 * PremiumCharts - Shared visualization components for all logistics tools
 * Uses Recharts for interactive charts and Framer Motion for animations
 */
import React, { memo, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, LineChart, Line, AreaChart, Area,
} from 'recharts'
import { TrendingUp, TrendingDown, DollarSign, Clock, Shield, Truck } from 'lucide-react'

// ─── Color Palette ───────────────────────────────────────────

export const COLORS = {
  primary: '#10b981',
  primaryLight: '#34d399',
  secondary: '#3b82f6',
  secondaryLight: '#60a5fa',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#8b5cf6',
  chart: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'],
  donut: ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5'],
}

// ─── Cost Donut Chart ────────────────────────────────────────

export const CostDonut = memo(({ data, title, className }) => {
  const formatted = useMemo(() => data?.filter(d => d.value > 0) || [], [data])
  if (formatted.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm border border-border/50 rounded-xl p-4 ${className}`}
    >
      <h4 className="text-sm font-semibold text-muted-foreground mb-3">{title || 'Cost Breakdown'}</h4>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={formatted}
            cx="50%" cy="50%"
            innerRadius={60} outerRadius={90}
            paddingAngle={3}
            dataKey="value"
            animationBegin={200}
            animationDuration={1200}
          >
            {formatted.map((entry, i) => (
              <Cell key={entry.name} fill={COLORS.chart[i % COLORS.chart.length]} stroke="transparent" />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            layout="vertical"
            align="right"
            verticalAlign="middle"
            iconType="circle"
            iconSize={8}
            formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </motion.div>
  )
})

// ─── Comparison Bar Chart ────────────────────────────────────

export const ComparisonBar = memo(({ data, title, className }) => {
  if (!data || data.length === 0) return null
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm border border-border/50 rounded-xl p-4 ${className}`}
    >
      <h4 className="text-sm font-semibold text-muted-foreground mb-3">{title || 'Comparison'}</h4>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} barSize={28}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color || COLORS.chart[i % COLORS.chart.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  )
})

// ─── Cost Stack Chart ────────────────────────────────────────

export const CostStack = memo(({ data, title, className }) => {
  if (!data || data.length === 0) return null
  const keys = Object.keys(data[0]).filter(k => k !== 'name')
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm border border-border/50 rounded-xl p-4 ${className}`}
    >
      <h4 className="text-sm font-semibold text-muted-foreground mb-3">{title || 'Cost Stack'}</h4>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend iconSize={8} />
          {keys.map((key, i) => (
            <Bar key={key} dataKey={key} stackId="a" fill={COLORS.chart[i % COLORS.chart.length]} radius={i === keys.length - 1 ? [4, 4, 0, 0] : 0} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  )
})

// ─── Monthly Trend Line ──────────────────────────────────────

export const TrendLine = memo(({ data, title, className }) => {
  if (!data || data.length === 0) return null
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm border border-border/50 rounded-xl p-4 ${className}`}
    >
      <h4 className="text-sm font-semibold text-muted-foreground mb-3">{title || 'Monthly Trend'}</h4>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip content={<CustomTooltip />} />
          <Line type="monotone" dataKey="value" stroke={COLORS.primary} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          {data.some(d => d.value2 !== undefined) && (
            <Line type="monotone" dataKey="value2" stroke={COLORS.secondary} strokeWidth={2} dot={{ r: 3 }} />
          )}
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  )
})

// ─── Area Trend Chart ────────────────────────────────────────

export const AreaTrend = memo(({ data, title, className }) => {
  if (!data || data.length === 0) return null
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm border border-border/50 rounded-xl p-4 ${className}`}
    >
      <h4 className="text-sm font-semibold text-muted-foreground mb-3">{title || 'Trend'}</h4>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
              <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey="value" stroke={COLORS.primary} fill="url(#areaGrad)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  )
})

// ─── Animated Metric Card ────────────────────────────────────

/**
 * @typedef {{
 *   label:string,
 *   value:any,
 *   icon?: import('lucide-react').LucideIcon,
 *   trend?: number,
 *   color?: string,
 *   prefix?: string,
 *   suffix?: string,
 * }} MetricCardProps
 */

/** @type {import('react').NamedExoticComponent<MetricCardProps>} */
export const MetricCard = memo(({ label, value, icon: Icon, trend, color, prefix = '₹', suffix = '' }) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-gradient-to-br from-card/90 to-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-4 hover:border-primary/30 transition-all"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground mb-1">{label}</p>
          <p className={`text-xl font-bold ${color || 'text-foreground'}`}>
            {prefix}{typeof value === 'number' ? value.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : value}{suffix}
          </p>
        </div>
        {Icon && (
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-4 h-4 text-primary" />
          </div>
        )}
      </div>
      {trend !== undefined && (
        <div className={`flex items-center gap-1 mt-2 text-xs ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          <span>{Math.abs(trend)}% vs last month</span>
        </div>
      )}
    </motion.div>
  )
})

// ─── Animated Gauge ──────────────────────────────────────────

/**
 * @typedef {{
 *   value:number,
 *   max?:number,
 *   label:string,
 *   color?:string,
 *   size?:number,
 * }} AnimatedGaugeProps
 */

/** @type {import('react').NamedExoticComponent<AnimatedGaugeProps>} */
export const AnimatedGauge = memo(({ value, max = 100, label, color, size = 120 }) => {
  const pct = Math.min((value / max) * 100, 100)
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center"
    >
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size / 2} cy={size / 2} r={size / 2 - 8} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
          <motion.circle
            cx={size / 2} cy={size / 2} r={size / 2 - 8}
            fill="none"
            stroke={color || COLORS.primary}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * (size / 2 - 8)}`}
            strokeDashoffset={`${2 * Math.PI * (size / 2 - 8) * (1 - pct / 100)}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            initial={{ strokeDashoffset: 2 * Math.PI * (size / 2 - 8) }}
            animate={{ strokeDashoffset: 2 * Math.PI * (size / 2 - 8) * (1 - pct / 100) }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          />
          <text x={size / 2} y={size / 2 - 4} textAnchor="middle" className="text-lg font-bold" fill="currentColor">
            {Math.round(pct)}%
          </text>
          <text x={size / 2} y={size / 2 + 14} textAnchor="middle" className="text-[8px]" fill="rgba(255,255,255,0.5)">
            {label}
          </text>
        </svg>
      </div>
    </motion.div>
  )
})

// ─── Utilization Bar ─────────────────────────────────────────

/**
 * @typedef {{
 *   value:number,
 *   label:string,
 *   color?:string,
 *   showLabel?:boolean,
 * }} UtilizationBarProps
 */

/** @type {import('react').NamedExoticComponent<UtilizationBarProps>} */
export const UtilizationBar = memo(({ value, label, color, showLabel = true }) => {
  const pct = Math.min(value, 100)
  const barColor = color || (pct > 80 ? COLORS.primary : pct > 50 ? COLORS.warning : COLORS.danger)
  return (
    <div className="space-y-1">
      {showLabel && (
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">{label}</span>
          <span className="font-medium">{Math.round(pct)}%</span>
        </div>
      )}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: barColor }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
})

// ─── Progress Timeline ───────────────────────────────────────

export const ProgressTimeline = memo(({ steps, currentStep }) => {
  if (!steps || steps.length === 0) return null
  return (
    <div className="space-y-3">
      {steps.map((step, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 }}
          className="flex items-start gap-3"
        >
          <div className="flex flex-col items-center">
            <motion.div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                step.completed || i <= currentStep
                  ? 'bg-primary border-primary text-white'
                  : 'bg-card border-border text-muted-foreground'
              }`}
              animate={{ scale: i === currentStep ? [1, 1.2, 1] : 1 }}
              transition={{ duration: 0.5, repeat: i === currentStep ? Infinity : 0, repeatDelay: 2 }}
            >
              {step.completed ? '✓' : i + 1}
            </motion.div>
            {i < steps.length - 1 && (
              <div className={`w-0.5 h-8 ${step.completed ? 'bg-primary' : 'bg-border'}`} />
            )}
          </div>
          <div className="pb-4">
            <p className={`text-sm font-medium ${i === currentStep ? 'text-primary' : 'text-foreground'}`}>{step.label}</p>
            {step.subtext && <p className="text-xs text-muted-foreground">{step.subtext}</p>}
          </div>
        </motion.div>
      ))}
    </div>
  )
})

// ─── Courier Comparison Cards ────────────────────────────────

export const CourierCard = memo(({ courier, selected, onSelect }) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect?.(courier)}
      className={`rounded-xl p-4 cursor-pointer border transition-all ${
        selected
          ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
          : 'border-border/50 bg-card hover:border-primary/30'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm">{courier.name || courier.courier}</span>
        </div>
        {courier.isCheapest && (
          <span className="text-[10px] bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full font-medium">Cheapest</span>
        )}
        {courier.isFastest && (
          <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full font-medium">Fastest</span>
        )}
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-lg font-bold">₹{(courier.total || courier.cost || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" /> {courier.etaDays || courier.eta || '-'} days
          </p>
        </div>
        <div className={`text-[10px] px-2 py-1 rounded-full ${
          courier.riskLevel === 'low' ? 'bg-green-500/10 text-green-400' :
          courier.riskLevel === 'medium' ? 'bg-yellow-500/10 text-yellow-400' :
          'bg-red-500/10 text-red-400'
        }`}>
          {courier.riskLevel || 'Low'} Risk
        </div>
      </div>
    </motion.div>
  )
})

// ─── Custom Tooltip ──────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="bg-card/95 backdrop-blur-md border border-border rounded-lg p-3 shadow-xl text-xs">
      <p className="font-medium mb-1">{label || payload[0]?.name}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium">{typeof entry.value === 'number' ? entry.value.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : entry.value}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Shimmer Loading ─────────────────────────────────────────

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
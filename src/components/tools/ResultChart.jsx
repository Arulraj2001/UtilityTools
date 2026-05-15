import React from 'react';
import { motion } from 'framer-motion';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Legend,
  BarChart, Bar,
} from 'recharts';

const COLORS = ['hsl(243,75%,59%)', 'hsl(262,83%,58%)', '#22c55e', '#f59e0b', '#ef4444'];

const fmt = (v) => {
  if (v >= 1e6) return `₹${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e5) return `₹${(v / 1e3).toFixed(0)}K`;
  return v.toLocaleString();
};

export default function ResultChart({ chart }) {
  if (!chart) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.1 }}
      className="rounded-2xl border border-border/50 bg-card p-4"
    >
      {chart.type === 'pie' && <PieChartView data={chart.data} />}

      {chart.type === 'area' && (
        <AreaChartView
          data={chart.data}
          dataKeys={chart.dataKeys}
          labels={chart.labels}
        />
      )}

      {chart.type === 'bar' && (
        <BarChartView
          data={chart.data}
          dataKeys={chart.dataKeys}
        />
      )}

      {chart.type === 'gauge' && (
        <GaugeView
          value={chart.value}
          min={chart.min}
          max={chart.max}
          zones={chart.zones}
        />
      )}
    </motion.div>
  );
}

/* ---------------- PIE ---------------- */
function PieChartView({ data }) {
  return (
    <div>
      <p className="text-sm font-medium text-muted-foreground mb-3">
        Breakdown
      </p>

      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            dataKey="value"
            paddingAngle={3}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>

          <Tooltip formatter={(v) => fmt(v)} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ---------------- AREA ---------------- */
function AreaChartView({ data, dataKeys = ['value'], labels = [] }) {
  return (
    <div>
      <p className="text-sm font-medium text-muted-foreground mb-3">
        Growth Chart
      </p>

      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data}>
          <defs>
            {dataKeys.map((k, i) => (
              <linearGradient
                key={k}
                id={`grad-${i}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="5%" stopColor={COLORS[i]} stopOpacity={0.3} />
                <stop offset="95%" stopColor={COLORS[i]} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />

          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={fmt} tick={{ fontSize: 11 }} />
          <Tooltip formatter={fmt} />
          <Legend />

          {dataKeys.map((k, i) => (
            <Area
              key={k}
              type="monotone"
              dataKey={k}
              name={labels[i] || k}
              stroke={COLORS[i]}
              fill={`url(#grad-${i})`}
              strokeWidth={2}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ----------------🔥 IMPROVED BAR CHART ---------------- */
function BarChartView({ data, dataKeys = ['value'] }) {
  return (
    <div className="w-full max-w-md mx-auto px-2">
      <ResponsiveContainer width="100%" height={270}>
        <BarChart data={data} barGap={12} barCategoryGap={18}>

          <defs>
            {COLORS.map((color, i) => (
              <linearGradient
                key={i}
                id={`barGrad-${i}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={color} stopOpacity={0.9} />
                <stop offset="100%" stopColor={color} stopOpacity={0.35} />
              </linearGradient>
            ))}
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
            opacity={0.5}
          />

          <XAxis
            dataKey="name"
            tick={{ fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            dy={8}
          />

          <YAxis
            tick={{ fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            dx={-6}
          />

          <Tooltip cursor={{ fill: 'rgba(255,255,255,0.04)' }} />

          {dataKeys.map((k, i) => (
            <Bar
              key={k}
              dataKey={k}
              fill={`url(#barGrad-${i})`}

              /* UI IMPROVEMENTS */
              barSize={16}
              radius={[14, 14, 0, 0]}
              animationDuration={900}
              animationEasing="ease-out"
            />
          ))}

        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ---------------- GAUGE ---------------- */
function GaugeView({ value, min = 0, max = 100, zones = [] }) {
  const pct = Math.min(Math.max((value - min) / (max - min), 0), 1);
  const zone =
    zones.find(z => value >= z.from && value <= z.to) ||
    zones[zones.length - 1];

  return (
    <div className="flex flex-col items-center">
      <p className="text-sm font-medium text-muted-foreground mb-2">
        BMI Gauge
      </p>

      <svg viewBox="0 0 200 120" className="w-full max-w-[240px]">
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="16"
        />

        {zones.map((z, i) => {
          const s = (z.from - min) / (max - min);
          const e = (z.to - min) / (max - min);

          const startAngle = Math.PI * (1 - s);
          const endAngle = Math.PI * (1 - e);

          const x1 = 100 + 80 * Math.cos(startAngle);
          const y1 = 100 - 80 * Math.sin(startAngle);
          const x2 = 100 + 80 * Math.cos(endAngle);
          const y2 = 100 - 80 * Math.sin(endAngle);

          const large = (e - s) > 0.5 ? 1 : 0;

          return (
            <path
              key={i}
              d={`M ${x1} ${y1} A 80 80 0 ${large} 0 ${x2} ${y2}`}
              fill="none"
              stroke={z.color}
              strokeWidth="16"
              opacity={0.8}
            />
          );
        })}

        <line
          x1="100"
          y1="100"
          x2={100 + 65 * Math.cos(Math.PI * (1 - pct))}
          y2={100 - 65 * Math.sin(Math.PI * (1 - pct))}
          stroke={zone?.color || '#6366f1'}
          strokeWidth="3"
        />

        <circle cx="100" cy="100" r="6" fill={zone?.color || '#6366f1'} />

        <text
          x="100"
          y="116"
          textAnchor="middle"
          fontSize="14"
          fontWeight="bold"
        >
          {value.toFixed(1)}
        </text>
      </svg>

      {zone && (
        <div
          className="mt-2 px-3 py-1 rounded-full text-sm font-medium"
          style={{ background: zone.color + '22', color: zone.color }}
        >
          {zone.label}
        </div>
      )}
    </div>
  );
}
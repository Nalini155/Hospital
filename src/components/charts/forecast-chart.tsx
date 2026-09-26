'use client'

import { useId } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { formatDate } from '@/lib/format'

export type ForecastChartData = {
  date: string
  actual?: number
  forecast?: number
  lower?: number
  upper?: number
  [key: string]: unknown
}

const axisStyle = { fontSize: 11, fill: 'oklch(0.52 0.02 215)' }

export function ForecastChart({
  data,
  height = 280,
  unit = '',
  showBand = true,
  showLegend = true,
  actualName = 'Actual',
  forecastName = 'Forecast',
}: {
  data: ForecastChartData[]
  height?: number
  unit?: string
  showBand?: boolean
  showLegend?: boolean
  actualName?: string
  forecastName?: string
}) {
  // Ranged area for the 95% confidence interval band.
  // Recharts draws an Area between [low, high] when dataKey points to array values.
  // On past (actual-only) points we collapse the range to the actual value (zero-width, invisible).
  const transformed = data.map((d) => {
    const fallback = d.actual ?? d.forecast ?? 0
    const range =
      d.upper != null && d.lower != null ? [d.lower, d.upper] : [fallback, fallback]
    return { ...d, range }
  })

  // Unique gradient id per instance to avoid duplicate-id collisions across charts
  const gid = useId().replace(/[:]/g, '')
  const bandId = `bandFill-${gid}`

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={transformed} margin={{ top: 8, right: 16, bottom: 4, left: -12 }}>
        <defs>
          <linearGradient id={bandId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.46 0.11 210)" stopOpacity={0.32} />
            <stop offset="100%" stopColor="oklch(0.46 0.11 210)" stopOpacity={0.1} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="oklch(0.91 0.008 220)" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={(v) => formatDate(v)}
          tick={axisStyle}
          tickLine={false}
          axisLine={{ stroke: 'oklch(0.91 0.008 220)' }}
          minTickGap={28}
        />
        <YAxis
          tick={axisStyle}
          tickLine={false}
          axisLine={false}
          width={48}
          tickFormatter={(v) => (unit === '%' ? `${v}%` : `${v}`)}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          labelFormatter={(l) => formatDate(String(l))}
          formatter={(value: number | number[], name: string) => {
            if (name === 'range') {
              const arr = Array.isArray(value) ? value : [value, value]
              return [`[${arr[0]} – ${arr[1]}]${unit}`, '95% CI']
            }
            const label = name === 'actual' ? actualName : name === 'forecast' ? forecastName : name
            return [`${value}${unit}`, label]
          }}
        />
        {showLegend && (
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            iconType="plainline"
            formatter={(v: string) =>
              v === 'actual' ? actualName : v === 'forecast' ? forecastName : '95% CI'
            }
          />
        )}
        {showBand && (
          <Area
            type="monotone"
            dataKey="range"
            stroke="none"
            fill={`url(#${bandId})`}
            isAnimationActive={false}
            name="95% CI"
            legendType="plainline"
          />
        )}
        <Line
          type="monotone"
          dataKey="actual"
          stroke="oklch(0.46 0.11 210)"
          strokeWidth={2.5}
          dot={false}
          connectNulls={false}
          isAnimationActive={false}
          name={actualName}
        />
        <Line
          type="monotone"
          dataKey="forecast"
          stroke="oklch(0.6 0.1 185)"
          strokeWidth={2.5}
          strokeDasharray="6 4"
          dot={false}
          connectNulls={false}
          isAnimationActive={false}
          name={forecastName}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

const tooltipStyle: React.CSSProperties = {
  borderRadius: 10,
  border: '1px solid oklch(0.91 0.008 220)',
  background: 'oklch(1 0 0)',
  boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
  fontSize: 12,
}

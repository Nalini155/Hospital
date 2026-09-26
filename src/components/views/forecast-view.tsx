'use client'

import { useState } from 'react'
import {
  TrendingUp,
  Activity,
  Sigma,
  CalendarDays,
  SlidersHorizontal,
  BedDouble,
  HeartPulse,
  CircleAlert,
} from 'lucide-react'
import { useForecast } from '@/hooks/use-api'
import { SectionCard, KpiCard } from '@/components/views/shared'
import { ForecastChart } from '@/components/charts/forecast-chart'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatLongDate } from '@/lib/format'
import type { ForecastPoint } from '@/lib/types'

type Metric = 'admissions' | 'bedsUsed' | 'icuUsed'

const METRIC_OPTIONS: {
  value: Metric
  label: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  { value: 'admissions', label: 'Admissions', icon: TrendingUp },
  { value: 'bedsUsed', label: 'Ward Occupancy', icon: BedDouble },
  { value: 'icuUsed', label: 'ICU Occupancy', icon: HeartPulse },
]

const METRIC_META: Record<
  Metric,
  {
    meanLabel: string
    peakLabel: string
    totalLabel: string
    varianceLabel: string
    unit?: string
  }
> = {
  admissions: {
    meanLabel: 'Mean daily admissions',
    peakLabel: 'Peak admissions day',
    totalLabel: 'Total admissions (7d)',
    varianceLabel: 'Daily variance',
  },
  bedsUsed: {
    meanLabel: 'Mean ward beds used',
    peakLabel: 'Peak ward beds day',
    totalLabel: 'Total bed-days (7d)',
    varianceLabel: 'Daily variance',
    unit: ' beds',
  },
  icuUsed: {
    meanLabel: 'Mean ICU beds used',
    peakLabel: 'Peak ICU beds day',
    totalLabel: 'Total ICU-days (7d)',
    varianceLabel: 'Daily variance',
    unit: ' beds',
  },
}

export function ForecastView() {
  const [metric, setMetric] = useState<Metric>('admissions')
  const { data, isLoading, isError } = useForecast(metric, 7)

  return (
    <div className="space-y-6">
      {/* Metric selector */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-foreground">
            Demand Forecast
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Configure a metric and review the 7-day projection with 95% confidence intervals.
          </p>
        </div>
        <Tabs value={metric} onValueChange={(v) => setMetric(v as Metric)}>
          <TabsList className="h-10">
            {METRIC_OPTIONS.map((opt) => (
              <TabsTrigger
                key={opt.value}
                value={opt.value}
                className="px-3 text-xs sm:text-sm"
              >
                <opt.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{opt.label}</span>
                <span className="sm:hidden">{opt.label.split(' ')[0]}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {isError ? (
        <ForecastErrorState />
      ) : isLoading || !data ? (
        <ForecastSkeleton />
      ) : (
        <ForecastContent metric={metric} data={data} />
      )}
    </div>
  )
}

function ForecastContent({
  metric,
  data,
}: {
  metric: Metric
  data: NonNullable<ReturnType<typeof useForecast>['data']>
}) {
  const { forecast, series, params } = data
  const meta = METRIC_META[metric]
  const points = forecast.points

  // Compute summary stats from the 7-day forecast points
  const total = points.reduce((acc, p) => acc + p.forecast, 0)
  let peak: ForecastPoint = points[0]
  for (const p of points) {
    if (p.forecast > peak.forecast) peak = p
  }
  const mean = forecast.mean
  const std = forecast.std

  const unitSuffix = meta.unit ?? ''

  return (
    <div className="space-y-6">
      {/* Main forecast chart */}
      <SectionCard
        title="7-day demand forecast"
        subtitle="Last 30 days actual + 7-day projection (95% confidence interval)"
        action={
          <Badge variant="outline" className="font-mono text-[11px]">
            horizon · 7d
          </Badge>
        }
      >
        <ForecastChart
          data={series}
          height={340}
          actualName="Actual"
          forecastName="Forecast"
        />
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          Forecast model: Holt&apos;s linear trend exponential smoothing with weekly
          seasonality. Confidence intervals derived from in-sample residual standard
          deviation (95% level).
        </p>
      </SectionCard>

      {/* Forecast summary stat tiles */}
      <SectionCard title="Forecast summary" subtitle="7-day horizon aggregate statistics">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
          <KpiCard
            label={meta.meanLabel}
            value={Math.round(mean)}
            unit={unitSuffix || undefined}
            icon={TrendingUp}
            accent="primary"
            hint="Average per day across horizon"
          />
          <KpiCard
            label={meta.peakLabel}
            value={Math.round(peak.forecast)}
            unit={unitSuffix || undefined}
            icon={Activity}
            accent="amber"
            hint={formatLongDate(peak.date)}
          />
          <KpiCard
            label={meta.totalLabel}
            value={Math.round(total)}
            unit={unitSuffix || undefined}
            icon={CalendarDays}
            accent="teal"
            hint="Sum across 7 forecast days"
          />
          <KpiCard
            label={meta.varianceLabel}
            value={std.toFixed(1)}
            unit={unitSuffix || undefined}
            icon={Sigma}
            accent="primary"
            hint="Residual std (daily)"
          />
          <KpiCard
            label="Model parameters"
            value={`α ${params.alpha.toFixed(2)} · β ${params.beta.toFixed(2)}`}
            icon={SlidersHorizontal}
            accent="primary"
            hint="Grid-tuned smoothing"
          />
        </div>
      </SectionCard>

      {/* Daily forecast detail table */}
      <SectionCard
        title="Daily forecast detail"
        subtitle="Point forecast with 95% confidence bounds and variance"
        bodyClassName="p-0"
      >
        <div className="max-h-[28rem] overflow-y-auto scroll-thin">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-border/60">
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="text-xs font-semibold uppercase tracking-wide">
                  Date
                </TableHead>
                <TableHead className="text-right text-xs font-semibold uppercase tracking-wide">
                  Forecast
                </TableHead>
                <TableHead className="text-right text-xs font-semibold uppercase tracking-wide">
                  Lower 95%
                </TableHead>
                <TableHead className="text-right text-xs font-semibold uppercase tracking-wide">
                  Upper 95%
                </TableHead>
                <TableHead className="text-right text-xs font-semibold uppercase tracking-wide">
                  Variance
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {points.map((p) => {
                const isPeak = p.date === peak.date
                return (
                  <TableRow key={p.date} className="text-sm">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span>{formatLongDate(p.date)}</span>
                        {isPeak && (
                          <Badge
                            variant="outline"
                            className="border-amber-500/40 bg-amber-50 text-[10px] font-semibold uppercase text-amber-600 dark:bg-amber-500/5"
                          >
                            Peak
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold text-primary">
                      {Math.round(p.forecast)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {Math.round(p.lower)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {Math.round(p.upper)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {Math.round(p.upper - p.lower)}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </SectionCard>
    </div>
  )
}

function ForecastErrorState() {
  return (
    <div className="flex h-64 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
      <CircleAlert className="h-8 w-8 text-destructive" />
      <p>Failed to load forecast data.</p>
      <p className="text-xs">Try regenerating the dataset from the header.</p>
    </div>
  )
}

function ForecastSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-[404px] rounded-xl" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[120px] rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-[360px] rounded-xl" />
    </div>
  )
}

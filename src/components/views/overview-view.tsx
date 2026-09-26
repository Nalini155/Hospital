'use client'

import {
  BedDouble,
  HeartPulse,
  TrendingUp,
  AlertTriangle,
  ShieldCheck,
  CircleAlert,
  Hospital,
  RotateCw,
  Loader2,
} from 'lucide-react'
import { useDashboard } from '@/hooks/use-api'
import { SectionCard, KpiCard } from '@/components/views/shared'
import { ForecastChart } from '@/components/charts/forecast-chart'
import { Button } from '@/components/ui/button'
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
import { cn } from '@/lib/utils'
import { formatLongDate, signed } from '@/lib/format'
import type { DashboardOverview } from '@/lib/types'

export function OverviewView() {
  const { data, isLoading, isError, error, refetch, isFetching } = useDashboard()

  if (isError) {
    const reason =
      error instanceof Error ? error.message : 'Unknown error.'
    return (
      <div className="flex min-h-[20rem] flex-col items-center justify-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
        <CircleAlert className="h-10 w-10 text-destructive" />
        <p className="text-base font-semibold text-foreground">
          Failed to load dashboard data
        </p>
        <p className="max-w-md text-sm text-muted-foreground">{reason}</p>
        <div className="mt-2 flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            {isFetching ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RotateCw className="mr-2 h-4 w-4" />
            )}
            Retry
          </Button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          If the error persists, try regenerating the dataset from the header button.
        </p>
      </div>
    )
  }
  if (isLoading || !data) return <OverviewSkeleton />

  return <OverviewContent data={data} />
}

function OverviewContent({ data }: { data: DashboardOverview }) {
  const { today, forecast7, forecastBed7, forecastIcu7, trend, gaps, alerts } = data
  const expectedAdmissions = Math.round(forecast7.mean)
  const occupancyTrendDelta = today.occupancyPct - 72 // baseline-ish; we don't have yesterday's here

  return (
    <div className="space-y-6">
      {/* Alert banners */}
      {alerts.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {alerts.map((a) => (
            <AlertCard key={a.id} alert={a} />
          ))}
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Ward Occupancy"
          value={today.occupancyPct}
          unit="%"
          icon={BedDouble}
          accent={today.occupancyPct >= 90 ? 'red' : today.occupancyPct >= 85 ? 'amber' : 'primary'}
          trend={{
            value: `${occupancyTrendDelta >= 0 ? '▲' : '▼'} ${Math.abs(occupancyTrendDelta)}% vs 72% baseline`,
            positive: occupancyTrendDelta <= 0,
          }}
          hint={`${today.bedsCapacity - today.availableBeds}/${today.bedsCapacity} beds in use`}
        />
        <KpiCard
          label="ICU Occupancy"
          value={today.icuOccupancyPct}
          unit="%"
          icon={HeartPulse}
          accent={today.icuOccupancyPct >= 90 ? 'red' : today.icuOccupancyPct >= 85 ? 'amber' : 'teal'}
          hint={`${today.icuUsed}/${today.icuCapacity} ICU beds in use`}
        />
        <KpiCard
          label="Available Beds"
          value={today.availableBeds}
          icon={Hospital}
          accent="primary"
          hint={`${today.availableIcu} ICU beds available`}
        />
        <KpiCard
          label="Expected Admissions (7d avg)"
          value={expectedAdmissions}
          icon={TrendingUp}
          accent="teal"
          trend={{ value: `±${Math.round(forecast7.std)} daily variance`, positive: true }}
          hint="Forecast horizon: next 7 days"
        />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <SectionCard
          title="Admissions forecast"
          subtitle="Last 3 weeks actual + 7-day projection (95% CI)"
          className="lg:col-span-2"
          action={
            <Badge variant="outline" className="font-mono text-[11px]">
              α={data.params.alpha.toFixed(2)} · β={data.params.beta.toFixed(2)}
            </Badge>
          }
        >
          <ForecastChart data={trend} height={300} />
        </SectionCard>

        <SectionCard
          title="Resource gap"
          subtitle="Forecast need vs. available capacity"
          bodyClassName="p-0"
        >
          <ResourceGapTable gaps={gaps} />
        </SectionCard>
      </div>

      {/* Secondary charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard
          title="Projected ward occupancy"
          subtitle="Next 7 days vs capacity"
        >
          <ForecastChart
            data={forecastBed7.points.map((p) => ({
              date: p.date,
              forecast: p.forecast,
              lower: p.lower,
              upper: p.upper,
            }))}
            height={240}
            actualName="Ward beds"
            forecastName="Projected"
            showLegend={false}
          />
        </SectionCard>
        <SectionCard
          title="Projected ICU occupancy"
          subtitle="Next 7 days vs capacity"
        >
          <ForecastChart
            data={forecastIcu7.points.map((p) => ({
              date: p.date,
              forecast: p.forecast,
              lower: p.lower,
              upper: p.upper,
            }))}
            height={240}
            actualName="ICU beds"
            forecastName="Projected"
            showLegend={false}
          />
        </SectionCard>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Data as of {formatLongDate(today.date)} · Forecast model: Holt linear trend exponential
        smoothing with weekly seasonality.
      </p>
    </div>
  )
}

function AlertCard({
  alert,
}: {
  alert: DashboardOverview['alerts'][number]
}) {
  const critical = alert.level === 'critical'
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-xl border p-4 shadow-sm',
        critical
          ? 'border-destructive/30 bg-destructive/5'
          : 'border-amber-500/30 bg-amber-50 dark:bg-amber-500/5',
      )}
    >
      <div
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
          critical ? 'bg-destructive/10 text-destructive' : 'bg-amber-500/15 text-amber-600',
        )}
      >
        {critical ? <AlertTriangle className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">{alert.title}</h3>
          <Badge
            variant="outline"
            className={cn(
              'text-[10px] font-semibold uppercase',
              critical
                ? 'border-destructive/30 text-destructive'
                : 'border-amber-500/40 text-amber-600',
            )}
          >
            {alert.level}
          </Badge>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{alert.message}</p>
        <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="font-medium text-foreground">{alert.occupancyPct}%</span>
          <span>peak occupancy</span>
          <span aria-hidden>·</span>
          <span>{alert.dateRange}</span>
        </div>
      </div>
    </div>
  )
}

function ResourceGapTable({ gaps }: { gaps: DashboardOverview['gaps'] }) {
  return (
    <div className="overflow-hidden rounded-lg">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="text-xs font-semibold uppercase tracking-wide">Resource</TableHead>
            <TableHead className="text-right text-xs font-semibold uppercase tracking-wide">
              Available
            </TableHead>
            <TableHead className="text-right text-xs font-semibold uppercase tracking-wide">
              Forecast need
            </TableHead>
            <TableHead className="text-right text-xs font-semibold uppercase tracking-wide">
              Gap
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {gaps.map((g) => (
            <TableRow key={g.resource} className="text-sm">
              <TableCell className="font-medium">{g.resource}</TableCell>
              <TableCell className="text-right tabular-nums">{g.available}</TableCell>
              <TableCell className="text-right tabular-nums">{g.forecastNeed}</TableCell>
              <TableCell className="text-right">
                <GapBadge gap={g.gap} severity={g.severity} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function GapBadge({
  gap,
  severity,
}: {
  gap: number
  severity: 'ok' | 'watch' | 'critical'
}) {
  if (severity === 'ok') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
        <ShieldCheck className="h-3.5 w-3.5" /> {signed(gap)}
      </span>
    )
  }
  if (severity === 'watch') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600">
        <AlertTriangle className="h-3.5 w-3.5" /> {signed(gap)}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-destructive">
      <AlertTriangle className="h-3.5 w-3.5" /> {signed(gap)}
    </span>
  )
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[120px] rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Skeleton className="h-[360px] rounded-xl lg:col-span-2" />
        <Skeleton className="h-[360px] rounded-xl" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-[300px] rounded-xl" />
        <Skeleton className="h-[300px] rounded-xl" />
      </div>
    </div>
  )
}

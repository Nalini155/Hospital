'use client'

import {
  AlertTriangle,
  ShieldCheck,
  CircleAlert,
  Gauge,
  Scale,
} from 'lucide-react'
import { useAlerts } from '@/hooks/use-api'
import { SectionCard } from '@/components/views/shared'
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
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { signed } from '@/lib/format'
import type { CapacityAlert, ResourceGap } from '@/lib/types'

export function AlertsView() {
  const { data, isLoading, isError } = useAlerts()

  if (isError) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
        <CircleAlert className="h-8 w-8 text-destructive" />
        <p>Failed to load capacity alerts.</p>
        <p className="text-xs">Try refreshing, or regenerate the dataset from the header.</p>
      </div>
    )
  }

  if (isLoading || !data) return <AlertsSkeleton />

  return <AlertsContent alerts={data.alerts} gaps={data.gaps} />
}

function AlertsContent({
  alerts,
  gaps,
}: {
  alerts: CapacityAlert[]
  gaps: ResourceGap[]
}) {
  const criticalCount = alerts.filter((a) => a.level === 'critical').length
  const warningCount = alerts.filter((a) => a.level === 'warning').length
  const total = alerts.length
  const allClear = total === 0

  return (
    <div className="space-y-6">
      {/* Summary header row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
          <SummaryStat label="Critical" value={criticalCount} tone="critical" />
          <SummaryStat label="Warning" value={warningCount} tone="warning" />
        </div>
        <StatusPill total={total} hasCritical={criticalCount > 0} />
      </div>

      {/* Alerts / all clear */}
      {allClear ? (
        <AllClearCard />
      ) : (
        <div className="space-y-4">
          {alerts.map((a) => (
            <AlertCard key={a.id} alert={a} />
          ))}
        </div>
      )}

      {/* Resource gap summary */}
      <SectionCard
        title="Resource gap summary"
        subtitle="Forecast need vs. available capacity over the next 7 days"
        bodyClassName="p-0"
      >
        <ResourceGapTable gaps={gaps} />
      </SectionCard>

      {/* Threshold configuration */}
      <SectionCard
        title="Threshold configuration"
        subtitle="How alerts are triggered and what the colors mean"
        action={
          <Badge variant="outline" className="font-mono text-[11px]">
            UI-only
          </Badge>
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <ThresholdCard
            icon={Gauge}
            label="Warning threshold"
            value="≥ 85% occupancy"
            description="Ward or ICU occupancy forecast to reach this level surfaces a warning (amber) alert."
            tone="warning"
          />
          <ThresholdCard
            icon={AlertTriangle}
            label="Critical threshold"
            value="≥ 90% occupancy"
            description="Occupancy forecast to exceed this level triggers a critical (red) capacity alert."
            tone="critical"
          />
          <ThresholdCard
            icon={Scale}
            label="Gap definition"
            value="forecast need − available"
            description="A positive gap indicates a shortage; zero or negative means capacity is sufficient."
            tone="primary"
          />
        </div>
        <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
          Red and amber are reserved strictly for active alerts — they are not used as decorative accents elsewhere in the dashboard.
        </p>
      </SectionCard>
    </div>
  )
}

function SummaryStat({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'critical' | 'warning' | 'neutral'
}) {
  const valueClasses =
    tone === 'critical'
      ? 'text-destructive'
      : tone === 'warning'
        ? 'text-amber-600'
        : 'text-foreground'
  return (
    <div className="flex items-baseline gap-2">
      <span className={cn('text-3xl font-semibold tabular-nums', valueClasses)}>
        {value}
      </span>
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
    </div>
  )
}

function StatusPill({
  total,
  hasCritical,
}: {
  total: number
  hasCritical: boolean
}) {
  if (total === 0) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-3.5 py-1.5 text-xs font-medium text-success">
        <ShieldCheck className="h-4 w-4" />
        All systems within capacity
      </div>
    )
  }
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium',
        hasCritical
          ? 'border-destructive/30 bg-destructive/10 text-destructive'
          : 'border-amber-500/40 bg-amber-50 text-amber-600 dark:bg-amber-500/10',
      )}
    >
      <AlertTriangle className="h-4 w-4" />
      {total} capacity {total === 1 ? 'alert' : 'alerts'} active
    </div>
  )
}

function AlertCard({ alert }: { alert: CapacityAlert }) {
  const critical = alert.level === 'critical'
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-xl border p-5 shadow-sm',
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
        <div className="flex flex-wrap items-center gap-2">
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
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <span className="font-semibold text-foreground">{alert.occupancyPct}%</span>
          <span>peak occupancy</span>
          <span aria-hidden>·</span>
          <span>{alert.dateRange}</span>
          <span aria-hidden>·</span>
          <span>{alert.resource}</span>
        </div>
      </div>
    </div>
  )
}

function AllClearCard() {
  return (
    <Card className="flex flex-col items-center justify-center gap-4 border-success/30 bg-success/5 p-8 text-center shadow-sm sm:flex-row sm:gap-5 sm:text-left">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
        <ShieldCheck className="h-8 w-8" />
      </div>
      <div className="space-y-1.5">
        <h3 className="text-lg font-semibold text-foreground">No capacity alerts</h3>
        <p className="max-w-md text-sm text-muted-foreground">
          Forecasted ward and ICU occupancy remain below warning thresholds (85%) for the next 7 days.
        </p>
      </div>
    </Card>
  )
}

function ResourceGapTable({ gaps }: { gaps: ResourceGap[] }) {
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
            <TableHead className="text-right text-xs font-semibold uppercase tracking-wide">
              Severity
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {gaps.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center text-xs text-muted-foreground">
                No resource gaps detected for the next 7 days.
              </TableCell>
            </TableRow>
          ) : (
            gaps.map((g) => (
              <TableRow key={g.resource} className="text-sm">
                <TableCell className="font-medium">{g.resource}</TableCell>
                <TableCell className="text-right tabular-nums">{g.available}</TableCell>
                <TableCell className="text-right tabular-nums">{g.forecastNeed}</TableCell>
                <TableCell className="text-right">
                  <span
                    className={cn(
                      'tabular-nums font-semibold',
                      g.severity === 'ok' && 'text-success',
                      g.severity === 'watch' && 'text-amber-600',
                      g.severity === 'critical' && 'text-destructive',
                    )}
                  >
                    {signed(g.gap)}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <SeverityBadge severity={g.severity} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

function SeverityBadge({
  severity,
}: {
  severity: 'ok' | 'watch' | 'critical'
}) {
  if (severity === 'ok') {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-success/30 text-[10px] font-semibold uppercase text-success"
      >
        <ShieldCheck className="h-3 w-3" /> Ok
      </Badge>
    )
  }
  if (severity === 'watch') {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-amber-500/40 text-[10px] font-semibold uppercase text-amber-600"
      >
        <AlertTriangle className="h-3 w-3" /> Watch
      </Badge>
    )
  }
  return (
    <Badge
      variant="outline"
      className="gap-1 border-destructive/30 text-[10px] font-semibold uppercase text-destructive"
    >
      <AlertTriangle className="h-3 w-3" /> Critical
    </Badge>
  )
}

function ThresholdCard({
  icon: Icon,
  label,
  value,
  description,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  description: string
  tone: 'primary' | 'warning' | 'critical'
}) {
  const iconClasses =
    tone === 'critical'
      ? 'bg-destructive/10 text-destructive'
      : tone === 'warning'
        ? 'bg-amber-500/10 text-amber-600'
        : 'bg-primary/10 text-primary'
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/20 p-4">
      <div
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
          iconClasses,
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 space-y-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="text-sm font-semibold text-foreground">{value}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

function AlertsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-baseline gap-6">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
        <Skeleton className="h-8 w-52 rounded-full" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
      <Skeleton className="h-[260px] rounded-xl" />
      <Skeleton className="h-[220px] rounded-xl" />
    </div>
  )
}

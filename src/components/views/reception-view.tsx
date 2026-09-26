'use client'

import {
  BedDouble,
  HeartPulse,
  Hospital,
  Activity,
  AlertTriangle,
  ShieldCheck,
  CircleAlert,
  RotateCw,
  Loader2,
} from 'lucide-react'
import { useReception, type ReceptionOverview } from '@/hooks/use-api'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
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
import { formatLongDate } from '@/lib/format'

export function ReceptionView() {
  const { data, isLoading, isError, error, refetch, isFetching } = useReception()

  if (isError) {
    const reason =
      error instanceof Error ? error.message : 'Unknown error.'
    return (
      <div className="flex min-h-[20rem] flex-col items-center justify-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
        <CircleAlert className="h-10 w-10 text-destructive" />
        <p className="text-base font-semibold text-foreground">
          Failed to load the Reception dashboard
        </p>
        <p className="max-w-md text-sm text-muted-foreground">{reason}</p>
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
    )
  }
  if (isLoading || !data) return <ReceptionSkeleton />

  return <ReceptionContent data={data} />
}

function ReceptionContent({ data }: { data: ReceptionOverview }) {
  const { today, alert, departments } = data
  return (
    <div className="space-y-6">
      {/* Header / date */}
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          Today&rsquo;s Overview
        </h2>
        <p className="text-sm text-muted-foreground">
          Live hospital capacity snapshot as of {formatLongDate(today.date)}.
        </p>
      </div>

      {/* Capacity alert banner */}
      {alert && alert.active ? (
        <div
          className={cn(
            'flex items-start gap-3 rounded-xl border p-4 shadow-sm',
            alert.level === 'critical'
              ? 'border-destructive/30 bg-destructive/5'
              : 'border-amber-500/30 bg-amber-50 dark:bg-amber-500/5',
          )}
        >
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
              alert.level === 'critical'
                ? 'bg-destructive/10 text-destructive'
                : 'bg-amber-500/15 text-amber-600',
            )}
          >
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">
                Upcoming Capacity Alert
              </h3>
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px] font-semibold uppercase',
                  alert.level === 'critical'
                    ? 'border-destructive/30 text-destructive'
                    : 'border-amber-500/40 text-amber-600',
                )}
              >
                {alert.level}
              </Badge>
            </div>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {alert.message}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-xl border border-success/30 bg-success/5 p-4 shadow-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-foreground">
              Capacity is within normal range
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              No capacity alerts active. Bed and ICU occupancy are below the warning threshold.
            </p>
          </div>
        </div>
      )}

      {/* Today overview — simple cards, no charts */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ReceptionStatCard
          label="Ward Occupancy"
          value={`${today.occupancyPct}%`}
          icon={BedDouble}
          accent={today.occupancyPct >= 90 ? 'red' : today.occupancyPct >= 85 ? 'amber' : 'primary'}
        />
        <ReceptionStatCard
          label="ICU Occupancy"
          value={`${today.icuOccupancyPct}%`}
          icon={HeartPulse}
          accent={today.icuOccupancyPct >= 90 ? 'red' : today.icuOccupancyPct >= 85 ? 'amber' : 'teal'}
        />
        <ReceptionStatCard
          label="Available Beds"
          value={`${today.availableBeds}`}
          icon={Hospital}
          accent="primary"
        />
        <ReceptionStatCard
          label="Available ICU Beds"
          value={`${today.availableIcu}`}
          icon={Activity}
          accent={today.availableIcu <= 2 ? 'red' : today.availableIcu <= 4 ? 'amber' : 'teal'}
        />
      </div>

      {/* Quick Patient Check-in Reference — simple table */}
      <Card className="border-border/70 shadow-sm">
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold tracking-tight text-foreground">
              Quick Patient Check-in Reference
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Department availability for admission routing.
            </p>
          </div>
        </div>
        <div className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="text-xs font-semibold uppercase tracking-wide">
                  Department
                </TableHead>
                <TableHead className="text-right text-xs font-semibold uppercase tracking-wide">
                  Available Beds
                </TableHead>
                <TableHead className="text-right text-xs font-semibold uppercase tracking-wide">
                  Occupancy
                </TableHead>
                <TableHead className="text-right text-xs font-semibold uppercase tracking-wide">
                  Status
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {departments.map((d) => (
                <TableRow key={d.department} className="text-sm">
                  <TableCell className="font-medium">{d.department}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {d.availableBeds} / {d.capacity}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{d.occupancyPct}%</TableCell>
                  <TableCell className="text-right">
                    <StatusBadge status={d.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}

function ReceptionStatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string
  value: string
  icon: React.ComponentType<{ className?: string }>
  accent: 'primary' | 'teal' | 'amber' | 'red'
}) {
  const accentBg: Record<string, string> = {
    primary: 'bg-primary/10 text-primary',
    teal: 'bg-teal-500/10 text-teal-600',
    amber: 'bg-amber-500/10 text-amber-600',
    red: 'bg-destructive/10 text-destructive',
  }
  return (
    <Card className="border-border/70 p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
        </div>
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', accentBg[accent])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  )
}

function StatusBadge({ status }: { status: 'Normal' | 'Near Full' | 'Full' }) {
  if (status === 'Normal') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
        <ShieldCheck className="h-3.5 w-3.5" /> Normal
      </span>
    )
  }
  if (status === 'Near Full') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600">
        <AlertTriangle className="h-3.5 w-3.5" /> Near Full
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-destructive">
      <AlertTriangle className="h-3.5 w-3.5" /> Full
    </span>
  )
}

function ReceptionSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-20 rounded-xl" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[104px] rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-[280px] rounded-xl" />
    </div>
  )
}

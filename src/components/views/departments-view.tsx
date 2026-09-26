'use client'

import {
  Ambulance,
  Baby,
  BedDouble,
  HeartPulse,
  AlertTriangle,
  ShieldCheck,
  CircleAlert,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useDepartments } from '@/hooks/use-api'
import { SectionCard } from '@/components/views/shared'
import { ForecastChart } from '@/components/charts/forecast-chart'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { pct } from '@/lib/format'
import type { DeptForecast, Department } from '@/lib/types'

type Severity = 'critical' | 'warning' | 'ok'

const PRIMARY = 'oklch(0.46 0.11 210)'
const AMBER = 'oklch(0.7 0.14 75)'
const DESTRUCTIVE = 'oklch(0.55 0.2 25)'
const AXIS_TICK = { fontSize: 11, fill: 'oklch(0.52 0.02 215)' }

const tooltipStyle: React.CSSProperties = {
  borderRadius: 10,
  border: '1px solid oklch(0.91 0.008 220)',
  background: 'oklch(1 0 0)',
  boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
  fontSize: 12,
}

const deptIcon: Record<Department, React.ComponentType<{ className?: string }>> = {
  Emergency: Ambulance,
  ICU: HeartPulse,
  'General Ward': BedDouble,
  Pediatrics: Baby,
}

function severityFor(value: number): Severity {
  if (value >= 90) return 'critical'
  if (value >= 85) return 'warning'
  return 'ok'
}

const severityBadge: Record<Severity, string> = {
  critical: 'border-destructive/30 bg-destructive/5 text-destructive',
  warning: 'border-amber-500/40 bg-amber-50 dark:bg-amber-500/5 text-amber-600',
  ok: 'border-primary/30 bg-primary/5 text-primary',
}

/** Projected peak occupancy % for a department = max bedForecast / bed capacity. */
function projectedPeakOcc(dept: DeptForecast): number {
  if (dept.bedsCapacity <= 0) return 0
  const peakBeds = Math.max(...dept.bedForecast7.points.map((p) => p.forecast))
  return (peakBeds / dept.bedsCapacity) * 100
}

export function DepartmentsView() {
  const { data, isLoading, isError } = useDepartments()

  if (isError) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
        <CircleAlert className="h-8 w-8 text-destructive" />
        <p>Failed to load department data.</p>
        <p className="text-xs">Try regenerating the dataset from the header.</p>
      </div>
    )
  }
  if (isLoading || !data) return <DepartmentsSkeleton />

  return <DepartmentsContent departments={data.departments} />
}

function DepartmentsContent({ departments }: { departments: DeptForecast[] }) {
  const comparisonData = departments.map((d) => ({
    department: d.department,
    peak: Math.round(projectedPeakOcc(d) * 10) / 10,
  }))

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Per-department occupancy, capacity and 7-day forecast. Thresholds: warning 85%, critical 90%.
      </p>

      {/* Department cards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {departments.map((d) => (
          <DepartmentCard key={d.department} dept={d} />
        ))}
      </div>

      {/* Comparison BarChart */}
      <SectionCard
        title="Department comparison"
        subtitle="Projected peak bed occupancy % per department over the next 7 days"
      >
        <ResponsiveContainer width="100%" height={260}>
          <BarChart
            data={comparisonData}
            margin={{ top: 12, right: 20, bottom: 8, left: -8 }}
          >
            <CartesianGrid
              stroke="oklch(0.91 0.008 220)"
              strokeDasharray="3 3"
              vertical={false}
            />
            <XAxis
              dataKey="department"
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={{ stroke: 'oklch(0.91 0.008 220)' }}
              interval={0}
              angle={-12}
              textAnchor="end"
              height={48}
            />
            <YAxis
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              width={44}
              tickFormatter={(v) => `${v}%`}
              domain={[0, (dataMax: number) => Math.max(100, Math.ceil((dataMax || 0) / 10) * 10)]}
            />
            <Tooltip
              cursor={{ fill: 'rgba(0,0,0,0.04)' }}
              contentStyle={tooltipStyle}
              formatter={(value: number) => [`${value}%`, 'Peak occupancy']}
              labelFormatter={(l) => `${l}`}
            />
            <ReferenceLine
              y={85}
              stroke={AMBER}
              strokeDasharray="5 4"
              label={{
                value: 'Warning 85%',
                position: 'right',
                fill: AMBER,
                fontSize: 10,
              }}
            />
            <ReferenceLine
              y={90}
              stroke={DESTRUCTIVE}
              strokeDasharray="5 4"
              label={{
                value: 'Critical 90%',
                position: 'right',
                fill: DESTRUCTIVE,
                fontSize: 10,
              }}
            />
            <Bar
              dataKey="peak"
              fill={PRIMARY}
              radius={[6, 6, 0, 0]}
              maxBarSize={72}
            />
          </BarChart>
        </ResponsiveContainer>
      </SectionCard>

      {/* Capacity table */}
      <SectionCard
        title="Department capacity table"
        subtitle="Today's snapshot plus 7-day bed projection"
        bodyClassName="p-0"
      >
        <div className="max-h-[28rem] overflow-y-auto scroll-thin">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="text-xs font-semibold uppercase tracking-wide">Department</TableHead>
                <TableHead className="text-right text-xs font-semibold uppercase tracking-wide">Today occ%</TableHead>
                <TableHead className="text-right text-xs font-semibold uppercase tracking-wide">Beds used</TableHead>
                <TableHead className="text-right text-xs font-semibold uppercase tracking-wide">Capacity</TableHead>
                <TableHead className="text-right text-xs font-semibold uppercase tracking-wide">Admissions</TableHead>
                <TableHead className="text-right text-xs font-semibold uppercase tracking-wide">7d avg forecast</TableHead>
                <TableHead className="text-right text-xs font-semibold uppercase tracking-wide">Projected peak occ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {departments.map((d) => {
                const peak = projectedPeakOcc(d)
                const avgForecast = Math.round(d.forecast7.mean)
                return (
                  <TableRow key={d.department} className="text-sm">
                    <TableCell className="font-medium">{d.department}</TableCell>
                    <TableCell className="text-right tabular-nums">{pct(d.todayOccupancyPct)}</TableCell>
                    <TableCell className="text-right tabular-nums">{d.bedsUsed}</TableCell>
                    <TableCell className="text-right tabular-nums">{d.bedsCapacity}</TableCell>
                    <TableCell className="text-right tabular-nums">{d.admissions}</TableCell>
                    <TableCell className="text-right tabular-nums">{avgForecast}</TableCell>
                    <TableCell className="text-right">
                      <PeakBadge value={peak} />
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

function DepartmentCard({ dept }: { dept: DeptForecast }) {
  const Icon = deptIcon[dept.department]
  const sev = severityFor(dept.todayOccupancyPct)
  const isIcu = dept.department === 'ICU'

  return (
    <SectionCard bodyClassName="p-5">
      {/* Custom header row (no SectionCard title) */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold tracking-tight text-foreground">
              {dept.department}
            </h3>
            <p className="text-[11px] text-muted-foreground">Today&apos;s occupancy</p>
          </div>
        </div>
        <OccupancyBadge value={dept.todayOccupancyPct} severity={sev} />
      </div>

      {/* Mini-stats row */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        <MiniStat label="Beds" value={`${dept.bedsUsed} / ${dept.bedsCapacity}`} />
        <MiniStat label="Admissions" value={`${dept.admissions}`} />
        <MiniStat
          label="ICU"
          value={isIcu ? `${dept.icuUsed} / ${dept.icuCapacity}` : '—'}
        />
      </div>

      {/* Mini forecast chart */}
      <div className="mt-4">
        <ForecastChart
          data={dept.bedForecast7.points.map((p) => ({
            date: p.date,
            forecast: p.forecast,
            lower: p.lower,
            upper: p.upper,
          }))}
          height={150}
          showLegend={false}
          showBand={true}
          actualName="Beds"
          forecastName="Projected"
        />
      </div>
    </SectionCard>
  )
}

function OccupancyBadge({ value, severity }: { value: number; severity: Severity }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-sm font-semibold tabular-nums',
        severityBadge[severity],
      )}
    >
      {severity === 'critical' && <AlertTriangle className="h-3.5 w-3.5" />}
      {severity === 'warning' && <ShieldCheck className="h-3.5 w-3.5" />}
      {pct(value)}
    </span>
  )
}

function PeakBadge({ value }: { value: number }) {
  const sev = severityFor(value)
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold tabular-nums',
        severityBadge[sev],
      )}
    >
      {sev === 'critical' && <AlertTriangle className="h-3 w-3" />}
      {sev === 'warning' && <ShieldCheck className="h-3 w-3" />}
      {pct(value)}
    </span>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  )
}

function DepartmentsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-72" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[300px] rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-[320px] rounded-xl" />
      <Skeleton className="h-[260px] rounded-xl" />
    </div>
  )
}

'use client'

import { useEffect, useRef, useState } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import {
  Loader2,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  PlayCircle,
  AlertTriangle,
  ShieldCheck,
  CircleAlert,
} from 'lucide-react'
import { SectionCard } from '@/components/views/shared'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { formatDate, signed } from '@/lib/format'
import { useSimulate } from '@/hooks/use-api'
import type { SimulationInput, SimulationResult } from '@/lib/types'

// Theme colors (oklch) — primary teal-blue, amber for scenario, destructive red for capacity.
const PRIMARY = 'oklch(0.46 0.11 210)'
const AMBER = 'oklch(0.66 0.16 65)'
const DESTRUCTIVE = 'oklch(0.55 0.22 27)'

const axisStyle = { fontSize: 11, fill: 'oklch(0.52 0.02 215)' }
const tooltipStyle: React.CSSProperties = {
  borderRadius: 10,
  border: '1px solid oklch(0.91 0.008 220)',
  background: 'oklch(1 0 0)',
  boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
  fontSize: 12,
}

const DEFAULT_INPUT: SimulationInput = {
  bedCapacityDelta: 0,
  icuCapacityDelta: 0,
  inflowPct: 0,
  losDelta: 0,
  horizon: 7,
}

type Tone = 'improved' | 'neutral' | 'watch' | 'critical'

function occupancyTone(base: number, scenario: number): Tone {
  if (scenario > base) return scenario >= 90 ? 'critical' : 'watch'
  if (scenario < base) return 'improved'
  return 'neutral'
}

function gapTone(base: number, scenario: number): Tone {
  if (scenario > base) return scenario >= 5 ? 'critical' : 'watch'
  if (scenario < base) return 'improved'
  return 'neutral'
}

function admissionsTone(base: number, scenario: number): Tone {
  if (scenario > base) return scenario >= base * 1.05 ? 'watch' : 'neutral'
  if (scenario < base) return 'improved'
  return 'neutral'
}

function toneTextClass(tone: Tone): string {
  switch (tone) {
    case 'improved':
      return 'text-success'
    case 'critical':
      return 'text-destructive'
    case 'watch':
      return 'text-amber-600'
    case 'neutral':
    default:
      return 'text-foreground'
  }
}

function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min
  return Math.max(min, Math.min(max, n))
}

function formatLos(v: number): string {
  return `${v > 0 ? '+' : ''}${v.toFixed(1)} days`
}

export function SimulationView() {
  const [bedCapacityDelta, setBedCapacityDelta] = useState(0)
  const [icuCapacityDelta, setIcuCapacityDelta] = useState(0)
  const [inflowPct, setInflowPct] = useState(0)
  const [losDelta, setLosDelta] = useState(0)
  const [horizon, setHorizon] = useState(7)

  const { mutate, data, isPending, isError } = useSimulate()
  const didAutoRun = useRef(false)

  // Auto-run the simulation once on mount with default inputs so the results
  // column is not empty on first visit. Guard against double-run (StrictMode).
  useEffect(() => {
    if (didAutoRun.current) return
    if (!data && !isPending) {
      didAutoRun.current = true
      mutate(DEFAULT_INPUT)
    }
  }, [data, isPending, mutate])

  const handleRun = () => {
    mutate({ bedCapacityDelta, icuCapacityDelta, inflowPct, losDelta, horizon })
  }

  const handleReset = () => {
    setBedCapacityDelta(0)
    setIcuCapacityDelta(0)
    setInflowPct(0)
    setLosDelta(0)
    setHorizon(7)
  }

  const result = data?.result

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
      {/* Controls column */}
      <div className="lg:col-span-2">
        <SectionCard
          title="Scenario controls"
          subtitle="Adjust capacity & demand to model impact on the forecast"
          bodyClassName="space-y-5"
        >
          <ControlRow
            label="Adjust available ward beds"
            valueText={`${signed(bedCapacityDelta)} beds`}
            min={-100}
            max={100}
            step={5}
            value={bedCapacityDelta}
            onChange={setBedCapacityDelta}
          />
          <ControlRow
            label="Adjust available ICU beds"
            valueText={`${signed(icuCapacityDelta)} beds`}
            min={-16}
            max={16}
            step={1}
            value={icuCapacityDelta}
            onChange={setIcuCapacityDelta}
          />
          <ControlRow
            label="Patient inflow change"
            valueText={`${signed(inflowPct)}%`}
            min={-30}
            max={50}
            step={1}
            value={inflowPct}
            onChange={setInflowPct}
          />
          <ControlRow
            label="Avg length of stay Δ"
            valueText={formatLos(losDelta)}
            min={-1}
            max={2}
            step={0.1}
            value={losDelta}
            onChange={(v) => setLosDelta(Math.round(v * 10) / 10)}
          />

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label>Forecast horizon</Label>
              <Select
                value={String(horizon)}
                onValueChange={(v) => setHorizon(Number(v))}
              >
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 days</SelectItem>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={handleRun} disabled={isPending}>
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PlayCircle className="h-4 w-4" />
              )}
              Run simulation
            </Button>
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={isPending}
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          </div>

          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Positive gap = shortage (forecast need exceeds capacity). Compare
            baseline vs scenario.
          </p>
        </SectionCard>
      </div>

      {/* Results column */}
      <div className="space-y-6 lg:col-span-3">
        {isPending && !result ? (
          <ResultsSkeleton />
        ) : !result && isError ? (
          <SectionCard title="Simulation error">
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <CircleAlert className="h-8 w-8 text-destructive" />
              <p>Failed to run the simulation. Please try again.</p>
            </div>
          </SectionCard>
        ) : result ? (
          <Results result={result} />
        ) : (
          <ResultsSkeleton />
        )}
      </div>
    </div>
  )
}

function ControlRow({
  label,
  valueText,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string
  valueText: string
  min: number
  max: number
  step: number
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label>{label}</Label>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold tabular-nums text-foreground">
            {valueText}
          </span>
          <Input
            type="number"
            key={value}
            defaultValue={value}
            className="h-8 w-20 text-xs tabular-nums"
            min={min}
            max={max}
            step={step}
            onBlur={(e) => {
              const n = parseFloat(e.target.value)
              if (!Number.isNaN(n)) onChange(clamp(n, min, max))
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
            }}
            aria-label={label}
          />
        </div>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={(v) => onChange(v[0])}
        aria-label={label}
      />
    </div>
  )
}

function Results({ result }: { result: SimulationResult }) {
  return (
    <>
      <SectionCard
        title="Scenario impact"
        subtitle="Baseline vs scenario across the forecast horizon"
      >
        <ImpactGrid result={result} />
      </SectionCard>

      <SectionCard
        title="Projected ward occupancy: base vs scenario"
        subtitle="Ward beds in use over the horizon with capacity reference"
      >
        <WardOccupancyChart data={result.bedForecast} />
      </SectionCard>

      <SectionCard
        title="Affected departments"
        subtitle="Where capacity pressure shifts under the scenario"
        bodyClassName="p-0"
      >
        <div className="overflow-hidden">
          <AffectedDepartmentsTable rows={result.affectedDepartments} />
        </div>
      </SectionCard>
    </>
  )
}

function ImpactGrid({ result }: { result: SimulationResult }) {
  const { base, scenario } = result
  const tiles: {
    label: string
    base: string
    scenario: string
    tone: Tone
    direction: 'up' | 'down' | 'flat'
  }[] = [
    {
      label: 'Ward peak occupancy',
      base: `${Math.round(base.bedOccPct)}%`,
      scenario: `${Math.round(scenario.bedOccPct)}%`,
      tone: occupancyTone(base.bedOccPct, scenario.bedOccPct),
      direction:
        scenario.bedOccPct > base.bedOccPct
          ? 'up'
          : scenario.bedOccPct < base.bedOccPct
            ? 'down'
            : 'flat',
    },
    {
      label: 'ICU peak occupancy',
      base: `${Math.round(base.icuOccPct)}%`,
      scenario: `${Math.round(scenario.icuOccPct)}%`,
      tone: occupancyTone(base.icuOccPct, scenario.icuOccPct),
      direction:
        scenario.icuOccPct > base.icuOccPct
          ? 'up'
          : scenario.icuOccPct < base.icuOccPct
            ? 'down'
            : 'flat',
    },
    {
      label: 'Ward bed gap',
      base: signed(base.bedGap),
      scenario: signed(scenario.bedGap),
      tone: gapTone(base.bedGap, scenario.bedGap),
      direction:
        scenario.bedGap > base.bedGap
          ? 'up'
          : scenario.bedGap < base.bedGap
            ? 'down'
            : 'flat',
    },
    {
      label: 'ICU bed gap',
      base: signed(base.icuGap),
      scenario: signed(scenario.icuGap),
      tone: gapTone(base.icuGap, scenario.icuGap),
      direction:
        scenario.icuGap > base.icuGap
          ? 'up'
          : scenario.icuGap < base.icuGap
            ? 'down'
            : 'flat',
    },
    {
      label: 'Peak admissions',
      base: String(Math.round(base.peakAdmissions)),
      scenario: String(Math.round(scenario.peakAdmissions)),
      tone: admissionsTone(base.peakAdmissions, scenario.peakAdmissions),
      direction:
        scenario.peakAdmissions > base.peakAdmissions
          ? 'up'
          : scenario.peakAdmissions < base.peakAdmissions
            ? 'down'
            : 'flat',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {tiles.map((t) => (
        <div
          key={t.label}
          className="rounded-lg border border-border/60 bg-muted/20 p-3.5"
        >
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {t.label}
          </p>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span
              className={cn(
                'text-xl font-bold tabular-nums',
                toneTextClass(t.tone),
              )}
            >
              {t.scenario}
            </span>
            {t.direction === 'up' && (
              <ArrowUp
                className={cn(
                  'h-3.5 w-3.5',
                  t.tone === 'critical' ? 'text-destructive' : 'text-amber-600',
                )}
              />
            )}
            {t.direction === 'down' && (
              <ArrowDown className="h-3.5 w-3.5 text-success" />
            )}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Base: <span className="tabular-nums">{t.base}</span>
          </p>
        </div>
      ))}
    </div>
  )
}

function WardOccupancyChart({
  data,
}: {
  data: SimulationResult['bedForecast']
}) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center text-xs text-muted-foreground">
        No forecast data available for this scenario.
      </div>
    )
  }
  const capacity = data[0].capacity
  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart
        data={data}
        margin={{ top: 8, right: 16, bottom: 4, left: -12 }}
      >
        <CartesianGrid
          stroke="oklch(0.91 0.008 220)"
          strokeDasharray="3 3"
          vertical={false}
        />
        <XAxis
          dataKey="date"
          tickFormatter={(v) => formatDate(String(v))}
          tick={axisStyle}
          tickLine={false}
          axisLine={{ stroke: 'oklch(0.91 0.008 220)' }}
          minTickGap={28}
        />
        <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={48} />
        <Tooltip
          contentStyle={tooltipStyle}
          labelFormatter={(l) => formatDate(String(l))}
          formatter={(value: number, name: string) => {
            if (name === 'baseBeds')
              return [`${Math.round(value)} beds`, 'Baseline']
            if (name === 'scenarioBeds')
              return [`${Math.round(value)} beds`, 'Scenario']
            if (name === 'capacity')
              return [`${Math.round(value)} beds`, 'Capacity']
            return [`${value}`, name]
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
          iconType="plainline"
          formatter={(v: string) =>
            v === 'baseBeds'
              ? 'Baseline'
              : v === 'scenarioBeds'
                ? 'Scenario'
                : v
          }
        />
        <ReferenceLine
          y={capacity}
          stroke={DESTRUCTIVE}
          strokeWidth={1.5}
          strokeDasharray="4 4"
          label={{
            value: 'Capacity',
            position: 'insideTopRight',
            fill: DESTRUCTIVE,
            fontSize: 11,
            fontWeight: 600,
          }}
        />
        <Line
          type="monotone"
          dataKey="baseBeds"
          stroke={PRIMARY}
          strokeWidth={2.4}
          dot={false}
          connectNulls
          name="baseBeds"
        />
        <Line
          type="monotone"
          dataKey="scenarioBeds"
          stroke={AMBER}
          strokeWidth={2.4}
          strokeDasharray="6 4"
          dot={false}
          connectNulls
          name="scenarioBeds"
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

function AffectedDepartmentsTable({
  rows,
}: {
  rows: SimulationResult['affectedDepartments']
}) {
  if (!rows || rows.length === 0) {
    return (
      <div className="px-5 py-8 text-center text-xs text-muted-foreground">
        No departments affected under this scenario.
      </div>
    )
  }
  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-muted/40 hover:bg-muted/40">
          <TableHead className="text-xs font-semibold uppercase tracking-wide">
            Department
          </TableHead>
          <TableHead className="text-right text-xs font-semibold uppercase tracking-wide">
            Baseline gap
          </TableHead>
          <TableHead className="text-right text-xs font-semibold uppercase tracking-wide">
            Scenario gap
          </TableHead>
          <TableHead className="text-right text-xs font-semibold uppercase tracking-wide">
            Change
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => {
          const change = r.scenarioGap - r.baseGap
          const worsened = r.scenarioGap > r.baseGap
          const rowAccent = worsened
            ? r.severity === 'critical'
              ? 'border-l-2 border-l-destructive/60 bg-destructive/5'
              : 'border-l-2 border-l-amber-500/60 bg-amber-50/40 dark:bg-amber-500/5'
            : ''
          return (
            <TableRow key={r.department} className="text-sm">
              <TableCell className={cn('font-medium', rowAccent)}>
                {r.department}
              </TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">
                {signed(r.baseGap)}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <span className="tabular-nums font-semibold">
                    {signed(r.scenarioGap)}
                  </span>
                  <SeverityBadge severity={r.severity} />
                </div>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                <span
                  className={cn(
                    'inline-flex items-center gap-1 text-xs font-semibold',
                    change > 0
                      ? 'text-amber-600'
                      : change < 0
                        ? 'text-success'
                        : 'text-muted-foreground',
                  )}
                >
                  {change > 0 ? (
                    <ArrowUp className="h-3 w-3" />
                  ) : change < 0 ? (
                    <ArrowDown className="h-3 w-3" />
                  ) : null}
                  {signed(change)}
                </span>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
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
        className="gap-1 border-success/40 text-[10px] uppercase text-success"
      >
        <ShieldCheck className="h-3 w-3" />
        OK
      </Badge>
    )
  }
  if (severity === 'watch') {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-amber-500/40 text-[10px] uppercase text-amber-600"
      >
        <AlertTriangle className="h-3 w-3" />
        Watch
      </Badge>
    )
  }
  return (
    <Badge
      variant="outline"
      className="gap-1 border-destructive/40 text-[10px] uppercase text-destructive"
    >
      <AlertTriangle className="h-3 w-3" />
      Critical
    </Badge>
  )
}

function ResultsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-[220px] rounded-xl" />
      <Skeleton className="h-[320px] rounded-xl" />
      <Skeleton className="h-[260px] rounded-xl" />
    </div>
  )
}

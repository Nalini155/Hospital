'use client'

import {
  Loader2,
  LogOut,
  RefreshCw,
  Database,
  Activity,
  TriangleAlert,
  Info,
  ShieldAlert,
} from 'lucide-react'
import {
  useSession,
  useLogout,
  useRegenerateData,
  useHistorical,
  useDashboard,
} from '@/hooks/use-api'
import { SectionCard } from '@/components/views/shared'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { cn } from '@/lib/utils'

export function SettingsView() {
  const { data: sessionData } = useSession()
  const user = sessionData?.user ?? null
  const logout = useLogout()
  const regenerate = useRegenerateData()
  const historical = useHistorical(365)
  const { data: dashboardData, isLoading: dashboardLoading } = useDashboard()

  const initials = user
    ? user.name
        .split(' ')
        .map((p) => p[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '?'
  const roleLabel = user?.role === 'ADMIN' ? 'Administrator' : 'Hospital Staff'

  const recordCount = historical.data?.count ?? null

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* ----------------------------- Account ----------------------------- */}
      <SectionCard
        title="Account"
        subtitle="The signed-in user for this CareFlow session"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12 border border-border">
              <AvatarFallback className="bg-primary text-base font-semibold text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold text-foreground">
                  {user?.name ?? 'User'}
                </p>
                <Badge
                  variant="outline"
                  className="border-primary/30 text-[10px] font-semibold uppercase tracking-wide text-primary"
                >
                  {roleLabel}
                </Badge>
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {user?.email ?? '—'}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Role:{' '}
                <span className="font-medium text-foreground">
                  {user?.role ?? '—'}
                </span>
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
            className={cn(
              'shrink-0 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive',
            )}
          >
            {logout.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4" />
            )}
            Sign out
          </Button>
        </div>
      </SectionCard>

      {/* --------------------------- Data source --------------------------- */}
      <SectionCard
        title="Historical data source"
        subtitle="Synthetic hospital operations dataset (365 days)"
        action={
          <Badge variant="outline" className="gap-1 font-mono text-[11px]">
            <Database className="h-3 w-3" />
            {recordCount != null ? `${recordCount} records` : '— records'}
          </Badge>
        }
      >
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            The dataset powering CareFlow is{' '}
            <span className="font-medium text-foreground">synthetic</span> —
            365 days of daily admissions, bed occupancy, ICU occupancy, and
            discharges across four departments:{' '}
            <span className="font-medium text-foreground">
              Emergency, ICU, General Ward, and Pediatrics
            </span>
            . Daily values are modeled with weekly seasonality (weekday vs.
            weekend patterns) and an underlying trend component to mimic real
            hospital load curves.
          </p>
          <div className="flex flex-col gap-3 rounded-lg border border-border/70 bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Current count:</span>{' '}
              {historical.isLoading
                ? 'Loading…'
                : recordCount != null
                  ? `${recordCount} daily records loaded`
                  : 'No data available'}
            </div>
            <Button
              variant="default"
              onClick={() => regenerate.mutate()}
              disabled={regenerate.isPending}
              className="shrink-0"
            >
              {regenerate.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Regenerating…
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Regenerate dataset
                </>
              )}
            </Button>
          </div>
        </div>
      </SectionCard>

      {/* -------------------------- Forecast model -------------------------- */}
      <SectionCard
        title="Forecast model"
        subtitle="Time-series method used for 7-day projections"
        action={
          dashboardLoading || !dashboardData ? (
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-16 rounded-md" />
              <Skeleton className="h-5 w-16 rounded-md" />
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Badge
                variant="outline"
                className="font-mono text-[11px] tabular-nums"
              >
                α={dashboardData.params.alpha.toFixed(2)}
              </Badge>
              <Badge
                variant="outline"
                className="font-mono text-[11px] tabular-nums"
              >
                β={dashboardData.params.beta.toFixed(2)}
              </Badge>
            </div>
          )
        }
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Activity className="h-5 w-5" />
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">
                Holt&apos;s linear trend exponential smoothing
              </span>{' '}
              with weekly (day-of-week) seasonality. The level smoothing
              parameter <span className="font-mono text-foreground">alpha</span>{' '}
              and trend smoothing parameter{' '}
              <span className="font-mono text-foreground">beta</span> are
              selected via grid search to minimize out-of-sample one-step SSE.
              95% confidence intervals are derived from in-sample residual
              standard deviation, widening with the square root of the
              forecast horizon.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ParamRow
              label="Alpha (level)"
              symbol="α"
              loading={dashboardLoading}
              value={
                dashboardData ? dashboardData.params.alpha.toFixed(3) : null
              }
              hint="Weight on the most recent observation"
            />
            <ParamRow
              label="Beta (trend)"
              symbol="β"
              loading={dashboardLoading}
              value={
                dashboardData ? dashboardData.params.beta.toFixed(3) : null
              }
              hint="Weight on the trend component update"
            />
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            This TypeScript forecasting engine replaces Python Prophet / XGBoost
            in this Next.js environment for reliability and zero additional
            runtime dependencies. It delivers equivalent short-horizon accuracy
            for daily hospital capacity data.
          </p>
        </div>
      </SectionCard>

      {/* ----------------------- Alert thresholds ----------------------- */}
      <SectionCard
        title="Capacity alert thresholds"
        subtitle="Occupancy levels that trigger warnings and critical alerts"
      >
        <div className="space-y-3">
          <ThresholdRow
            label="Warning"
            value="85%"
            description="Approaching capacity — proactive staffing recommended"
            tone="amber"
          />
          <Separator />
          <ThresholdRow
            label="Critical"
            value="90%"
            description="At or near capacity — escalate per protocol"
            tone="destructive"
          />
          <div className="flex items-start gap-2 rounded-lg border border-border/70 bg-muted/30 p-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">Color policy:</span>{' '}
              Red and amber are reserved strictly for capacity alerts across
              the application. Teal-blue indicates primary information; green
              indicates a healthy/safe state.
            </p>
          </div>
        </div>
      </SectionCard>

      {/* ------------------------ Disclaimer & about ------------------------ */}
      <SectionCard
        title="About & disclaimer"
        subtitle="System scope, intent, and technical stack"
      >
        <div className="space-y-4">
          <Alert className="border-amber-500/40 bg-amber-50 text-amber-900 dark:bg-amber-500/10 dark:text-amber-100">
            <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertTitle className="text-amber-900 dark:text-amber-100">
              Important — read before relying on this system
            </AlertTitle>
            <AlertDescription className="text-amber-900/80 dark:text-amber-100/80">
              This system provides capacity &amp; operations risk signals only,
              not medical diagnosis or emergency predictions. Decisions
              involving patient care must always be made by qualified clinical
              staff using established hospital protocols.
            </AlertDescription>
          </Alert>

          <div className="rounded-lg border border-border/70 bg-muted/30 p-4 text-sm leading-relaxed text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">
                CareFlow Intelligence
              </span>{' '}
              is a prototype hospital resource forecasting &amp; operations
              intelligence system. Forecast horizon:{' '}
              <span className="font-medium text-foreground">7 days</span>{' '}
              (configurable). It is intended as a planning aid for capacity
              managers and hospital operations teams.
            </p>
            <p className="mt-3">
              Built with{' '}
              <span className="font-medium text-foreground">Next.js</span>,{' '}
              <span className="font-medium text-foreground">Tailwind CSS</span>,{' '}
              <span className="font-medium text-foreground">Recharts</span>,{' '}
              <span className="font-medium text-foreground">
                Prisma / SQLite
              </span>
              , and a{' '}
              <span className="font-medium text-foreground">
                TypeScript forecasting engine
              </span>
              .
            </p>
          </div>
        </div>
      </SectionCard>
    </div>
  )
}

/* --------------------------------- bits --------------------------------- */

function ParamRow({
  label,
  symbol,
  value,
  hint,
  loading,
}: {
  label: string
  symbol: string
  value: string | null
  hint: string
  loading: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/30 px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-xs font-medium text-foreground">{label}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>
      </div>
      {loading || value == null ? (
        <Skeleton className="h-6 w-16 rounded-md" />
      ) : (
        <Badge
          variant="outline"
          className="font-mono text-xs tabular-nums text-primary"
        >
          {symbol}={value}
        </Badge>
      )}
    </div>
  )
}

function ThresholdRow({
  label,
  value,
  description,
  tone,
}: {
  label: string
  value: string
  description: string
  tone: 'amber' | 'destructive'
}) {
  const chipClass =
    tone === 'amber'
      ? 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300'
      : 'border-destructive/40 bg-destructive/10 text-destructive'
  const iconClass =
    tone === 'amber'
      ? 'bg-amber-500/15 text-amber-600'
      : 'bg-destructive/15 text-destructive'
  return (
    <div className="flex items-center gap-4">
      <div
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
          iconClass,
        )}
      >
        <TriangleAlert className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <Badge
            variant="outline"
            className={cn('font-mono text-xs tabular-nums', chipClass)}
          >
            {value} occupancy
          </Badge>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

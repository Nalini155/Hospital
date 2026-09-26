'use client'

import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'

export function SectionCard({
  title,
  subtitle,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: string
  subtitle?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <Card className={cn('border-border/70 shadow-sm', className)}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-3 border-b border-border/60 px-5 py-4">
          <div>
            {title && (
              <h3 className="text-sm font-semibold tracking-tight text-foreground">{title}</h3>
            )}
            {subtitle && (
              <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={cn('p-5', bodyClassName)}>{children}</div>
    </Card>
  )
}

export function KpiCard({
  label,
  value,
  unit,
  trend,
  icon: Icon,
  accent = 'primary',
  hint,
}: {
  label: string
  value: string | number
  unit?: string
  trend?: { value: string; positive?: boolean }
  icon: React.ComponentType<{ className?: string }>
  accent?: 'primary' | 'teal' | 'amber' | 'red'
  hint?: string
}) {
  const accentBg: Record<string, string> = {
    primary: 'bg-primary/10 text-primary',
    teal: 'bg-teal-500/10 text-teal-600',
    amber: 'bg-amber-500/10 text-amber-600',
    red: 'bg-destructive/10 text-destructive',
  }
  return (
    <Card className="border-border/70 p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            {value}
            {unit && <span className="ml-1 text-base font-medium text-muted-foreground">{unit}</span>}
          </p>
          {trend && (
            <p
              className={cn(
                'mt-1.5 text-xs font-medium',
                trend.positive ? 'text-success' : 'text-destructive',
              )}
            >
              {trend.value}
            </p>
          )}
          {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', accentBg[accent])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  )
}

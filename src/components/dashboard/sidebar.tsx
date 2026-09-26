'use client'

import {
  LayoutDashboard,
  TrendingUp,
  Building2,
  BellRing,
  SlidersHorizontal,
  Settings as SettingsIcon,
} from 'lucide-react'
import { CareFlowLogo } from '@/components/careflow-logo'
import { useUiStore } from '@/lib/store'
import { useAlerts } from '@/hooks/use-api'
import { cn } from '@/lib/utils'

const NAV = [
  { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'forecast', label: 'Forecast', icon: TrendingUp },
  { id: 'departments', label: 'Departments', icon: Building2 },
  { id: 'alerts', label: 'Alerts', icon: BellRing },
  { id: 'simulation', label: 'What-If', icon: SlidersHorizontal },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
] as const

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const view = useUiStore((s) => s.view)
  const setView = useUiStore((s) => s.setView)
  const { data } = useAlerts()
  const alertCount = data?.alerts?.length ?? 0

  return (
    <nav className="flex flex-1 flex-col gap-1 px-3 py-4" aria-label="Primary">
      {NAV.map((item) => {
        const active = view === item.id
        const Icon = item.icon
        const showBadge = item.id === 'alerts' && alertCount > 0
        return (
          <button
            key={item.id}
            onClick={() => {
              setView(item.id)
              onNavigate?.()
            }}
            className={cn(
              'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              active
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground',
            )}
            aria-current={active ? 'page' : undefined}
          >
            <Icon
              className={cn(
                'h-[18px] w-[18px] shrink-0',
                active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
              )}
            />
            <span className="flex-1 text-left">{item.label}</span>
            {showBadge && (
              <span
                className={cn(
                  'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold',
                  alertCount > 0
                    ? 'bg-destructive text-destructive-foreground'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {alertCount}
              </span>
            )}
          </button>
        )
      })}
    </nav>
  )
}

export function SidebarBrand() {
  return (
    <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-5">
      <CareFlowLogo className="h-8 w-8" />
      <div className="flex flex-col leading-tight">
        <span className="text-[15px] font-semibold tracking-tight">CareFlow</span>
        <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Intelligence
        </span>
      </div>
    </div>
  )
}

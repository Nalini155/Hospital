'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, LogOut, Menu, RefreshCw, ChevronDown } from 'lucide-react'
import { useSession, useLogout, useRegenerateData } from '@/hooks/use-api'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet'
import { SidebarNav, SidebarBrand } from '@/components/dashboard/sidebar'
import { useUiStore } from '@/lib/store'
import { useToast } from '@/hooks/use-toast'

const VIEW_TITLES: Record<string, { title: string; subtitle: string }> = {
  overview: { title: 'Dashboard', subtitle: 'Real-time capacity & forecast overview' },
  forecast: { title: 'Demand Forecast', subtitle: '7-day time-series projection with confidence intervals' },
  departments: { title: 'Departments', subtitle: 'Ward-level occupancy & forecast breakdown' },
  alerts: { title: 'Capacity Alerts', subtitle: 'Threshold breaches & resource gap summary' },
  simulation: { title: 'What-If Simulation', subtitle: 'Model scenarios & department impact' },
  settings: { title: 'Settings', subtitle: 'Account, data & system configuration' },
}

export function DashboardHeader() {
  const { data } = useSession()
  const user = data?.user
  const view = useUiStore((s) => s.view)
  const setMobileOpen = useUiStore((s) => s.setMobileOpen)
  const mobileOpen = useUiStore((s) => s.mobileOpen)
  const logout = useLogout()
  const regenerate = useRegenerateData()
  const { toast } = useToast()
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)

  const meta = VIEW_TITLES[view] ?? VIEW_TITLES.overview

  const initials = user
    ? user.name
        .split(' ')
        .map((p) => p[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '?'

  const roleLabel = user?.role === 'ADMIN' ? 'Administrator' : 'Hospital Staff'

  const doLogout = async () => {
    setLoggingOut(true)
    await logout.mutateAsync()
    setLoggingOut(false)
    toast({ title: 'Signed out', description: 'You have been logged out.' })
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-md sm:px-6">
      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <div className="flex h-full flex-col">
            <SidebarBrand />
            <SidebarNav onNavigate={() => setMobileOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex flex-1 flex-col">
        <h1 className="text-base font-semibold tracking-tight sm:text-lg">{meta.title}</h1>
        <p className="hidden text-xs text-muted-foreground sm:block">{meta.subtitle}</p>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="hidden sm:inline-flex"
          onClick={() => regenerate.mutate()}
          disabled={regenerate.isPending}
        >
          {regenerate.isPending ? (
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
          )}
          Regenerate data
        </Button>

        <AlertDialog>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-full border border-transparent py-1 pl-1 pr-2.5 transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="User account menu">
                <Avatar className="h-8 w-8 border border-border">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden text-left sm:block">
                  <p className="text-xs font-medium leading-tight">{user?.name ?? 'User'}</p>
                  <p className="text-[10px] leading-tight text-muted-foreground">{roleLabel}</p>
                </div>
                <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{user?.name}</span>
                  <span className="text-xs font-normal text-muted-foreground">{user?.email}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => useUiStore.getState().setView('settings')}>
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <AlertDialogTrigger asChild>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={(e) => e.preventDefault()}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </AlertDialogTrigger>
            </DropdownMenuContent>
          </DropdownMenu>

          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Sign out of CareFlow?</AlertDialogTitle>
              <AlertDialogDescription>
                You will need to sign in again to access the dashboard. Any unsaved
                what-if scenario adjustments will be cleared.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={loggingOut}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={doLogout}
                disabled={loggingOut}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {loggingOut && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign out
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </header>
  )
}

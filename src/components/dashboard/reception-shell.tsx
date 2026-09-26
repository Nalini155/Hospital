'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2,
  LogOut,
  Menu,
  ChevronDown,
  LayoutDashboard,
  BedDouble,
  HeartPulse,
  Users,
  ClipboardList,
} from 'lucide-react'
import { useSession, useLogout } from '@/hooks/use-api'
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
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { SidebarBrand } from '@/components/dashboard/sidebar'
import { ReceptionView } from '@/components/views/reception-view'
import { UpdateBedsView } from '@/components/views/reception-update-beds-view'
import { UpdateIcuView } from '@/components/views/reception-update-icu-view'
import { UpdatePatientsView } from '@/components/views/reception-update-patients-view'
import { DailyEntryView } from '@/components/views/reception-daily-entry-view'
import { DisclaimerFooter } from '@/components/dashboard/footer'
import { useUiStore } from '@/lib/store'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

type RecView = 'dashboard' | 'beds' | 'icu' | 'patients' | 'daily'

const REC_NAV: { id: RecView; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'beds', label: 'Update Beds', icon: BedDouble },
  { id: 'icu', label: 'Update ICU', icon: HeartPulse },
  { id: 'patients', label: 'Update Patients', icon: Users },
  { id: 'daily', label: 'Daily Entry', icon: ClipboardList },
]

const REC_TITLES: Record<RecView, { title: string; subtitle: string }> = {
  dashboard: { title: 'Reception Dashboard', subtitle: 'Live capacity overview & patient check-in reference' },
  beds: { title: 'Update Beds', subtitle: "Update today's ward bed capacity & occupancy" },
  icu: { title: 'Update ICU', subtitle: "Update today's ICU bed capacity & occupancy" },
  patients: { title: 'Update Patients', subtitle: "Update today's admissions & discharges" },
  daily: { title: 'Daily Entry', subtitle: 'Update ward, ICU & patient numbers in one place' },
}

/**
 * Reception shell — restricted layout for the Reception role. Sidebar shows
 * Dashboard, Update Beds, Update ICU, and Daily Entry. No access to forecast,
 * analytics, admin, or settings. Logout dropdown with confirmation.
 */
export function ReceptionShell() {
  const recView = useUiStore((s) => s.recView)
  const setRecView = useUiStore((s) => s.setRecView)
  const mobileOpen = useUiStore((s) => s.mobileOpen)
  const setMobileOpen = useUiStore((s) => s.setMobileOpen)

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside className="hidden w-[260px] shrink-0 border-r border-sidebar-border bg-sidebar lg:flex lg:flex-col">
        <SidebarBrand />
        <nav className="flex flex-1 flex-col gap-1 px-3 py-4" aria-label="Primary">
          {REC_NAV.map((item) => {
            const active = recView === item.id
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={() => setRecView(item.id)}
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
              </button>
            )
          })}
        </nav>
        <div className="mt-auto border-t border-sidebar-border px-5 py-4">
          <p className="text-[10px] leading-relaxed text-muted-foreground">
            Capacity &amp; operations risk signals only — not medical diagnosis or emergency predictions.
          </p>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <ReceptionHeader title={REC_TITLES[recView].title} subtitle={REC_TITLES[recView].subtitle} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {recView === 'dashboard' && <ReceptionView />}
          {recView === 'beds' && <UpdateBedsView />}
          {recView === 'icu' && <UpdateIcuView />}
          {recView === 'patients' && <UpdatePatientsView />}
          {recView === 'daily' && <DailyEntryView />}
        </main>
        <DisclaimerFooter />
      </div>
    </div>
  )
}

function ReceptionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  const { data } = useSession()
  const user = data?.user
  const setRecView = useUiStore((s) => s.setRecView)
  const setMobileOpen = useUiStore((s) => s.setMobileOpen)
  const mobileOpen = useUiStore((s) => s.mobileOpen)
  const logout = useLogout()
  const { toast } = useToast()
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)

  const initials = user
    ? user.name
        .split(' ')
        .map((p) => p[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '?'

  const roleLabel = 'Reception'

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
            <nav className="flex flex-1 flex-col gap-1 px-3 py-4" aria-label="Primary">
              {REC_NAV.map((item) => {
                const active = useUiStore.getState().recView === item.id
                const Icon = item.icon
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setRecView(item.id)
                      setMobileOpen(false)
                    }}
                    className={cn(
                      'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      active
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground',
                    )}
                    aria-current={active ? 'page' : undefined}
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0 text-primary" />
                    <span className="flex-1 text-left">{item.label}</span>
                  </button>
                )
              })}
            </nav>
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex flex-1 flex-col">
        <h1 className="text-base font-semibold tracking-tight sm:text-lg">{title}</h1>
        <p className="hidden text-xs text-muted-foreground sm:block">{subtitle}</p>
      </div>

      <div className="flex items-center gap-2">
        <AlertDialog>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center gap-2 rounded-full border border-transparent py-1 pl-1 pr-2.5 transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="User account menu"
              >
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
                You will need to sign in again to access the Reception dashboard.
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

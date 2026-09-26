'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, LogOut, Menu, ChevronDown } from 'lucide-react'
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
import { DisclaimerFooter } from '@/components/dashboard/footer'
import { useToast } from '@/hooks/use-toast'

/**
 * Reception shell — a separate, restricted layout for the Reception role.
 * The sidebar shows only the Dashboard item (no Forecast, Departments,
 * Alerts, What-If, or Settings). The header has no "Regenerate data" button
 * (an admin/staff action) and a logout dropdown with confirmation.
 */
export function ReceptionShell() {
  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      {/* Desktop sidebar — Reception only sees Dashboard */}
      <aside className="hidden w-[260px] shrink-0 border-r border-sidebar-border bg-sidebar lg:flex lg:flex-col">
        <SidebarBrand />
        <nav className="flex flex-1 flex-col gap-1 px-3 py-4" aria-label="Primary">
          <div
            className="group flex items-center gap-3 rounded-lg bg-sidebar-accent px-3 py-2.5 text-sm font-medium text-sidebar-accent-foreground"
            aria-current="page"
          >
            <span className="text-primary text-[18px]">●</span>
            <span className="flex-1 text-left">Dashboard</span>
          </div>
        </nav>
        <div className="mt-auto border-t border-sidebar-border px-5 py-4">
          <p className="text-[10px] leading-relaxed text-muted-foreground">
            Capacity &amp; operations risk signals only — not medical diagnosis or emergency predictions.
          </p>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <ReceptionHeader />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <ReceptionView />
        </main>
        <DisclaimerFooter />
      </div>
    </div>
  )
}

function ReceptionHeader() {
  const { data } = useSession()
  const user = data?.user
  const [mobileOpenState, setMobileOpenState] = useState(false)
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
      {/* Mobile sidebar — Reception only sees Dashboard */}
      <Sheet open={mobileOpenState} onOpenChange={setMobileOpenState}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <div className="flex h-full flex-col">
            <SidebarBrand />
            <nav className="flex flex-1 flex-col gap-1 px-3 py-4" aria-label="Primary">
              <div className="group flex items-center gap-3 rounded-lg bg-sidebar-accent px-3 py-2.5 text-sm font-medium text-sidebar-accent-foreground">
                <span className="text-primary text-[18px]">●</span>
                <span className="flex-1 text-left">Dashboard</span>
              </div>
            </nav>
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex flex-1 flex-col">
        <h1 className="text-base font-semibold tracking-tight sm:text-lg">Reception Dashboard</h1>
        <p className="hidden text-xs text-muted-foreground sm:block">
          Live capacity overview &amp; patient check-in reference
        </p>
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

'use client'

import { SidebarBrand, SidebarNav } from '@/components/dashboard/sidebar'
import { DashboardHeader } from '@/components/dashboard/header'
import { ViewRouter } from '@/components/dashboard/view-router'
import { DisclaimerFooter } from '@/components/dashboard/footer'

export function DashboardShell() {
  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside className="hidden w-[260px] shrink-0 border-r border-sidebar-border bg-sidebar lg:flex lg:flex-col">
        <SidebarBrand />
        <SidebarNav />
        <SidebarFooterMini />
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <ViewRouter />
        </main>
        <DisclaimerFooter />
      </div>
    </div>
  )
}

function SidebarFooterMini() {
  return (
    <div className="mt-auto border-t border-sidebar-border px-5 py-4">
      <p className="text-[10px] leading-relaxed text-muted-foreground">
        Capacity &amp; operations risk signals only — not medical diagnosis or emergency predictions.
      </p>
    </div>
  )
}

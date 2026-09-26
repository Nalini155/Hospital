'use client'

import { useSession } from '@/hooks/use-api'
import { AuthView } from '@/components/auth/auth-view'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { ReceptionShell } from '@/components/dashboard/reception-shell'
import { PageLoader } from '@/components/ui/page-loader'

export default function Home() {
  const { data, isLoading } = useSession()

  if (isLoading) {
    return <PageLoader label="Loading CareFlow Intelligence…" />
  }

  if (!data || !data.user) {
    return <AuthView />
  }

  // Role-based routing: Reception users get their own simplified dashboard and
  // cannot access the full analytics dashboard. Admin/Staff get the full shell.
  if (data.user.role === 'RECEPTION') {
    return <ReceptionShell />
  }

  return <DashboardShell />
}

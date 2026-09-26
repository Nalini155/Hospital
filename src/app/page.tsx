'use client'

import { useSession } from '@/hooks/use-api'
import { AuthView } from '@/components/auth/auth-view'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { PageLoader } from '@/components/ui/page-loader'

export default function Home() {
  const { data, isLoading } = useSession()

  if (isLoading) {
    return <PageLoader label="Loading CareFlow Intelligence…" />
  }

  if (!data || !data.user) {
    return <AuthView />
  }

  return <DashboardShell />
}

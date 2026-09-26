'use client'

import { useUiStore } from '@/lib/store'
import { OverviewView } from '@/components/views/overview-view'
import { ForecastView } from '@/components/views/forecast-view'
import { DepartmentsView } from '@/components/views/departments-view'
import { AlertsView } from '@/components/views/alerts-view'
import { SimulationView } from '@/components/views/simulation-view'
import { SettingsView } from '@/components/views/settings-view'
import { AdminView } from '@/components/views/admin-view'

export function ViewRouter() {
  const view = useUiStore((s) => s.view)
  switch (view) {
    case 'forecast':
      return <ForecastView />
    case 'departments':
      return <DepartmentsView />
    case 'alerts':
      return <AlertsView />
    case 'simulation':
      return <SimulationView />
    case 'settings':
      return <SettingsView />
    case 'admin':
      return <AdminView />
    case 'overview':
    default:
      return <OverviewView />
  }
}

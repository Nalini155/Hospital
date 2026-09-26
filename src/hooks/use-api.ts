'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { apiFetch } from '@/lib/api-client'
import type {
  AuthUser,
  DashboardOverview,
  DeptForecast,
  SeriesForecast,
  SimulationInput,
  SimulationResult,
  CapacityAlert,
  ResourceGap,
} from '@/lib/types'

// ---------- Session ----------
export function useSession() {
  return useQuery<{ user: AuthUser | null }>({
    queryKey: ['session'],
    queryFn: async () => {
      const res = await apiFetch('/api/auth/me')
      if (!res.ok) return { user: null }
      return res.json()
    },
  })
}

export type AuthError = Error & { code?: string }

function authError(message: string, code?: string): AuthError {
  const e = new Error(message) as AuthError
  e.code = code
  return e
}

export function useLogin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (vars: { email: string; password: string }) => {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vars),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw authError(data.error ?? 'Login failed', data.code)
      return data as { user: AuthUser }
    },
    onSuccess: async (data) => {
      // The login response contains the user and the server has set the httpOnly
      // session cookie. We set the session cache so the UI can switch to the
      // dashboard, BUT we also refetch /api/auth/me to CONFIRM the cookie is
      // actually committed by the browser before any data fetch fires. This
      // eliminates the race where useDashboard's fetch ran before the cookie
      // was stored, returning 401.
      qc.setQueryData<{ user: AuthUser | null }>(['session'], { user: data.user })
      try {
        await qc.refetchQueries({ queryKey: ['session'] })
      } catch {
        // refetch failure is non-fatal; the setQueryData above already set the session
      }
      // Now that the cookie is confirmed, invalidate data queries so they fetch
      // fresh with the cookie attached.
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['forecast'] })
      qc.invalidateQueries({ queryKey: ['departments'] })
      qc.invalidateQueries({ queryKey: ['alerts'] })
    },
    // Errors are rendered inline in the auth view, not as toasts.
  })
}

export function useSignup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (vars: {
      name: string
      email: string
      password: string
      role: 'ADMIN' | 'STAFF'
    }) => {
      const res = await apiFetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vars),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw authError(data.error ?? 'Sign up failed', data.code)
      return data as { user: AuthUser }
    },
    onSuccess: async (data) => {
      qc.setQueryData<{ user: AuthUser | null }>(['session'], { user: data.user })
      try {
        await qc.refetchQueries({ queryKey: ['session'] })
      } catch {
        // non-fatal
      }
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['forecast'] })
      qc.invalidateQueries({ queryKey: ['departments'] })
      qc.invalidateQueries({ queryKey: ['alerts'] })
    },
    // Errors are rendered inline in the auth view, not as toasts.
  })
}

export function useLogout() {
  const qc = useQueryClient()
  const router = useRouter()
  return useMutation({
    mutationFn: async () => {
      await apiFetch('/api/auth/logout', { method: 'POST' })
    },
    onSuccess: () => {
      qc.setQueryData(['session'], { user: null })
      qc.clear()
      router.refresh()
    },
  })
}

// ---------- Dashboard data ----------
export function useDashboard() {
  const qc = useQueryClient()
  return useQuery<DashboardOverview>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await apiFetch('/api/dashboard')
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const err = new Error(
          data.error ?? 'Failed to load dashboard',
        ) as Error & { code?: string; status?: number }
        err.code = data.code
        err.status = res.status
        throw err
      }
      return data as DashboardOverview
    },
    // Keep retrying transient failures so a one-off seed/forecast hiccup
    // doesn't strand the user on an error screen.
    retry: 2,
    // If we get a 401, the session cookie may be stale/missing. Invalidate
    // the session query so useSession re-checks /api/auth/me and, if truly
    // logged out, the page switches back to the auth view.
    onError: (err) => {
      if (err && typeof err === 'object' && 'status' in err && err.status === 401) {
        qc.invalidateQueries({ queryKey: ['session'] })
      }
    },
  })
}

export function useForecast(metric: 'admissions' | 'bedsUsed' | 'icuUsed' = 'admissions', horizon = 7) {
  return useQuery<{
    metric: string
    horizon: number
    forecast: SeriesForecast
    series: { date: string; actual?: number; forecast?: number; lower?: number; upper?: number }[]
    params: { alpha: number; beta: number }
  }>({
    queryKey: ['forecast', metric, horizon],
    queryFn: async () => {
      const res = await apiFetch(`/api/forecast?metric=${metric}&horizon=${horizon}`)
      if (!res.ok) throw new Error('Failed to load forecast')
      return res.json()
    },
  })
}

export function useDepartments() {
  return useQuery<{ departments: DeptForecast[] }>({
    queryKey: ['departments'],
    queryFn: async () => {
      const res = await apiFetch('/api/departments')
      if (!res.ok) throw new Error('Failed to load departments')
      return res.json()
    },
  })
}

export function useAlerts() {
  return useQuery<{ alerts: CapacityAlert[]; gaps: ResourceGap[] }>({
    queryKey: ['alerts'],
    queryFn: async () => {
      const res = await apiFetch('/api/alerts')
      if (!res.ok) throw new Error('Failed to load alerts')
      return res.json()
    },
  })
}

export function useHistorical(days = 90) {
  return useQuery<{
    data: {
      date: string
      admissions: number
      bedsUsed: number
      icuUsed: number
      bedsCapacity: number
      icuCapacity: number
      discharges: number
    }[]
    count: number
  }>({
    queryKey: ['historical', days],
    queryFn: async () => {
      const res = await apiFetch(`/api/data/historical?days=${days}`)
      if (!res.ok) throw new Error('Failed to load historical data')
      return res.json()
    },
  })
}

export function useRegenerateData() {
  const qc = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: async () => {
      const res = await apiFetch('/api/data/historical', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const err = new Error(data.error ?? 'Failed to regenerate dataset') as Error & {
          code?: string
        }
        err.code = data.code
        throw err
      }
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['forecast'] })
      qc.invalidateQueries({ queryKey: ['departments'] })
      qc.invalidateQueries({ queryKey: ['alerts'] })
      qc.invalidateQueries({ queryKey: ['historical'] })
      toast({
        title: 'Dataset regenerated',
        description: '365 days of synthetic hospital data loaded.',
      })
    },
    onError: (e: Error) => {
      // Show the precise backend reason (seed failed / DB write error / etc.)
      toast({
        title: 'Could not regenerate dataset',
        description: e.message,
        variant: 'destructive',
      })
    },
  })
}

export function useSimulate() {
  return useMutation<{ input: SimulationInput; result: SimulationResult }>({
    mutationFn: async (input: SimulationInput) => {
      const res = await apiFetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Simulation failed')
      return data
    },
  })
}

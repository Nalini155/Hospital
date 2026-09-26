'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { apiFetch, saveAuthToken, clearAuthToken } from '@/lib/api-client'
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
      return data as { user: AuthUser; token: string }
    },
    onSuccess: async (data) => {
      // Store the JWT in localStorage so we can send it as a Bearer header on
      // every subsequent API call. This works in ANY context (same-origin,
      // gateway, iframe, cross-origin) — unlike the httpOnly cookie alone.
      if (data.token) saveAuthToken(data.token)
      // Set the session cache so the UI switches to the dashboard, then refetch
      // /api/auth/me to confirm the session is live (cookie OR header).
      qc.setQueryData<{ user: AuthUser | null }>(['session'], { user: data.user })
      try {
        await qc.refetchQueries({ queryKey: ['session'] })
      } catch {
        // non-fatal
      }
      // Now that the session is confirmed, invalidate data queries so they fetch
      // fresh with the token attached (cookie or Authorization header).
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
      return data as { user: AuthUser; token: string }
    },
    onSuccess: async (data) => {
      if (data.token) saveAuthToken(data.token)
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

export function useGoogleLogin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const res = await apiFetch('/api/auth/google', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw authError(data.error ?? 'Google sign-in failed', data.code)
      return data as { user: AuthUser; token: string }
    },
    onSuccess: async (data) => {
      if (data.token) saveAuthToken(data.token)
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
  })
}

// ---------- Google multi-step flow (account chooser → email code → login) ----------
export type MockGoogleAccount = {
  email: string
  name: string
  initials: string
  role: 'ADMIN' | 'STAFF' | 'RECEPTION'
}

/** Shared success handler for the Google verify step — set session + invalidate. */
function finishGoogleLogin(qc: ReturnType<typeof useQueryClient>, data: { user: AuthUser; token: string }) {
  if (data.token) saveAuthToken(data.token)
  qc.setQueryData<{ user: AuthUser | null }>(['session'], { user: data.user })
  // Fire-and-forget the session refetch; don't block the UI.
  qc.refetchQueries({ queryKey: ['session'] }).catch(() => {})
  qc.invalidateQueries({ queryKey: ['dashboard'] })
  qc.invalidateQueries({ queryKey: ['forecast'] })
  qc.invalidateQueries({ queryKey: ['departments'] })
  qc.invalidateQueries({ queryKey: ['alerts'] })
}

export function useGoogleInitiate(enabled = true) {
  return useQuery<{ accounts: MockGoogleAccount[] }>({
    queryKey: ['google-initiate'],
    queryFn: async () => {
      const res = await apiFetch('/api/auth/google/initiate')
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Failed to load Google accounts')
      return data as { accounts: MockGoogleAccount[] }
    },
    // Fetch only when enabled (e.g. when the chooser dialog opens).
    enabled,
    staleTime: Infinity,
  })
}

export function useGoogleSendCode() {
  return useMutation({
    mutationFn: async (email: string) => {
      const res = await apiFetch('/api/auth/google/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw authError(data.error ?? 'Could not send code', data.code)
      return data as { ok: boolean; email: string; demoCode: string; expiresInMs: number; message: string }
    },
  })
}

export function useGoogleVerify() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (vars: { email: string; code: string }) => {
      const res = await apiFetch('/api/auth/google/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vars),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw authError(data.error ?? 'Verification failed', data.code)
      return data as { user: AuthUser; token: string }
    },
    onSuccess: (data) => finishGoogleLogin(qc, data),
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
      // Clear the stored JWT so subsequent requests don't send a stale token.
      clearAuthToken()
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

// ---------- Reception dashboard (simplified) ----------
export type ReceptionOverview = {
  today: {
    date: string
    occupancyPct: number
    icuOccupancyPct: number
    availableBeds: number
    availableIcu: number
  }
  alert: {
    active: boolean
    level: 'warning' | 'critical' | 'none'
    message: string
  } | null
  departments: {
    department: string
    availableBeds: number
    capacity: number
    occupancyPct: number
    status: 'Normal' | 'Near Full' | 'Full'
  }[]
}

export function useReception() {
  return useQuery<ReceptionOverview>({
    queryKey: ['reception'],
    queryFn: async () => {
      const res = await apiFetch('/api/reception')
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const err = new Error(
          data.error ?? 'Failed to load reception dashboard',
        ) as Error & { code?: string; status?: number }
        err.code = data.code
        err.status = res.status
        throw err
      }
      return data as ReceptionOverview
    },
    retry: 2,
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

// ---------- Admin dashboard ----------
export type AdminUser = {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'STAFF' | 'RECEPTION'
  active: boolean
  joinedDate: string
}

export type AdminOverview = {
  users: { total: number; admin: number; staff: number; reception: number; active: number }
  data: {
    hospitalRecords: number
    departmentRecords: number
    daysOfHistory: number
    departments: number
    lastRefresh: string | null
    lastRefreshDate: string | null
  }
  forecastRuns: number
}

export type AdminActivity = {
  id: string
  action: string
  detail: string
  userEmail: string
  userName: string
  timestamp: string
}

export function useAdminUsers() {
  const qc = useQueryClient()
  return useQuery<{ users: AdminUser[] }>({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await apiFetch('/api/admin/users')
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const err = new Error(data.error ?? 'Failed to load users') as Error & {
          code?: string; status?: number
        }
        err.code = data.code
        err.status = res.status
        throw err
      }
      return data as { users: AdminUser[] }
    },
  })
}

export function useUpdateUser() {
  const qc = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: async (vars: {
      userId: string
      role?: 'ADMIN' | 'STAFF' | 'RECEPTION'
      active?: boolean
    }) => {
      const res = await apiFetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vars),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Failed to update user')
      return data as { user: AdminUser }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      qc.invalidateQueries({ queryKey: ['admin-overview'] })
      qc.invalidateQueries({ queryKey: ['admin-activity'] })
      toast({ title: 'User updated', description: 'The user record was saved.' })
    },
    onError: (e: Error) => {
      toast({
        title: 'Update failed',
        description: e.message,
        variant: 'destructive',
      })
    },
  })
}

export function useAdminOverview() {
  return useQuery<AdminOverview>({
    queryKey: ['admin-overview'],
    queryFn: async () => {
      const res = await apiFetch('/api/admin/overview')
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Failed to load overview')
      return data as AdminOverview
    },
  })
}

export function useAdminActivity(limit = 20) {
  return useQuery<{ activities: AdminActivity[] }>({
    queryKey: ['admin-activity', limit],
    queryFn: async () => {
      const res = await apiFetch(`/api/admin/activity?limit=${limit}`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Failed to load activity')
      return data as { activities: AdminActivity[] }
    },
  })
}

// ---------- Reception data entry (Update Beds / Update ICU) ----------
export type ReceptionDeptCurrent = {
  department: string
  totalBeds: number
  bedsOccupied: number
}

export function useReceptionBeds() {
  return useQuery<{ today: string; departments: ReceptionDeptCurrent[] }>({
    queryKey: ['reception-beds'],
    queryFn: async () => {
      const res = await apiFetch('/api/reception/update-beds')
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Failed to load bed data')
      return data as { today: string; departments: ReceptionDeptCurrent[] }
    },
  })
}

export function useUpdateBeds() {
  const qc = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: async (vars: {
      totalBeds: number
      bedsOccupied: number
      department: 'Emergency' | 'ICU' | 'General Ward' | 'Pediatrics'
    }) => {
      const res = await apiFetch('/api/reception/update-beds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vars),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Failed to save bed data')
      return data as { ok: boolean; message: string }
    },
    onSuccess: (data) => {
      // Invalidate all data queries so the reception dashboard AND the admin
      // / main dashboard reflect the updated numbers in real time.
      qc.invalidateQueries({ queryKey: ['reception'] })
      qc.invalidateQueries({ queryKey: ['reception-beds'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['departments'] })
      qc.invalidateQueries({ queryKey: ['alerts'] })
      qc.invalidateQueries({ queryKey: ['admin-overview'] })
      toast({ title: 'Saved', description: data.message })
    },
    onError: (e: Error) => {
      toast({ title: 'Save failed', description: e.message, variant: 'destructive' })
    },
  })
}

export function useReceptionIcu() {
  return useQuery<{ today: string; totalIcuBeds: number; icuBedsOccupied: number }>({
    queryKey: ['reception-icu'],
    queryFn: async () => {
      const res = await apiFetch('/api/reception/update-icu')
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Failed to load ICU data')
      return data as { today: string; totalIcuBeds: number; icuBedsOccupied: number }
    },
  })
}

export function useUpdateIcu() {
  const qc = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: async (vars: { totalIcuBeds: number; icuBedsOccupied: number }) => {
      const res = await apiFetch('/api/reception/update-icu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vars),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Failed to save ICU data')
      return data as { ok: boolean; message: string }
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['reception'] })
      qc.invalidateQueries({ queryKey: ['reception-icu'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['departments'] })
      qc.invalidateQueries({ queryKey: ['alerts'] })
      qc.invalidateQueries({ queryKey: ['admin-overview'] })
      toast({ title: 'Saved', description: data.message })
    },
    onError: (e: Error) => {
      toast({ title: 'Save failed', description: e.message, variant: 'destructive' })
    },
  })
}

// ---------- Reception patient (admissions/discharges) entry ----------
export function useReceptionPatients() {
  return useQuery<{ today: string; admissions: number; discharges: number }>({
    queryKey: ['reception-patients'],
    queryFn: async () => {
      const res = await apiFetch('/api/reception/update-patients')
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Failed to load patient data')
      return data as { today: string; admissions: number; discharges: number }
    },
  })
}

export function useUpdatePatients() {
  const qc = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: async (vars: {
      admissions: number
      discharges: number
      department?: 'Emergency' | 'ICU' | 'General Ward' | 'Pediatrics'
    }) => {
      const res = await apiFetch('/api/reception/update-patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vars),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Failed to save patient data')
      return data as { ok: boolean; message: string }
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['reception'] })
      qc.invalidateQueries({ queryKey: ['reception-patients'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['departments'] })
      qc.invalidateQueries({ queryKey: ['admin-overview'] })
      toast({ title: 'Saved', description: data.message })
    },
    onError: (e: Error) => {
      toast({ title: 'Save failed', description: e.message, variant: 'destructive' })
    },
  })
}

'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
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
      const res = await fetch('/api/auth/me', { cache: 'no-store' })
      if (!res.ok) return { user: null }
      return res.json()
    },
  })
}

export function useLogin() {
  const qc = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: async (vars: { email: string; password: string }) => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vars),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Login failed')
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['session'] })
    },
    onError: (e: Error) => {
      toast({ title: 'Login failed', description: e.message, variant: 'destructive' })
    },
  })
}

export function useSignup() {
  const qc = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: async (vars: {
      name: string
      email: string
      password: string
      role: 'ADMIN' | 'STAFF'
    }) => {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vars),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Signup failed')
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['session'] })
    },
    onError: (e: Error) => {
      toast({ title: 'Sign up failed', description: e.message, variant: 'destructive' })
    },
  })
}

export function useLogout() {
  const qc = useQueryClient()
  const router = useRouter()
  return useMutation({
    mutationFn: async () => {
      await fetch('/api/auth/logout', { method: 'POST' })
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
  return useQuery<DashboardOverview>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard', { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to load dashboard')
      return res.json()
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
      const res = await fetch(
        `/api/forecast?metric=${metric}&horizon=${horizon}`,
        { cache: 'no-store' },
      )
      if (!res.ok) throw new Error('Failed to load forecast')
      return res.json()
    },
  })
}

export function useDepartments() {
  return useQuery<{ departments: DeptForecast[] }>({
    queryKey: ['departments'],
    queryFn: async () => {
      const res = await fetch('/api/departments', { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to load departments')
      return res.json()
    },
  })
}

export function useAlerts() {
  return useQuery<{ alerts: CapacityAlert[]; gaps: ResourceGap[] }>({
    queryKey: ['alerts'],
    queryFn: async () => {
      const res = await fetch('/api/alerts', { cache: 'no-store' })
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
      const res = await fetch(`/api/data/historical?days=${days}`, {
        cache: 'no-store',
      })
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
      const res = await fetch('/api/data/historical', { method: 'POST' })
      if (!res.ok) throw new Error('Failed to regenerate dataset')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['forecast'] })
      qc.invalidateQueries({ queryKey: ['departments'] })
      qc.invalidateQueries({ queryKey: ['alerts'] })
      qc.invalidateQueries({ queryKey: ['historical'] })
      toast({ title: 'Dataset regenerated', description: '365 days of synthetic hospital data loaded.' })
    },
  })
}

export function useSimulate() {
  return useMutation<{ input: SimulationInput; result: SimulationResult }>({
    mutationFn: async (input: SimulationInput) => {
      const res = await fetch('/api/simulate', {
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

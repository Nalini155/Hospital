'use client'

import { create } from 'zustand'

type UiState = {
  // active dashboard view (client-side view switching, stays on `/`)
  view: string
  setView: (v: string) => void
  // active reception view (Reception shell has its own nav: dashboard/beds/icu/daily)
  recView: 'dashboard' | 'beds' | 'icu' | 'patients' | 'daily'
  setRecView: (v: 'dashboard' | 'beds' | 'icu' | 'patients' | 'daily') => void
  // sidebar collapse on desktop
  collapsed: boolean
  toggleCollapsed: () => void
  setCollapsed: (c: boolean) => void
  // mobile sidebar open
  mobileOpen: boolean
  setMobileOpen: (o: boolean) => void
}

export const useUiStore = create<UiState>((set) => ({
  view: 'overview',
  setView: (v) => set({ view: v, mobileOpen: false }),
  recView: 'dashboard',
  setRecView: (v) => set({ recView: v, mobileOpen: false }),
  collapsed: false,
  toggleCollapsed: () => set((s) => ({ collapsed: !s.collapsed })),
  setCollapsed: (c) => set({ collapsed: c }),
  mobileOpen: false,
  setMobileOpen: (o) => set({ mobileOpen: o }),
}))

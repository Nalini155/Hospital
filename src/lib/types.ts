// Shared types mirroring API responses

export type Role = 'ADMIN' | 'STAFF' | 'RECEPTION'

export type AuthUser = {
  id: string
  name: string
  email: string
  role: Role
}

export type DashboardView =
  | 'overview'
  | 'forecast'
  | 'departments'
  | 'alerts'
  | 'simulation'
  | 'settings'

export type ForecastPoint = {
  date: string
  actual?: number
  forecast: number
  lower: number
  upper: number
}

export type SeriesForecast = {
  points: ForecastPoint[]
  mean: number
  std: number
  params: { alpha: number; beta: number }
}

export type ResourceGap = {
  resource: string
  available: number
  forecastNeed: number
  gap: number
  severity: 'ok' | 'watch' | 'critical'
}

export type CapacityAlert = {
  id: string
  level: 'warning' | 'critical'
  title: string
  message: string
  resource: string
  dateRange: string
  occupancyPct: number
}

export type DashboardOverview = {
  today: {
    date: string
    occupancyPct: number
    icuOccupancyPct: number
    admissions: number
    availableBeds: number
    availableIcu: number
    bedsCapacity: number
    icuCapacity: number
  }
  forecast7: SeriesForecast
  forecastBed7: SeriesForecast
  forecastIcu7: SeriesForecast
  trend: {
    date: string
    actual?: number
    forecast?: number
    lower?: number
    upper?: number
  }[]
  gaps: ResourceGap[]
  alerts: CapacityAlert[]
  params: { alpha: number; beta: number }
}

export type Department = 'Emergency' | 'ICU' | 'General Ward' | 'Pediatrics'

export type DeptForecast = {
  department: Department
  forecast7: SeriesForecast
  bedForecast7: SeriesForecast
  todayOccupancyPct: number
  bedsCapacity: number
  bedsUsed: number
  admissions: number
  icuCapacity: number
  icuUsed: number
}

export type SimulationInput = {
  bedCapacityDelta: number
  icuCapacityDelta: number
  inflowPct: number
  losDelta: number
  horizon: number
}

export type SimulationResult = {
  base: {
    bedGap: number
    icuGap: number
    bedOccPct: number
    icuOccPct: number
    peakAdmissions: number
  }
  scenario: {
    bedGap: number
    icuGap: number
    bedOccPct: number
    icuOccPct: number
    peakAdmissions: number
  }
  affectedDepartments: {
    department: string
    baseGap: number
    scenarioGap: number
    severity: 'ok' | 'watch' | 'critical'
  }[]
  forecast: { date: string; baseAdmissions: number; scenarioAdmissions: number }[]
  bedForecast: {
    date: string
    baseBeds: number
    scenarioBeds: number
    capacity: number
  }[]
}

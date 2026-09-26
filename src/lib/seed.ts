import { db } from '@/lib/db'

export type Department = 'Emergency' | 'ICU' | 'General Ward' | 'Pediatrics'
export const DEPARTMENTS: Department[] = [
  'Emergency',
  'ICU',
  'General Ward',
  'Pediatrics',
]

export type DailyRecord = {
  date: string
  admissions: number
  discharges: number
  bedsUsed: number
  bedsCapacity: number
  icuUsed: number
  icuCapacity: number
}

export type DeptDailyRecord = {
  date: string
  department: Department
  admissions: number
  bedsUsed: number
  bedsCapacity: number
  icuUsed: number
  icuCapacity: number
}

// Department share of total admissions (sums to 1)
const DEPT_SHARE: Record<Department, number> = {
  Emergency: 0.34,
  ICU: 0.08,
  'General Ward': 0.42,
  Pediatrics: 0.16,
}

// Department bed capacity (Emergency + General Ward + Pediatrics = aggregate ward capacity; ICU separate)
const DEPT_BED_CAPACITY: Record<Department, number> = {
  Emergency: 60,
  ICU: 32,
  'General Ward': 412,
  Pediatrics: 108,
}
// Only ICU department contributes to aggregate ICU capacity
const ICU_CAPACITY = 32

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

// Deterministic-ish pseudo random with seed for reproducibility
function mulberry32(seed: number) {
  let a = seed
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function gaussian(rand: () => number): number {
  // Box-Muller
  const u = rand() || 0.0001
  const v = rand()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

/**
 * Generate realistic daily hospital operations for `days` days ending today.
 * Models: weekly seasonality (fewer admissions on weekends), gentle upward trend,
 * occupancy coupling to admissions (lag), and noise. ICU ratio derived from
 * total admissions (~6-9%) to fill missing ICU fields with realistic synthetic ratios.
 */
export function generateSyntheticData(
  days = 365,
  endDate = new Date(),
  seed = 20240115,
): { aggregate: DailyRecord[]; departments: DeptDailyRecord[] } {
  const rand = mulberry32(seed)
  const aggregate: DailyRecord[] = []
  const departments: DeptDailyRecord[] = []

  const start = addDays(endDate, -(days - 1))

  // Base parameters — tuned for realistic daily hospital volumes
  const baseAdmissions = 135 // ~avg daily admissions
  const trendPerDay = 0.0003 // ~11% upward drift over the full year
  const weekendDrop = 0.2 // weekends ~20% lower
  const dayOfWeekSeasonality = [0.92, 1.08, 1.1, 1.07, 1.0, 0.82, 0.78] // Sun..Sat

  // Occupancy dynamics — mean-reverting toward realistic targets
  let bedsUsed = 460 // starting ward occupancy (~80%)
  let icuUsed = 25
  const bedsCapacity = 580 // general ward capacity (aggregate non-ICU)
  const totalBedCapacity = bedsCapacity + ICU_CAPACITY
  // Mean-reversion targets (fraction of capacity)
  const targetWardOcc = 0.8 * bedsCapacity // ~464 (80%)
  const targetIcuOcc = 0.78 * ICU_CAPACITY // ~25 (78%)

  for (let i = 0; i < days; i++) {
    const d = addDays(start, i)
    const dow = d.getDay() // 0=Sun..6=Sat
    const isWeekend = dow === 0 || dow === 6
    const trend = 1 + trendPerDay * i
    const seasonal = isWeekend
      ? 1 - weekendDrop
      : dayOfWeekSeasonality[dow]

    const noise = 1 + 0.08 * gaussian(rand)
    const admissions = Math.max(
      60,
      Math.round(baseAdmissions * trend * seasonal * noise),
    )

    // Discharges lag admissions by ~2 days and are ~95% of admissions
    const discharges = Math.max(
      40,
      Math.round(
        admissions * (0.95 + 0.03 * gaussian(rand)),
      ),
    )

    // ICU admissions ~4% of total (realistic)
    const icuAdmissions = Math.max(
      1,
      Math.round(admissions * (0.04 + 0.008 * gaussian(rand))),
    )
    // Ward admissions = total minus ICU-bound
    const netWard = admissions - icuAdmissions - discharges
    // Mean-revert ward occupancy toward target, perturbed by net flow & noise
    bedsUsed = Math.max(
      220,
      Math.min(
        bedsCapacity - 1,
        bedsUsed + 0.12 * (targetWardOcc - bedsUsed) + netWard + 1.5 * gaussian(rand),
      ),
    )
    const icuDischarges = Math.round(icuAdmissions * 0.93)
    // Mean-revert ICU occupancy toward target
    icuUsed = Math.max(
      6,
      Math.min(
        ICU_CAPACITY - 1,
        icuUsed + 0.18 * (targetIcuOcc - icuUsed) + (icuAdmissions - icuDischarges) + 0.4 * gaussian(rand),
      ),
    )

    aggregate.push({
      date: toISO(d),
      admissions,
      discharges,
      bedsUsed: Math.round(bedsUsed),
      bedsCapacity,
      icuUsed: Math.round(icuUsed),
      icuCapacity: ICU_CAPACITY,
    })

    // Department breakdown
    for (const dept of DEPARTMENTS) {
      const share = DEPT_SHARE[dept]
      const deptNoise = 1 + 0.12 * gaussian(rand)
      const deptAdmissions = Math.max(2, Math.round(admissions * share * deptNoise))
      const cap = DEPT_BED_CAPACITY[dept]
      // occupancy proportional to overall occupancy, clamped
      const occRatio = Math.min(
        0.96,
        Math.max(0.45, bedsUsed / bedsCapacity + 0.05 * gaussian(rand)),
      )
      const deptBedsUsed = Math.round(cap * occRatio)
      const isICU = dept === 'ICU'
      departments.push({
        date: toISO(d),
        department: dept,
        admissions: deptAdmissions,
        bedsUsed: Math.min(cap, deptBedsUsed),
        bedsCapacity: cap,
        icuUsed: isICU ? Math.round(icuUsed) : 0,
        icuCapacity: isICU ? ICU_CAPACITY : 0,
      })
    }
  }

  return { aggregate, departments }
}

export async function ensureSeedData(): Promise<void> {
  const count = await db.hospitalDaily.count()
  // We expect at least 14 days of data for the forecasting model (weekly seasonality
  // + grid search). If the dataset is missing or only partially seeded (e.g. an
  // interrupted previous seed), reseed so the dashboard always has enough data.
  if (count >= 14) return
  await resetSeedData(365)
}

export async function seedDatabase(days = 365): Promise<void> {
  const { aggregate, departments } = generateSyntheticData(days)

  await db.hospitalDaily.createMany({
    data: aggregate.map((r) => ({
      date: r.date,
      admissions: r.admissions,
      discharges: r.discharges,
      bedsUsed: r.bedsUsed,
      bedsCapacity: r.bedsCapacity,
      icuUsed: r.icuUsed,
      icuCapacity: r.icuCapacity,
    })),
  })

  await db.departmentDaily.createMany({
    data: departments.map((r) => ({
      date: r.date,
      department: r.department,
      admissions: r.admissions,
      bedsUsed: r.bedsUsed,
      bedsCapacity: r.bedsCapacity,
      icuUsed: r.icuUsed,
      icuCapacity: r.icuCapacity,
    })),
  })
}

export async function resetSeedData(days = 365): Promise<void> {
  // Delete in a safe order and reseed. Wrapped so callers see a clean error.
  await db.departmentDaily.deleteMany({})
  await db.hospitalDaily.deleteMany({})
  await seedDatabase(days)
}

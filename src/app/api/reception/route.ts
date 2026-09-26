import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { ensureSeedData } from '@/lib/seed'
import { DEPARTMENTS, type Department } from '@/lib/seed'

export type ReceptionDeptStatus = 'Normal' | 'Near Full' | 'Full'

export type ReceptionDept = {
  department: Department
  availableBeds: number
  capacity: number
  occupancyPct: number
  status: ReceptionDeptStatus
}

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
  departments: ReceptionDept[]
}

function statusFor(occPct: number): ReceptionDeptStatus {
  if (occPct >= 95) return 'Full'
  if (occPct >= 85) return 'Near Full'
  return 'Normal'
}

export async function GET() {
  const session = await getAuthUser()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // Reception endpoint is available to all authenticated users, but the data is
  // tailored to the Reception simplified dashboard.
  try {
    await ensureSeedData()
  } catch (e) {
    return NextResponse.json(
      {
        error:
          'Could not initialize the sample dataset. ' +
          (e instanceof Error ? e.message : 'Unknown seed error.'),
        code: 'SEED_FAILED',
      },
      { status: 500 },
    )
  }

  try {
    // Latest aggregate daily record (today)
    const latestAggregate = await db.hospitalDaily.findFirst({
      orderBy: { date: 'desc' },
    })
    if (!latestAggregate) {
      return NextResponse.json(
        { error: 'No hospital data available.', code: 'NO_DATA' },
        { status: 500 },
      )
    }

    // Latest per-department records
    const deptRows: ReceptionDept[] = []
    for (const dept of DEPARTMENTS) {
      const latest = await db.departmentDaily.findFirst({
        where: { department: dept },
        orderBy: { date: 'desc' },
      })
      if (!latest) continue
      const occPct = Math.round((latest.bedsUsed / latest.bedsCapacity) * 100)
      deptRows.push({
        department: dept,
        availableBeds: Math.max(0, latest.bedsCapacity - latest.bedsUsed),
        capacity: latest.bedsCapacity,
        occupancyPct: occPct,
        status: statusFor(occPct),
      })
    }

    // Capacity alert: derived from today's occupancy. Reception users see a
    // simple "high occupancy expected" signal rather than the full forecast
    // threshold system.
    let alert: ReceptionOverview['alert'] = null
    const wardOcc = latestAggregate.bedsUsed / latestAggregate.bedsCapacity
    const icuOcc = latestAggregate.icuUsed / latestAggregate.icuCapacity
    const maxOcc = Math.max(wardOcc, icuOcc)
    if (maxOcc >= 0.9) {
      alert = {
        active: true,
        level: 'critical',
        message:
          'Critical capacity: ward or ICU is at ≥90% occupancy. Coordinate admissions carefully and escalate to the duty manager.',
      }
    } else if (maxOcc >= 0.85) {
      alert = {
        active: true,
        level: 'warning',
        message:
          'Expected high occupancy today — plan admissions accordingly and prioritize discharges where possible.',
      }
    } else {
      alert = { active: false, level: 'none', message: '' }
    }

    const overview: ReceptionOverview = {
      today: {
        date: latestAggregate.date,
        occupancyPct: Math.round(wardOcc * 100),
        icuOccupancyPct: Math.round(icuOcc * 100),
        availableBeds: Math.max(0, latestAggregate.bedsCapacity - latestAggregate.bedsUsed),
        availableIcu: Math.max(0, latestAggregate.icuCapacity - latestAggregate.icuUsed),
      },
      alert,
      departments: deptRows,
    }
    return NextResponse.json(overview)
  } catch (e) {
    return NextResponse.json(
      {
        error:
          'Failed to load reception dashboard. ' +
          (e instanceof Error ? e.message : 'Unknown error.'),
        code: 'RECEPTION_FAILED',
      },
      { status: 500 },
    )
  }
}

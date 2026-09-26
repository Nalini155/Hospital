import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { ensureSeedData, DEPARTMENTS, type Department } from '@/lib/seed'
import { logActivity } from '@/lib/activity'

const schema = z.object({
  totalIcuBeds: z.number().int().min(0, 'Total ICU beds cannot be negative'),
  icuBedsOccupied: z.number().int().min(0, 'Occupied ICU beds cannot be negative'),
}).refine((d) => d.icuBedsOccupied <= d.totalIcuBeds, {
  message: 'Occupied ICU beds cannot exceed total ICU beds',
  path: ['icuBedsOccupied'],
})

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export async function GET() {
  const session = await getAuthUser()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    await ensureSeedData()
  } catch (e) {
    return NextResponse.json(
      { error: 'Could not initialize dataset. ' + (e instanceof Error ? e.message : ''), code: 'SEED_FAILED' },
      { status: 500 },
    )
  }
  try {
    const today = todayISO()
    // ICU capacity/occupancy comes from the ICU department record + the
    // aggregate hospital daily record. Prefill from the latest available.
    const latestIcuDept = await db.departmentDaily.findFirst({
      where: { department: 'ICU' },
      orderBy: { date: 'desc' },
    })
    const latestAgg = await db.hospitalDaily.findFirst({ orderBy: { date: 'desc' } })
    return NextResponse.json({
      today,
      totalIcuBeds: latestIcuDept?.icuCapacity ?? latestIcuDept?.bedsCapacity ?? latestAgg?.icuCapacity ?? 0,
      icuBedsOccupied: latestIcuDept?.icuUsed ?? latestIcuDept?.bedsUsed ?? latestAgg?.icuUsed ?? 0,
    })
  } catch (e) {
    return NextResponse.json(
      { error: 'Failed to load ICU data. ' + (e instanceof Error ? e.message : ''), code: 'LOAD_FAILED' },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  const session = await getAuthUser()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body', code: 'BAD_REQUEST' }, { status: 400 })
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Validation failed', code: 'VALIDATION' },
      { status: 400 },
    )
  }
  const { totalIcuBeds, icuBedsOccupied } = parsed.data
  const today = todayISO()
  const available = Math.max(0, totalIcuBeds - icuBedsOccupied)

  try {
    // Upsert the ICU department daily record for today.
    const existingIcu = await db.departmentDaily.findUnique({
      where: { date_department: { date: today, department: 'ICU' } },
    })
    if (existingIcu) {
      await db.departmentDaily.update({
        where: { id: existingIcu.id },
        data: { bedsCapacity: totalIcuBeds, bedsUsed: icuBedsOccupied, icuCapacity: totalIcuBeds, icuUsed: icuBedsOccupied },
      })
    } else {
      await db.departmentDaily.create({
        data: {
          date: today,
          department: 'ICU',
          admissions: 0,
          bedsCapacity: totalIcuBeds,
          bedsUsed: icuBedsOccupied,
          icuCapacity: totalIcuBeds,
          icuUsed: icuBedsOccupied,
        },
      })
    }

    // Recompute today's aggregate hospital daily ICU fields. Ward fields stay
    // as the latest known so we don't clobber reception bed updates.
    type DeptRow = {
      id: string
      date: string
      department: string
      admissions: number
      bedsUsed: number
      bedsCapacity: number
      icuUsed: number
      icuCapacity: number
    }
    const latestByDept: Record<string, DeptRow | undefined> = {}
    const allToday = await db.departmentDaily.findMany({ where: { date: today } })
    for (const r of allToday) latestByDept[r.department] = r as DeptRow
    for (const dept of DEPARTMENTS) {
      if (!latestByDept[dept]) {
        const latest = await db.departmentDaily.findFirst({ where: { department: dept }, orderBy: { date: 'desc' } })
        if (latest) latestByDept[dept] = latest as DeptRow
      }
    }
    const wardDepts: Department[] = ['Emergency', 'General Ward', 'Pediatrics']
    const wardBedsUsed = wardDepts.reduce((s, d) => s + (latestByDept[d]?.bedsUsed ?? 0), 0)
    const wardBedsCapacity = wardDepts.reduce((s, d) => s + (latestByDept[d]?.bedsCapacity ?? 0), 0)

    const existingAgg = await db.hospitalDaily.findUnique({ where: { date: today } })
    const latestAgg = existingAgg ?? (await db.hospitalDaily.findFirst({ orderBy: { date: 'desc' } }))
    if (existingAgg) {
      await db.hospitalDaily.update({
        where: { id: existingAgg.id },
        data: {
          bedsUsed: wardBedsUsed,
          bedsCapacity: wardBedsCapacity,
          icuUsed: icuBedsOccupied,
          icuCapacity: totalIcuBeds,
        },
      })
    } else if (latestAgg) {
      await db.hospitalDaily.create({
        data: {
          date: today,
          admissions: latestAgg.admissions,
          discharges: latestAgg.discharges,
          bedsUsed: wardBedsUsed,
          bedsCapacity: wardBedsCapacity,
          icuUsed: icuBedsOccupied,
          icuCapacity: totalIcuBeds,
        },
      })
    }

    await logActivity({
      action: 'update_icu',
      detail: `Updated ICU beds: ${icuBedsOccupied}/${totalIcuBeds} occupied (${available} available)`,
      userEmail: session.email,
      userName: session.email,
    })

    return NextResponse.json({
      ok: true,
      message: `ICU beds updated: ${icuBedsOccupied} of ${totalIcuBeds} occupied (${available} available)`,
      data: { totalIcuBeds, icuBedsOccupied, available, date: today },
    })
  } catch (e) {
    return NextResponse.json(
      { error: 'Failed to save ICU data. ' + (e instanceof Error ? e.message : 'Unknown error.'), code: 'SAVE_FAILED' },
      { status: 500 },
    )
  }
}

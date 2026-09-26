import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { ensureSeedData, DEPARTMENTS, type Department } from '@/lib/seed'
import { logActivity } from '@/lib/activity'

const schema = z.object({
  totalBeds: z.number().int().min(0, 'Total beds cannot be negative'),
  bedsOccupied: z.number().int().min(0, 'Occupied beds cannot be negative'),
  department: z.enum(['Emergency', 'ICU', 'General Ward', 'Pediatrics']),
}).refine((d) => d.bedsOccupied <= d.totalBeds, {
  message: 'Occupied beds cannot exceed total beds',
  path: ['bedsOccupied'],
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
  // Return current today's values for all departments so the form can prefill
  try {
    const today = todayISO()
    const out: { department: Department; totalBeds: number; bedsOccupied: number }[] = []
    for (const dept of DEPARTMENTS) {
      const row = await db.departmentDaily.findFirst({
        where: { department: dept },
        orderBy: { date: 'desc' },
      })
      out.push({
        department: dept,
        totalBeds: row?.bedsCapacity ?? 0,
        bedsOccupied: row?.bedsUsed ?? 0,
      })
    }
    return NextResponse.json({ today, departments: out })
  } catch (e) {
    return NextResponse.json(
      { error: 'Failed to load current bed data. ' + (e instanceof Error ? e.message : ''), code: 'LOAD_FAILED' },
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
  const { totalBeds, bedsOccupied, department } = parsed.data
  const today = todayISO()
  const available = Math.max(0, totalBeds - bedsOccupied)

  try {
    // Upsert the department's daily record for today. If a row exists for
    // (today, department) update it; otherwise create it.
    const existing = await db.departmentDaily.findUnique({
      where: { date_department: { date: today, department } },
    })
    let deptRow
    if (existing) {
      deptRow = await db.departmentDaily.update({
        where: { id: existing.id },
        data: { bedsCapacity: totalBeds, bedsUsed: bedsOccupied },
      })
    } else {
      deptRow = await db.departmentDaily.create({
        data: {
          date: today,
          department,
          admissions: 0,
          bedsCapacity: totalBeds,
          bedsUsed: bedsOccupied,
          icuUsed: 0,
          icuCapacity: 0,
        },
      })
    }

    // Recompute the aggregate ward occupancy for today: sum of all non-ICU
    // department bedsUsed/bedsCapacity, so the main dashboard reflects the
    // reception update in real time. ICU capacity comes from the ICU dept.
    const allDeptRows = await db.departmentDaily.findMany({
      where: { date: today },
    })
    // If today has no rows for some departments yet, fall back to latest known.
    const latestByDept: Record<string, NonNullable<typeof allDeptRows[number]>> = {}
    for (const r of allDeptRows) latestByDept[r.department] = r
    for (const dept of DEPARTMENTS) {
      if (!latestByDept[dept]) {
        const latest = await db.departmentDaily.findFirst({
          where: { department: dept },
          orderBy: { date: 'desc' },
        })
        if (latest) latestByDept[dept] = latest
      }
    }
    // Ward = Emergency + General Ward + Pediatrics; ICU = ICU dept
    const wardDepts: Department[] = ['Emergency', 'General Ward', 'Pediatrics']
    const wardBedsUsed = wardDepts.reduce((s, d) => s + (latestByDept[d]?.bedsUsed ?? 0), 0)
    const wardBedsCapacity = wardDepts.reduce((s, d) => s + (latestByDept[d]?.bedsCapacity ?? 0), 0)
    const icuRow = latestByDept['ICU']
    const icuUsed = icuRow?.icuUsed ?? icuRow?.bedsUsed ?? 0
    const icuCapacity = icuRow?.icuCapacity ?? icuRow?.bedsCapacity ?? 0

    // Upsert today's aggregate hospital daily
    const existingAgg = await db.hospitalDaily.findUnique({ where: { date: today } })
    const latestAgg = existingAgg ??
      (await db.hospitalDaily.findFirst({ orderBy: { date: 'desc' } }))
    if (existingAgg) {
      await db.hospitalDaily.update({
        where: { id: existingAgg.id },
        data: { bedsUsed: wardBedsUsed, bedsCapacity: wardBedsCapacity, icuUsed, icuCapacity },
      })
    } else if (latestAgg) {
      // Create today's aggregate from the latest record + reception updates
      await db.hospitalDaily.create({
        data: {
          date: today,
          admissions: latestAgg.admissions,
          discharges: latestAgg.discharges,
          bedsUsed: wardBedsUsed,
          bedsCapacity: wardBedsCapacity,
          icuUsed,
          icuCapacity,
        },
      })
    }

    await logActivity({
      action: 'update_beds',
      detail: `Updated ${department} beds: ${bedsOccupied}/${totalBeds} occupied (${available} available)`,
      userEmail: session.email,
      userName: session.email,
    })

    return NextResponse.json({
      ok: true,
      message: `${department} beds updated: ${bedsOccupied} of ${totalBeds} occupied (${available} available)`,
      data: {
        department,
        totalBeds,
        bedsOccupied,
        available,
        date: today,
      },
    })
  } catch (e) {
    return NextResponse.json(
      { error: 'Failed to save bed data. ' + (e instanceof Error ? e.message : 'Unknown error.'), code: 'SAVE_FAILED' },
      { status: 500 },
    )
  }
}

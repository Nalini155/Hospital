import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { ensureSeedData, DEPARTMENTS, type Department } from '@/lib/seed'
import { logActivity } from '@/lib/activity'

const schema = z.object({
  admissions: z.number().int().min(0, 'Admissions cannot be negative').max(10000, 'Value too large'),
  discharges: z.number().int().min(0, 'Discharges cannot be negative').max(10000, 'Value too large'),
  department: z.enum(['Emergency', 'ICU', 'General Ward', 'Pediatrics']).optional(),
})

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export async function GET() {
  const session = await getAuthUser()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    await ensureSeedData()
  } catch {
    return NextResponse.json({ error: 'Seed failed', code: 'SEED_FAILED' }, { status: 500 })
  }
  const today = todayISO()
  const latestAgg = await db.hospitalDaily.findFirst({ orderBy: { date: 'desc' } })
  return NextResponse.json({
    today,
    admissions: latestAgg?.admissions ?? 0,
    discharges: latestAgg?.discharges ?? 0,
  })
}

export async function POST(request: Request) {
  const session = await getAuthUser()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
  const { admissions, discharges, department } = parsed.data
  const today = todayISO()

  try {
    // Update today's aggregate hospital daily admissions/discharges.
    const existingAgg = await db.hospitalDaily.findUnique({ where: { date: today } })
    const latestAgg = existingAgg ?? (await db.hospitalDaily.findFirst({ orderBy: { date: 'desc' } }))
    if (existingAgg) {
      await db.hospitalDaily.update({
        where: { id: existingAgg.id },
        data: { admissions, discharges },
      })
    } else if (latestAgg) {
      await db.hospitalDaily.create({
        data: {
          date: today,
          admissions,
          discharges,
          bedsUsed: latestAgg.bedsUsed,
          bedsCapacity: latestAgg.bedsCapacity,
          icuUsed: latestAgg.icuUsed,
          icuCapacity: latestAgg.icuCapacity,
        },
      })
    }

    // Optionally update a specific department's admissions for today.
    if (department) {
      const existingDept = await db.departmentDaily.findUnique({
        where: { date_department: { date: today, department: department as Department } },
      })
      if (existingDept) {
        await db.departmentDaily.update({
          where: { id: existingDept.id },
          data: { admissions },
        })
      } else {
        const latestDept = await db.departmentDaily.findFirst({
          where: { department: department as Department },
          orderBy: { date: 'desc' },
        })
        await db.departmentDaily.create({
          data: {
            date: today,
            department: department as Department,
            admissions,
            bedsUsed: latestDept?.bedsUsed ?? 0,
            bedsCapacity: latestDept?.bedsCapacity ?? 0,
            icuUsed: latestDept?.icuUsed ?? 0,
            icuCapacity: latestDept?.icuCapacity ?? 0,
          },
        })
      }
    }

    await logActivity({
      action: 'update_patients',
      detail: `Updated today's patients: ${admissions} admissions, ${discharges} discharges${department ? ` (${department})` : ''}`,
      userEmail: session.email,
      userName: session.email,
    })

    return NextResponse.json({
      ok: true,
      message: `Patients updated: ${admissions} admissions, ${discharges} discharges`,
      data: { admissions, discharges, date: today },
    })
  } catch (e) {
    return NextResponse.json(
      { error: 'Failed to save patient data. ' + (e instanceof Error ? e.message : ''), code: 'SAVE_FAILED' },
      { status: 500 },
    )
  }
}

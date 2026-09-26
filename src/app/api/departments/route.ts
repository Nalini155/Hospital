import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { getDepartmentForecasts } from '@/lib/forecast'
import { ensureSeedData } from '@/lib/seed'

export async function GET() {
  const session = await getAuthUser()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  await ensureSeedData()
  const departments = await getDepartmentForecasts(7)
  return NextResponse.json({ departments })
}

import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { getDashboardOverview } from '@/lib/forecast'
import { ensureSeedData } from '@/lib/seed'

export async function GET() {
  const session = await getAuthUser()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  await ensureSeedData()
  const overview = await getDashboardOverview(7)
  return NextResponse.json({ alerts: overview.alerts, gaps: overview.gaps })
}

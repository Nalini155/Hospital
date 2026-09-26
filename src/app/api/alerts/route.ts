import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { getDashboardOverview } from '@/lib/forecast'
import { ensureSeedData } from '@/lib/seed'

export async function GET() {
  const session = await getAuthUser()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
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
    const overview = await getDashboardOverview(7)
    return NextResponse.json({ alerts: overview.alerts, gaps: overview.gaps })
  } catch (e) {
    return NextResponse.json(
      {
        error:
          'Failed to load alerts. ' +
          (e instanceof Error ? e.message : 'Unknown error.'),
        code: 'ALERTS_FAILED',
      },
      { status: 500 },
    )
  }
}

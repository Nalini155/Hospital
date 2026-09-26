import { NextResponse } from 'next/server'
import { getDashboardOverview } from '@/lib/forecast'
import { ensureSeedData } from '@/lib/seed'
import { requireNonReception } from '@/lib/role-guard'

export async function GET() {
  const guard = await requireNonReception()
  if (guard instanceof NextResponse) return guard

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

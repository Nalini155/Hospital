import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { getDashboardOverview } from '@/lib/forecast'
import { ensureSeedData } from '@/lib/seed'

export async function GET() {
  const session = await getAuthUser()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // The full analytics dashboard (forecast models, resource gaps, alerts with
  // thresholds) is restricted to operational/admin/staff roles. Reception users
  // get their own simplified endpoint at /api/reception.
  if (session.role === 'RECEPTION') {
    return NextResponse.json(
      {
        error: 'Your role does not have access to the analytics dashboard. Use the Reception dashboard.',
        code: 'FORBIDDEN_ROLE',
      },
      { status: 403 },
    )
  }

  // Make sure a default/seed dataset exists so the dashboard never renders an
  // empty/error state on a fresh database. ensureSeedData is idempotent: it only
  // (re)seeds when fewer than 14 daily records are present.
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
    return NextResponse.json(overview)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown dashboard error.'
    return NextResponse.json(
      {
        error:
          'Failed to compute the dashboard forecast. Try regenerating the dataset from the header. ' +
          message,
        code: 'FORECAST_FAILED',
      },
      { status: 500 },
    )
  }
}

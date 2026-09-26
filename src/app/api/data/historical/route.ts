import { NextResponse } from 'next/server'
import { getHistoricalSeries } from '@/lib/forecast'
import { ensureSeedData, resetSeedData } from '@/lib/seed'
import { requireNonReception } from '@/lib/role-guard'
import { logActivity } from '@/lib/activity'

export async function GET(request: Request) {
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
    const { searchParams } = new URL(request.url)
    const days = Math.min(365, Math.max(7, Number(searchParams.get('days') ?? '90')))
    const data = await getHistoricalSeries(days)
    return NextResponse.json({ data, count: data.length })
  } catch (e) {
    return NextResponse.json(
      {
        error:
          'Failed to load historical data. ' +
          (e instanceof Error ? e.message : 'Unknown error.'),
        code: 'HISTORICAL_FAILED',
      },
      { status: 500 },
    )
  }
}

export async function POST() {
  const guard = await requireNonReception()
  if (guard instanceof NextResponse) return guard
  // guard is the session here
  const session = guard as { userId: string; email: string; role: string }

  try {
    await resetSeedData(365)
    // Look up the user's name for the activity log
    const { db } = await import('@/lib/db')
    const actor = await db.user.findUnique({ where: { id: session.userId } })
    await logActivity({
      action: 'regenerate_data',
      detail: 'Regenerated the 365-day synthetic hospital dataset',
      userEmail: session.email,
      userName: actor?.name ?? session.email,
    })
    return NextResponse.json({
      ok: true,
      message: 'Dataset regenerated with 365 days of synthetic hospital data',
    })
  } catch (e) {
    const reason = e instanceof Error ? e.message : 'Unknown error.'
    return NextResponse.json(
      {
        error: 'Could not regenerate the dataset. ' + reason,
        code: 'REGENERATE_FAILED',
      },
      { status: 500 },
    )
  }
}

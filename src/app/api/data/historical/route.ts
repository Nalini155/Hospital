import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { getHistoricalSeries } from '@/lib/forecast'
import { ensureSeedData, resetSeedData } from '@/lib/seed'

export async function GET(request: Request) {
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
  const session = await getAuthUser()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    await resetSeedData(365)
    // Verify the reseed actually produced data so we can return a precise error
    // if (for example) the DB write failed silently.
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

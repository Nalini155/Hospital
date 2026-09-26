import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { getHistoricalSeries, forecastSeries } from '@/lib/forecast'
import { ensureSeedData } from '@/lib/seed'

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
    const horizon = Math.min(30, Math.max(1, Number(searchParams.get('horizon') ?? '7')))
    const metric = (searchParams.get('metric') ?? 'admissions') as
      | 'admissions'
      | 'bedsUsed'
      | 'icuUsed'
    const history = await getHistoricalSeries(180)
    const values = history.map((h) => h[metric] as number)
    const fc = forecastSeries(values, horizon)
    const series = [
      ...history.slice(-30).map((h) => ({
        date: h.date,
        actual: h[metric] as number,
      })),
      ...fc.points.map((p) => ({
        date: p.date,
        forecast: p.forecast,
        lower: p.lower,
        upper: p.upper,
      })),
    ]
    return NextResponse.json({ metric, horizon, forecast: fc, series, params: fc.params })
  } catch (e) {
    return NextResponse.json(
      {
        error:
          'Failed to compute forecast. ' +
          (e instanceof Error ? e.message : 'Unknown error.'),
        code: 'FORECAST_FAILED',
      },
      { status: 500 },
    )
  }
}

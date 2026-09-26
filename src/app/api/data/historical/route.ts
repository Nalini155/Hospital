import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { getHistoricalSeries } from '@/lib/forecast'
import { ensureSeedData, resetSeedData } from '@/lib/seed'

export async function GET(request: Request) {
  const session = await getAuthUser()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  await ensureSeedData()
  const { searchParams } = new URL(request.url)
  const days = Math.min(365, Math.max(7, Number(searchParams.get('days') ?? '90')))
  const data = await getHistoricalSeries(days)
  return NextResponse.json({ data, count: data.length })
}

export async function POST() {
  const session = await getAuthUser()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  await resetSeedData(365)
  return NextResponse.json({ ok: true, message: 'Dataset regenerated with 365 days of synthetic hospital data' })
}

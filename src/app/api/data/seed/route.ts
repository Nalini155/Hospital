import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { ensureSeedData, resetSeedData } from '@/lib/seed'

export async function POST() {
  const session = await getAuthUser()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  await resetSeedData(365)
  return NextResponse.json({ ok: true, message: 'Seeded 365 days of synthetic daily hospital data' })
}

export async function GET() {
  const session = await getAuthUser()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  await ensureSeedData()
  return NextResponse.json({ ok: true })
}

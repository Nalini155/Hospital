import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { runSimulation, type SimulationInput } from '@/lib/forecast'
import { ensureSeedData } from '@/lib/seed'

export async function POST(request: Request) {
  const session = await getAuthUser()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  await ensureSeedData()
  let body: Partial<SimulationInput>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const input: SimulationInput = {
    bedCapacityDelta: Number(body.bedCapacityDelta ?? 0),
    icuCapacityDelta: Number(body.icuCapacityDelta ?? 0),
    inflowPct: Number(body.inflowPct ?? 0),
    losDelta: Number(body.losDelta ?? 0),
    horizon: Math.min(30, Math.max(1, Number(body.horizon ?? 7))),
  }
  const result = await runSimulation(input)
  return NextResponse.json({ input, result })
}

import { NextResponse } from 'next/server'
import { getDepartmentForecasts } from '@/lib/forecast'
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
    const departments = await getDepartmentForecasts(7)
    return NextResponse.json({ departments })
  } catch (e) {
    return NextResponse.json(
      {
        error:
          'Failed to load department forecasts. ' +
          (e instanceof Error ? e.message : 'Unknown error.'),
        code: 'DEPT_FAILED',
      },
      { status: 500 },
    )
  }
}

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/admin-guard'

/**
 * GET /api/admin/overview — system overview stats for the Admin dashboard.
 * Returns: total users (by role), total hospital records, total department
 * records, total forecast runs (proxied by activity count), last data refresh
 * time (latest HospitalDaily.createdAt).
 */
export async function GET() {
  const guard = await requireAdmin()
  if (guard instanceof NextResponse) return guard

  try {
    const [
      totalUsers,
      adminCount,
      staffCount,
      receptionCount,
      activeCount,
      hospitalRecords,
      deptRecords,
      forecastRuns,
      latestHospital,
    ] = await Promise.all([
      db.user.count(),
      db.user.count({ where: { role: 'ADMIN' } }),
      db.user.count({ where: { role: 'STAFF' } }),
      db.user.count({ where: { role: 'RECEPTION' } }),
      db.user.count({ where: { active: true } }),
      db.hospitalDaily.count(),
      db.departmentDaily.count(),
      db.activity.count({ where: { action: 'regenerate_data' } }),
      db.hospitalDaily.findFirst({ orderBy: { createdAt: 'desc' }, select: { createdAt: true, date: true } }),
    ])

    // "Total forecast runs" — count forecast-related activity. We log each
    // regenerate as a forecast-related event; here we report the number of
    // distinct days of data available (a proxy for model coverage) plus the
    // regenerate count. For a clearer metric, count all dashboard/forecast
    // API hits would require per-request logging; we use the activity table.
    const lastRefresh = latestHospital?.createdAt?.toISOString() ?? null

    return NextResponse.json({
      users: {
        total: totalUsers,
        admin: adminCount,
        staff: staffCount,
        reception: receptionCount,
        active: activeCount,
      },
      data: {
        hospitalRecords,
        departmentRecords: deptRecords,
        daysOfHistory: hospitalRecords, // one record per day
        departments: 4,
        lastRefresh,
        lastRefreshDate: latestHospital?.date ?? null,
      },
      // Forecast runs proxied by the number of regenerate actions logged.
      // Each regenerate retrains/recomputes the forecast across the dataset.
      forecastRuns: forecastRuns,
    })
  } catch (e) {
    return NextResponse.json(
      {
        error:
          'Failed to load system overview. ' +
          (e instanceof Error ? e.message : 'Unknown error.'),
        code: 'OVERVIEW_FAILED',
      },
      { status: 500 },
    )
  }
}

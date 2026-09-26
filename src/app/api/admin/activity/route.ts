import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/admin-guard'

/**
 * GET /api/admin/activity — recent activity log entries (newest first).
 * Query param: ?limit=20 (default 20, max 100).
 */
export async function GET(request: Request) {
  const guard = await requireAdmin()
  if (guard instanceof NextResponse) return guard

  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? '20')))
    const entries = await db.activity.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        action: true,
        detail: true,
        userEmail: true,
        userName: true,
        createdAt: true,
      },
    })
    return NextResponse.json({
      activities: entries.map((a) => ({
        id: a.id,
        action: a.action,
        detail: a.detail,
        userEmail: a.userEmail,
        userName: a.userName,
        timestamp: a.createdAt.toISOString(),
      })),
    })
  } catch (e) {
    return NextResponse.json(
      {
        error:
          'Failed to load activity log. ' +
          (e instanceof Error ? e.message : 'Unknown error.'),
        code: 'ACTIVITY_FAILED',
      },
      { status: 500 },
    )
  }
}

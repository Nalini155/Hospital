import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'

/**
 * Authenticate the request AND enforce that the user has the ADMIN role.
 * Admin endpoints (user management, system overview, activity log) are
 * restricted to administrators. Returns the session on success, or a
 * NextResponse (401 Unauthorized / 403 Forbidden) on failure.
 *
 * Usage in a route handler:
 *   const guard = requireAdmin()
 *   if (guard instanceof NextResponse) return guard
 *   // else guard is the session { userId, email, role }
 */
export async function requireAdmin(): Promise<
  | { userId: string; email: string; role: string }
  | NextResponse
> {
  const session = await getAuthUser()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.role !== 'ADMIN') {
    return NextResponse.json(
      {
        error:
          'Administrator access required. Your role does not have permission for this resource.',
        code: 'FORBIDDEN_ADMIN',
      },
      { status: 403 },
    )
  }
  return session
}

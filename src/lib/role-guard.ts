import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'

/**
 * Authenticate the request AND enforce that the user is NOT a Reception-role
 * user (Reception has access only to its own simplified endpoint at
 * /api/reception). Returns the session on success, or a NextResponse
 * (401 Unauthorized / 403 Forbidden) on failure.
 *
 * Usage in a route handler:
 *   const guard = requireNonReception()
 *   if (guard instanceof NextResponse) return guard
 *   // else guard is the session
 */
export async function requireNonReception(): Promise<
  | { userId: string; email: string; role: string }
  | NextResponse
> {
  const session = await getAuthUser()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.role === 'RECEPTION') {
    return NextResponse.json(
      {
        error:
          'Your role does not have access to this resource. Use the Reception dashboard.',
        code: 'FORBIDDEN_ROLE',
      },
      { status: 403 },
    )
  }
  return session
}

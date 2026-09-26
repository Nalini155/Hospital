import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/admin-guard'
import { logActivity } from '@/lib/activity'

/**
 * GET /api/admin/users — list all users with name, email, role, joined date,
 * and active status. Admin-only.
 */
export async function GET() {
  const guard = await requireAdmin()
  if (guard instanceof NextResponse) return guard

  try {
    const users = await db.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
      },
    })
    return NextResponse.json({
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        active: u.active,
        joinedDate: u.createdAt.toISOString(),
      })),
    })
  } catch (e) {
    return NextResponse.json(
      {
        error:
          'Failed to load users. ' +
          (e instanceof Error ? e.message : 'Unknown error.'),
        code: 'USERS_FAILED',
      },
      { status: 500 },
    )
  }
}

const patchSchema = z.object({
  userId: z.string().min(1),
  // Optional: change role
  role: z.enum(['ADMIN', 'STAFF', 'RECEPTION']).optional(),
  // Optional: set active flag (true = reactivate, false = deactivate)
  active: z.boolean().optional(),
})

/**
 * PATCH /api/admin/users — update a user's role and/or active status.
 * Admin-only. Prevents an admin from deactivating/demoting themselves.
 */
export async function PATCH(request: Request) {
  const guard = await requireAdmin()
  if (guard instanceof NextResponse) return guard

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body', code: 'BAD_REQUEST' },
      { status: 400 },
    )
  }
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? 'Validation failed',
        code: 'VALIDATION',
      },
      { status: 400 },
    )
  }
  const { userId, role, active } = parsed.data

  // Prevent self-deactivation / self-demotion to avoid locking out the only admin.
  if (userId === guard.userId) {
    if (active === false) {
      return NextResponse.json(
        {
          error: 'You cannot deactivate your own account.',
          code: 'SELF_GUARD',
        },
        { status: 400 },
      )
    }
    if (role && role !== 'ADMIN') {
      return NextResponse.json(
        {
          error: 'You cannot demote your own admin account.',
          code: 'SELF_GUARD',
        },
        { status: 400 },
      )
    }
  }

  const data: { role?: string; active?: boolean } = {}
  if (role !== undefined) data.role = role
  if (active !== undefined) data.active = active

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: 'No changes provided (role or active required).', code: 'NO_CHANGE' },
      { status: 400 },
    )
  }

  try {
    const updated = await db.user.update({
      where: { id: userId },
      data,
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
    })
    // Log the action(s)
    const actor = await db.user.findUnique({ where: { id: guard.userId } })
    if (role !== undefined) {
      await logActivity({
        action: 'role_change',
        detail: `Set role for ${updated.email} to ${role}`,
        userEmail: guard.email,
        userName: actor?.name ?? guard.email,
      })
    }
    if (active !== undefined) {
      await logActivity({
        action: active ? 'reactivate' : 'deactivate',
        detail: `${active ? 'Reactivated' : 'Deactivated'} account ${updated.email}`,
        userEmail: guard.email,
        userName: actor?.name ?? guard.email,
      })
    }
    return NextResponse.json({
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        active: updated.active,
        joinedDate: updated.createdAt.toISOString(),
      },
    })
  } catch (e) {
    return NextResponse.json(
      {
        error:
          'Failed to update user. ' +
          (e instanceof Error ? e.message : 'Unknown error.'),
        code: 'UPDATE_FAILED',
      },
      { status: 500 },
    )
  }
}

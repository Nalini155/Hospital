import { db } from '@/lib/db'

/**
 * Append a row to the Activity audit log. Used by the admin dashboard's
 * Activity Log and seeded on significant actions (login, signup, role change,
 * deactivate/reactivate, dataset regeneration).
 */
export async function logActivity(params: {
  action: string
  detail: string
  userEmail: string
  userName: string
}): Promise<void> {
  try {
    await db.activity.create({
      data: {
        action: params.action,
        detail: params.detail,
        userEmail: params.userEmail,
        userName: params.userName,
      },
    })
  } catch {
    // Logging is best-effort; never fail the parent operation because of it.
  }
}

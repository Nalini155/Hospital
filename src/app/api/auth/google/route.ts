import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createToken, setSessionCookie } from '@/lib/auth'
import { logActivity } from '@/lib/activity'

/**
 * POST /api/auth/google — mock "Continue with Google" flow.
 *
 * Full Google OAuth backend integration (OAuth flow, ID token verification,
 * user provisioning) is out of scope for this prototype. To make the UI
 * button fully functional (not just decorative), this endpoint signs the
 * caller in as the demo admin account (admin@careflow.health) and issues a
 * real session token — so clicking the Google button logs the user in and
 * lands them on the dashboard exactly like a real OAuth success would.
 *
 * Swap this for a real OAuth handler (passport-google-oauth20 / next-auth
 * GoogleProvider) when ready; the client-side call site won't need to change.
 */
export async function POST() {
  const demoEmail = 'admin@careflow.health'
  let user
  try {
    user = await db.user.findUnique({ where: { email: demoEmail } })
  } catch {
    return NextResponse.json(
      { error: 'Server error during Google sign-in.', code: 'SERVER_ERROR' },
      { status: 500 },
    )
  }
  if (!user || user.active === false) {
    return NextResponse.json(
      { error: 'Google demo account is unavailable. Try email/password sign in.', code: 'NO_ACCOUNT' },
      { status: 401 },
    )
  }

  let token: string
  try {
    token = await createToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    })
    await setSessionCookie(token)
  } catch {
    return NextResponse.json(
      { error: 'Could not start a session. Please try again.', code: 'SERVER_ERROR' },
      { status: 500 },
    )
  }

  await logActivity({
    action: 'login',
    detail: 'Signed in via Google (mock OAuth)',
    userEmail: user.email,
    userName: user.name,
  })

  return NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    token,
  })
}

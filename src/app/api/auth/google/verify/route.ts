import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { createToken, setSessionCookie, hashPassword } from '@/lib/auth'
import { verifyCode, MOCK_GOOGLE_ACCOUNTS } from '@/lib/google-flow'
import { logActivity } from '@/lib/activity'

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  code: z.string().min(4, 'Enter the verification code').max(8, 'Invalid code'),
})

/**
 * POST /api/auth/google/verify — user entered the verification code. Verify
 * it, then find-or-create a CareFlow user for that email and issue a real
 * session token. Any email is accepted so users can sign in with their own
 * personal Google account. New emails get a STAFF role; known mock accounts
 * keep their configured role (ADMIN/RECEPTION/STAFF).
 */
export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body', code: 'BAD_REQUEST' },
      { status: 400 },
    )
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Validation failed', code: 'VALIDATION' },
      { status: 400 },
    )
  }
  const email = parsed.data.email.toLowerCase().trim()
  const code = parsed.data.code

  if (!verifyCode(email, code)) {
    return NextResponse.json(
      {
        error: 'Invalid or expired verification code. Try sending a new code.',
        code: 'INVALID_CODE',
      },
      { status: 401 },
    )
  }

  // Find-or-create the CareFlow user. Known mock accounts keep their configured
  // role; any other (personal) email gets STAFF role by default.
  const knownAccount = MOCK_GOOGLE_ACCOUNTS.find((a) => a.email.toLowerCase() === email)
  let user = await db.user.findUnique({ where: { email } }).catch(() => null)
  if (!user) {
    const name = knownAccount?.name ?? email.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    const role = knownAccount?.role ?? 'STAFF'
    user = await db.user.create({
      data: {
        name,
        email,
        passwordHash: hashPassword(`google-${email}-${Date.now()}-${Math.random()}`),
        role,
        active: true,
      },
    })
  } else if (user.active === false) {
    return NextResponse.json(
      {
        error: 'This account has been deactivated. Contact an administrator.',
        code: 'ACCOUNT_DEACTIVATED',
      },
      { status: 403 },
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
    detail: 'Signed in via Google (verified email code)',
    userEmail: user.email,
    userName: user.name,
  })

  return NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    token,
  })
}

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { verifyPassword, createToken, setSessionCookie } from '@/lib/auth'
import { logActivity } from '@/lib/activity'

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

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
      {
        error: parsed.error.issues[0]?.message ?? 'Validation failed',
        code: 'VALIDATION',
      },
      { status: 400 },
    )
  }
  const { email, password } = parsed.data
  const normalizedEmail = email.toLowerCase().trim()

  let user
  try {
    user = await db.user.findUnique({ where: { email: normalizedEmail } })
  } catch {
    return NextResponse.json(
      {
        error: 'Server error. Please try again in a moment.',
        code: 'SERVER_ERROR',
      },
      { status: 500 },
    )
  }

  if (!user) {
    return NextResponse.json(
      {
        error: `No account found with ${normalizedEmail}. Check the address or create a new account.`,
        code: 'NO_ACCOUNT',
      },
      { status: 401 },
    )
  }

  if (user.active === false) {
    return NextResponse.json(
      {
        error:
          'This account has been deactivated. Contact an administrator to restore access.',
        code: 'ACCOUNT_DEACTIVATED',
      },
      { status: 403 },
    )
  }

  if (!verifyPassword(password, user.passwordHash)) {
    return NextResponse.json(
      {
        error: 'Incorrect password. Please try again or use "Forgot password?".',
        code: 'WRONG_PASSWORD',
      },
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
    if (process.env.NODE_ENV !== 'production') {
      console.log('[auth] login: token issued + cookie set for', user.email, '| token length:', token.length)
    }
  } catch {
    return NextResponse.json(
      {
        error: 'Could not create a session. Please try again.',
        code: 'SERVER_ERROR',
      },
      { status: 500 },
    )
  }

  await logActivity({
    action: 'login',
    detail: 'Signed in',
    userEmail: user.email,
    userName: user.name,
  })

  return NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    token,
  })
}

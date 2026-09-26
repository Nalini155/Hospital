import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { hashPassword, createToken, setSessionCookie } from '@/lib/auth'

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['ADMIN', 'STAFF']).default('STAFF'),
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
  const { name, email, password, role } = parsed.data
  const normalizedEmail = email.toLowerCase().trim()

  let existing
  try {
    existing = await db.user.findUnique({ where: { email: normalizedEmail } })
  } catch {
    return NextResponse.json(
      {
        error: 'Server error. Please try again in a moment.',
        code: 'SERVER_ERROR',
      },
      { status: 500 },
    )
  }
  if (existing) {
    return NextResponse.json(
      {
        error: 'An account with this email already exists. Try signing in instead.',
        code: 'EMAIL_EXISTS',
      },
      { status: 409 },
    )
  }

  let user
  try {
    user = await db.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash: hashPassword(password),
        role,
      },
    })
  } catch {
    return NextResponse.json(
      {
        error: 'Could not create your account. Please try again.',
        code: 'SERVER_ERROR',
      },
      { status: 500 },
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
      {
        error: 'Account created, but could not start a session. Please sign in.',
        code: 'SESSION_ERROR',
      },
      { status: 500 },
    )
  }

  // Return the token in the body so the client can ALSO send it as a Bearer
  // header (works across gateway / iframe / cross-origin contexts).
  return NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    token,
  })
}

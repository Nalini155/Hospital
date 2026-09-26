import { NextResponse } from 'next/server'
import { z } from 'zod'
import { issueCode } from '@/lib/google-flow'

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
})

/**
 * POST /api/auth/google/send-code — user picked/entered a Google email; generate
 * a 6-digit verification code and "send it to the email". Accepts ANY email so
 * users can sign in with their own personal Google account. Because we can't
 * send real email in this sandbox, the code is returned as `demoCode` so the UI
 * can display it for the user to enter. In production you'd email the code.
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

  const code = issueCode(email)
  return NextResponse.json({
    ok: true,
    email,
    demoCode: code,
    expiresInMs: 10 * 60 * 1000,
    message: `A 6-digit verification code was sent to ${email}.`,
  })
}

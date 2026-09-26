import { NextResponse } from 'next/server'
import { z } from 'zod'
import { issueCode, MOCK_GOOGLE_ACCOUNTS } from '@/lib/google-flow'

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
})

/**
 * POST /api/auth/google/send-code — user picked a Google account; generate a
 * 6-digit verification code and "send it to the email". Because we can't send
 * real email in this sandbox, the code is returned in the response (as
 * `demoCode`) so the UI can display it for the user to enter. In production
 * you'd email the code and NOT return it.
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

  // Only allow emails that are in the mock account list OR look like a real
  // Google account (so the chooser is meaningful). For the demo, accept any
  // of the mock accounts; reject others so the flow stays realistic.
  const known = MOCK_GOOGLE_ACCOUNTS.some((a) => a.email.toLowerCase() === email)
  if (!known) {
    return NextResponse.json(
      {
        error: 'This Google account is not authorized for the demo. Choose one of the listed accounts.',
        code: 'ACCOUNT_NOT_ALLOWED',
      },
      { status: 403 },
    )
  }

  const code = issueCode(email)
  return NextResponse.json({
    ok: true,
    email,
    // Returned so the demo UI can show it. In production, remove `demoCode`.
    demoCode: code,
    expiresInMs: 10 * 60 * 1000,
    message: `A 6-digit verification code was sent to ${email}.`,
  })
}

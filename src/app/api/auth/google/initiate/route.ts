import { NextResponse } from 'next/server'
import { MOCK_GOOGLE_ACCOUNTS } from '@/lib/google-flow'

/**
 * GET /api/auth/google/initiate — returns the list of mock Google accounts
 * to show in the account chooser. (In a real OAuth flow this is where you'd
 * redirect to Google's account chooser.)
 */
export async function GET() {
  return NextResponse.json({
    accounts: MOCK_GOOGLE_ACCOUNTS.map((a) => ({
      email: a.email,
      name: a.name,
      initials: a.initials,
      role: a.role,
    })),
  })
}

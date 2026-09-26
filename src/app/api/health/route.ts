import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * GET /api/health — production health check.
 * Reports DB connectivity + key env-var presence so you can debug a broken
 * deploy from Vercel logs / the live URL without guessing. Safe to hit
 * publicly (returns no secrets).
 */
export async function GET() {
  const hasDbUrl = !!process.env.DATABASE_URL
  const dbUrlScheme = process.env.DATABASE_URL?.split('://')[0] ?? '(unset)'
  const hasJwt = !!process.env.JWT_SECRET
  const jwtOk = hasJwt && (process.env.JWT_SECRET?.length ?? 0) >= 32
  const isProd = process.env.NODE_ENV === 'production'

  let dbOk = false
  let dbError: string | undefined
  try {
    // Cheap connectivity check — count users (table must exist).
    await db.user.count()
    dbOk = true
  } catch (e) {
    dbError = e instanceof Error ? e.message : String(e)
  }

  return NextResponse.json({
    status: dbOk && jwtOk ? 'ok' : 'degraded',
    env: {
      NODE_ENV: process.env.NODE_ENV ?? '(unset)',
      DATABASE_URL: hasDbUrl ? `set (${dbUrlScheme}://)` : 'MISSING',
      JWT_SECRET: jwtOk ? 'set (>=32 chars)' : hasJwt ? 'set but too short' : 'MISSING',
    },
    db: {
      connected: dbOk,
      scheme: dbUrlScheme,
      error: dbError,
      note:
        dbUrlScheme === 'file'
          ? 'SQLite file:// does not work on Vercel serverless. Use a postgresql:// connection string.'
          : undefined,
    },
    auth: {
      jwtConfigured: jwtOk,
      note: isProd && !jwtOk ? 'JWT_SECRET is required in production.' : undefined,
    },
  }, { status: dbOk && jwtOk ? 200 : 503 })
}

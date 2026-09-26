import { PrismaClient } from '@prisma/client'

/**
 * Warn early if DATABASE_URL looks like a local SQLite file path — that
 * config does NOT work on Vercel serverless functions (ephemeral read-only
 * filesystem) and is the #1 cause of "Server error" after deploy. The
 * production DATABASE_URL must be a postgresql:// connection string.
 */
if (process.env.NODE_ENV === 'production') {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('[db] FATAL: DATABASE_URL env var is not set. Add a PostgreSQL connection string (e.g. from Neon) in Vercel → Project Settings → Environment Variables.')
  } else if (url.startsWith('file:')) {
    console.error('[db] FATAL: DATABASE_URL is a local SQLite file path ("' + url + '"). SQLite does NOT work on Vercel serverless. Set DATABASE_URL to a postgresql:// connection string (Neon/Supabase/Vercel Postgres).')
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Only log queries in development; production logging is too noisy and
    // shows up in Vercel function logs. Errors are always surfaced by Prisma.
    log: process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['query', 'error', 'warn'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

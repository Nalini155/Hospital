import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import { cookies, headers } from 'next/headers'

const SECRET =
  process.env.JWT_SECRET ||
  'careflow-dev-secret-change-me-please-0123456789abcdef0123456789abcdef'
const TOKEN_NAME = 'careflow_token'
const TOKEN_TTL_DAYS = 7

const enc = new TextEncoder()

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10)
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash)
}

export async function createToken(payload: {
  userId: string
  email: string
  role: string
}): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_TTL_DAYS}d`)
    .sign(enc.encode(SECRET))
}

export async function verifyToken(token: string): Promise<{
  userId: string
  email: string
  role: string
} | null> {
  try {
    const { payload } = await jwtVerify(token, enc.encode(SECRET), {
      algorithms: ['HS256'],
    })
    if (
      typeof payload.userId === 'string' &&
      typeof payload.email === 'string' &&
      typeof payload.role === 'string'
    ) {
      return {
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
      }
    }
    return null
  } catch {
    return null
  }
}

export async function setSessionCookie(token: string) {
  const store = await cookies()
  store.set(TOKEN_NAME, token, {
    httpOnly: true,
    // 'lax' works for same-origin top-level navigations; the Authorization
    // header fallback covers cross-origin / gateway / iframe contexts where
    // SameSite cookies would be blocked.
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * TOKEN_TTL_DAYS,
  })
}

export async function clearSessionCookie() {
  const store = await cookies()
  store.delete(TOKEN_NAME)
}

export async function readSessionCookie(): Promise<string | undefined> {
  const store = await cookies()
  return store.get(TOKEN_NAME)?.value
}

/**
 * Read the auth token from EITHER the careflow_token cookie OR the
 * Authorization: Bearer <token> header. The header fallback is essential
 * when the app is served through a gateway/preview iframe where SameSite
 * httpOnly cookies may not be sent back by the browser.
 */
export async function readAuthToken(): Promise<string | undefined> {
  // 1. Try the cookie first (same-origin requests)
  const cookieToken = await readSessionCookie()
  if (cookieToken) return cookieToken
  // 2. Fall back to the Authorization header (cross-origin / gateway / iframe)
  const h = await headers()
  const authHeader = h.get('authorization') ?? h.get('Authorization')
  if (authHeader?.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim()
  }
  return undefined
}

export async function getAuthUser(): Promise<{
  userId: string
  email: string
  role: string
} | null> {
  const token = await readAuthToken()
  // Temporary diagnostic logging to trace auth issues. Remove once stable.
  if (process.env.NODE_ENV !== 'production') {
    if (!token) {
      console.log('[auth] getAuthUser: no token (cookie or Authorization header)')
    } else {
      console.log('[auth] getAuthUser: token found, length=', token.length)
    }
  }
  if (!token) return null
  const verified = await verifyToken(token)
  if (process.env.NODE_ENV !== 'production') {
    console.log('[auth] getAuthUser: token verify result =', verified ? 'VALID' : 'INVALID/EXPIRED')
  }
  return verified
}

import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'

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

export async function getAuthUser(): Promise<{
  userId: string
  email: string
  role: string
} | null> {
  const token = await readSessionCookie()
  // Temporary diagnostic logging to trace auth issues. Remove once stable.
  if (process.env.NODE_ENV !== 'production') {
    if (!token) {
      console.log('[auth] getAuthUser: no careflow_token cookie present in request')
    } else {
      console.log('[auth] getAuthUser: careflow_token cookie found, length=', token.length)
    }
  }
  if (!token) return null
  const verified = await verifyToken(token)
  if (process.env.NODE_ENV !== 'production') {
    console.log('[auth] getAuthUser: token verify result =', verified ? 'VALID' : 'INVALID/EXPIRED')
  }
  return verified
}

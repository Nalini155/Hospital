import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

export async function GET() {
  const session = await getAuthUser()
  if (!session) {
    // getAuthUser already logs why (no cookie / invalid token)
    return NextResponse.json({ user: null }, { status: 200 })
  }
  const user = await db.user.findUnique({ where: { id: session.userId } })
  if (!user) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[auth] /me: session valid but user not found in DB:', session.userId)
    }
    return NextResponse.json({ user: null }, { status: 200 })
  }
  if (process.env.NODE_ENV !== 'production') {
    console.log('[auth] /me: returning user', user.email)
  }
  return NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  })
}

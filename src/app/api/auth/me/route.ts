import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

export async function GET() {
  const session = await getAuthUser()
  if (!session) {
    return NextResponse.json({ user: null }, { status: 200 })
  }
  const user = await db.user.findUnique({ where: { id: session.userId } })
  if (!user) {
    return NextResponse.json({ user: null }, { status: 200 })
  }
  return NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  })
}

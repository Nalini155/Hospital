import { db } from '../src/lib/db'
import { hashPassword } from '../src/lib/auth'

async function main() {
  const email = 'admin@careflow.health'
  const password = 'careflow123'
  const existing = await db.user.findUnique({ where: { email } })
  if (existing) {
    // Reset password to guarantee the demo account works reliably
    await db.user.update({
      where: { id: existing.id },
      data: {
        name: 'Dr. Admin',
        role: 'ADMIN',
        passwordHash: hashPassword(password),
      },
    })
    console.log(`Reset demo admin: ${email} / ${password} (id: ${existing.id})`)
  } else {
    const created = await db.user.create({
      data: {
        name: 'Dr. Admin',
        email,
        passwordHash: hashPassword(password),
        role: 'ADMIN',
      },
    })
    console.log(`Created demo admin: ${email} / ${password} (id: ${created.id})`)
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })

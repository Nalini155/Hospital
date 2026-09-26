import { db } from '../src/lib/db'
import { hashPassword } from '../src/lib/auth'

async function main() {
  const email = 'admin@careflow.health'
  const existing = await db.user.findUnique({ where: { email } })
  if (existing) {
    console.log('Demo user already exists:', email)
    return
  }
  await db.user.create({
    data: {
      name: 'Dr. Admin',
      email,
      passwordHash: hashPassword('careflow123'),
      role: 'ADMIN',
    },
  })
  console.log('Created demo user:', email, '/ careflow123')
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })

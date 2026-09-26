import { db } from '../src/lib/db'
import bcrypt from 'bcryptjs'

async function main() {
  const users = await db.user.findMany()
  console.log('=== USER TABLE ===')
  console.log('count:', users.length)
  for (const u of users) {
    console.log({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      hashPrefix: u.passwordHash.slice(0, 12),
      hashLen: u.passwordHash.length,
    })
  }

  console.log('\n=== PASSWORD VERIFY TEST ===')
  const admin = users.find((u) => u.email === 'admin@careflow.health')
  if (!admin) {
    console.log('❌ admin@careflow.health NOT FOUND in DB')
  } else {
    const ok = bcrypt.compareSync('careflow123', admin.passwordHash)
    console.log('compareSync("careflow123", hash) =>', ok)
    console.log('full hash:', admin.passwordHash)
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('ERROR:', e)
    process.exit(1)
  })

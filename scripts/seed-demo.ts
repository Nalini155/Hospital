import { db } from '../src/lib/db'
import { hashPassword } from '../src/lib/auth'

async function main() {
  const receptionEmail = 'reception@careflow.health'
  const receptionPass = 'reception123'
  const existingReception = await db.user.findUnique({ where: { email: receptionEmail } })
  if (existingReception) {
    await db.user.update({
      where: { id: existingReception.id },
      data: {
        name: 'Reception Desk',
        role: 'RECEPTION',
        passwordHash: hashPassword(receptionPass),
      },
    })
    console.log(`Reset demo reception: ${receptionEmail} / ${receptionPass}`)
  } else {
    await db.user.create({
      data: {
        name: 'Reception Desk',
        email: receptionEmail,
        passwordHash: hashPassword(receptionPass),
        role: 'RECEPTION',
      },
    })
    console.log(`Created demo reception: ${receptionEmail} / ${receptionPass}`)
  }

  // Also keep the admin demo account fresh
  const adminEmail = 'admin@careflow.health'
  const adminPass = 'careflow123'
  const existingAdmin = await db.user.findUnique({ where: { email: adminEmail } })
  if (existingAdmin) {
    await db.user.update({
      where: { id: existingAdmin.id },
      data: { name: 'Dr. Admin', role: 'ADMIN', passwordHash: hashPassword(adminPass) },
    })
    console.log(`Reset demo admin: ${adminEmail} / ${adminPass}`)
  } else {
    await db.user.create({
      data: { name: 'Dr. Admin', email: adminEmail, passwordHash: hashPassword(adminPass), role: 'ADMIN' },
    })
    console.log(`Created demo admin: ${adminEmail} / ${adminPass}`)
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })

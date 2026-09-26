import { db } from '../src/lib/db'

async function main() {
  console.log('=== BEFORE ===')
  console.log('hospitalDaily:', await db.hospitalDaily.count())
  console.log('departmentDaily:', await db.departmentDaily.count())
  console.log('users:', await db.user.count())

  // Wipe the hospital data to simulate a fresh / broken state
  await db.departmentDaily.deleteMany({})
  await db.hospitalDaily.deleteMany({})
  console.log('\n=== AFTER WIPE (simulating empty dataset) ===')
  console.log('hospitalDaily:', await db.hospitalDaily.count())
  console.log('departmentDaily:', await db.departmentDaily.count())
  console.log('users:', await db.user.count())
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })

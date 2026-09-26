/**
 * Selects the Prisma provider based on the DATABASE_URL scheme and rewrites
 * prisma/schema.prisma so a single codebase works in BOTH:
 *   - local dev (file:./... → sqlite)
 *   - Vercel production (postgresql://... → postgresql)
 *
 * Run automatically by `postinstall` and `db:generate`. On Vercel, the build
 * sets DATABASE_URL to the Neon Postgres URL, so the provider becomes
 * postgresql and `prisma generate` produces a Postgres client.
 */
const fs = require('fs')
const path = require('path')

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma')
const url = process.env.DATABASE_URL || ''
const scheme = url.split('://')[0] || ''
const provider = scheme === 'postgresql' || scheme === 'postgres' ? 'postgresql' : 'sqlite'

let schema = fs.readFileSync(schemaPath, 'utf8')
const match = schema.match(/datasource db \{[\s\S]*?provider\s*=\s*"(\w+)"/)
if (!match) {
  console.error('[select-provider] could not find datasource block in schema.prisma')
  process.exit(1)
}
const current = match[1]
if (current === provider) {
  console.log(`[select-provider] provider already "${provider}" — no change needed`)
  process.exit(0)
}
schema = schema.replace(/(datasource db \{[\s\S]*?provider\s*=\s*")\w+(")/, `$1${provider}$2`)
fs.writeFileSync(schemaPath, schema)
console.log(`[select-provider] set Prisma provider to "${provider}" (based on DATABASE_URL scheme "${scheme || 'file'}")`)

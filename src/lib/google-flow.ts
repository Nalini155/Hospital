/**
 * Mock Google account chooser + email verification-code flow.
 *
 * In a production app this would be a real OAuth handshake (Google sign-in →
 * ID token → user provisioning). For this prototype we simulate the flow so
 * the UI is fully functional:
 *   1. User clicks "Continue with Google" → we show a list of mock Google
 *      accounts to choose from.
 *   2. User picks an account → we generate a 6-digit verification code and
 *      "send it to the account's email". Since we can't actually send email
 *      in this sandbox, the code is returned to the client and displayed in
 *      a small "demo code" banner so the user can read + enter it.
 *   3. User enters the code → we verify it; if valid we find-or-create a
 *      CareFlow user for that email and issue a real session token.
 *
 * The code store is an in-memory Map with a 10-minute TTL. This works because
 * the Next.js dev server is a single long-running process. For a serverless
 * deployment you'd swap this for Redis or a DB row.
 */

export type MockGoogleAccount = {
  email: string
  name: string
  initials: string
  // The CareFlow role to assign when this Google account is used to sign in.
  role: 'ADMIN' | 'STAFF' | 'RECEPTION'
}

/** The mock Google accounts shown in the account chooser. */
export const MOCK_GOOGLE_ACCOUNTS: MockGoogleAccount[] = [
  {
    email: 'admin@careflow.health',
    name: 'Dr. Admin',
    initials: 'DA',
    role: 'ADMIN',
  },
  {
    email: 'reception@careflow.health',
    name: 'Reception Desk',
    initials: 'RD',
    role: 'RECEPTION',
  },
  {
    email: 'google.user@gmail.com',
    name: 'Google User',
    initials: 'GU',
    role: 'STAFF',
  },
]

type StoredCode = {
  code: string
  expiresAt: number // epoch ms
}

// Module-level store keyed by lowercased email. TTL: 10 minutes.
const codeStore = new Map<string, StoredCode>()
const CODE_TTL_MS = 10 * 60 * 1000

/** Generate a 6-digit zero-padded code. */
export function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

/** Store a verification code for an email, returning the code. */
export function issueCode(email: string): string {
  const code = generateCode()
  codeStore.set(email.toLowerCase().trim(), {
    code,
    expiresAt: Date.now() + CODE_TTL_MS,
  })
  return code
}

/** Validate a code for an email. Returns true if valid (and clears it). */
export function verifyCode(email: string, code: string): boolean {
  const key = email.toLowerCase().trim()
  const entry = codeStore.get(key)
  if (!entry) return false
  if (Date.now() > entry.expiresAt) {
    codeStore.delete(key)
    return false
  }
  if (entry.code !== String(code).trim()) return false
  // Single-use: consume the code on success.
  codeStore.delete(key)
  return true
}

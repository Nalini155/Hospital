'use client'

const TOKEN_KEY = 'careflow_token'

/**
 * Persist the JWT returned by /api/auth/login (or /signup) so we can also send
 * it as a Bearer header. This is the reliable auth path when the app is served
 * through a gateway / preview iframe where the SameSite httpOnly cookie may not
 * be sent back by the browser.
 */
export function saveAuthToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {
    // localStorage may be unavailable (private mode / sandbox); non-fatal,
    // the cookie path still works for same-origin requests.
  }
}

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function clearAuthToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    // non-fatal
  }
}

/**
 * Shared fetch wrapper for authenticated API calls.
 *
 * - Sends the JWT as `Authorization: Bearer <token>` from localStorage (works
 *   in any context: gateway, iframe, cross-origin). The httpOnly cookie set by
 *   the server is also sent automatically for same-origin requests — the
 *   backend accepts either.
 * - `credentials: 'same-origin'` so the cookie is included when available.
 * - `cache: 'no-store'` so we never serve stale auth-protected data.
 */
export function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const token = getAuthToken()
  const headers: Record<string, string> = { ...(init.headers as Record<string, string>) }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return fetch(input, {
    ...init,
    credentials: 'same-origin',
    cache: 'no-store',
    headers,
  })
}

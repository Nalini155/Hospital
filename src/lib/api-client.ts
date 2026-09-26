'use client'

/**
 * Shared fetch wrapper for authenticated API calls.
 *
 * - Explicitly sets `credentials: 'same-origin'` so the httpOnly session cookie
 *   (careflow_token) is always included, even under non-default fetch policies.
 * - `cache: 'no-store'` so we never serve stale auth-protected data.
 *
 * Usage: `const res = await apiFetch('/api/dashboard')`
 */
export function apiFetch(
  input: string,
  init: RequestInit = {},
): Promise<Response> {
  return fetch(input, {
    ...init,
    credentials: 'same-origin',
    cache: 'no-store',
    headers: {
      ...(init.headers ?? {}),
    },
  })
}

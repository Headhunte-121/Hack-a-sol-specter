import { kvGet, kvSet } from '../shell/storage'

/** rotateClientToken: a random token, replaced every day, never linked to an account or device identifier.
 *  The server hashes it with a daily salt, so it only serves rate limiting. */
export function rotateClientToken(now: Date = new Date()): string {
  const day = now.toISOString().slice(0, 10)
  const cur = kvGet<{ day: string; value: string } | null>('client_token', null)
  if (cur && cur.day === day) return cur.value
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  const value = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
  kvSet('client_token', { day, value })
  return value
}

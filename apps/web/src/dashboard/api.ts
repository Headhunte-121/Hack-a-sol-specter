import { kvGet, kvSet } from '../shell/storage'

// API base comes from a public environment variable. Empty means "no backend configured": the dashboard says so, the rest of the app is unaffected.
export const apiBase = (): string => ((import.meta.env?.VITE_API_BASE as string | undefined) ?? '').replace(/\/$/, '')

export interface ApiResult<T> {
  data: T | null
  fromCache: boolean
  error: boolean
}

/** apiGet: shows the last saved copy first when offline, and refreshes when a connection is available. */
export async function apiGet<T>(path: string, timeoutMs = 6000): Promise<ApiResult<T>> {
  const key = `api.${path}`
  const cached = kvGet<{ at: number; data: T } | null>(key, null)
  const base = apiBase()
  if (!base) return { data: cached?.data ?? null, fromCache: !!cached, error: !cached }
  try {
    const ctl = new AbortController()
    const timer = setTimeout(() => ctl.abort(), timeoutMs)
    const r = await fetch(base + path, { signal: ctl.signal, cache: 'no-store' })
    clearTimeout(timer)
    if (!r.ok) throw new Error(String(r.status))
    const data = (await r.json()) as T
    kvSet(key, { at: Date.now(), data })
    return { data, fromCache: false, error: false }
  } catch {
    return { data: cached?.data ?? null, fromCache: !!cached, error: !cached }
  }
}

export async function apiHealthy(): Promise<boolean> {
  const base = apiBase()
  if (!base || (typeof navigator !== 'undefined' && !navigator.onLine)) return false
  try {
    const ctl = new AbortController()
    const timer = setTimeout(() => ctl.abort(), 4000)
    const r = await fetch(base + '/health', { signal: ctl.signal, cache: 'no-store' })
    clearTimeout(timer)
    return r.ok
  } catch {
    return false
  }
}

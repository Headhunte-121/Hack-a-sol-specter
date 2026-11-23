import { kvGet, kvSet } from '../shell/storage'
import { buildLocalDashboardResponse } from './localDemo'

// API base comes from a public environment variable. Empty means "no backend configured": the dashboard then shows labelled demo
// numbers and this device's own anonymous reports instead of failing, and the rest of the app is unaffected.
export const apiBase = (): string => ((import.meta.env?.VITE_API_BASE as string | undefined) ?? '').replace(/\/$/, '')

export interface ApiResult<T> {
  data: T | null
  fromCache: boolean
  localFallback: boolean
  error: boolean
}

/** apiGet: the live server first; when it is not configured, or cannot be reached, the last saved copy, then on-device figures. */
export async function apiGet<T>(path: string, timeoutMs = 6000): Promise<ApiResult<T>> {
  const key = `api.${path}`
  const cached = kvGet<{ at: number; data: T } | null>(key, null)
  const base = apiBase()

  if (!base) {
    const local = buildLocalDashboardResponse(path) as T | null
    if (local !== null) return { data: local, fromCache: false, localFallback: true, error: false }
    return { data: cached?.data ?? null, fromCache: !!cached, localFallback: false, error: !cached }
  }

  try {
    const ctl = new AbortController()
    const timer = setTimeout(() => ctl.abort(), timeoutMs)
    const r = await fetch(base + path, { signal: ctl.signal, cache: 'no-store' })
    clearTimeout(timer)
    if (!r.ok) throw new Error(String(r.status))
    const data = (await r.json()) as T
    kvSet(key, { at: Date.now(), data })
    return { data, fromCache: false, localFallback: false, error: false }
  } catch {
    if (cached) return { data: cached.data, fromCache: true, localFallback: false, error: false }
    const local = buildLocalDashboardResponse(path) as T | null
    if (local !== null) return { data: local, fromCache: true, localFallback: true, error: false }
    return { data: null, fromCache: false, localFallback: false, error: true }
  }
}

export async function apiHealthy(timeoutMs = 8000): Promise<boolean> {
  const base = apiBase()
  if (!base || (typeof navigator !== 'undefined' && !navigator.onLine)) return false
  try {
    const ctl = new AbortController()
    const timer = setTimeout(() => ctl.abort(), timeoutMs)
    const r = await fetch(base + '/health', { signal: ctl.signal, cache: 'no-store' })
    clearTimeout(timer)
    return r.ok
  } catch {
    return false
  }
}

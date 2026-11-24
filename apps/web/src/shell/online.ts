import { useEffect, useState } from 'react'
import { apiBase } from '../dashboard/api'

// The browser flag is only a hint: in the Android app's WebView it stays "true" unless the app holds the network-state permission, and it
// also stays true on a Wi-Fi network that has no internet. So the header and the offline notes use the flag first and then check that the
// network really answers.

const RECHECK_ONLINE_MS = 60_000
const RECHECK_OFFLINE_MS = 8_000

/** Asks the project's server for its health page without reading the answer (no-cors): any HTTP reply, even an error page, proves the
 *  network works; only a network failure or a timeout means offline. Returns null when there is no server address to ask. */
export async function reachNetwork(timeoutMs = 6000): Promise<boolean | null> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return false
  const base = apiBase()
  if (!base || typeof fetch === 'undefined') return null
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), timeoutMs)
  try {
    await fetch(base + '/health', { mode: 'no-cors', cache: 'no-store', signal: ctl.signal })
    return true
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine)
  useEffect(() => {
    let alive = true
    let timer: ReturnType<typeof setTimeout> | undefined
    const flag = () => (typeof navigator === 'undefined' ? true : navigator.onLine)
    const check = async () => {
      clearTimeout(timer)
      const reached = await reachNetwork()
      if (!alive) return
      const now = reached ?? flag()
      setOnline(now)
      timer = setTimeout(() => void check(), now ? RECHECK_ONLINE_MS : RECHECK_OFFLINE_MS)
    }
    const on = () => void check()
    const off = () => { setOnline(false); void check() }
    const visible = () => { if (document.visibilityState === 'visible') void check() }
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    document.addEventListener('visibilitychange', visible)
    void check()
    return () => {
      alive = false
      clearTimeout(timer)
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
      document.removeEventListener('visibilitychange', visible)
    }
  }, [])
  return online
}

export async function confirmOnline(healthUrl: string, timeoutMs = 4000): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return false
  try {
    const ctl = new AbortController()
    const timer = setTimeout(() => ctl.abort(), timeoutMs)
    const r = await fetch(healthUrl, { method: 'GET', cache: 'no-store', signal: ctl.signal })
    clearTimeout(timer)
    return r.ok
  } catch {
    return false
  }
}

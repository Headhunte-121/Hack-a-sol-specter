import { useEffect, useState } from 'react'

// The browser flag is only a hint: confirm with a lightweight request before syncing.
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
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

import { useEffect, useState } from 'react'
import { kvGet, kvSet } from './storage'

const KEY = 'demo_mode'

/** Returns true if demo mode is enabled (showing test examples and demo labels). Defaults to true. */
export function isDemoMode(): boolean {
  return kvGet<boolean>(KEY, true)
}

/** Updates demo mode and notifies active listeners. */
export function setDemoMode(enabled: boolean): void {
  kvSet(KEY, enabled)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('demo_mode_changed', { detail: enabled }))
  }
}

/** Hook to read and update demo mode state across components. */
export function useDemoMode(): [boolean, (val: boolean) => void] {
  const [demo, setDemo] = useState<boolean>(() => isDemoMode())

  useEffect(() => {
    const handler = (e: Event) => {
      if (e instanceof CustomEvent && typeof e.detail === 'boolean') {
        setDemo(e.detail)
      } else {
        setDemo(isDemoMode())
      }
    }
    window.addEventListener('demo_mode_changed', handler)
    window.addEventListener('storage', handler)
    return () => {
      window.removeEventListener('demo_mode_changed', handler)
      window.removeEventListener('storage', handler)
    }
  }, [])

  return [demo, setDemoMode]
}

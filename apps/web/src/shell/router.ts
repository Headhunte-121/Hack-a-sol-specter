import { useEffect, useState } from 'react'

export function currentPath(): string {
  const h = window.location.hash.replace(/^#/, '')
  return h === '' ? '/' : h.split('?')[0]
}
export function currentQuery(): URLSearchParams {
  const h = window.location.hash.replace(/^#/, '')
  return new URLSearchParams(h.includes('?') ? h.slice(h.indexOf('?') + 1) : '')
}
export function navigate(path: string) {
  window.location.hash = '#' + path.replace(/^#+/, '')
}
export function usePath(): string {
  const [p, setP] = useState(currentPath)
  useEffect(() => {
    const on = () => setP(currentPath())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return p
}

import { useEffect, useRef } from 'react'

// Inner screens (a check result, a quiz, a report outcome) share their page's address. Each one gets its own history entry,
// so the phone's Back button closes the inner screen instead of leaving the page.

const KEY = 'innerScreen'
type Entry = { id: string; data?: Record<string, unknown> }

const entryNow = (): Entry | null => {
  const s: unknown = history.state
  return s && typeof s === 'object' && KEY in s ? ((s as Record<string, Entry>)[KEY] ?? null) : null
}
let lastSkipped: string | null = null

/** useBackStep: while `open`, Back closes the inner screen. Returns the function the on-screen Back button should call. */
export function useBackStep(open: boolean, close: () => void, data?: Record<string, unknown>): () => void {
  const closeRef = useRef(close)
  closeRef.current = close
  const dataRef = useRef(data)
  dataRef.current = data
  const id = useRef<string | null>(null)

  useEffect(() => {
    if (!open) return
    const cur = entryNow()
    if (cur) {
      id.current = cur.id // reopened on its own entry after coming back from another page
    } else {
      id.current = Math.random().toString(36).slice(2)
      history.pushState({ ...((history.state as object | null) ?? {}), [KEY]: { id: id.current, data: dataRef.current } }, '')
    }
    const onPop = () => {
      if (entryNow()?.id !== id.current) {
        id.current = null
        closeRef.current()
      }
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [open])

  // keep the saved data current (a later answer on the same inner screen), so a return shows what was last on screen
  const dataKey = JSON.stringify(data ?? null)
  useEffect(() => {
    if (!open || !id.current || entryNow()?.id !== id.current) return
    history.replaceState({ ...((history.state as object | null) ?? {}), [KEY]: { id: id.current, data: dataRef.current } }, '')
  }, [open, dataKey])

  return () => {
    if (id.current && entryNow()?.id === id.current) history.back() // the popstate handler closes the screen
    else closeRef.current()
  }
}

/** closeThenGo: leave an inner screen for another address on the same page (for example the score screen's "next lesson")
 *  without leaving the inner screen's entry behind, so Back from the new address never lands on a dead entry. */
export function closeThenGo(close: () => void, hashPath: string) {
  if (entryNow()) {
    window.addEventListener('popstate', () => { window.location.hash = hashPath }, { once: true })
    close()
  } else {
    window.location.hash = hashPath
  }
}

/** useInnerScreenOnReturn: call once per page. When the page opens on an inner-screen entry (Back from another page), either
 *  restore that screen from the saved data (`restore` returns true) or step back past the entry so Back is never a dead press. */
export function useInnerScreenOnReturn(restore?: (data: Record<string, unknown> | undefined) => boolean) {
  const restoreRef = useRef(restore)
  restoreRef.current = restore
  useEffect(() => {
    const cur = entryNow()
    if (!cur) return
    if (restoreRef.current?.(cur.data)) return
    if (lastSkipped === cur.id) return // React development mode runs this effect twice
    lastSkipped = cur.id
    history.back()
  }, [])
}

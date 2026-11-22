import { useEffect, useSyncExternalStore } from 'react'
import { registerSW } from 'virtual:pwa-register'
import { isBusy } from './busy'
import { requestPersistentStorage } from './storage'

export type OfflineState = 'ready' | 'partial' | 'not_ready'
type State = { offline: OfflineState; needRefresh: boolean; storageFull: boolean; installEvent: BeforeInstallPromptEvent | null; installed: boolean }
type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

let state: State = { offline: 'not_ready', needRefresh: false, storageFull: false, installEvent: null, installed: false }
const listeners = new Set<() => void>()
const emit = (patch: Partial<State>) => {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}
export const usePwaState = () => useSyncExternalStore(subscribe, () => state)

let updateSW: ((reload?: boolean) => Promise<void>) | null = null

/** checkOfflineReady: is the model (the key offline asset) in the precache? Ready / partial / not ready. */
export async function checkOfflineReady(): Promise<OfflineState> {
  try {
    if (!('caches' in window)) return 'not_ready'
    const hit = await caches.match('/model/model.json')
    if (hit) return 'ready'
    const reg = await navigator.serviceWorker?.getRegistration()
    return reg?.installing || reg?.waiting || reg?.active ? 'partial' : 'not_ready'
  } catch {
    return 'not_ready'
  }
}

/** registerOfflineCache: register the service worker, which precaches app files, model, content and fonts. */
export function registerOfflineCache(): void {
  if (!('serviceWorker' in navigator)) return
  try {
    updateSW = registerSW({
      immediate: true,
      onOfflineReady: () => void checkOfflineReady().then((offline) => emit({ offline })),
      onNeedRefresh: () => emit({ needRefresh: true }),
      onRegisterError: (e: unknown) => {
        if (e instanceof DOMException && e.name === 'QuotaExceededError') emit({ storageFull: true })
      },
    })
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') emit({ storageFull: true })
  }
  const poll = () => void checkOfflineReady().then((offline) => emit({ offline }))
  poll()
  const timer = setInterval(() => {
    poll()
    if (state.offline === 'ready') clearInterval(timer)
  }, 2500)
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    emit({ installEvent: e as BeforeInstallPromptEvent })
  })
  window.addEventListener('appinstalled', () => emit({ installed: true, installEvent: null }))
  if (window.matchMedia?.('(display-mode: standalone)').matches) emit({ installed: true })
}

/** handleAppUpdate: apply a waiting version only when the user is not in the middle of a quiz or report form. */
export async function applyUpdate(): Promise<boolean> {
  if (isBusy()) return false
  await updateSW?.(true)
  return true
}
export const dismissUpdate = () => emit({ needRefresh: false })

/** promptInstall: show the browser install dialog. Returns the outcome, or null if unsupported / already installed. */
export async function promptInstall(): Promise<'accepted' | 'dismissed' | null> {
  const ev = state.installEvent
  if (!ev) return null
  await ev.prompt()
  const choice = await ev.userChoice
  emit({ installEvent: null })
  if (choice.outcome === 'accepted') void requestPersistentStorage() // keep offline files from being evicted
  return choice.outcome
}

export function usePwaBootstrap() {
  useEffect(() => {
    registerOfflineCache()
  }, [])
}

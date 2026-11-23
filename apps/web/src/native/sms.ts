import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core'

export interface DeviceSms {
  id: string
  sender: string
  body: string
  date: number
}

interface SmsReaderPlugin {
  getRecentSms(opts?: { limit?: number }): Promise<{ messages: DeviceSms[] }>
  startListening(): Promise<void>
  stopListening(): Promise<void>
  getPendingSharedText(): Promise<{ text: string | null }>
  addListener(eventName: 'smsReceived', cb: (sms: DeviceSms) => void): Promise<PluginListenerHandle>
  addListener(eventName: 'sharedText', cb: (ev: { text: string }) => void): Promise<PluginListenerHandle>
}

const SmsReader = registerPlugin<SmsReaderPlugin>('SmsReader')
const SHARED_KEY = 'suraksha:shared_text'

export const isAndroidNative = () =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'

export async function readRecentSms(limit = 30): Promise<DeviceSms[]> {
  if (!isAndroidNative()) return []
  const { messages } = await SmsReader.getRecentSms({ limit })
  return messages ?? []
}

export async function subscribeIncomingSms(onSms: (sms: DeviceSms) => void): Promise<() => void> {
  if (!isAndroidNative()) return () => {}
  await SmsReader.startListening()
  const handle = await SmsReader.addListener('smsReceived', onSms)
  return () => {
    void handle.remove()
    void SmsReader.stopListening()
  }
}

export function stashSharedText(text: string): void {
  try { sessionStorage.setItem(SHARED_KEY, text) } catch { /* ignore */ }
}

/** Reads and clears any text shared via PWA Share Target (/share-target?text=...) or Android ACTION_SEND. */
export async function consumeSharedText(): Promise<string | null> {
  try {
    const stashed = sessionStorage.getItem(SHARED_KEY)
    if (stashed) {
      sessionStorage.removeItem(SHARED_KEY)
      return stashed
    }
  } catch { /* ignore */ }

  if (isAndroidNative()) {
    try {
      const { text } = await SmsReader.getPendingSharedText()
      if (text?.trim()) return text.trim()
    } catch { /* ignore */ }
  }
  return null
}

export async function subscribeNativeShare(onText: (text: string) => void): Promise<() => void> {
  if (!isAndroidNative()) return () => {}
  const handle = await SmsReader.addListener('sharedText', (ev) => {
    if (ev.text?.trim()) onText(ev.text.trim())
  })
  return () => { void handle.remove() }
}

/** Captures GET /?title=...&text=...&url=... on PWA launch and routes straight to #/message. */
export function captureWebShareTarget(): boolean {
  if (typeof window === 'undefined') return false
  const params = new URLSearchParams(window.location.search)
  const text = params.get('text') || ''
  const url = params.get('url') || ''
  const title = params.get('title') || params.get('sender') || ''
  if (!text && !url && !title && window.location.pathname !== '/share-target') return false
  const bodyText = [text, url].filter(Boolean).join(' ') || title || ''
  const senderText = title && title !== bodyText ? title : ''
  if (bodyText) {
    const full = senderText ? `From: ${senderText}\n${bodyText}` : bodyText
    stashSharedText(full)
  }
  history.replaceState(null, '', '/#/message')
  return true
}

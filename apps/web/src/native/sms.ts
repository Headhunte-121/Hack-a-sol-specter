import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core'

export interface DeviceSms {
  id: string
  sender: string
  body: string
  date: number
  /** 'chat' = RCS "Chat" message; 'whatsapp' = WhatsApp message; absent = standard SMS */
  via?: 'chat' | 'whatsapp'
}

interface SmsReaderPlugin {
  getRecentSms(opts?: { limit?: number }): Promise<{ messages: DeviceSms[] }>
  startListening(): Promise<void>
  stopListening(): Promise<void>
  getPendingSharedText(): Promise<{ text: string | null }>
  getChatMessages(opts?: { limit?: number }): Promise<{ messages: DeviceSms[]; enabled: boolean }>
  openChatAccessSettings(): Promise<void>
  openAppSettings(): Promise<void>
  clearChatMessages(): Promise<void>
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

export interface ChatRead {
  /** false on the web and on an older app build that does not have the reader */
  supported: boolean
  /** the user allowed Notification access to Suraksha in Android settings */
  enabled: boolean
  messages: DeviceSms[]
}

/**
 * Messages sent over RCS ("Chat" in Google Messages: the ones with a chat bubble on the picture, business senders with a tick) are not SMS and no app can
 * read them from the SMS inbox. With the user's permission (Notification access) the app keeps the text of the messaging app's new notifications.
 * Only messages that arrived after the user allowed it can be read. Never rejects.
 */
export async function readChatMessages(limit = 30): Promise<ChatRead> {
  if (!isAndroidNative()) return { supported: false, enabled: false, messages: [] }
  try {
    const r = await SmsReader.getChatMessages({ limit })
    // a WhatsApp message keeps its own tag; everything else the listener read is a Chat (RCS) message
    return { supported: true, enabled: !!r.enabled, messages: (r.messages ?? []).map((m) => ({ ...m, via: m.via === 'whatsapp' ? ('whatsapp' as const) : ('chat' as const) })) }
  } catch {
    return { supported: false, enabled: false, messages: [] }
  }
}

export async function openChatAccessSettings(): Promise<void> {
  if (isAndroidNative()) await SmsReader.openChatAccessSettings().catch(() => {})
}

export async function openAppSettings(): Promise<void> {
  if (isAndroidNative()) await SmsReader.openAppSettings().catch(() => {})
}

export async function clearChatMessages(): Promise<void> {
  if (isAndroidNative()) await SmsReader.clearChatMessages().catch(() => {})
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

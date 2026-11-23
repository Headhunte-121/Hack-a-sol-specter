import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DeviceSms } from '../native/sms'
import { LangProvider } from '../shell/i18n'
import { resetScorerCache } from './model'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

// The inbox of the Android app must show a message that arrives later even when the live receiver misses it (the page paused in the background,
// a message that came over RCS and so never fires an SMS broadcast), by reading the inbox again every few seconds and when the app returns.
const inbox: DeviceSms[] = []
const state = { reads: 0, subscribed: 0, unsubscribed: 0 }
// Chat (RCS) messages are read from the messaging app's notifications, only after the user allows Notification access
const chat = { supported: true, enabled: false, messages: [] as DeviceSms[] }
const opened = { access: 0, appInfo: 0 }
vi.mock('../native/sms', async () => {
  const real = await vi.importActual<typeof import('../native/sms')>('../native/sms')
  return {
    ...real,
    isAndroidNative: () => true,
    readRecentSms: async () => { state.reads++; return [...inbox] },
    subscribeIncomingSms: async () => { state.subscribed++; return () => { state.unsubscribed++ } },
    readChatMessages: async () => ({ supported: chat.supported, enabled: chat.enabled, messages: [...chat.messages] }),
    openChatAccessSettings: async () => { opened.access++ },
    openAppSettings: async () => { opened.appInfo++ },
    consumeSharedText: async () => null,
    subscribeNativeShare: async () => () => {},
  }
})

const pub = join(__dirname, '..', '..', 'public')
const file = (p: string) => readFileSync(join(pub, p), 'utf8')

describe('the Android inbox screen', { timeout: 15000 }, () => {
  let host: HTMLDivElement
  let root: Root
  beforeEach(() => {
    resetScorerCache()
    vi.useFakeTimers()
    state.reads = 0; state.subscribed = 0; state.unsubscribed = 0
    chat.supported = true; chat.enabled = false; chat.messages = []; opened.access = 0; opened.appInfo = 0
    inbox.length = 0
    inbox.push({ id: '1', sender: 'AX-HDFCBK-S', body: 'Rs 500 debited from A/c XX1234 on 22-Nov. If not you call the bank.', date: Date.parse('2026-11-22T10:00:00') })
    localStorage.clear()
    localStorage.setItem('gt02:lang', JSON.stringify('en'))
    window.matchMedia = ((q: string) => ({ matches: q.includes('pointer: coarse'), media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as unknown as typeof window.matchMedia
    vi.stubGlobal('fetch', async (u: string) => ({ ok: true, json: async () => JSON.parse(file(String(u).replace(/^\//, ''))) }))
    host = document.createElement('div')
    document.body.appendChild(host)
  })
  afterEach(() => { act(() => root?.unmount()); host.remove(); vi.useRealTimers(); vi.unstubAllGlobals(); resetScorerCache() })

  const mount = async () => {
    const { default: DetectorPage } = await import('./DetectorPage')
    await act(async () => { root = createRoot(host); root.render(<LangProvider><DetectorPage /></LangProvider>) })
    for (let k = 0; k < 20; k++) {
      if (host.querySelector('[data-testid="sms-inbox"]') && !host.textContent?.includes('Loading the checker')) break
      await act(async () => { await vi.advanceTimersByTimeAsync(50) })
    }
  }

  it('shows the inbox, then a message that arrived later without any live event, and when it last looked', async () => {
    await mount()
    expect(host.textContent).toContain('AX-HDFCBK-S')
    expect(host.textContent).toContain('Checked')
    expect(state.subscribed).toBe(1)
    inbox.unshift({ id: '2', sender: 'TZ-OFFER-P', body: 'Hello from a friend, are we meeting today?', date: Date.parse('2026-11-23T11:14:00') })
    expect(host.textContent).not.toContain('TZ-OFFER-P')
    await act(async () => { await vi.advanceTimersByTimeAsync(8100) })
    expect(host.textContent).toContain('TZ-OFFER-P')
    expect(state.reads).toBeGreaterThanOrEqual(2)
  })

  it('explains why Chat messages cannot be read, and sends the person to Android settings to allow it', async () => {
    await mount()
    const card = host.querySelector('[data-testid="chat-access"]') as HTMLElement
    expect(card).not.toBeNull()
    expect(card.textContent).toContain('not SMS')
    expect(card.textContent).toContain('Allow restricted settings')
    const [allow, appInfo] = [...card.querySelectorAll('button')]
    await act(async () => { allow.click() })
    await act(async () => { appInfo.click() })
    expect(opened).toEqual({ access: 1, appInfo: 1 })
  })

  it('lists Chat messages once access is allowed, marks them, flags a scam among them, and shows a message that is also an SMS only once', async () => {
    chat.enabled = true
    chat.messages = [
      { id: 'chat-1', sender: 'A Friend', body: 'ALERT: Your account has been blocked. Verify your KYC now at http://bit.ly/x9 or it will be closed today.', date: Date.parse('2026-11-23T23:30:00'), via: 'chat' },
      { id: 'chat-2', sender: 'AX-HDFCBK-S', body: 'Rs 500 debited from A/c XX1234 on 22-Nov. If not you call the bank.', date: Date.parse('2026-11-22T10:00:01'), via: 'chat' },
    ]
    await mount()
    expect(host.querySelector('[data-testid="chat-access"]')).toBeNull()
    expect(host.querySelector('[data-testid="chat-on"]')).not.toBeNull()
    expect(host.textContent).toContain('A Friend')
    expect(host.querySelectorAll('[data-testid="chat-badge"]').length).toBe(1)
    expect(host.textContent!.split('AX-HDFCBK-S').length - 1).toBe(1)
    const items = [...host.querySelectorAll('[data-testid="sms-inbox"] li')]
    expect(items[0].textContent).toContain('A Friend') // newest first
    expect(host.textContent).toMatch(/Likely scam|Suspicious|scam/i)
  })

  it('shows nothing about Chat messages on an app build that cannot read them', async () => {
    chat.supported = false
    await mount()
    expect(host.querySelector('[data-testid="chat-access"]')).toBeNull()
    expect(host.querySelector('[data-testid="chat-on"]')).toBeNull()
    expect(host.textContent).toContain('AX-HDFCBK-S')
  })

  it('stops listening when the screen is left, even if it is left right away', async () => {
    await mount()
    act(() => root.unmount())
    await act(async () => { await vi.advanceTimersByTimeAsync(10) })
    expect(state.unsubscribed).toBe(state.subscribed)
    root = createRoot(document.createElement('div'))
  })
})

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DeviceSms } from '../native/sms'
import { LangProvider } from '../shell/i18n'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

// The inbox of the Android app must show a message that arrives later even when the live receiver misses it (the page paused in the background,
// a message that came over RCS and so never fires an SMS broadcast), by reading the inbox again every few seconds and when the app returns.
const inbox: DeviceSms[] = []
const state = { reads: 0, subscribed: 0, unsubscribed: 0 }
vi.mock('../native/sms', async () => {
  const real = await vi.importActual<typeof import('../native/sms')>('../native/sms')
  return {
    ...real,
    isAndroidNative: () => true,
    readRecentSms: async () => { state.reads++; return [...inbox] },
    subscribeIncomingSms: async () => { state.subscribed++; return () => { state.unsubscribed++ } },
    consumeSharedText: async () => null,
    subscribeNativeShare: async () => () => {},
  }
})

const pub = join(__dirname, '..', '..', 'public')
const file = (p: string) => readFileSync(join(pub, p), 'utf8')

describe('the Android inbox screen', () => {
  let host: HTMLDivElement
  let root: Root
  beforeEach(() => {
    vi.useFakeTimers()
    state.reads = 0; state.subscribed = 0; state.unsubscribed = 0
    inbox.length = 0
    inbox.push({ id: '1', sender: 'AX-HDFCBK-S', body: 'Rs 500 debited from A/c XX1234 on 22-Nov. If not you call the bank.', date: Date.parse('2026-11-22T10:00:00') })
    localStorage.clear()
    localStorage.setItem('gt02:lang', JSON.stringify('en'))
    window.matchMedia = ((q: string) => ({ matches: q.includes('pointer: coarse'), media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as unknown as typeof window.matchMedia
    vi.stubGlobal('fetch', async (u: string) => ({ ok: true, json: async () => JSON.parse(file(String(u).replace(/^\//, ''))) }))
    host = document.createElement('div')
    document.body.appendChild(host)
  })
  afterEach(() => { act(() => root.unmount()); host.remove(); vi.useRealTimers(); vi.unstubAllGlobals() })

  const mount = async () => {
    const { default: DetectorPage } = await import('./DetectorPage')
    await act(async () => { root = createRoot(host); root.render(<LangProvider><DetectorPage /></LangProvider>) })
    await act(async () => { await vi.advanceTimersByTimeAsync(50) })
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

  it('stops listening when the screen is left, even if it is left right away', async () => {
    await mount()
    act(() => root.unmount())
    await act(async () => { await vi.advanceTimersByTimeAsync(10) })
    expect(state.unsubscribed).toBe(state.subscribed)
    root = createRoot(document.createElement('div'))
  })
})

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { reachNetwork, useOnlineStatus } from './online'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

function Probe() {
  return <span id="state">{useOnlineStatus() ? 'online' : 'offline'}</span>
}

let flag = true
let host: HTMLDivElement
let root: Root
const state = () => host.querySelector('#state')?.textContent

async function mount() {
  root = createRoot(host)
  await act(async () => { root.render(<Probe />) })
}

describe('online status in the app header', () => {
  beforeEach(() => {
    flag = true
    Object.defineProperty(window.navigator, 'onLine', { configurable: true, get: () => flag })
    host = document.createElement('div')
    document.body.appendChild(host)
  })

  afterEach(() => {
    act(() => root?.unmount())
    host.remove()
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('without a server address it follows the browser flag and makes no request', async () => {
    vi.stubEnv('VITE_API_BASE', '')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await mount()
    expect(state()).toBe('online')
    expect(fetchMock).not.toHaveBeenCalled()
    flag = false
    await act(async () => { window.dispatchEvent(new Event('offline')) })
    expect(state()).toBe('offline')
  })

  it('shows Offline when the flag says online (Android WebView) but the network does not answer', async () => {
    vi.stubEnv('VITE_API_BASE', 'https://api.example.test')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    await mount()
    expect(state()).toBe('offline')
  })

  it('shows Online when the server answers, even with an error page, and asks without reading the reply', async () => {
    vi.stubEnv('VITE_API_BASE', 'https://api.example.test')
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 503, type: 'opaque' })
    vi.stubGlobal('fetch', fetchMock)
    await mount()
    expect(state()).toBe('online')
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.example.test/health')
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ mode: 'no-cors', cache: 'no-store' })
  })

  it('goes Offline at once on the offline event and comes back when the network answers again', async () => {
    vi.stubEnv('VITE_API_BASE', 'https://api.example.test')
    const fetchMock = vi.fn().mockResolvedValue({ type: 'opaque' })
    vi.stubGlobal('fetch', fetchMock)
    await mount()
    expect(state()).toBe('online')
    flag = false
    await act(async () => { window.dispatchEvent(new Event('offline')) })
    expect(state()).toBe('offline')
    flag = true
    await act(async () => { window.dispatchEvent(new Event('online')) })
    expect(state()).toBe('online')
  })

  it('reachNetwork does not ask the network when the flag already says offline', async () => {
    vi.stubEnv('VITE_API_BASE', 'https://api.example.test')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    flag = false
    expect(await reachNetwork()).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

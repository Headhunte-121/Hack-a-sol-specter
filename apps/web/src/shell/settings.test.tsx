import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('virtual:pwa-register', () => ({ registerSW: () => async () => {} }))

import { LangProvider } from './i18n'
import { Settings } from './Settings'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let root: Root

describe('Settings server status row', () => {
  const origApi = import.meta.env.VITE_API_BASE
  const origAsr = import.meta.env.VITE_ASR_BASE

  beforeEach(() => {
    vi.restoreAllMocks()
    window.matchMedia = ((q: string) => ({
      matches: false,
      media: q,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      onchange: null,
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia
    localStorage.clear()
    localStorage.setItem('gt02:lang', '"en"')
    host = document.createElement('div')
    document.body.appendChild(host)
  })

  afterEach(() => {
    act(() => root?.unmount())
    host.remove()
    import.meta.env.VITE_API_BASE = origApi
    import.meta.env.VITE_ASR_BASE = origAsr
  })

  it('renders "Not configured" when both env vars are unset', async () => {
    delete (import.meta.env as Record<string, unknown>).VITE_API_BASE
    delete (import.meta.env as Record<string, unknown>).VITE_ASR_BASE

    await act(async () => {
      root = createRoot(host)
      root.render(
        <LangProvider>
          <Settings />
        </LangProvider>
      )
    })

    const apiStatus = host.querySelector('[data-testid="reports-api-status"]')
    const asrStatus = host.querySelector('[data-testid="speech-service-status"]')

    expect(apiStatus?.textContent).toContain('Not configured')
    expect(asrStatus?.textContent).toContain('Not configured')
  })

  it('renders "Connected" with details when health probes succeed', async () => {
    import.meta.env.VITE_API_BASE = 'https://api.example.com'
    import.meta.env.VITE_ASR_BASE = 'https://speech.example.com'

    vi.spyOn(globalThis, 'fetch').mockImplementation((url) => {
      const u = String(url)
      if (u.includes('api.example.com/health')) {
        return Promise.resolve(
          new Response(JSON.stringify({ status: 'ok', version: '1.2.0' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        )
      }
      if (u.includes('speech.example.com/health')) {
        return Promise.resolve(
          new Response(JSON.stringify({ status: 'ok', model: 'whisper-base', hindi_model: 'indic' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        )
      }
      return Promise.reject(new Error('Unknown url: ' + u))
    })

    await act(async () => {
      root = createRoot(host)
      root.render(
        <LangProvider>
          <Settings />
        </LangProvider>
      )
    })

    // Allow promise microtasks to settle
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })

    const apiStatus = host.querySelector('[data-testid="reports-api-status"]')
    const asrStatus = host.querySelector('[data-testid="speech-service-status"]')

    expect(apiStatus?.textContent).toContain('Connected')
    expect(apiStatus?.textContent).toContain('(v1.2.0)')
    expect(asrStatus?.textContent).toContain('Connected')
    expect(asrStatus?.textContent).toContain('(whisper-base / indic)')
  })

  it('renders "Offline" when health probes fail', async () => {
    import.meta.env.VITE_API_BASE = 'https://api.example.com'
    import.meta.env.VITE_ASR_BASE = 'https://speech.example.com'

    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Connection refused'))

    await act(async () => {
      root = createRoot(host)
      root.render(
        <LangProvider>
          <Settings />
        </LangProvider>
      )
    })

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })

    const apiStatus = host.querySelector('[data-testid="reports-api-status"]')
    const asrStatus = host.querySelector('[data-testid="speech-service-status"]')

    expect(apiStatus?.textContent).toContain('Offline')
    expect(asrStatus?.textContent).toContain('Offline')
  })
})

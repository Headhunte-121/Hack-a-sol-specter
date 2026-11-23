import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('virtual:pwa-register', () => ({ registerSW: () => async () => {} }))

import { LangProvider } from '../shell/i18n'
import CallPage from './CallPage'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let root: Root

describe('CallPage audio degradation and probe states', () => {
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
    localStorage.setItem('gt02:demo_mode', 'false')
    host = document.createElement('div')
    document.body.appendChild(host)
  })

  afterEach(() => {
    act(() => root?.unmount())
    host.remove()
    import.meta.env.VITE_ASR_BASE = origAsr
  })

  it('defaults to paste mode and displays calm note under audio tab when asr is unset', async () => {
    delete (import.meta.env as Record<string, unknown>).VITE_ASR_BASE

    vi.spyOn(globalThis, 'fetch').mockImplementation((url) => {
      const u = String(url)
      if (u.includes('call_lexicon.json')) {
        return Promise.resolve(new Response(JSON.stringify({ version: '1', keywords: {} })))
      }
      if (u.includes('demo_calls.json')) {
        return Promise.resolve(new Response(JSON.stringify({ calls: [] })))
      }
      if (u.includes('brands.json')) {
        return Promise.resolve(new Response(JSON.stringify({ brands: [] })))
      }
      if (u.includes('model.json') || u.includes('signals.json')) {
        return Promise.resolve(new Response(JSON.stringify({})))
      }
      return Promise.reject(new Error('Unknown url: ' + u))
    })

    await act(async () => {
      root = createRoot(host)
      root.render(
        <LangProvider>
          <CallPage />
        </LangProvider>
      )
    })

    // Default tab should be paste
    const textarea = host.querySelector('textarea')
    expect(textarea).not.toBeNull()

    // Find and click the audio tab
    const tabs = host.querySelectorAll('[role="tab"]')
    const audioTab = Array.from(tabs).find((t) => t.textContent?.toLowerCase().includes('audio'))
    expect(audioTab).toBeDefined()

    await act(async () => {
      audioTab?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    // Should show calm note
    const calmNote = host.querySelector('[data-testid="asr-unavailable-note"]')
    expect(calmNote).not.toBeNull()
    expect(calmNote?.textContent).toContain('Audio check needs a speech server')
    // No record button should be rendered
    const recordBtn = Array.from(host.querySelectorAll('button')).find((b) => b.textContent?.includes('Record'))
    expect(recordBtn).toBeUndefined()
  })

  it('displays calm note when speech server health check fails', async () => {
    import.meta.env.VITE_ASR_BASE = 'https://speech.example.com'

    vi.spyOn(globalThis, 'fetch').mockImplementation((url) => {
      const u = String(url)
      if (u.includes('/health')) {
        return Promise.reject(new Error('Connection refused'))
      }
      return Promise.resolve(new Response(JSON.stringify({})))
    })

    await act(async () => {
      root = createRoot(host)
      root.render(
        <LangProvider>
          <CallPage />
        </LangProvider>
      )
    })

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })

    // Find and click the audio tab
    const tabs = host.querySelectorAll('[role="tab"]')
    const audioTab = Array.from(tabs).find((t) => t.textContent?.toLowerCase().includes('audio'))
    await act(async () => {
      audioTab?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const calmNote = host.querySelector('[data-testid="asr-unavailable-note"]')
    expect(calmNote).not.toBeNull()
    expect(calmNote?.textContent).toContain('Audio check needs a speech server')
  })
})

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LangProvider } from '../shell/i18n'
import DetectorPage from './DetectorPage'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const pub = join(__dirname, '..', '..', 'public')
const file = (p: string) => readFileSync(join(pub, p), 'utf8')

describe('DetectorPage speech synthesis cleanup', () => {
  let host: HTMLDivElement
  let root: Root
  let cancelCalled = 0

  beforeEach(() => {
    cancelCalled = 0
    localStorage.clear()
    localStorage.setItem('gt02:lang', JSON.stringify('en'))
    window.matchMedia = ((q: string) => ({
      matches: false,
      media: q,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      onchange: null,
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia

    class MockSpeechSynthesisUtterance {
      text: string
      lang = ''
      constructor(text = '') {
        this.text = text
      }
    }
    vi.stubGlobal('SpeechSynthesisUtterance', MockSpeechSynthesisUtterance)
    vi.stubGlobal('speechSynthesis', {
      cancel: vi.fn(() => {
        cancelCalled++
      }),
      speak: vi.fn(),
    })
    vi.stubGlobal('fetch', async (u: string) => ({
      ok: true,
      json: async () => JSON.parse(file(String(u).replace(/^\//, ''))),
    }))

    host = document.createElement('div')
    document.body.appendChild(host)
  })

  afterEach(() => {
    act(() => root?.unmount())
    host.remove()
    vi.unstubAllGlobals()
  })

  it('cancels speech synthesis when unmounting DetectorPage', async () => {
    await act(async () => {
      root = createRoot(host)
      root.render(
        <LangProvider>
          <DetectorPage />
        </LangProvider>
      )
    })

    const initialCancels = cancelCalled
    act(() => {
      root.unmount()
    })

    expect(cancelCalled).toBeGreaterThan(initialCancels)
  })
})

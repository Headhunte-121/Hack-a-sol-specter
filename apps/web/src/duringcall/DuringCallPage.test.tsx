import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LangProvider } from '../shell/i18n'
import DuringCallPage from './DuringCallPage'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('DuringCallPage', () => {
  let host: HTMLDivElement
  let root: Root
  let cancelCalled = 0
  let speakCalled = 0

  beforeEach(() => {
    cancelCalled = 0
    speakCalled = 0
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
    host = document.createElement('div')
    document.body.appendChild(host)

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
      speak: vi.fn(() => {
        speakCalled++
      }),
    })
  })

  afterEach(() => {
    act(() => root?.unmount())
    host.remove()
    vi.unstubAllGlobals()
  })

  const mount = async () => {
    await act(async () => {
      root = createRoot(host)
      root.render(
        <LangProvider>
          <DuringCallPage />
        </LangProvider>
      )
    })
  }

  it('renders during call guidance checklist', async () => {
    await mount()
    expect(host.querySelector('[data-testid="dc-checklist"]')).toBeTruthy()
  })

  it('speaks aloud on button click and cancels speech on unmount', async () => {
    await mount()
    const speakBtn = host.querySelector('button.btn-secondary') as HTMLButtonElement | null
    expect(speakBtn).toBeTruthy()

    act(() => {
      speakBtn?.click()
    })

    expect(cancelCalled).toBeGreaterThanOrEqual(1)
    expect(speakCalled).toBe(1)

    // Verify unmount cancels speech
    const callsBeforeUnmount = cancelCalled
    act(() => {
      root.unmount()
    })
    expect(cancelCalled).toBeGreaterThan(callsBeforeUnmount)
  })
})

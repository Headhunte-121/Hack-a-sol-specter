import { beforeEach, describe, expect, it, vi } from 'vitest'

const clearQueue = vi.fn(() => Promise.resolve())
vi.mock('./queue', () => ({ clearQueue }))
const { hasConsent, setConsent } = await import('./consent')

beforeEach(() => { localStorage.clear(); clearQueue.mockClear() })

describe('consent', () => {
  it('is off by default', () => {
    expect(hasConsent()).toBe(false)
  })
  it('switching it off discards anything waiting to be sent, right away', () => {
    setConsent(true)
    expect(hasConsent()).toBe(true)
    expect(clearQueue).not.toHaveBeenCalled()
    setConsent(false)
    expect(hasConsent()).toBe(false)
    expect(clearQueue).toHaveBeenCalledTimes(1)
  })
})

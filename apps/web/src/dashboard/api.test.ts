import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiGet } from './api'

// The hosted trends endpoints answer in 2 to 8 seconds, so a working but slow server must not be reported as "No connection".
const slowServer = (ms: number) =>
  vi.fn((_url: string, init?: RequestInit) =>
    new Promise((resolve, reject) => {
      const t = setTimeout(() => resolve({ ok: true, json: async () => ({ rows: [1] }) }), ms)
      init?.signal?.addEventListener('abort', () => { clearTimeout(t); reject(new DOMException('aborted', 'AbortError')) })
    }),
  )

describe('apiGet with a slow server', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubEnv('VITE_API_BASE', 'https://api.test')
    localStorage.clear()
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('waits for a server that takes 9 seconds and returns its data', async () => {
    vi.stubGlobal('fetch', slowServer(9000))
    const pending = apiGet<{ rows: number[] }>('/trends/overview')
    await vi.advanceTimersByTimeAsync(9000)
    const r = await pending
    expect(r.data).toEqual({ rows: [1] })
    expect(r.fromCache).toBe(false)
    expect(r.localFallback).toBe(false)
  })

  it('gives up on a server that never answers and falls back to on-device figures', async () => {
    vi.stubGlobal('fetch', slowServer(60000))
    const pending = apiGet<unknown>('/trends/overview')
    await vi.advanceTimersByTimeAsync(15001)
    const r = await pending
    expect(r.fromCache).toBe(true)
    expect(r.localFallback).toBe(true)
  })
})

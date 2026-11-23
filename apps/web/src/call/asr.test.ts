import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { asrBase, healthCheck, validateClip } from './asr'

describe('asr service client and health probes', () => {
  const originalEnv = import.meta.env.VITE_ASR_BASE

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    import.meta.env.VITE_ASR_BASE = originalEnv
  })

  it('asrBase returns null when VITE_ASR_BASE is unset, empty, or whitespace', () => {
    import.meta.env.VITE_ASR_BASE = ''
    expect(asrBase()).toBeNull()

    import.meta.env.VITE_ASR_BASE = '   '
    expect(asrBase()).toBeNull()

    delete (import.meta.env as Record<string, unknown>).VITE_ASR_BASE
    expect(asrBase()).toBeNull()
  })

  it('asrBase falls back to ngrok when VITE_ASR_BASE points to onrender.com', () => {
    import.meta.env.VITE_ASR_BASE = 'https://hack-a-sol-specter.onrender.com'
    expect(asrBase()).toBe('https://paternal-ideology-situation.ngrok-free.dev')
  })

  it('asrBase returns null when explicitly disabled', () => {
    import.meta.env.VITE_ASR_BASE = 'disabled'
    expect(asrBase()).toBeNull()

    import.meta.env.VITE_ASR_BASE = 'none'
    expect(asrBase()).toBeNull()
  })

  it('asrBase returns cleaned URL when VITE_ASR_BASE is set to custom server', () => {
    import.meta.env.VITE_ASR_BASE = 'https://speech.example.com/'
    expect(asrBase()).toBe('https://speech.example.com')

    import.meta.env.VITE_ASR_BASE = '  https://speech.example.com  '
    expect(asrBase()).toBe('https://speech.example.com')
  })

  it('healthCheck returns { ok: false } immediately without fetch when asrBase is null', async () => {
    import.meta.env.VITE_ASR_BASE = ''
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const res = await healthCheck(1000)
    expect(res).toEqual({ ok: false })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('healthCheck returns ok and model info when endpoint is reachable', async () => {
    import.meta.env.VITE_ASR_BASE = 'https://speech.example.com'
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'ok', model: 'whisper-base', hindi_model: 'indic-whisper' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )
    const res = await healthCheck(1000)
    expect(res).toEqual({ ok: true, model: 'whisper-base', hindi_model: 'indic-whisper' })
  })

  it('healthCheck returns { ok: false } when endpoint returns 500 or error', async () => {
    import.meta.env.VITE_ASR_BASE = 'https://speech.example.com'
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('internal error', { status: 500 })
    )
    const res = await healthCheck(1000)
    expect(res).toEqual({ ok: false })
  })

  it('healthCheck returns { ok: false } on network rejection / timeout', async () => {
    import.meta.env.VITE_ASR_BASE = 'https://speech.example.com'
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'))
    const res = await healthCheck(1000)
    expect(res).toEqual({ ok: false })
  })

  it('validateClip rejects oversized audio or too long duration', () => {
    const hugeBlob = new Blob([new Uint8Array(6 * 1024 * 1024)], { type: 'audio/wav' })
    expect(validateClip(hugeBlob, 10)).toBe('too_big')

    const longBlob = new Blob(['sample audio'], { type: 'audio/wav' })
    expect(validateClip(longBlob, 200)).toBe('too_long')

    const badTypeBlob = new Blob(['sample'], { type: 'text/plain' })
    expect(validateClip(badTypeBlob, 10)).toBe('bad_type')

    const amrBlob = new Blob(['sample audio'], { type: 'audio/amr' })
    expect(validateClip(amrBlob, 10)).toBeNull()

    const amrNamedBlob = Object.assign(new Blob(['sample audio'], { type: 'application/octet-stream' }), { name: 'call_recording.amr' })
    expect(validateClip(amrNamedBlob, 10)).toBeNull()
  })
})

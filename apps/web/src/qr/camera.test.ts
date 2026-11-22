import { describe, expect, it, vi } from 'vitest'
import en from '../i18n/en.json'
import { cameraErrorKey, openCamera } from './camera'

const err = (name: string) => Object.assign(new Error(name), { name })
const stream = { id: 's' } as unknown as MediaStream
const deps = (permission: PermissionState | 'unknown') => ({ permission: vi.fn(async () => permission), settle: vi.fn(async () => {}) })

describe('camera errors get their own next step', () => {
  it('maps each browser error to a message that exists', () => {
    expect(cameraErrorKey(err('NotAllowedError'))).toBe('qr.err.camera')
    expect(cameraErrorKey(Object.assign(err('NotAllowedError'), { permission: 'prompt' }))).toBe('qr.err.camera_dismissed')
    expect(cameraErrorKey(err('SecurityError'))).toBe('qr.err.camera')
    expect(cameraErrorKey(err('NotFoundError'))).toBe('qr.err.camera_none')
    expect(cameraErrorKey(err('NotReadableError'))).toBe('qr.err.camera_busy')
    expect(cameraErrorKey(err('NotSupportedError'))).toBe('qr.err.camera_unsupported')
    expect(cameraErrorKey(new TypeError('x'))).toBe('qr.err.camera_unsupported')
    expect(cameraErrorKey(err('SomethingNew'))).toBe('qr.err.camera_failed')
    expect(cameraErrorKey(null)).toBe('qr.err.camera_failed')
    for (const k of ['qr.err.camera', 'qr.err.camera_dismissed', 'qr.err.camera_none', 'qr.err.camera_busy', 'qr.err.camera_unsupported', 'qr.err.camera_failed', 'qr.take_photo']) {
      expect((en as Record<string, string>)[k], k).toBeTruthy()
    }
  })
})

describe('openCamera', () => {
  it('asks for the back camera first', async () => {
    const getUserMedia = vi.fn(async () => stream)
    expect(await openCamera({ getUserMedia }, deps('granted'))).toBe(stream)
    expect(getUserMedia).toHaveBeenCalledWith({ video: { facingMode: { ideal: 'environment' } } })
  })
  it('falls back to any camera when the back camera cannot be used', async () => {
    const getUserMedia = vi.fn().mockRejectedValueOnce(err('OverconstrainedError')).mockResolvedValueOnce(stream)
    expect(await openCamera({ getUserMedia }, deps('granted'))).toBe(stream)
    expect(getUserMedia).toHaveBeenLastCalledWith({ video: true })
  })
  it('first tap: refused while the site is allowed (system dialog, or settings just changed) -> waits, retries once, opens', async () => {
    const d = deps('granted')
    const getUserMedia = vi.fn().mockRejectedValueOnce(err('NotAllowedError')).mockResolvedValueOnce(stream)
    expect(await openCamera({ getUserMedia }, d)).toBe(stream)
    expect(getUserMedia).toHaveBeenCalledTimes(2)
    expect(d.settle).toHaveBeenCalledTimes(1)
  })
  it('refused twice while allowed for the site -> reported as blocked (the phone setting is off)', async () => {
    const getUserMedia = vi.fn().mockRejectedValue(err('NotAllowedError'))
    const e = await openCamera({ getUserMedia }, deps('granted')).catch((x) => x)
    expect(getUserMedia).toHaveBeenCalledTimes(2)
    expect(cameraErrorKey(e)).toBe('qr.err.camera')
  })
  it('blocked for the site -> no retry, blocked message', async () => {
    const getUserMedia = vi.fn().mockRejectedValue(err('NotAllowedError'))
    const e = await openCamera({ getUserMedia }, deps('denied')).catch((x) => x)
    expect(getUserMedia).toHaveBeenCalledTimes(1)
    expect(cameraErrorKey(e)).toBe('qr.err.camera')
  })
  it('the question was closed without an answer -> no retry, "tap Scan again and choose Allow"', async () => {
    const getUserMedia = vi.fn().mockRejectedValue(err('NotAllowedError'))
    const e = await openCamera({ getUserMedia }, deps('prompt')).catch((x) => x)
    expect(getUserMedia).toHaveBeenCalledTimes(1)
    expect(cameraErrorKey(e)).toBe('qr.err.camera_dismissed')
  })
  it('reports a browser without camera support', async () => {
    await expect(openCamera(undefined, deps('unknown'))).rejects.toMatchObject({ name: 'NotSupportedError' })
  })
})

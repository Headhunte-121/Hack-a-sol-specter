import { describe, expect, it, vi } from 'vitest'
import en from '../i18n/en.json'
import { cameraErrorKey, openCamera } from './camera'

const err = (name: string) => Object.assign(new Error(name), { name })

describe('camera errors get their own next step', () => {
  it('maps each browser error to a message that exists', () => {
    expect(cameraErrorKey(err('NotAllowedError'))).toBe('qr.err.camera')
    expect(cameraErrorKey(err('SecurityError'))).toBe('qr.err.camera')
    expect(cameraErrorKey(err('NotFoundError'))).toBe('qr.err.camera_none')
    expect(cameraErrorKey(err('NotReadableError'))).toBe('qr.err.camera_busy')
    expect(cameraErrorKey(err('NotSupportedError'))).toBe('qr.err.camera_unsupported')
    expect(cameraErrorKey(new TypeError('x'))).toBe('qr.err.camera_unsupported')
    expect(cameraErrorKey(err('SomethingNew'))).toBe('qr.err.camera_failed')
    expect(cameraErrorKey(null)).toBe('qr.err.camera_failed')
    for (const k of ['qr.err.camera', 'qr.err.camera_none', 'qr.err.camera_busy', 'qr.err.camera_unsupported', 'qr.err.camera_failed', 'qr.take_photo']) {
      expect((en as Record<string, string>)[k], k).toBeTruthy()
    }
  })
})

describe('openCamera', () => {
  const stream = { id: 's' } as unknown as MediaStream
  it('asks for the back camera first', async () => {
    const getUserMedia = vi.fn(async () => stream)
    expect(await openCamera({ getUserMedia })).toBe(stream)
    expect(getUserMedia).toHaveBeenCalledWith({ video: { facingMode: { ideal: 'environment' } } })
  })
  it('falls back to any camera when the back camera cannot be used', async () => {
    const getUserMedia = vi.fn().mockRejectedValueOnce(err('OverconstrainedError')).mockResolvedValueOnce(stream)
    expect(await openCamera({ getUserMedia })).toBe(stream)
    expect(getUserMedia).toHaveBeenLastCalledWith({ video: true })
  })
  it('does not retry when the camera is blocked, and says so', async () => {
    const getUserMedia = vi.fn().mockRejectedValue(err('NotAllowedError'))
    await expect(openCamera({ getUserMedia })).rejects.toMatchObject({ name: 'NotAllowedError' })
    expect(getUserMedia).toHaveBeenCalledTimes(1)
  })
  it('reports a browser without camera support', async () => {
    await expect(openCamera(undefined)).rejects.toMatchObject({ name: 'NotSupportedError' })
  })
})

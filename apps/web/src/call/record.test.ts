import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { startRecording } from './asr'

// A stand-in microphone: tracks that can be stopped, and a recorder that fires onstop like the browser's.
const track = { stop: vi.fn() }
class FakeRecorder {
  state: 'inactive' | 'recording' = 'inactive'
  mimeType = 'audio/webm'
  ondataavailable: ((e: { data: Blob }) => void) | null = null
  onstop: (() => void) | null = null
  start() { this.state = 'recording' }
  stop() { this.state = 'inactive'; this.ondataavailable?.({ data: new Blob(['x']) }); queueMicrotask(() => this.onstop?.()) }
}

beforeEach(() => {
  vi.useFakeTimers()
  track.stop.mockClear()
  vi.stubGlobal('MediaRecorder', FakeRecorder)
  vi.stubGlobal('navigator', { ...navigator, mediaDevices: { getUserMedia: async () => ({ getTracks: () => [track] }) } })
})
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

describe('recording', () => {
  it('hands the clip on when it stops by itself at the 3-minute limit', async () => {
    const onAutoStop = vi.fn()
    await startRecording(onAutoStop)
    await vi.advanceTimersByTimeAsync(180_000)
    expect(onAutoStop).toHaveBeenCalledTimes(1)
    expect(track.stop).toHaveBeenCalled()
  })
  it('cancel() turns the microphone off and never hands the clip on for upload', async () => {
    const onAutoStop = vi.fn()
    const rec = await startRecording(onAutoStop)
    rec.cancel()
    await vi.advanceTimersByTimeAsync(180_000)
    expect(track.stop).toHaveBeenCalled()
    expect(onAutoStop).not.toHaveBeenCalled()
  })
})

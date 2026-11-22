import type { Segment } from './analyze'

// Client side of the transcription service. Only this module talks to it; everything else works with the transcript text.
export const asrBase = (): string => ((import.meta.env?.VITE_ASR_BASE as string | undefined) || 'https://paternal-ideology-situation.ngrok-free.dev').replace(/\/$/, '')
export const LIMITS = { maxBytes: 5 * 1024 * 1024, maxSeconds: 180 }
const OK_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/wave', 'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/aac', 'audio/x-m4a', 'audio/m4a', 'video/webm']
const OK_EXT = /\.(mp3|wav|m4a|ogg|webm|aac|mp4)$/i

export type ClipError = 'too_big' | 'too_long' | 'bad_type' | 'empty'
export class AsrError extends Error {
  constructor(public code: ClipError | 'silent' | 'failed' | 'timeout' | 'cancelled' | 'mic') {
    super(code)
  }
}

/** validateClip: same limits as the server, so the user gets a friendly message before anything is uploaded. */
export function validateClip(blob: Blob & { name?: string }, durationSec: number | null): ClipError | null {
  if (blob.size === 0) return 'empty'
  if (blob.size > LIMITS.maxBytes) return 'too_big'
  const typeOk = OK_TYPES.includes(blob.type.split(';')[0]) || (!!blob.name && OK_EXT.test(blob.name))
  if (!typeOk) return 'bad_type'
  if (durationSec !== null && durationSec > LIMITS.maxSeconds) return 'too_long'
  return null
}

/** Read the clip length from its metadata (null if the browser cannot tell). */
export function audioDuration(blob: Blob, timeoutMs = 4000): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob)
    const a = new Audio()
    const done = (v: number | null) => { URL.revokeObjectURL(url); resolve(v) }
    const timer = setTimeout(() => done(null), timeoutMs)
    a.onloadedmetadata = () => { clearTimeout(timer); done(Number.isFinite(a.duration) ? a.duration : null) }
    a.onerror = () => { clearTimeout(timer); done(null) }
    a.src = url
  })
}

export async function healthCheck(timeoutMs = 5000): Promise<{ ok: boolean; model?: string }> {
  const base = asrBase()
  if (!base) return { ok: false }
  try {
    const ctl = new AbortController()
    const timer = setTimeout(() => ctl.abort(), timeoutMs)
    const r = await fetch(`${base}/health`, { signal: ctl.signal, cache: 'no-store' })
    clearTimeout(timer)
    if (!r.ok) return { ok: false }
    const j = (await r.json()) as { model?: string }
    return { ok: true, model: j.model }
  } catch {
    return { ok: false }
  }
}

export interface UploadOpts {
  signal?: AbortSignal
  onStatus?: (s: 'waking' | 'uploading' | 'transcribing') => void
  retries?: number
  wakeTimeoutMs?: number
}

/** uploadForTranscript: wake the service if it is asleep (free hosts sleep), upload with a cancel option, retry once. */
export async function uploadForTranscript(blob: Blob, opts: UploadOpts = {}): Promise<{ segments: Segment[]; duration: number }> {
  const base = asrBase()
  if (!base) throw new AsrError('failed')
  const wake = Date.now() + (opts.wakeTimeoutMs ?? 70000)
  opts.onStatus?.('waking')
  while (!(await healthCheck(6000)).ok) {
    if (opts.signal?.aborted) throw new AsrError('cancelled')
    if (Date.now() > wake) throw new AsrError('failed')
    await new Promise((r) => setTimeout(r, 2500))
  }
  let lastErr: unknown
  for (let attempt = 0; attempt <= (opts.retries ?? 1); attempt++) {
    try {
      opts.onStatus?.('uploading')
      const form = new FormData()
      form.append('file', blob, (blob as File).name || 'clip.webm')
      const ctl = new AbortController()
      const timer = setTimeout(() => ctl.abort(), 150000)
      opts.signal?.addEventListener('abort', () => ctl.abort())
      opts.onStatus?.('transcribing')
      const r = await fetch(`${base}/transcribe`, { method: 'POST', body: form, signal: ctl.signal })
      clearTimeout(timer)
      if (r.status === 413) throw new AsrError('too_big')
      if (r.status === 415) throw new AsrError('bad_type')
      if (r.status === 422) {
        const j = (await r.json().catch(() => ({}))) as { detail?: { code?: string } }
        throw new AsrError(j.detail?.code === 'too_long' ? 'too_long' : 'silent')
      }
      if (r.status === 504) throw new AsrError('timeout')
      if (!r.ok) throw new Error(String(r.status))
      const j = (await r.json()) as { segments: Segment[]; duration: number }
      return j
    } catch (e) {
      if (opts.signal?.aborted) throw new AsrError('cancelled')
      if (e instanceof AsrError && e.code !== 'failed') throw e // size/type/silence problems will not fix themselves on retry
      lastErr = e
    }
  }
  void lastErr
  throw new AsrError('failed')
}

/** recordAudio: microphone permission is asked only when recording starts. Stops by itself at 3 minutes.
 *  cancel() turns the microphone off and throws the recording away: nothing is handed on for upload. */
export async function startRecording(onAutoStop?: (b: Blob) => void): Promise<{ stop: () => Promise<Blob>; cancel: () => void }> {
  let stream: MediaStream
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  } catch {
    throw new AsrError('mic')
  }
  const rec = new MediaRecorder(stream)
  const chunks: Blob[] = []
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data)
  const finished = new Promise<Blob>((resolve) => {
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop())
      resolve(new Blob(chunks, { type: rec.mimeType || 'audio/webm' }))
    }
  })
  rec.start()
  let discarded = false
  const auto = setTimeout(() => { if (rec.state !== 'inactive') { rec.stop(); void finished.then((b) => { if (!discarded) onAutoStop?.(b) }) } }, LIMITS.maxSeconds * 1000 - 1000)
  return {
    stop: () => { clearTimeout(auto); if (rec.state !== 'inactive') rec.stop(); return finished },
    cancel: () => {
      discarded = true
      clearTimeout(auto)
      if (rec.state !== 'inactive') rec.stop()
      stream.getTracks().forEach((t) => t.stop())
    },
  }
}

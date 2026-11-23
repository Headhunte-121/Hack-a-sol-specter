import { Capacitor } from '@capacitor/core'
import { SpeechRecognition } from '@capgo/capacitor-speech-recognition'
import { postProcessTranscript } from './normalize'

export type LiveSpeechLang = 'hi-IN' | 'en-IN'

export interface LiveMicCallbacks {
  onTranscript: (committedLines: string[], interim: string) => void
  onError: (code: 'mic' | 'unsupported' | 'failed') => void
  onEnd?: () => void
}

export interface LiveMicSession {
  stop: () => Promise<void>
}

export function isLiveMicSupported(): boolean {
  if (Capacitor.isNativePlatform()) return true
  if (typeof window === 'undefined') return false
  const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition)
}

export async function startLiveMic(lang: LiveSpeechLang, cb: LiveMicCallbacks): Promise<LiveMicSession> {
  const lines: string[] = []
  let active = true

  // 1. Native Android (Capacitor 8 + @capgo/capacitor-speech-recognition v8)
  if (Capacitor.isNativePlatform()) {
    const { available } = await SpeechRecognition.available()
    if (!available) { cb.onError('unsupported'); throw new Error('unsupported') }

    const perm = await SpeechRecognition.requestPermissions()
    if (perm.speechRecognition !== 'granted') { cb.onError('mic'); throw new Error('mic') }

    // Opt into Android's offline on-device recognizer automatically when available for this language
    const onDevice = await SpeechRecognition.isOnDeviceRecognitionAvailable({ language: lang })
      .then((r) => Boolean(r.available))
      .catch(() => false)

    let lastPartial = ''
    let restartTimer: number | null = null

    const startNative = () =>
      SpeechRecognition.start({
        language: lang,
        maxResults: 1,
        partialResults: true,
        popup: false,
        ...(onDevice ? { useOnDeviceRecognition: true } : {}),
      })

    const partialSub = await SpeechRecognition.addListener('partialResults', (ev) => {
      if (!active) return
      const text = postProcessTranscript(ev.matches?.[0] ?? '')
      if (!text) return
      lastPartial = text
      cb.onTranscript([...lines], text)
    })

    const segmentSub = await SpeechRecognition.addListener('segmentResults', (ev) => {
      if (!active) return
      const text = postProcessTranscript(ev.matches?.[0] ?? '')
      if (!text) return
      lines.push(text)
      lastPartial = ''
      cb.onTranscript([...lines], '')
    })

    // Android stops listening after a short pause; commit & restart automatically while active
    const stateSub = await SpeechRecognition.addListener('listeningState', (ev) => {
      if (ev.status === 'stopped' && active) {
        if (lastPartial) {
          lines.push(lastPartial)
          lastPartial = ''
          cb.onTranscript([...lines], '')
        }
        restartTimer = window.setTimeout(() => {
          if (active) void startNative().catch(() => {})
        }, 250)
      }
    })

    await startNative()

    return {
      stop: async () => {
        active = false
        if (restartTimer !== null) window.clearTimeout(restartTimer)
        await SpeechRecognition.stop().catch(() => {})
        await partialSub.remove()
        await segmentSub.remove()
        await stateSub.remove()
        if (lastPartial) {
          lines.push(lastPartial)
          cb.onTranscript([...lines], '')
        }
        cb.onEnd?.()
      },
    }
  }

  // 2. Web Browser (Chrome on Android / Desktop)
  const w = window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }
  const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition
  if (!SR) { cb.onError('unsupported'); throw new Error('unsupported') }

  const rec = new SR()
  rec.lang = lang
  rec.continuous = true
  rec.interimResults = true

  rec.onresult = (e: any) => {
    let interim = ''
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const piece = postProcessTranscript(e.results[i][0]?.transcript ?? '')
      if (!piece) continue
      if (e.results[i].isFinal) lines.push(piece)
      else interim = piece
    }
    cb.onTranscript([...lines], interim)
  }

  rec.onerror = (e: any) => {
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
      active = false
      cb.onError('mic')
    } else if (e.error !== 'no-speech' && e.error !== 'aborted') {
      cb.onError('failed')
    }
  }

  rec.onend = () => {
    if (active) {
      try { rec.start() } catch { active = false; cb.onEnd?.() }
    } else {
      cb.onEnd?.()
    }
  }

  rec.start()
  return {
    stop: async () => {
      active = false
      try { rec.stop() } catch { /* ignore */ }
      cb.onEnd?.()
    },
  }
}

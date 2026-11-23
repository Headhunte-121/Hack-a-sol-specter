import { postProcessTranscript } from './normalize'

export interface LiveMicCallbacks {
  onTranscript: (committedText: string, interimText: string) => void
  onError: (code: 'mic' | 'unsupported' | 'failed') => void
  onEnd?: () => void
}

export interface LiveMicSession {
  stop: () => Promise<void>
}

/**
 * startLiveMic: streams live speech transcription continuously into callbacks.
 * Supports Web Speech API (Chrome / Android browser / WebKit).
 */
export async function startLiveMic(lang: 'hi-IN' | 'en-IN', cb: LiveMicCallbacks): Promise<LiveMicSession> {
  let committed = ''
  let active = true

  const SR =
    (typeof window !== 'undefined' && (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).SpeechRecognition) ||
    (typeof window !== 'undefined' && (window as unknown as { webkitSpeechRecognition?: any }).webkitSpeechRecognition)

  if (!SR) {
    cb.onError('unsupported')
    throw new Error('unsupported')
  }

  const rec = new SR()
  rec.lang = lang
  rec.continuous = true
  rec.interimResults = true

  rec.onresult = (e: any) => {
    let interim = ''
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const piece = postProcessTranscript(e.results[i][0].transcript)
      if (e.results[i].isFinal) {
        committed = `${committed}\n${piece}`.trim()
      } else {
        interim = piece
      }
    }
    cb.onTranscript(committed, interim)
  }

  rec.onerror = (e: any) => {
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
      cb.onError('mic')
    } else if (e.error !== 'no-speech' && e.error !== 'aborted') {
      cb.onError('failed')
    }
  }

  rec.onend = () => {
    if (active) {
      try {
        rec.start()
      } catch {
        cb.onEnd?.()
      }
    } else {
      cb.onEnd?.()
    }
  }

  try {
    rec.start()
  } catch {
    cb.onError('failed')
  }

  return {
    stop: async () => {
      active = false
      try {
        rec.stop()
      } catch {}
      cb.onEnd?.()
    },
  }
}

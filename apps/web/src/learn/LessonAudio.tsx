import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { Headphones } from 'lucide-react'
import { LANGS, useLang } from '../shell/i18n'
import { Banner } from '../shell/ui'
import {
  activeSegment,
  announcementKey,
  asRate,
  chooseSource,
  formatClock,
  initialPlayer,
  parseCaptions,
  playerReducer,
  RATES,
  type AudioSource,
  type Captions,
  type Rate,
  type VoiceLike,
} from './audio'
import { CardIcon } from './cardIcons'
import type { Lesson } from './content'
import { playableUrl } from './offline'

/** The voices this phone has. The list is often empty until the browser has loaded it, so it is read again when it changes. */
function useVoices(): SpeechSynthesisVoice[] {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    const read = () => setVoices(speechSynthesis.getVoices())
    read()
    speechSynthesis.addEventListener?.('voiceschanged', read)
    return () => speechSynthesis.removeEventListener?.('voiceschanged', read)
  }, [])
  return voices
}

function RateButtons({ rate, onRate }: { rate: Rate; onRate: (r: Rate) => void }) {
  const { t } = useLang()
  return (
    <div
      role="group"
      aria-label={t('learn.audio.speed')}
      className="inline-flex items-center gap-1 rounded-xl border border-slate-200/90 bg-[#F4F7FF] p-1"
    >
      <span className="px-2 text-xs font-bold text-slate-500">{t('learn.audio.speed')}</span>
      {RATES.map((r) => (
        <button
          key={r}
          type="button"
          aria-pressed={r === rate}
          onClick={() => onRate(r)}
          className={`min-h-9 min-w-[3.25rem] rounded-lg px-2.5 text-xs font-extrabold transition-all ${
            r === rate
              ? 'bg-[#163264] text-white shadow-xs'
              : 'text-slate-600 hover:bg-white hover:text-[#0F1B3D]'
          }`}
        >
          {r}×
        </button>
      ))}
    </div>
  )
}

/** The text a screen reader hears when the player changes: kept in a polite live region that is not shown. */
function Announcer({ text }: { text: string }) {
  return (
    <p className="sr-only" role="status" aria-live="polite">
      {text}
    </p>
  )
}

// ---------------------------------------------------------------- a recording
function FilePlayer({ source, onLine }: { source: Extract<AudioSource, { kind: 'file' }>; onLine: (i: number) => void }) {
  const { t } = useLang()
  const audio = useRef<HTMLAudioElement>(null)
  const [state, dispatch] = useReducer(playerReducer, initialPlayer)
  const [src, setSrc] = useState<{ src: string; fromCache: boolean } | null>(null)
  const [captions, setCaptions] = useState<Captions | null>(null)
  const [announce, setAnnounce] = useState('')
  const prev = useRef(state)
  const mounted = useRef(true)

  const safeDispatch: typeof dispatch = (action) => {
    if (mounted.current) dispatch(action)
  }

  // Use the downloaded copy when there is one (it plays with no internet), otherwise the normal address.
  useEffect(() => {
    let alive = true
    const made: { url: string | null } = { url: null }
    playableUrl(source.url, typeof caches !== 'undefined' ? caches : undefined, (b) => (made.url = URL.createObjectURL(b))).then((r) => {
      if (alive) setSrc(r)
    })
    return () => {
      alive = false
      if (made.url) URL.revokeObjectURL(made.url)
    }
  }, [source.url])

  useEffect(() => {
    setCaptions(null)
    if (!source.captionsUrl) return
    let alive = true
    fetch(source.captionsUrl)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (alive) setCaptions(parseCaptions(j))
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [source.captionsUrl])

  useEffect(() => {
    onLine(-1)
  }, [onLine])
  useEffect(() => {
    if (audio.current) audio.current.playbackRate = state.rate
  }, [state.rate, src])
  useEffect(() => {
    const key = announcementKey(prev.current, state)
    prev.current = state
    if (key && mounted.current) setAnnounce(t(key, { rate: state.rate }))
  }, [state, t])
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      audio.current?.pause()
    }
  }, [])

  const toggle = () => {
    const el = audio.current
    if (!el) return
    if (el.paused || el.ended) {
      safeDispatch({ type: 'play' })
      el.play().catch(() => safeDispatch({ type: 'error' }))
    } else el.pause()
  }
  const seek = (time: number) => {
    if (audio.current) audio.current.currentTime = time
    safeDispatch({ type: 'seek', time })
  }
  const active = captions ? activeSegment(captions.segments, state.time) : -1
  const playing = state.status === 'playing' || state.status === 'loading'
  const progressPct = state.duration > 0 ? Math.min(100, Math.max(0, (state.time / state.duration) * 100)) : 0

  return (
    <div className="flex flex-col gap-3">
      <audio
        ref={audio}
        src={src?.src}
        preload={src?.fromCache ? 'metadata' : 'none'}
        onLoadedMetadata={(e) => {
          safeDispatch({ type: 'loaded', duration: e.currentTarget.duration })
          e.currentTarget.playbackRate = state.rate
        }}
        onTimeUpdate={(e) => safeDispatch({ type: 'time', time: e.currentTarget.currentTime })}
        onPlay={() => safeDispatch({ type: 'play' })}
        onPause={() => safeDispatch({ type: 'pause' })}
        onEnded={() => safeDispatch({ type: 'ended' })}
        onError={() => safeDispatch({ type: 'error' })}
      />

      {/* Primary Control Row: Play Pill + Inline Speed Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <button
          type="button"
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#163264] px-5 py-2.5 text-[15.5px] font-extrabold text-white shadow-sm shadow-blue-950/15 transition-colors hover:bg-[#1747c4] disabled:opacity-60 sm:flex-none"
          onClick={toggle}
          disabled={!src}
        >
          <CardIcon name={playing ? 'pause' : 'play'} size={20} />
          <span>{playing ? t('learn.audio.pause') : t('learn.audio.play')}</span>
        </button>

        <RateButtons rate={state.rate} onRate={(r) => safeDispatch({ type: 'rate', rate: asRate(r) })} />
      </div>

      {/* Sleek Scrubber Row */}
      <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-[#F8FAFF] px-3 py-1.5">
        <span className="min-w-[2.75rem] font-mono text-xs font-bold text-slate-600 tabular-nums" aria-hidden="true">
          {formatClock(state.time)}
        </span>
        <div className="relative flex h-8 min-w-0 flex-1 items-center">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-[#1747c4] transition-all duration-100" style={{ width: `${progressPct}%` }} />
          </div>
          <input
            type="range"
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-default"
            min={0}
            max={Math.max(1, Math.floor(state.duration))}
            step={1}
            value={Math.min(Math.floor(state.time), Math.max(1, Math.floor(state.duration)))}
            disabled={state.duration <= 0}
            aria-label={t('learn.audio.seek')}
            aria-valuetext={`${formatClock(state.time)} / ${formatClock(state.duration)}`}
            onChange={(e) => seek(Number(e.target.value))}
          />
        </div>
        <span className="min-w-[2.75rem] text-right font-mono text-xs font-bold text-slate-500 tabular-nums" aria-hidden="true">
          {formatClock(state.duration)}
        </span>
      </div>
      {state.status === 'error' && <Banner tone="warn">{t('learn.audio.error')}</Banner>}

      {captions && (
        <section
          aria-label={t('learn.audio.transcript')}
          data-testid="transcript"
          className="rounded-xl border border-slate-200/80 bg-[#F8FAFF] p-3"
        >
          <h3 className="mb-2 text-xs font-extrabold tracking-wider text-[#163264] uppercase">
            {t('learn.audio.transcript')}
          </h3>
          <ol className="flex max-h-56 flex-col gap-1.5 overflow-y-auto pr-1">
            {captions.segments.map((s, i) => (
              <li key={i}>
                <button
                  type="button"
                  aria-current={i === active ? 'true' : undefined}
                  onClick={() => seek(s.start)}
                  className={`w-full rounded-xl border px-3 py-2 text-left text-[15px] leading-relaxed transition-colors ${
                    i === active
                      ? 'border-[#1747c4]/30 bg-[#EFF4FF] font-bold text-[#163264] shadow-2xs'
                      : 'border-transparent bg-white text-slate-700 hover:border-slate-200'
                  }`}
                >
                  {s.text}
                </button>
              </li>
            ))}
          </ol>
        </section>
      )}
      <Announcer text={announce} />
    </div>
  )
}

// ---------------------------------------------------------------- the phone's own voice
function DeviceVoice({ voice, lines, onLine }: { voice: VoiceLike; lines: string[]; onLine: (i: number) => void }) {
  const { t } = useLang()
  const [playing, setPlaying] = useState(false)
  const [rate, setRate] = useState<Rate>(1)
  const [announce, setAnnounce] = useState('')
  const run = useRef(0) // each start gets a number, so late events from a stopped reading are ignored
  const at = useRef(0)

  const stop = (say = true) => {
    run.current++
    speechSynthesis.cancel()
    setPlaying(false)
    onLine(-1)
    if (say) setAnnounce(t('learn.audio.sr.stopped'))
  }
  const start = (from: number, r: Rate) => {
    speechSynthesis.cancel()
    const mine = ++run.current
    setPlaying(true)
    setAnnounce(t('learn.audio.sr.playing'))
    lines.slice(from).forEach((text, k) => {
      const i = from + k
      const u = new SpeechSynthesisUtterance(text)
      u.voice = voice as SpeechSynthesisVoice
      u.lang = voice.lang
      u.rate = r
      u.onstart = () => {
        if (run.current === mine) {
          at.current = i
          onLine(i)
        }
      }
      if (i === lines.length - 1) {
        const finish = () => {
          if (run.current === mine) {
            setPlaying(false)
            onLine(-1)
            setAnnounce(t('learn.audio.sr.ended'))
          }
        }
        u.onend = finish
        u.onerror = finish
      }
      speechSynthesis.speak(u)
    })
  }
  useEffect(
    () => () => {
      run.current++
      speechSynthesis.cancel()
    },
    []
  )

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <button
          type="button"
          className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-[15.5px] font-extrabold text-white shadow-sm transition-colors sm:flex-none ${
            playing
              ? 'bg-[#C62828] shadow-red-950/15 hover:bg-[#B71C1C]'
              : 'bg-[#163264] shadow-blue-950/15 hover:bg-[#1747c4]'
          }`}
          onClick={() => (playing ? stop() : start(0, rate))}
        >
          <CardIcon name={playing ? 'pause' : 'speaker'} size={20} />
          <span>{playing ? t('learn.stop_audio') : t('learn.read_aloud')}</span>
        </button>

        <RateButtons
          rate={rate}
          onRate={(r) => {
            setRate(r)
            if (playing) start(at.current, r)
          }}
        />
      </div>

      <p className="text-[13px] font-medium text-slate-500">{t('learn.audio.device')}</p>
      <Announcer text={announce} />
    </div>
  )
}

/** LessonAudio: listen to a lesson. A recording is used when the lesson has one for the language; otherwise the phone's own voice, but only
 *  when the phone has a voice for that language. With neither, there is no play button and the page says why: the text is always there. */
export function LessonAudio({ lesson, lines, onLine }: { lesson: Lesson; lines: string[]; onLine: (i: number) => void }) {
  const { t, lang } = useLang()
  const voices = useVoices()
  const source = useMemo(() => chooseSource(lesson, lang, voices), [lesson, lang, voices])
  const language = LANGS.find((l) => l.code === lang)?.label ?? lang

  return (
    <section
      className="flex flex-col gap-3 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-md shadow-blue-950/6"
      aria-label={t('learn.audio.title')}
      data-testid="lesson-audio"
    >
      <div className="flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-xl bg-[#EFF4FF] text-[#1747c4] ring-1 ring-blue-200/80">
          <Headphones className="size-4" strokeWidth={2.3} />
        </span>
        <h2 className="text-[16px] font-extrabold text-[#163264]">{t('learn.audio.title')}</h2>
      </div>

      {source.kind === 'file' && <FilePlayer key={`${lesson.id}:${lang}`} source={source} onLine={onLine} />}
      {source.kind === 'voice' && <DeviceVoice key={`${lesson.id}:${lang}`} voice={source.voice} lines={lines} onLine={onLine} />}
      {source.kind === 'none' && (
        <p className="rounded-xl bg-[#F8FAFF] p-3 text-[14.5px] leading-relaxed text-slate-600" data-testid="audio-unavailable">
          {t('learn.audio.unavailable', { language })}
        </p>
      )}
    </section>
  )
}
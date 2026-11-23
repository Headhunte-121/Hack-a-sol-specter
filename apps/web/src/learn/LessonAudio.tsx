import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { LANGS, useLang } from '../shell/i18n'
import { Banner } from '../shell/ui'
import { activeSegment, announcementKey, asRate, chooseSource, formatClock, initialPlayer, parseCaptions, playerReducer, RATES, type AudioSource, type Captions, type Rate, type VoiceLike } from './audio'
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
    <div role="group" aria-label={t('learn.audio.speed')} className="flex items-center gap-2">
      <span className="text-[1rem] font-bold text-muted">{t('learn.audio.speed')}</span>
      {RATES.map((r) => (
        <button key={r} type="button" aria-pressed={r === rate} onClick={() => onRate(r)} className={`btn !min-h-11 !min-w-[4rem] ${r === rate ? 'btn-primary' : 'btn-secondary'}`}>
          {r}×
        </button>
      ))}
    </div>
  )
}

/** The text a screen reader hears when the player changes: kept in a polite live region that is not shown. */
function Announcer({ text }: { text: string }) {
  return <p className="sr-only" role="status" aria-live="polite">{text}</p>
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

  // Use the downloaded copy when there is one (it plays with no internet), otherwise the normal address.
  useEffect(() => {
    let alive = true
    const made: { url: string | null } = { url: null }
    playableUrl(source.url, typeof caches !== 'undefined' ? caches : undefined, (b) => (made.url = URL.createObjectURL(b))).then((r) => { if (alive) setSrc(r) })
    return () => { alive = false; if (made.url) URL.revokeObjectURL(made.url) }
  }, [source.url])

  useEffect(() => {
    setCaptions(null)
    if (!source.captionsUrl) return
    let alive = true
    fetch(source.captionsUrl).then((r) => (r.ok ? r.json() : null)).then((j) => { if (alive) setCaptions(parseCaptions(j)) }).catch(() => {})
    return () => { alive = false }
  }, [source.captionsUrl])

  useEffect(() => { onLine(-1) }, [onLine])
  useEffect(() => { if (audio.current) audio.current.playbackRate = state.rate }, [state.rate, src])
  useEffect(() => {
    const key = announcementKey(prev.current, state)
    prev.current = state
    if (key) setAnnounce(t(key, { rate: state.rate }))
  }, [state, t])
  useEffect(() => () => audio.current?.pause(), [])

  const toggle = () => {
    const el = audio.current
    if (!el) return
    if (el.paused || el.ended) {
      dispatch({ type: 'play' })
      el.play().catch(() => dispatch({ type: 'error' }))
    } else el.pause()
  }
  const seek = (time: number) => {
    if (audio.current) audio.current.currentTime = time
    dispatch({ type: 'seek', time })
  }
  const active = captions ? activeSegment(captions.segments, state.time) : -1
  const playing = state.status === 'playing' || state.status === 'loading'

  return (
    <div className="flex flex-col gap-3">
      <audio
        ref={audio}
        src={src?.src}
        preload={src?.fromCache ? 'metadata' : 'none'}
        onLoadedMetadata={(e) => { dispatch({ type: 'loaded', duration: e.currentTarget.duration }); e.currentTarget.playbackRate = state.rate }}
        onTimeUpdate={(e) => dispatch({ type: 'time', time: e.currentTarget.currentTime })}
        onPlay={() => dispatch({ type: 'play' })}
        onPause={() => dispatch({ type: 'pause' })}
        onEnded={() => dispatch({ type: 'ended' })}
        onError={() => dispatch({ type: 'error' })}
      />
      <button type="button" className="btn btn-primary !min-h-[3.75rem] !text-[1.15rem]" onClick={toggle} disabled={!src}>
        <CardIcon name={playing ? 'pause' : 'play'} size={26} />
        {playing ? t('learn.audio.pause') : t('learn.audio.play')}
      </button>
      <div className="flex items-center gap-3">
        <span className="min-w-[3rem] text-[1rem] tabular-nums" aria-hidden="true">{formatClock(state.time)}</span>
        <input
          type="range"
          className="h-11 min-w-0 flex-1 accent-[#1b3b73]"
          min={0}
          max={Math.max(1, Math.floor(state.duration))}
          step={1}
          value={Math.min(Math.floor(state.time), Math.max(1, Math.floor(state.duration)))}
          disabled={state.duration <= 0}
          aria-label={t('learn.audio.seek')}
          aria-valuetext={`${formatClock(state.time)} / ${formatClock(state.duration)}`}
          onChange={(e) => seek(Number(e.target.value))}
        />
        <span className="min-w-[3rem] text-right text-[1rem] tabular-nums" aria-hidden="true">{formatClock(state.duration)}</span>
      </div>
      <RateButtons rate={state.rate} onRate={(r) => dispatch({ type: 'rate', rate: asRate(r) })} />
      {state.status === 'error' && <Banner tone="warn">{t('learn.audio.error')}</Banner>}
      {captions && (
        <section aria-label={t('learn.audio.transcript')} data-testid="transcript">
          <h3 className="mb-1 text-[1.05rem] font-bold text-brand">{t('learn.audio.transcript')}</h3>
          <ol className="flex flex-col gap-1.5">
            {captions.segments.map((s, i) => (
              <li key={i}>
                <button
                  type="button"
                  aria-current={i === active ? 'true' : undefined}
                  onClick={() => seek(s.start)}
                  className={`w-full rounded-xl px-3 py-2 text-left text-[1.15rem] leading-[1.6] ${i === active ? 'bg-warn-bg font-bold text-warn' : 'bg-white'}`}
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
      u.onstart = () => { if (run.current === mine) { at.current = i; onLine(i) } }
      if (i === lines.length - 1) {
        const finish = () => { if (run.current === mine) { setPlaying(false); onLine(-1); setAnnounce(t('learn.audio.sr.ended')) } }
        u.onend = finish
        u.onerror = finish
      }
      speechSynthesis.speak(u)
    })
  }
  useEffect(() => () => { run.current++; speechSynthesis.cancel() }, [])

  return (
    <div className="flex flex-col gap-3">
      <button type="button" className="btn btn-primary !min-h-[3.75rem] !text-[1.15rem]" onClick={() => (playing ? stop() : start(0, rate))}>
        <CardIcon name={playing ? 'pause' : 'speaker'} size={26} />
        {playing ? t('learn.stop_audio') : t('learn.read_aloud')}
      </button>
      <RateButtons rate={rate} onRate={(r) => { setRate(r); if (playing) start(at.current, r) }} />
      <p className="text-[1rem] leading-snug text-muted">{t('learn.audio.device')}</p>
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
    <section className="card flex flex-col gap-3" aria-label={t('learn.audio.title')} data-testid="lesson-audio">
      <h2 className="text-[1.15rem] font-bold text-brand">{t('learn.audio.title')}</h2>
      {source.kind === 'file' && <FilePlayer key={`${lesson.id}:${lang}`} source={source} onLine={onLine} />}
      {source.kind === 'voice' && <DeviceVoice key={`${lesson.id}:${lang}`} voice={source.voice} lines={lines} onLine={onLine} />}
      {source.kind === 'none' && <p className="text-[1.05rem] leading-[1.6]" data-testid="audio-unavailable">{t('learn.audio.unavailable', { language })}</p>}
    </section>
  )
}

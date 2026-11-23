import type { Lang } from '../shell/i18n'
import { pick, type Lesson } from './content'

// State logic of the lesson audio player, kept free of the page so it can be tested: which source to use (a recording, the phone's
// own voice, or nothing), the player's state, which caption line is current, and what to announce to a screen reader.

export const RATES = [0.75, 1, 1.25] as const
export type Rate = (typeof RATES)[number]
export const DEFAULT_RATE: Rate = 1

/** Where a recording for a lesson is served from. */
export const audioUrl = (path: string): string => (path.startsWith('/') ? path : `/${path}`)

// ---------------- captions
export interface Segment {
  start: number
  end: number
  text: string
}
export interface Captions {
  lang?: string
  duration?: number
  segments: Segment[]
}

/** parseCaptions: the timed text written by scripts/make_captions.py. Returns null when it is not usable, so the page falls back to the
 *  lesson text instead of showing something broken. Segments are sorted by start time. */
export function parseCaptions(raw: unknown): Captions | null {
  const list = Array.isArray(raw) ? raw : raw && typeof raw === 'object' ? (raw as { segments?: unknown }).segments : null
  if (!Array.isArray(list) || list.length === 0) return null
  const segments: Segment[] = []
  for (const s of list) {
    const o = s as Partial<Segment> | null
    if (!o || typeof o.text !== 'string' || typeof o.start !== 'number' || typeof o.end !== 'number') return null
    if (!Number.isFinite(o.start) || !Number.isFinite(o.end) || o.start < 0 || o.end < o.start) return null
    if (o.text.trim()) segments.push({ start: o.start, end: o.end, text: o.text.trim() })
  }
  if (segments.length === 0) return null
  segments.sort((a, b) => a.start - b.start)
  const meta = Array.isArray(raw) ? {} : (raw as { lang?: unknown; duration?: unknown })
  return {
    lang: typeof meta.lang === 'string' ? meta.lang : undefined,
    duration: typeof meta.duration === 'number' && Number.isFinite(meta.duration) ? meta.duration : undefined,
    segments,
  }
}

/** activeSegment: the line being spoken at time t. A line stays current through a short pause until the next one starts; before the
 *  first line, and once the audio has passed the end of the last line, nothing is current (-1). */
export function activeSegment(segments: Segment[], t: number): number {
  if (segments.length === 0 || t < segments[0].start) return -1
  let found = -1
  for (let i = 0; i < segments.length; i++) {
    if (segments[i].start <= t) found = i
    else break
  }
  return found >= 0 && found === segments.length - 1 && t > segments[found].end ? -1 : found
}

/** formatClock: seconds as m:ss. */
export function formatClock(sec: number): string {
  const s = Math.max(0, Math.floor(Number.isFinite(sec) ? sec : 0))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// ---------------- the lines of a lesson (what the recording says, and the text read by the phone's voice)
/** lessonLines: the title, the example, each warning sign and the one thing to do, in the order a recording reads them. */
export function lessonLines(lesson: Lesson, lang: Lang): string[] {
  return [pick(lesson.title, lang), pick(lesson.example, lang), ...lesson.signs.map((s) => pick(s, lang)), pick(lesson.todo, lang)]
}

// ---------------- choosing what to play
/** The part of a speech voice we need (a SpeechSynthesisVoice has more). */
export interface VoiceLike {
  lang: string
  name?: string
}
/** Language tags a voice must start with for each app language. Chhattisgarhi (hne) only matches a voice that really says so: a Hindi voice
 *  is not offered for Chhattisgarhi text. */
const VOICE_PREFIX: Record<Lang, string[]> = { en: ['en-in', 'en'], hi: ['hi'], cg: ['hne'] }

/** voiceFor: a voice for the language, or null when the phone has none (the voice list is often empty until it has loaded). */
export function voiceFor<V extends VoiceLike>(voices: V[], lang: Lang): V | null {
  const tags = voices.map((v) => ({ v, tag: v.lang.toLowerCase().replace('_', '-') }))
  for (const prefix of VOICE_PREFIX[lang]) {
    const hit = tags.find(({ tag }) => tag === prefix || tag.startsWith(`${prefix}-`))
    if (hit) return hit.v
  }
  return null
}

export type AudioSource = { kind: 'file'; url: string; captionsUrl: string | null } | { kind: 'voice'; voice: VoiceLike } | { kind: 'none' }

/** chooseSource: a recording for the language when the lesson declares one; otherwise the phone's own voice, but only when it has a voice
 *  for that language; otherwise none (the page then hides the play button and says why). */
export function chooseSource(lesson: Lesson, lang: Lang, voices: VoiceLike[]): AudioSource {
  const file = lesson.audio?.[lang]
  if (file) {
    const captions = lesson.captions?.[lang]
    return { kind: 'file', url: audioUrl(file), captionsUrl: captions ? audioUrl(captions) : null }
  }
  const voice = voiceFor(voices, lang)
  return voice ? { kind: 'voice', voice } : { kind: 'none' }
}

// ---------------- player state
export type PlayerStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error'
export interface PlayerState {
  status: PlayerStatus
  time: number
  duration: number
  rate: Rate
}
export const initialPlayer: PlayerState = { status: 'idle', time: 0, duration: 0, rate: DEFAULT_RATE }

export type PlayerAction =
  | { type: 'play' }
  | { type: 'pause' }
  | { type: 'toggle' }
  | { type: 'loaded'; duration: number }
  | { type: 'time'; time: number }
  | { type: 'seek'; time: number }
  | { type: 'rate'; rate: number }
  | { type: 'ended' }
  | { type: 'error' }
  | { type: 'reset' }

const clampTime = (t: number, duration: number) => Math.min(Math.max(Number.isFinite(t) ? t : 0, 0), duration > 0 ? duration : Math.max(t, 0))
export const asRate = (r: number): Rate => (RATES as readonly number[]).includes(r) ? (r as Rate) : DEFAULT_RATE

export function playerReducer(s: PlayerState, a: PlayerAction): PlayerState {
  switch (a.type) {
    case 'play':
      if (s.status === 'error') return s
      return { ...s, status: s.duration > 0 ? 'playing' : 'loading', time: s.status === 'ended' ? 0 : s.time }
    case 'pause':
      return s.status === 'playing' || s.status === 'loading' ? { ...s, status: 'paused' } : s
    case 'toggle':
      return playerReducer(s, { type: s.status === 'playing' || s.status === 'loading' ? 'pause' : 'play' })
    case 'loaded':
      return { ...s, duration: Math.max(0, a.duration), status: s.status === 'loading' ? 'playing' : s.status }
    case 'time':
      return s.status === 'error' ? s : { ...s, time: clampTime(a.time, s.duration) }
    case 'seek':
      return { ...s, time: clampTime(a.time, s.duration), status: s.status === 'ended' ? 'paused' : s.status }
    case 'rate':
      return { ...s, rate: asRate(a.rate) }
    case 'ended':
      return { ...s, status: 'ended', time: s.duration }
    case 'error':
      return { ...s, status: 'error' }
    case 'reset':
      return initialPlayer
  }
}

/** The key of the language string a screen reader should hear when the state changes, or null for a change that is silent (the clock
 *  moving is never announced). */
export function announcementKey(prev: PlayerState, next: PlayerState): string | null {
  if (next.rate !== prev.rate) return 'learn.audio.sr.rate'
  if (next.status === prev.status) return null
  switch (next.status) {
    case 'playing':
      return 'learn.audio.sr.playing'
    case 'paused':
      return 'learn.audio.sr.paused'
    case 'loading':
      return 'learn.audio.sr.loading'
    case 'ended':
      return 'learn.audio.sr.ended'
    case 'error':
      return 'learn.audio.error'
    default:
      return null
  }
}

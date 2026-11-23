import { describe, expect, it } from 'vitest'
import { activeSegment, announcementKey, asRate, audioUrl, chooseSource, formatClock, initialPlayer, lessonLines, parseCaptions, playerReducer, RATES, voiceFor, type PlayerState } from './audio'
import type { Lesson } from './content'

const t = (s: string) => ({ en: `${s} en`, hi: `${s} hi`, cg: `${s} cg` })
const lesson: Lesson = { id: 'upi_pin', scripts: [], title: t('title'), example: t('example'), signs: [t('s1'), t('s2')], todo: t('todo') }
const withAudio: Lesson = { ...lesson, audio: { hi: 'audio/upi_pin.hi.m4a' }, captions: { hi: 'audio/upi_pin.hi.json' } }
const run = (actions: Parameters<typeof playerReducer>[1][], from: PlayerState = initialPlayer) => actions.reduce(playerReducer, from)

describe('choosing what to play', () => {
  it('uses the recording when the lesson declares one for the language, with its captions', () => {
    expect(chooseSource(withAudio, 'hi', [])).toEqual({ kind: 'file', url: '/audio/upi_pin.hi.m4a', captionsUrl: '/audio/upi_pin.hi.json' })
  })
  it('a recording without captions still plays', () => {
    expect(chooseSource({ ...withAudio, captions: undefined }, 'hi', [])).toEqual({ kind: 'file', url: '/audio/upi_pin.hi.m4a', captionsUrl: null })
  })
  it('with no recording it uses the phone voice only when the phone has one for that language', () => {
    const hindi = { lang: 'hi-IN', name: 'Hindi voice' }
    expect(chooseSource(lesson, 'hi', [{ lang: 'en-US' }, hindi])).toEqual({ kind: 'voice', voice: hindi })
    expect(chooseSource(lesson, 'hi', [{ lang: 'en-US' }])).toEqual({ kind: 'none' })
    expect(chooseSource(lesson, 'hi', [])).toEqual({ kind: 'none' }) // the voice list is empty until it has loaded
  })
  it('a recording in another language is not used', () => {
    expect(chooseSource(withAudio, 'cg', [])).toEqual({ kind: 'none' })
    expect(chooseSource(withAudio, 'en', [{ lang: 'en-IN' }])).toEqual({ kind: 'voice', voice: { lang: 'en-IN' } })
  })
  it('Chhattisgarhi never borrows a Hindi voice, only a voice that says it is Chhattisgarhi', () => {
    expect(chooseSource(lesson, 'cg', [{ lang: 'hi-IN' }])).toEqual({ kind: 'none' })
    expect(chooseSource(lesson, 'cg', [{ lang: 'hne-IN' }])).toEqual({ kind: 'voice', voice: { lang: 'hne-IN' } })
  })
  it('prefers Indian English and accepts underscores and other English voices', () => {
    expect(voiceFor([{ lang: 'en-US' }, { lang: 'en-IN' }], 'en')).toEqual({ lang: 'en-IN' })
    expect(voiceFor([{ lang: 'en_GB' }], 'en')).toEqual({ lang: 'en_GB' })
    expect(voiceFor([{ lang: 'hin-IN' }], 'hi')).toBeNull() // a different language tag is not Hindi
  })
  it('builds the address under /audio/', () => {
    expect(audioUrl('audio/x.m4a')).toBe('/audio/x.m4a')
    expect(audioUrl('/audio/x.m4a')).toBe('/audio/x.m4a')
  })
  it('lists the title, example, each sign and the todo in the language', () => {
    expect(lessonLines(lesson, 'hi')).toEqual(['title hi', 'example hi', 's1 hi', 's2 hi', 'todo hi'])
  })
})

describe('captions', () => {
  const good = { lang: 'hi', duration: 12.4, segments: [{ start: 4, end: 8, text: ' second ' }, { start: 0, end: 3.5, text: 'first' }] }
  it('parses and sorts the segments', () => {
    const c = parseCaptions(good)!
    expect(c.segments.map((s) => s.text)).toEqual(['first', 'second'])
    expect(c.duration).toBe(12.4)
  })
  it('accepts a plain list of segments', () => {
    expect(parseCaptions([{ start: 0, end: 1, text: 'a' }])!.segments.length).toBe(1)
  })
  it('refuses anything not usable, so the page falls back to the lesson text', () => {
    expect(parseCaptions(null)).toBeNull()
    expect(parseCaptions({})).toBeNull()
    expect(parseCaptions({ segments: [] })).toBeNull()
    expect(parseCaptions({ segments: [{ start: 'a', end: 1, text: 'x' }] })).toBeNull()
    expect(parseCaptions({ segments: [{ start: 5, end: 1, text: 'x' }] })).toBeNull()
    expect(parseCaptions({ segments: [{ start: -1, end: 1, text: 'x' }] })).toBeNull()
    expect(parseCaptions({ segments: [{ start: 0, end: 1, text: '   ' }] })).toBeNull()
  })
  const segs = parseCaptions(good)!.segments // first 0-3.5, second 4-8
  it('highlights the line being spoken, and keeps it through a short pause', () => {
    expect(activeSegment(segs, 0)).toBe(0)
    expect(activeSegment(segs, 3.7)).toBe(0) // a pause: still the first line
    expect(activeSegment(segs, 4)).toBe(1)
    expect(activeSegment(segs, 7.9)).toBe(1)
  })
  it('highlights nothing before the first line or after the last one has finished', () => {
    expect(activeSegment([{ start: 1, end: 2, text: 'a' }], 0.5)).toBe(-1)
    expect(activeSegment(segs, 8.5)).toBe(-1)
    expect(activeSegment([], 3)).toBe(-1)
  })
  it('formats the clock as m:ss', () => {
    expect(formatClock(0)).toBe('0:00')
    expect(formatClock(65.9)).toBe('1:05')
    expect(formatClock(-4)).toBe('0:00')
    expect(formatClock(Number.NaN)).toBe('0:00')
  })
})

describe('player state', () => {
  it('goes from idle to loading to playing once the length is known', () => {
    const s1 = run([{ type: 'play' }])
    expect(s1.status).toBe('loading')
    expect(run([{ type: 'loaded', duration: 61 }], s1).status).toBe('playing')
    expect(run([{ type: 'loaded', duration: 61 }, { type: 'play' }]).status).toBe('playing')
  })
  it('pauses and resumes', () => {
    const playing = run([{ type: 'loaded', duration: 60 }, { type: 'play' }])
    const paused = run([{ type: 'pause' }], playing)
    expect(paused.status).toBe('paused')
    expect(run([{ type: 'toggle' }], paused).status).toBe('playing')
    expect(run([{ type: 'toggle' }], playing).status).toBe('paused')
    expect(run([{ type: 'pause' }]).status).toBe('idle') // nothing to pause
  })
  it('keeps the time inside the recording, also when seeking', () => {
    const s = run([{ type: 'loaded', duration: 60 }, { type: 'time', time: 12.5 }])
    expect(s.time).toBe(12.5)
    expect(run([{ type: 'seek', time: 500 }], s).time).toBe(60)
    expect(run([{ type: 'seek', time: -5 }], s).time).toBe(0)
  })
  it('offers 0.75x, 1x and 1.25x and ignores any other speed', () => {
    expect([...RATES]).toEqual([0.75, 1, 1.25])
    expect(run([{ type: 'rate', rate: 1.25 }]).rate).toBe(1.25)
    expect(run([{ type: 'rate', rate: 0.75 }]).rate).toBe(0.75)
    expect(asRate(3)).toBe(1)
    expect(run([{ type: 'rate', rate: 3 }]).rate).toBe(1)
  })
  it('at the end it shows finished, and play starts again from the beginning', () => {
    const ended = run([{ type: 'loaded', duration: 60 }, { type: 'play' }, { type: 'ended' }])
    expect(ended.status).toBe('ended')
    expect(ended.time).toBe(60)
    const again = run([{ type: 'play' }], ended)
    expect(again.status).toBe('playing')
    expect(again.time).toBe(0)
    expect(run([{ type: 'seek', time: 10 }], ended).status).toBe('paused')
  })
  it('an error stops it and play does not pretend to work', () => {
    const e = run([{ type: 'play' }, { type: 'error' }])
    expect(e.status).toBe('error')
    expect(run([{ type: 'play' }], e).status).toBe('error')
    expect(run([{ type: 'reset' }], e)).toEqual(initialPlayer)
  })
})

describe('what a screen reader is told', () => {
  const playing = run([{ type: 'loaded', duration: 60 }, { type: 'play' }])
  it('announces playing, paused, loading, finished and errors', () => {
    expect(announcementKey(initialPlayer, run([{ type: 'play' }]))).toBe('learn.audio.sr.loading')
    expect(announcementKey(run([{ type: 'play' }]), playing)).toBe('learn.audio.sr.playing')
    expect(announcementKey(playing, run([{ type: 'pause' }], playing))).toBe('learn.audio.sr.paused')
    expect(announcementKey(playing, run([{ type: 'ended' }], playing))).toBe('learn.audio.sr.ended')
    expect(announcementKey(playing, run([{ type: 'error' }], playing))).toBe('learn.audio.error')
  })
  it('announces a speed change but never the clock moving', () => {
    expect(announcementKey(playing, run([{ type: 'rate', rate: 1.25 }], playing))).toBe('learn.audio.sr.rate')
    expect(announcementKey(playing, run([{ type: 'time', time: 5 }], playing))).toBeNull()
    expect(announcementKey(playing, run([{ type: 'seek', time: 9 }], playing))).toBeNull()
  })
})

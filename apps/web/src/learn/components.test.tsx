import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LangProvider, translate } from '../shell/i18n'
import { kvSet } from '../shell/storage'
import type { Lesson, LessonCard } from './content'
import { LessonAudio } from './LessonAudio'
import { LessonCards } from './LessonCards'
import { OfflineDownload } from './OfflineDownload'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
const hi = (k: string, v?: Record<string, string | number>) => translate('hi', k, v) // the default language of the test page

const tri = (s: string) => ({ en: `${s} en`, hi: `${s} hi`, cg: `${s} cg` })
const cards: LessonCard[] = [1, 2, 3, 4, 5, 6].map((n) => ({ id: `c${n}`, icon: n % 2 ? 'shield' : 'key', title: tri(`T${n}`), body: tri(`B${n}`) }))
const lesson = (extra: Partial<Lesson> = {}): Lesson => ({ id: 'l1', scripts: [], minutes: 3, title: tri('title'), example: tri('ex'), signs: [tri('s')], todo: tri('todo'), ...extra })

let host: HTMLDivElement
let root: Root
const mount = (el: React.ReactElement) => act(() => { root = createRoot(host); root.render(<LangProvider>{el}</LangProvider>) })
const q = (sel: string) => host.querySelector(sel) as HTMLElement
const qa = (sel: string) => [...host.querySelectorAll(sel)] as HTMLElement[]
const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 0)) })

beforeEach(() => {
  kvSet('lang', 'hi')
  host = document.createElement('div')
  document.body.appendChild(host)
  Object.defineProperty(window, 'matchMedia', { value: (m: string) => ({ matches: m.includes('reduce'), addEventListener() {}, removeEventListener() {} }), configurable: true })
})
afterEach(() => {
  act(() => root?.unmount())
  host.remove()
  vi.unstubAllGlobals()
})

describe('LessonCards', () => {
  it('shows one slide per card with "n of N", a dot per card and large readable text', async () => {
    await mount(<LessonCards cards={cards} />)
    expect(qa('article').length).toBe(6)
    expect(q('[data-testid="card-position"]').textContent).toBe(hi('learn.cards.position', { n: 1, total: 6 }))
    expect(qa('[aria-label^="' + hi('learn.cards.goto', { n: 1 }).slice(0, 4) + '"]').length).toBeGreaterThan(0)
    expect(qa('button[aria-current]').length).toBe(1)
    expect(host.textContent).toContain('T1 hi')
  })
  it('the arrow keys on the row change the card and the label follows', async () => {
    await mount(<LessonCards cards={cards} />)
    const row = q('[tabindex="0"]')
    await act(() => { row.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })) })
    expect(q('[data-testid="card-position"]').textContent).toBe(hi('learn.cards.position', { n: 2, total: 6 }))
    await act(() => { row.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true })) })
    expect(q('[data-testid="card-position"]').textContent).toBe(hi('learn.cards.position', { n: 6, total: 6 }))
    await act(() => { row.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })) })
    expect(q('[data-testid="card-position"]').textContent).toBe(hi('learn.cards.position', { n: 6, total: 6 })) // stays on the last card
    await act(() => { row.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true })) })
    expect(q('[data-testid="card-position"]').textContent).toBe(hi('learn.cards.position', { n: 1, total: 6 }))
  })
  it('the buttons and the dots move between cards, and the end buttons are off', async () => {
    await mount(<LessonCards cards={cards} />)
    const prev = q(`button[aria-label="${hi('learn.cards.prev')}"]`) as HTMLButtonElement
    const next = q(`button[aria-label="${hi('learn.cards.next')}"]`) as HTMLButtonElement
    expect(prev.disabled).toBe(true)
    await act(() => next.click())
    expect(q('[data-testid="card-position"]').textContent).toBe(hi('learn.cards.position', { n: 2, total: 6 }))
    expect(prev.disabled).toBe(false)
    await act(() => (q(`button[aria-label="${hi('learn.cards.goto', { n: 6 })}"]`) as HTMLButtonElement).click())
    expect(q('[data-testid="card-position"]').textContent).toBe(hi('learn.cards.position', { n: 6, total: 6 }))
    expect(next.disabled).toBe(true)
  })
  it('the touch targets for the dots are at least 44 pixels (2.75rem classes)', async () => {
    await mount(<LessonCards cards={cards} />)
    for (const b of qa('button[aria-label^="' + hi('learn.cards.goto', { n: 1 }).slice(0, 4) + '"]')) expect(b.className).toMatch(/h-11 w-11/)
  })
  it('renders nothing for a lesson without cards (a pack from before schema v2)', async () => {
    await mount(<LessonCards cards={[]} />)
    expect(host.innerHTML).toBe('')
  })
})

describe('LessonAudio', () => {
  const stubVoices = (voices: { lang: string; name: string }[]) =>
    vi.stubGlobal('speechSynthesis', { getVoices: () => voices, addEventListener() {}, removeEventListener() {}, cancel() {}, speak() {} })

  it('with no recording and no voice for the language there is no play button, and it says why', async () => {
    stubVoices([{ lang: 'en-US', name: 'English' }])
    await mount(<LessonAudio lesson={lesson()} lines={['a']} onLine={() => {}} />)
    expect(qa('button').length).toBe(0)
    expect(q('[data-testid="audio-unavailable"]').textContent).toContain(hi('learn.audio.unavailable', { language: 'हिन्दी' }).slice(0, 12))
  })
  it('with no recording but a Hindi voice on the phone, it offers to read aloud', async () => {
    stubVoices([{ lang: 'hi-IN', name: 'Hindi' }])
    await mount(<LessonAudio lesson={lesson()} lines={['a', 'b']} onLine={() => {}} />)
    expect(qa('button').some((b) => b.textContent?.includes(hi('learn.read_aloud')))).toBe(true)
    expect(qa('[aria-pressed]').length).toBe(3) // 0.75x, 1x, 1.25x
    expect(q('[aria-pressed="true"]').textContent).toBe('1×')
  })
  it('with a recording it shows the player: play, seek, three speeds and a live region for screen readers', async () => {
    stubVoices([])
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ segments: [{ start: 0, end: 2, text: 'first line' }, { start: 2, end: 4, text: 'second line' }] }))))
    await mount(<LessonAudio lesson={lesson({ audio: { hi: 'audio/l1.hi.m4a' }, captions: { hi: 'audio/l1.hi.json' } })} lines={['a']} onLine={() => {}} />)
    await flush()
    expect(q('audio')).not.toBeNull()
    expect(q('input[type="range"]').getAttribute('aria-label')).toBe(hi('learn.audio.seek'))
    expect(qa('[aria-pressed]').map((b) => b.textContent)).toEqual(['0.75×', '1×', '1.25×'])
    expect(q('[role="status"]')).not.toBeNull()
    // the transcript is always on the page, with the lines from the captions
    expect(q('[data-testid="transcript"]').textContent).toContain('first line')
    expect(q('[data-testid="transcript"]').textContent).toContain('second line')
  })
  it('choosing a speed marks it pressed and announces it', async () => {
    stubVoices([])
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}')))
    await mount(<LessonAudio lesson={lesson({ audio: { hi: 'audio/l1.hi.m4a' } })} lines={['a']} onLine={() => {}} />)
    await flush()
    await act(() => (qa('[aria-pressed]')[2] as HTMLButtonElement).click())
    expect(q('[aria-pressed="true"]').textContent).toBe('1.25×')
    expect(q('[role="status"]').textContent).toBe(hi('learn.audio.sr.rate', { rate: 1.25 }))
  })
  it('pressing play on a recording starts it, and a failure to start shows the message instead of a broken player', async () => {
    stubVoices([])
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}')))
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.reject(new Error('no source')))
    await mount(<LessonAudio lesson={lesson({ audio: { hi: 'audio/l1.hi.m4a' } })} lines={['a']} onLine={() => {}} />)
    await flush()
    const button = qa('button').find((b) => b.textContent?.includes(hi('learn.audio.play')))!
    await act(async () => { button.click(); await Promise.resolve() })
    await flush()
    expect(play).toHaveBeenCalled()
    expect(host.textContent).toContain(hi('learn.audio.error'))
    play.mockRestore()
  })
})

describe('OfflineDownload', () => {
  it('still offers the video narration when no lesson has a recording of its own', async () => {
    vi.stubGlobal('caches', { open: async () => ({ match: async () => undefined, put: async () => {}, delete: async () => true, keys: async () => [] }), delete: async () => true })
    await mount(<OfflineDownload lessons={[lesson()]} />)
    await flush()
    expect(host.innerHTML).not.toBe('')
    expect(host.textContent).toContain(hi('learn.offline.have', { n: 0, total: 1 })) // one file: the lesson's video narration
  })
  it('shows the button, how many files and an estimate of the size when recordings exist', async () => {
    vi.stubGlobal('caches', { open: async () => ({ match: async () => undefined, put: async () => {}, delete: async () => true, keys: async () => [] }), delete: async () => true })
    vi.stubGlobal('navigator', { ...navigator, onLine: true, storage: { estimate: async () => ({ usage: 1_000_000, quota: 50_000_000 }) } })
    await mount(<OfflineDownload lessons={[lesson({ audio: { hi: 'audio/l1.hi.m4a' } })]} />)
    await flush()
    const button = qa('button').find((b) => b.textContent === hi('learn.offline.button'))
    expect(button).toBeTruthy()
    expect(host.textContent).toContain(hi('learn.offline.have', { n: 0, total: 2 })) // the recording and the video narration
    expect(host.textContent).toContain('एमबी') // the unit is in Devanagari on the Hindi screen
    expect(host.textContent).toMatch(/खाली/)
  })
})

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import en from '../i18n/en.json'
import { LangProvider } from '../shell/i18n'
import type { Lesson } from './content'
import { LessonVideo } from './LessonVideo'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const lessons = JSON.parse(readFileSync(join(__dirname, '..', '..', 'public', 'content', 'lessons.json'), 'utf8')).lessons as Lesson[]
const lesson = lessons.find((l) => l.id === 'upi_pin') ?? lessons[0]

describe('the lesson video player', () => {
  let host: HTMLDivElement
  let root: Root
  beforeEach(() => {
    localStorage.clear()
    host = document.createElement('div')
    document.body.appendChild(host)
  })
  afterEach(() => { act(() => root.unmount()); host.remove() })

  const mount = async (lang: 'en' | 'hi' | 'cg') => {
    localStorage.setItem('gt02:lang', JSON.stringify(lang))
    await act(async () => { root = createRoot(host); root.render(<LangProvider><LessonVideo lesson={lesson} /></LangProvider>) })
    await act(async () => { await Promise.resolve() })
  }
  const labels = () => [...host.querySelectorAll('[aria-label], [title]')].flatMap((e) => [e.getAttribute('aria-label'), e.getAttribute('title')]).filter((x): x is string => !!x)

  it('plays the narration in the app language, from a small .m4a file the offline cache list does not pre-download', async () => {
    await mount('hi')
    expect(host.querySelector('audio')?.getAttribute('src')).toBe(`/audio/video/${lesson.id}.hi.m4a`)
    expect(host.querySelector('audio')?.getAttribute('src')).not.toMatch(/\.mp3$/)
  })

  it('has no English button labels on the Hindi and Chhattisgarhi screens', async () => {
    for (const lang of ['hi', 'cg'] as const) {
      await mount(lang)
      const found = labels()
      expect(found.length).toBeGreaterThan(5)
      for (const l of found) expect(l, `${lang}: "${l}"`).not.toMatch(/[A-Za-z]/)
      act(() => root.unmount())
    }
  })

  it('says plainly that the Chhattisgarhi narration is a Hindi computer voice, and only there', async () => {
    await mount('cg')
    expect(host.querySelector('[data-testid="video-voice-note"]')?.textContent).toBeTruthy()
    act(() => root.unmount())
    await mount('en')
    expect(host.querySelector('[data-testid="video-voice-note"]')).toBeNull()
    expect(labels()).toContain(en['learn.video.rewind'])
  })
})

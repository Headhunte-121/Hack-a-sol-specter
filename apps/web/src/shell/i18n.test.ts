import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DEMO_MESSAGES } from '../detector/demo'
import { buildReportSummary } from '../report/summary'
import cg from '../i18n/cg.json'
import hi from '../i18n/hi.json'
import { formatDateTime } from './i18n'

// Text that must stay exactly as typed even in Hindi or Chhattisgarhi: a web address, link schemes and audio file types.
const LITERAL = /cybercrime\.gov\.in|https?|\b(mp3|wav|m4a|ogg|webm)\b|\{\w+\}/g
const english = (s: string) => s.replace(LITERAL, '').match(/[A-Za-z]{2,}/g) ?? []

describe('Hindi and Chhattisgarhi screens show no English words', () => {
  for (const [name, dict] of [['hi', hi], ['cg', cg]] as const) {
    it(`${name}: every interface string`, () => {
      const bad = Object.entries(dict as Record<string, string>).filter(([, v]) => english(v).length).map(([k, v]) => `${k}: ${v}`)
      expect(bad).toEqual([])
    })
  }
  it('example message chips', () => {
    for (const m of DEMO_MESSAGES) {
      expect(english(m.label.hi), m.id).toEqual([])
      expect(english(m.label.cg), m.id).toEqual([])
    }
  })
  it('example call titles', () => {
    const calls = JSON.parse(readFileSync(join(__dirname, '..', '..', 'public', 'content', 'demo_calls.json'), 'utf8')).calls as { id: string; title: { en: string; hi: string; cg: string } }[]
    for (const c of calls) {
      expect(c.title.en, c.id).toBeTruthy()
      expect(english(c.title.hi), c.id).toEqual([])
      expect(english(c.title.cg), c.id).toEqual([])
    }
  })
  it('lessons and quiz (only links, .apk files and masked numbers stay as typed, since people must recognise them)', () => {
    const keep = /\b[a-z0-9-]+(\.[a-z0-9-]+)*\.(com|in|top|xyz|sbi|ly|net|org)\b(\/\S*)?|\.apk|98X+/gi // web addresses, app files, masked numbers
    const bad: string[] = []
    const walk = (o: unknown, path: string) => {
      if (Array.isArray(o)) o.forEach((v, i) => walk(v, `${path}[${i}]`))
      else if (o && typeof o === 'object') {
        const r = o as Record<string, unknown>
        if (typeof r.en === 'string' && typeof r.hi === 'string') {
          for (const l of ['hi', 'cg']) if (english(String(r[l]).replace(keep, '')).length) bad.push(`${path}.${l}: ${r[l]}`)
        } else for (const [k, v] of Object.entries(r)) walk(v, `${path}.${k}`)
      }
    }
    for (const f of ['lessons.json', 'quiz.json']) walk(JSON.parse(readFileSync(join(__dirname, '..', '..', 'public', 'content', f), 'utf8')), f)
    expect(bad).toEqual([])
  })
  it('dates in the report summary use Hindi month names and a 24-hour clock, not English AM/PM', () => {
    const d = new Date('2026-11-23T14:05:00+05:30')
    expect(formatDateTime(d, 'hi')).not.toMatch(/AM|PM|am|pm|Nov/)
    expect(buildReportSummary(null, (k) => k, d, 'hi')).not.toMatch(/AM|PM/)
  })
})

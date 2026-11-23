import type { Lang } from '../shell/i18n'
import { CARD_ICON_NAMES } from './cardIconNames'

export type Tri = { en: string; hi: string; cg: string }
/** One visual card: one idea, a title and a short body. */
export interface LessonCard {
  id: string
  icon: string
  title: Tri
  body: Tri
}
export interface Lesson {
  id: string
  scripts: string[]
  /** Reading time in minutes (schema v2). Older packs do not have it: use lessonMinutes(). */
  minutes?: number
  title: Tri
  /** Six to eight visual cards (schema v2). Older packs do not have them: use lessonCards(). */
  cards?: LessonCard[]
  example: Tri
  signs: Tri[]
  todo: Tri
  /** Recorded audio per language, as a path under audio/ (for example "audio/upi_pin.hi.m4a"). Optional: no file may exist yet. */
  audio?: Partial<Record<Lang, string>>
  /** Timed captions per language (JSON written by scripts/make_captions.py). Optional. */
  captions?: Partial<Record<Lang, string>>
}
export interface Question {
  id: string
  topic: string
  /** 1 easy, 2 medium, 3 hard: the weight class used by the score (see score.ts). */
  difficulty: 1 | 2 | 3
  type: 'mcq' | 'tf' | 'scenario'
  question: Tri
  options: Tri[]
  answer: number
  explanation: Tri
}
export interface ContentPack {
  lessons: Lesson[]
  questions: Question[]
}

/** pick: text in the active language; falls back Chhattisgarhi -> Hindi -> English and reports when it fell back. */
export function pick(tri: Tri, lang: Lang): string {
  return (tri[lang] || (lang === 'cg' ? tri.hi : '') || tri.en) as string
}

export const MAX_READING_MINUTES = 5
/** A lesson's cards, or an empty list for a pack from before schema v2. */
export const lessonCards = (l: Lesson): LessonCard[] => l.cards ?? []
const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length
/** Words in a lesson's English text: the example, signs, todo and cards (the whole of what a person reads). */
export function lessonWords(l: Lesson): number {
  const parts = [l.title.en, l.example.en, ...l.signs.map((s) => s.en), l.todo.en, ...lessonCards(l).flatMap((c) => [c.title.en, c.body.en])]
  return parts.reduce((n, p) => n + wordCount(p), 0)
}
/** Reading time: the declared minutes, or an estimate at about 120 words a minute for a pack that does not declare it. */
export function lessonMinutes(l: Lesson): number {
  return l.minutes && l.minutes > 0 ? l.minutes : Math.max(1, Math.ceil(lessonWords(l) / 120))
}

/** validateContentPack: every question has an answer, explanation, topic and all three languages (also run at build time).
 *  With requireCards the lessons must also have the schema v2 fields (6 to 8 cards, reading time of at most 5 minutes). */
export function validateContentPack(pack: ContentPack, opts: { requireCards?: boolean } = {}): string[] {
  const problems: string[] = []
  const ok = (t: Tri | undefined) => !!t && !!t.en?.trim() && !!t.hi?.trim() && !!t.cg?.trim()
  const topics = new Set(pack.lessons.map((l) => l.id))
  const seen = new Set<string>()
  for (const l of pack.lessons) {
    if (seen.has(l.id)) problems.push(`lesson ${l.id}: duplicate id`)
    seen.add(l.id)
    if (!ok(l.title) || !ok(l.example) || !ok(l.todo) || !l.signs.length || !l.signs.every(ok)) problems.push(`lesson ${l.id}: missing text`)
    const cards = lessonCards(l)
    if (opts.requireCards) {
      if (cards.length < 6 || cards.length > 8) problems.push(`lesson ${l.id}: needs 6 to 8 cards, has ${cards.length}`)
      if (!l.minutes || l.minutes < 1 || l.minutes > MAX_READING_MINUTES) problems.push(`lesson ${l.id}: minutes must be 1 to ${MAX_READING_MINUTES}`)
    }
    const cardIds = new Set<string>()
    for (const c of cards) {
      if (cardIds.has(c.id)) problems.push(`lesson ${l.id}: duplicate card id ${c.id}`)
      cardIds.add(c.id)
      if (!ok(c.title) || !ok(c.body)) problems.push(`lesson ${l.id} card ${c.id}: missing text`)
      if (!CARD_ICON_NAMES.includes(c.icon)) problems.push(`lesson ${l.id} card ${c.id}: unknown icon ${c.icon}`)
    }
  }
  const qIds = new Set<string>()
  for (const q of pack.questions) {
    if (qIds.has(q.id)) problems.push(`question ${q.id}: duplicate id`)
    qIds.add(q.id)
    if (!topics.has(q.topic)) problems.push(`question ${q.id}: unknown topic ${q.topic}`)
    if (!ok(q.question) || !ok(q.explanation) || !q.options.every(ok)) problems.push(`question ${q.id}: missing text`)
    if (!(q.answer >= 0 && q.answer < q.options.length)) problems.push(`question ${q.id}: bad answer index`)
    if (![1, 2, 3].includes(q.difficulty)) problems.push(`question ${q.id}: bad difficulty`)
  }
  return problems
}

let cache: Promise<ContentPack> | null = null
/** loadContentPack: read the packs from the on-device cache (precached by the service worker). */
export function loadContentPack(fetchJson: (p: string) => Promise<unknown> = (p) => fetch(p).then((r) => r.json())): Promise<ContentPack> {
  if (!cache) {
    cache = Promise.all([fetchJson('/content/lessons.json'), fetchJson('/content/quiz.json')])
      .then(([l, q]) => ({ lessons: (l as { lessons: Lesson[] }).lessons, questions: (q as { questions: Question[] }).questions }))
      .catch((e) => {
        cache = null
        throw e
      })
  }
  return cache
}

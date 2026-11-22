import type { Lang } from '../shell/i18n'

export type Tri = { en: string; hi: string; cg: string }
export interface Lesson {
  id: string
  scripts: string[]
  title: Tri
  example: Tri
  signs: Tri[]
  todo: Tri
}
export interface Question {
  id: string
  topic: string
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

/** validateContentPack: every question has an answer, explanation, topic and all three languages (also run at build time). */
export function validateContentPack(pack: ContentPack): string[] {
  const problems: string[] = []
  const ok = (t: Tri | undefined) => !!t && !!t.en?.trim() && !!t.hi?.trim() && !!t.cg?.trim()
  const topics = new Set(pack.lessons.map((l) => l.id))
  for (const l of pack.lessons) {
    if (!ok(l.title) || !ok(l.example) || !ok(l.todo) || !l.signs.length || !l.signs.every(ok)) problems.push(`lesson ${l.id}: missing text`)
  }
  for (const q of pack.questions) {
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

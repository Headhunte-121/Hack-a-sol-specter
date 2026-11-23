import { kvGet, kvSet } from '../shell/storage'

// All learning progress stays on the device.
export interface Attempt {
  at: number
  score: number
  level: string
  topics: Record<string, number>
}
export const doneLessons = (): string[] => kvGet<string[]>('lessons.done', [])
/** markLessonComplete: idempotent. */
export function markLessonComplete(id: string) {
  const d = doneLessons()
  if (!d.includes(id)) kvSet('lessons.done', [...d, id])
}
export const usedQuestions = (): string[] => kvGet<string[]>('quiz.used', [])
export const saveUsedQuestions = (ids: string[]) => kvSet('quiz.used', ids)
export const attemptHistory = (): Attempt[] => kvGet<Attempt[]>('quiz.history', [])
/** storeAttemptHistory: keeps the last 20 attempts so the next result can show the previous score. */
export function storeAttemptHistory(a: Attempt) {
  kvSet('quiz.history', [...attemptHistory(), a].slice(-20))
}

export interface ChapterAttempt {
  at: number
  chapterId: string
  score: number
  correctCount: number
  totalQuestions: number
  stars: number
  bestStreak: number
}

export const chapterAttempts = (): Record<string, ChapterAttempt> =>
  kvGet<Record<string, ChapterAttempt>>('quiz.chapter_attempts', {})

export function saveChapterAttempt(a: ChapterAttempt) {
  const current = chapterAttempts()
  const prev = current[a.chapterId]
  if (!prev || a.score >= prev.score) {
    kvSet('quiz.chapter_attempts', { ...current, [a.chapterId]: a })
  }
}


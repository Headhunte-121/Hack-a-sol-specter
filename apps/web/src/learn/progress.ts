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

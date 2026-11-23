import type { Question } from './content'

/** Small seedable RNG so tests are deterministic (mulberry32). */
export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function shuffle<T>(arr: T[], r: () => number): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** How many questions a quiz session draws from the bank: at least one for each of the ten topics. */
export const QUIZ_LENGTH = 15

/** hashSeed: a number from a seed and a question id (FNV-1a), so each question gets its own stable shuffle. */
export function hashSeed(seed: number, id: string): number {
  let h = 0x811c9dc5 ^ (seed >>> 0)
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** displayOrder: the order the options are SHOWN in, as indexes into question.options. True/false keeps its order. It only changes how the
 *  options look: the answer, the explanation and the score always use the option's original index, so the same answers give the same score
 *  whatever the seed. */
export function displayOrder(q: Question, seed: number): number[] {
  const identity = q.options.map((_, i) => i)
  return q.type === 'tf' ? identity : shuffle(identity, rng(hashSeed(seed, q.id)))
}

/** selectQuestions: a balanced set across topics, mixed difficulty, no repeats until the bank is used up. */
export function selectQuestions(bank: Question[], n: number, used: string[] = [], seed = Date.now()): { questions: Question[]; used: string[] } {
  const r = rng(seed)
  const usedSet = new Set(used)
  const topics = shuffle([...new Set(bank.map((q) => q.topic))], r)
  const queues = new Map<string, Question[]>()
  for (const t of topics) {
    const all = bank.filter((q) => q.topic === t)
    let fresh = all.filter((q) => !usedSet.has(q.id))
    if (fresh.length === 0) fresh = all // this topic's questions are all used: start again
    queues.set(t, shuffle(fresh, r))
  }
  const picked: Question[] = []
  while (picked.length < Math.min(n, bank.length)) {
    let progressed = false
    for (const t of topics) {
      const q = queues.get(t)!.shift()
      if (q) {
        picked.push(q)
        progressed = true
        if (picked.length >= n) break
      }
    }
    if (!progressed) break
  }
  const questions = shuffle(picked, r)
  let nextUsed = [...new Set([...used, ...questions.map((q) => q.id)])]
  if (nextUsed.length >= bank.length) nextUsed = questions.map((q) => q.id) // bank used up: reset the memory
  return { questions, used: nextUsed }
}

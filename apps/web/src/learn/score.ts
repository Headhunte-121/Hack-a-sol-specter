import type { Question } from './content'

// ---- scoring design (also written in docs/scoring.md so judges can inspect it) ----
// Topic score  = difficulty-weighted share correct in that topic, 0..100. Difficulty weights: easy 1, medium 1.5, hard 2.
// Literacy score = weighted mean of the topic scores of the topics attempted, 0..100, using TOPIC_WEIGHTS below.
// Levels: below 40 Beginner, 40 to 69 Aware, 70 and above Confident. It is deterministic: same answers, same score.
export const DIFFICULTY_WEIGHT: Record<1 | 2 | 3, number> = { 1: 1, 2: 1.5, 3: 2 }
export const TOPIC_WEIGHTS: Record<string, number> = {
  otp_pin_card: 20, fake_kyc: 15, digital_arrest: 15, courier_customs: 10, upi_qr: 20, links_apps: 10, what_to_do: 10,
  atm_pin: 10, upi_pin: 10, safe_habits: 10,
}
export type Level = 'beginner' | 'aware' | 'confident'
export interface Answer {
  questionId: string
  topic: string
  difficulty: 1 | 2 | 3
  correct: boolean
}

export function toAnswer(q: Question, chosen: number): Answer {
  return { questionId: q.id, topic: q.topic, difficulty: q.difficulty, correct: chosen === q.answer }
}

/** checkAnswer: correctness plus the explanation to show straight away. */
export function checkAnswer(q: Question, chosen: number) {
  return { correct: chosen === q.answer, answer: toAnswer(q, chosen), correctIndex: q.answer }
}

/** computeTopicScores: difficulty-weighted share correct per topic (0..100), only for topics that were answered. */
export function computeTopicScores(answers: Answer[]): Record<string, number> {
  const got: Record<string, number> = {}
  const max: Record<string, number> = {}
  for (const a of answers) {
    const w = DIFFICULTY_WEIGHT[a.difficulty]
    max[a.topic] = (max[a.topic] ?? 0) + w
    got[a.topic] = (got[a.topic] ?? 0) + (a.correct ? w : 0)
  }
  return Object.fromEntries(Object.keys(max).map((t) => [t, Math.round((got[t] / max[t]) * 1000) / 10]))
}

export function levelOf(score: number): Level {
  return score >= 70 ? 'confident' : score >= 40 ? 'aware' : 'beginner'
}

/** computeLiteracyScore: weighted mean of topic scores over the attempted topics. */
export function computeLiteracyScore(topicScores: Record<string, number>) {
  let num = 0
  let den = 0
  for (const [t, s] of Object.entries(topicScores)) {
    const w = TOPIC_WEIGHTS[t] ?? 10
    num += w * s
    den += w
  }
  const score = den === 0 ? 0 : Math.round(num / den)
  return { score, level: levelOf(score) }
}

/** recommendNextLesson: the weakest topic's lesson (ties go to the heavier topic); a high score suggests the message checker. */
export function recommendNextLesson(topicScores: Record<string, number>, score: number): { kind: 'lesson'; topic: string } | { kind: 'checker' } {
  if (score >= 85 || Object.keys(topicScores).length === 0) return { kind: 'checker' }
  const weakest = Object.entries(topicScores).sort((a, b) => a[1] - b[1] || (TOPIC_WEIGHTS[b[0]] ?? 0) - (TOPIC_WEIGHTS[a[0]] ?? 0))[0][0]
  return { kind: 'lesson', topic: weakest }
}

/** A coarse band for the optional anonymous contribution to the dashboard: never answers, never identity. */
export function scoreBand(score: number): '0-39' | '40-69' | '70-100' {
  return score >= 70 ? '70-100' : score >= 40 ? '40-69' : '0-39'
}

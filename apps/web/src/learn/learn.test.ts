import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { validateContentPack, type ContentPack, type Lesson, type Question } from './content'
import { selectQuestions } from './quiz'
import { checkAnswer, computeLiteracyScore, computeTopicScores, levelOf, recommendNextLesson, scoreBand, toAnswer, type Answer } from './score'

const dir = join(__dirname, '..', '..', 'public', 'content')
const lessons = (JSON.parse(readFileSync(join(dir, 'lessons.json'), 'utf8')) as { lessons: Lesson[] }).lessons
const questions = (JSON.parse(readFileSync(join(dir, 'quiz.json'), 'utf8')) as { questions: Question[] }).questions
const pack: ContentPack = { lessons, questions }

describe('content pack', () => {
  it('has 7 lessons and at least 28 questions, all complete in en/hi/cg', () => {
    expect(lessons.length).toBe(7)
    expect(questions.length).toBeGreaterThanOrEqual(28)
    expect(validateContentPack(pack)).toEqual([])
  })
  it('has about four questions per lesson and a mix of difficulty and question types', () => {
    for (const l of lessons) expect(questions.filter((q) => q.topic === l.id).length).toBeGreaterThanOrEqual(4)
    expect(new Set(questions.map((q) => q.difficulty)).size).toBe(3)
    expect(new Set(questions.map((q) => q.type))).toEqual(new Set(['mcq', 'tf', 'scenario']))
  })
  it('the validator catches a missing translation', () => {
    const broken = structuredClone(pack)
    broken.questions[0].question.cg = ''
    expect(validateContentPack(broken).length).toBeGreaterThan(0)
  })
})

describe('selectQuestions', () => {
  it('draws a balanced set of 12 with no repeats inside a session', () => {
    const { questions: qs } = selectQuestions(questions, 12, [], 1)
    expect(qs.length).toBe(12)
    expect(new Set(qs.map((q) => q.id)).size).toBe(12)
    const per = qs.reduce<Record<string, number>>((m, q) => ((m[q.topic] = (m[q.topic] ?? 0) + 1), m), {})
    expect(Object.keys(per).length).toBe(7) // every topic appears
    expect(Math.max(...Object.values(per))).toBeLessThanOrEqual(2)
  })
  it('does not repeat questions until the bank is used up', () => {
    const a = selectQuestions(questions, 12, [], 7)
    const b = selectQuestions(questions, 12, a.used, 8)
    const overlap = b.questions.filter((q) => a.questions.some((x) => x.id === q.id))
    expect(overlap.length).toBeLessThanOrEqual(0)
  })
})

const ans = (topic: string, difficulty: 1 | 2 | 3, correct: boolean): Answer => ({ questionId: `${topic}${difficulty}${correct}`, topic, difficulty, correct })

describe('scoring', () => {
  it('computes difficulty-weighted topic scores', () => {
    const t = computeTopicScores([ans('upi_qr', 1, true), ans('upi_qr', 3, false), ans('fake_kyc', 2, true)])
    expect(t.upi_qr).toBeCloseTo(33.3, 1) // 1 of 3 weight points
    expect(t.fake_kyc).toBe(100)
  })
  it('combines topics with documented weights and assigns levels', () => {
    const { score, level } = computeLiteracyScore({ otp_pin_card: 100, upi_qr: 0 }) // weights 20 and 20
    expect(score).toBe(50)
    expect(level).toBe('aware')
    expect(levelOf(39)).toBe('beginner')
    expect(levelOf(40)).toBe('aware')
    expect(levelOf(70)).toBe('confident')
  })
  it('is deterministic: the same answers always give the same score', () => {
    const answers = questions.slice(0, 12).map((q, i) => toAnswer(q, i % 2 ? q.answer : 0))
    const r1 = computeLiteracyScore(computeTopicScores(answers))
    const r2 = computeLiteracyScore(computeTopicScores([...answers].reverse()))
    expect(r1).toEqual(r2)
  })
  it('all correct gives 100, all wrong gives 0', () => {
    const right = questions.map((q) => toAnswer(q, q.answer))
    const wrong = questions.map((q) => toAnswer(q, (q.answer + 1) % q.options.length))
    expect(computeLiteracyScore(computeTopicScores(right)).score).toBe(100)
    expect(computeLiteracyScore(computeTopicScores(wrong)).score).toBe(0)
  })
  it('recommends the weakest topic, or the checker for a high score', () => {
    expect(recommendNextLesson({ upi_qr: 20, fake_kyc: 90 }, 55)).toEqual({ kind: 'lesson', topic: 'upi_qr' })
    expect(recommendNextLesson({ upi_qr: 95 }, 95)).toEqual({ kind: 'checker' })
  })
  it('checkAnswer returns correctness', () => {
    expect(checkAnswer(questions[0], questions[0].answer).correct).toBe(true)
    expect(checkAnswer(questions[0], questions[0].answer === 0 ? 1 : 0).correct).toBe(false)
  })
  it('score bands never carry answers', () => {
    expect(scoreBand(10)).toBe('0-39')
    expect(scoreBand(55)).toBe('40-69')
    expect(scoreBand(90)).toBe('70-100')
  })
})

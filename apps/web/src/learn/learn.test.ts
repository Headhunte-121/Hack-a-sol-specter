import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { lessonCards, lessonMinutes, lessonWords, MAX_READING_MINUTES, validateContentPack, type ContentPack, type Lesson, type Question } from './content'
import { displayOrder, hashSeed, QUIZ_LENGTH, selectQuestions } from './quiz'
import { checkAnswer, computeLiteracyScore, computeTopicScores, levelOf, recommendNextLesson, scoreBand, toAnswer, TOPIC_WEIGHTS, type Answer } from './score'

const dir = join(__dirname, '..', '..', 'public', 'content')
const lessons = (JSON.parse(readFileSync(join(dir, 'lessons.json'), 'utf8')) as { lessons: Lesson[] }).lessons
const questions = (JSON.parse(readFileSync(join(dir, 'quiz.json'), 'utf8')) as { questions: Question[] }).questions
const pack: ContentPack = { lessons, questions }

describe('content pack', () => {
  it('has 10 lessons and at least 60 questions, all complete in en/hi/cg', () => {
    expect(lessons.length).toBe(10)
    expect(questions.length).toBeGreaterThanOrEqual(60)
    expect(validateContentPack(pack, { requireCards: true })).toEqual([])
  })
  it('has the three newer lessons: ATM PIN, UPI PIN and everyday habits', () => {
    for (const id of ['atm_pin', 'upi_pin', 'safe_habits']) expect(lessons.map((l) => l.id)).toContain(id)
  })
  it('every lesson has 6 to 8 cards, a reading time of at most 5 minutes, and a text that fits it', () => {
    for (const l of lessons) {
      expect(lessonCards(l).length, l.id).toBeGreaterThanOrEqual(6)
      expect(lessonCards(l).length, l.id).toBeLessThanOrEqual(8)
      expect(lessonMinutes(l), l.id).toBeLessThanOrEqual(MAX_READING_MINUTES)
      expect(lessonWords(l), l.id).toBeLessThanOrEqual(lessonMinutes(l) * 150) // a slow, careful reader
    }
  })
  it('has at least six questions per topic and a mix of difficulty and question types', () => {
    for (const l of lessons) expect(questions.filter((q) => q.topic === l.id).length, l.id).toBeGreaterThanOrEqual(6)
    expect(new Set(questions.map((q) => q.difficulty)).size).toBe(3)
    expect(new Set(questions.map((q) => q.type))).toEqual(new Set(['mcq', 'tf', 'scenario']))
    for (const l of lessons) expect(new Set(questions.filter((q) => q.topic === l.id).map((q) => q.type)).size, l.id).toBeGreaterThanOrEqual(2)
  })
  it('question ids are unique and every topic has a lesson to open', () => {
    expect(new Set(questions.map((q) => q.id)).size).toBe(questions.length)
    for (const q of questions) expect(lessons.some((l) => l.id === q.topic), q.id).toBe(true)
  })
  it('scoring has a weight for every topic', () => {
    for (const l of lessons) expect(TOPIC_WEIGHTS[l.id], l.id).toBeGreaterThan(0)
  })
  it('the validator catches a missing translation', () => {
    const broken = structuredClone(pack)
    broken.questions[0].question.cg = ''
    expect(validateContentPack(broken).length).toBeGreaterThan(0)
  })
  it('the validator catches too few cards, an unknown icon and a duplicate id', () => {
    const fewer = structuredClone(pack)
    fewer.lessons[0].cards = fewer.lessons[0].cards!.slice(0, 3)
    expect(validateContentPack(fewer, { requireCards: true }).join()).toContain('needs 6 to 8 cards')
    const icon = structuredClone(pack)
    icon.lessons[1].cards![0].icon = 'unicorn'
    expect(validateContentPack(icon).join()).toContain('unknown icon')
    const dup = structuredClone(pack)
    dup.questions[1].id = dup.questions[0].id
    expect(validateContentPack(dup).join()).toContain('duplicate id')
  })
  it('a pack from before schema v2 (no cards, no minutes) still validates and gets an estimated reading time', () => {
    const old = structuredClone(pack)
    for (const l of old.lessons) {
      delete l.cards
      delete l.minutes
    }
    expect(validateContentPack(old)).toEqual([])
    expect(lessonCards(old.lessons[0])).toEqual([])
    expect(lessonMinutes(old.lessons[0])).toBeGreaterThanOrEqual(1)
  })
})

describe('selectQuestions', () => {
  it(`draws a balanced set of ${QUIZ_LENGTH} with no repeats inside a session and every topic present`, () => {
    const { questions: qs } = selectQuestions(questions, QUIZ_LENGTH, [], 1)
    expect(qs.length).toBe(QUIZ_LENGTH)
    expect(new Set(qs.map((q) => q.id)).size).toBe(QUIZ_LENGTH)
    const per = qs.reduce<Record<string, number>>((m, q) => ((m[q.topic] = (m[q.topic] ?? 0) + 1), m), {})
    expect(Object.keys(per).length).toBe(lessons.length) // every topic appears
    expect(Math.max(...Object.values(per))).toBeLessThanOrEqual(2)
  })
  it('does not repeat questions until the bank is used up', () => {
    const a = selectQuestions(questions, QUIZ_LENGTH, [], 7)
    const b = selectQuestions(questions, QUIZ_LENGTH, a.used, 8)
    const overlap = b.questions.filter((q) => a.questions.some((x) => x.id === q.id))
    expect(overlap.length).toBeLessThanOrEqual(0)
  })
  it('is repeatable: the same seed draws the same questions in the same order', () => {
    const ids = (seed: number) => selectQuestions(questions, QUIZ_LENGTH, [], seed).questions.map((q) => q.id)
    expect(ids(99)).toEqual(ids(99))
  })
})

describe('display order of the options (shuffle independence)', () => {
  it('is a permutation of the options, the same for the same seed and question', () => {
    for (const q of questions) {
      const o = displayOrder(q, 12345)
      expect([...o].sort((a, b) => a - b)).toEqual(q.options.map((_, i) => i))
      expect(displayOrder(q, 12345)).toEqual(o)
    }
  })
  it('keeps true/false in its fixed order and does reorder the others for some seeds', () => {
    const tf = questions.find((q) => q.type === 'tf')!
    for (const seed of [1, 2, 3, 4, 5]) expect(displayOrder(tf, seed)).toEqual([0, 1])
    const mcq = questions.find((q) => q.type === 'mcq' && q.options.length === 4)!
    expect(new Set([...Array(30).keys()].map((seed) => displayOrder(mcq, seed).join())).size).toBeGreaterThan(1)
  })
  it('different questions get different shuffles from the same seed', () => {
    expect(hashSeed(5, 'q_a')).not.toBe(hashSeed(5, 'q_b'))
  })
  it('a person who gives the same answers always gets the same score, whatever order the options are shown in', () => {
    // They know the answer to every other question and pick the first wrong option for the rest. Only the seed (the order shown) changes.
    const sit = (seed: number) => {
      const qs = selectQuestions(questions, QUIZ_LENGTH, [], 42).questions
      const answers = qs.map((q, i) => {
        const shown = displayOrder(q, seed) // what is on screen, top to bottom, as original indexes
        const wanted = i % 2 === 0 ? q.answer : (q.answer + 1) % q.options.length
        const position = shown.indexOf(wanted) // the person taps this position...
        return toAnswer(q, shown[position]) // ...which stands for this original option
      })
      return computeLiteracyScore(computeTopicScores(answers))
    }
    const base = sit(1)
    for (const seed of [2, 3, 17, 1000, 987654321]) expect(sit(seed)).toEqual(base)
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
  it('the weakest topic can be any of the ten, including the newer ones, and names a lesson that exists', () => {
    for (const weak of ['atm_pin', 'upi_pin', 'safe_habits']) {
      const topics = Object.fromEntries(lessons.map((l) => [l.id, l.id === weak ? 10 : 70]))
      const { score } = computeLiteracyScore(topics)
      expect(score).toBeLessThan(85)
      const rec = recommendNextLesson(topics, score)
      expect(rec).toEqual({ kind: 'lesson', topic: weak })
      expect(lessons.some((l) => l.id === weak)).toBe(true)
    }
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

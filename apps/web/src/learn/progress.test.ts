import { beforeEach, describe, expect, it } from 'vitest'
import {
  attemptHistory,
  chapterAttempts,
  doneLessons,
  markLessonComplete,
  saveChapterAttempt,
  storeAttemptHistory,
  type ChapterAttempt,
} from './progress'

describe('progress tracking', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('marks lessons complete idempotently', () => {
    expect(doneLessons()).toEqual([])
    markLessonComplete('atm_pin')
    expect(doneLessons()).toEqual(['atm_pin'])
    markLessonComplete('atm_pin')
    expect(doneLessons()).toEqual(['atm_pin'])
    markLessonComplete('upi_qr')
    expect(doneLessons()).toEqual(['atm_pin', 'upi_qr'])
  })

  it('stores attempt history keeping at most 20 attempts', () => {
    for (let i = 1; i <= 25; i++) {
      storeAttemptHistory({
        at: i * 1000,
        score: i * 4,
        level: 'good',
        topics: { atm_pin: i },
      })
    }
    const history = attemptHistory()
    expect(history.length).toBe(20)
    expect(history[0].score).toBe(6 * 4)
    expect(history[19].score).toBe(25 * 4)
  })

  describe('saveChapterAttempt (Bug B fix)', () => {
    it('saves the initial chapter attempt', () => {
      const a: ChapterAttempt = {
        at: 1000,
        chapterId: 'ch1',
        score: 80,
        correctCount: 16,
        totalQuestions: 20,
        stars: 2,
        bestStreak: 6,
      }
      saveChapterAttempt(a)
      const current = chapterAttempts()
      expect(current.ch1).toEqual(a)
    })

    it('preserves higher streak when replaying with higher score but lower streak', () => {
      const first: ChapterAttempt = {
        at: 1000,
        chapterId: 'ch1',
        score: 80,
        correctCount: 16,
        totalQuestions: 20,
        stars: 2,
        bestStreak: 8,
      }
      saveChapterAttempt(first)

      const second: ChapterAttempt = {
        at: 2000,
        chapterId: 'ch1',
        score: 90,
        correctCount: 18,
        totalQuestions: 20,
        stars: 3,
        bestStreak: 4, // lower streak in this run
      }
      saveChapterAttempt(second)

      const current = chapterAttempts()
      expect(current.ch1.score).toBe(90)
      expect(current.ch1.stars).toBe(3)
      expect(current.ch1.bestStreak).toBe(8) // preserved max streak!
    })

    it('upgrades best streak even when replaying with lower score', () => {
      const first: ChapterAttempt = {
        at: 1000,
        chapterId: 'ch1',
        score: 90,
        correctCount: 18,
        totalQuestions: 20,
        stars: 3,
        bestStreak: 5,
      }
      saveChapterAttempt(first)

      const second: ChapterAttempt = {
        at: 2000,
        chapterId: 'ch1',
        score: 75, // lower score
        correctCount: 15,
        totalQuestions: 20,
        stars: 2,
        bestStreak: 10, // higher streak!
      }
      saveChapterAttempt(second)

      const current = chapterAttempts()
      expect(current.ch1.score).toBe(90) // keeps best score
      expect(current.ch1.stars).toBe(3) // keeps best stars
      expect(current.ch1.bestStreak).toBe(10) // upgraded best streak!
    })

    it('leaves record untouched when replaying with lower score and lower streak', () => {
      const first: ChapterAttempt = {
        at: 1000,
        chapterId: 'ch1',
        score: 90,
        correctCount: 18,
        totalQuestions: 20,
        stars: 3,
        bestStreak: 8,
      }
      saveChapterAttempt(first)

      const second: ChapterAttempt = {
        at: 2000,
        chapterId: 'ch1',
        score: 60,
        correctCount: 12,
        totalQuestions: 20,
        stars: 1,
        bestStreak: 3,
      }
      saveChapterAttempt(second)

      const current = chapterAttempts()
      expect(current.ch1).toEqual(first)
    })
  })
})

import { describe, expect, it } from 'vitest'
import { CHAPTERS, CHAPTER_QUESTIONS_COUNT, selectChapterQuestions } from './chapters'
import quizJson from '../../public/content/quiz.json'
import type { Question } from './content'

const questions = (quizJson as { questions: Question[] }).questions

describe('Chapter system (5 chapters x 20 questions)', () => {
  it('defines exactly 5 chapters covering all 10 topics', () => {
    expect(CHAPTERS.length).toBe(5)
    const allTopics = CHAPTERS.flatMap((c) => c.topics)
    expect(allTopics.length).toBe(10)
    expect(new Set(allTopics).size).toBe(10)
  })

  it('selects exactly 20 questions for each of the 5 chapters', () => {
    for (const chapter of CHAPTERS) {
      const selected = selectChapterQuestions(questions, chapter, CHAPTER_QUESTIONS_COUNT, 42)
      expect(selected.length).toBe(20)

      // No duplicates within a session
      const ids = new Set(selected.map((q) => q.id))
      expect(ids.size).toBe(20)

      // All questions belong to the chapter's two topics
      for (const q of selected) {
        expect(chapter.topics).toContain(q.topic)
      }

      // Exactly 10 questions per topic
      const countA = selected.filter((q) => q.topic === chapter.topics[0]).length
      const countB = selected.filter((q) => q.topic === chapter.topics[1]).length
      expect(countA).toBe(10)
      expect(countB).toBe(10)
    }
  })

  it('is deterministic: the same seed yields identical questions in the same order', () => {
    const ch = CHAPTERS[0]
    const a = selectChapterQuestions(questions, ch, 20, 999).map((q) => q.id)
    const b = selectChapterQuestions(questions, ch, 20, 999).map((q) => q.id)
    expect(a).toEqual(b)
  })

  it('different seeds yield different order or mix', () => {
    const ch = CHAPTERS[2]
    const a = selectChapterQuestions(questions, ch, 20, 1).map((q) => q.id)
    const b = selectChapterQuestions(questions, ch, 20, 2).map((q) => q.id)
    expect(a.join()).not.toEqual(b.join())
  })
})

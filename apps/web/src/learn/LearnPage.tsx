import { useEffect, useMemo, useState } from 'react'
import { Award, BookOpen, ChevronRight, Film, HelpCircle, LayoutGrid, Lightbulb, RotateCcw, Scissors, Sparkles, Star, Volume2, VolumeX } from 'lucide-react'
import { categoryFromSignals, LESSON_FOR_CATEGORY } from '../shared/categories'
import { setBusy } from '../shell/busy'
import { useLang } from '../shell/i18n'
import { closeThenGo, useBackStep, useInnerScreenOnReturn } from '../shell/backStep'
import { Layout } from '../shell/Layout'
import { currentQuery, navigate } from '../shell/router'
import { kvGet, kvSet } from '../shell/storage'
import { Banner, Icon } from '../shell/ui'
import { lessonLines } from './audio'
import { CHAPTERS, CHAPTER_QUESTIONS_COUNT, selectChapterQuestions, type Chapter } from './chapters'
import { ChapterResultView } from './ChapterResultView'
import { ChapterSelect } from './ChapterSelect'
import { loadContentPack, lessonCards, lessonMinutes, pick, type ContentPack, type Lesson, type Question } from './content'
import { LessonAudio } from './LessonAudio'
import { LessonCards } from './LessonCards'
import { LessonVideo } from './LessonVideo'
import { OfflineDownload } from './OfflineDownload'
import { attemptHistory, chapterAttempts, doneLessons, markLessonComplete, saveChapterAttempt, saveUsedQuestions, storeAttemptHistory, usedQuestions, type Attempt, type ChapterAttempt } from './progress'
import { displayOrder, QUIZ_LENGTH, selectQuestions } from './quiz'
import { playQuizSound } from './quizAudio'
import { QuizConfetti } from './QuizConfetti'
import { QuizScenarioVisual } from './QuizScenarioVisual'
import { Chapter1Artwork } from './PaintedArtwork'
import { QuizSurprise, type LifelineState } from './QuizSurprise'
import { QuizVideoScenario } from './QuizVideoScenario'
import { checkAnswer, computeLiteracyScore, computeTopicScores, recommendNextLesson, type Answer } from './score'

type View =
  | { kind: 'home' }
  | { kind: 'lesson'; id: string }
  | { kind: 'chapters' }
  | { kind: 'quiz'; chapter?: Chapter }
  | { kind: 'result'; attempt: Attempt; previous: number | null }
  | { kind: 'chapter_result'; chapter: Chapter; attempt: ChapterAttempt; previous: number | null }

/** The screen the address asks for: a lesson (?lesson=<id>), a chapter (?chapter=<id>), or the home list. */
function baseView(p: URLSearchParams): View {
  const id = p.get('lesson')
  const from = p.get('from')
  const chapter = p.get('chapter')
  if (id) return { kind: 'lesson', id }
  if (from) return { kind: 'lesson', id: LESSON_FOR_CATEGORY[categoryFromSignals(from.split(',').filter(Boolean))] }
  if (chapter) {
    const ch = CHAPTERS.find((c) => c.id === chapter || String(c.number) === chapter)
    if (ch) return { kind: 'quiz', chapter: ch }
    return { kind: 'chapters' }
  }
  return { kind: 'home' }
}

function useHashParams() {
  const [q, setQ] = useState(currentQuery)
  useEffect(() => {
    const on = () => setQ(currentQuery())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return q
}

export default function LearnPage() {
  const { t, lang } = useLang()
  const params = useHashParams()
  const [pack, setPack] = useState<ContentPack | null>(null)
  const [error, setError] = useState(false)
  const [view, setView] = useState<View>({ kind: 'home' })
  const [done, setDone] = useState<string[]>(doneLessons())
  const [isMuted, setIsMuted] = useState<boolean>(() => kvGet<boolean>('quiz.muted', false))

  const toggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev
      kvSet('quiz.muted', next)
      return next
    })
  }

  useEffect(() => {
    loadContentPack().then(setPack).catch(() => setError(true))
  }, [])

  // deep links: ?lesson=<id> or ?chapter=<id> or ?from=<signal,signal>
  useEffect(() => {
    const b = baseView(params)
    setView((v) => (b.kind === 'lesson' || v.kind === 'lesson' ? b : v))
  }, [params])

  const title = (l: Lesson) => pick(l.title, lang)
  const startGrandQuiz = () => setView({ kind: 'quiz' })
  const startChaptersHub = () => setView({ kind: 'chapters' })
  const startChapter = (chapter: Chapter) => setView({ kind: 'quiz', chapter })

  const isQuiz = view.kind === 'quiz'
  const isResult = view.kind === 'result' || view.kind === 'chapter_result'
  const isChapters = view.kind === 'chapters'

  useInnerScreenOnReturn()
  const back = useBackStep(isQuiz || isResult || isChapters, () => {
    if (view.kind === 'quiz' && view.chapter) {
      setView({ kind: 'chapters' })
    } else {
      setView(baseView(params))
    }
  })
  const onBack = isQuiz || isResult || isChapters ? back : undefined

  return (
    <Layout
      title={
        view.kind === 'result'
          ? t('learn.score.title')
          : view.kind === 'chapter_result'
          ? t('learn.quiz.chapter_prefix', { n: view.chapter.number })
          : view.kind === 'chapters'
          ? t('learn.quiz.chapters_btn')
          : view.kind === 'home'
          ? t('learn.title')
          : undefined
      }
      onBack={onBack}
    >
      {error && <Banner tone="bad" role="alert">{t('learn.error')}</Banner>}
      {!pack && !error && <p className="text-muted">{t('learn.loading')}</p>}

      {pack && view.kind === 'home' && (
        <Home
          pack={pack}
          done={done}
          title={title}
          onOpen={(id) => navigate(`/learn?lesson=${id}`)}
          onChapters={startChaptersHub}
          onGrandQuiz={startGrandQuiz}
        />
      )}

      {pack && view.kind === 'chapters' && (
        <ChapterSelect
          onSelectChapter={startChapter}
          onSelectGrandQuiz={startGrandQuiz}
          isMuted={isMuted}
          onToggleMute={toggleMute}
        />
      )}

      {pack && view.kind === 'lesson' && (
        <LessonView
          lesson={pack.lessons.find((l) => l.id === view.id) ?? pack.lessons[0]}
          done={done.includes(view.id)}
          onDone={(id) => {
            markLessonComplete(id)
            setDone(doneLessons())
          }}
          onChapterQuiz={(ch) => setView({ kind: 'quiz', chapter: ch })}
          onChapters={startChaptersHub}
        />
      )}

      {pack && view.kind === 'quiz' && (
        <QuizView
          pack={pack}
          chapter={view.chapter}
          isMuted={isMuted}
          onToggleMute={toggleMute}
          onFinish={(attempt, previous) => setView({ kind: 'result', attempt, previous })}
          onFinishChapter={(ch, attempt, prev) =>
            setView({ kind: 'chapter_result', chapter: ch, attempt, previous: prev })
          }
          onQuit={back}
        />
      )}

      {pack && view.kind === 'chapter_result' && (
        <ChapterResultView
          pack={pack}
          chapter={view.chapter}
          attempt={view.attempt}
          previous={view.previous}
          onNextChapter={(nextCh) => setView({ kind: 'quiz', chapter: nextCh })}
          onRetry={() => setView({ kind: 'quiz', chapter: view.chapter })}
          onBackToChapters={() => setView({ kind: 'chapters' })}
          isMuted={isMuted}
        />
      )}

      {pack && view.kind === 'result' && (
        <ResultView
          pack={pack}
          attempt={view.attempt}
          previous={view.previous}
          title={title}
          onRetry={startGrandQuiz}
          onChapters={startChaptersHub}
          onLesson={(id) => closeThenGo(back, `/learn?lesson=${id}`)}
        />
      )}
    </Layout>
  )
}

function Home({
  pack,
  done,
  title,
  onOpen,
  onChapters,
  onGrandQuiz,
}: {
  pack: ContentPack
  done: string[];
  title: (l: Lesson) => string;
  onOpen: (id: string) => void;
  onChapters: () => void;
  onGrandQuiz: () => void;
}) {
  const { t, lang } = useLang()
  const last = attemptHistory().slice(-1)[0]
  const attempts = chapterAttempts()
  const completedChaptersCount = CHAPTERS.filter((c) => !!attempts[c.id]).length
  const rec = last ? recommendNextLesson(last.topics, last.score) : null

  return (
    <>
      {/* Primary 5-Chapter Interactive Quiz Button */}
      <div className="flex flex-col gap-2.5">
        <button
          className="btn btn-primary !min-h-[82px] !text-[22px] flex items-center justify-between !p-3.5 shadow-lg hover:shadow-xl transition-all"
          onClick={onChapters}
        >
          <div className="flex items-center gap-3.5">
            <img
              src="images/quiz/quiz_badge.jpg"
              alt="Cyber Safety Academy"
              className="h-16 w-16 rounded-2xl object-cover shadow-md ring-2 ring-white/40 shrink-0"
            />
            <div className="text-left">
              <span className="block font-black leading-tight text-[21px]">
                {t('learn.quiz.chapters_btn')}
              </span>
              <span className="block text-[13px] font-medium text-blue-100 mt-0.5">
                {completedChaptersCount > 0
                  ? (lang === 'hi' ? `${completedChaptersCount}/5 अध्याय पूरे हुए · सभी खेलें` : lang === 'cg' ? `${completedChaptersCount}/5 अध्याय पूरा होगे` : `${completedChaptersCount}/5 Chapters Completed`)
                  : (lang === 'hi' ? 'इंटरैक्टिव विषय चित्र, वीडियो सिमुलेशन एवं उपहार के साथ' : lang === 'cg' ? 'इंटरैक्टिव विषय फोटो, वीडियो सिमुलेशन अउ ईनाम के संग' : 'Interactive topic visuals, video simulations & surprises')}
              </span>
            </div>
          </div>
          <ChevronRight size={28} className="shrink-0" />
        </button>

        {/* Quick Speed Assessment Link */}
        <div className="flex items-center justify-between px-1 text-[15px]">
          <span className="text-muted">
            {last && t('learn.score.previous', { score: last.score })}
          </span>
          <button
            type="button"
            onClick={onGrandQuiz}
            className="font-bold text-brand hover:underline"
          >
            {t('learn.take_quiz', { n: QUIZ_LENGTH })}
          </button>
        </div>
      </div>

      <div className="mt-2 text-[22px] font-bold">{t('learn.lessons')}</div>
      <ol className="flex flex-col gap-3">
        {pack.lessons.map((l, i) => (
          <li key={l.id}>
            <button
              className="flex min-h-[76px] w-full items-center gap-3.5 rounded-2xl border-2 border-line bg-white px-4 py-3 text-left transition-all hover:border-brand/40"
              onClick={() => onOpen(l.id)}
            >
              <span className="num bg-brand">{i + 1}</span>
              <span className="flex-1">
                <span className="block text-[20px] font-bold leading-snug">{title(l)}</span>
                <span className="flex items-center gap-2 text-[15px] text-muted">
                  <span>{t('learn.minutes', { n: lessonMinutes(l) })}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1 font-semibold text-brand">
                    <Film size={13} />
                    <span>{t('learn.video.badge')}</span>
                  </span>
                </span>
              </span>
              {done.includes(l.id) && <span className="text-[15px] font-bold text-ok">✔ {t('learn.done')}</span>}
              {rec?.kind === 'lesson' && rec.topic === l.id && (
                <span className="rounded-lg bg-warn-bg px-2 py-0.5 text-[13px] font-bold text-warn">
                  {t('learn.recommended')}
                </span>
              )}
            </button>
          </li>
        ))}
      </ol>
      <OfflineDownload lessons={pack.lessons} />
    </>
  )
}

function LessonView({
  lesson,
  done,
  onDone,
  onChapterQuiz,
  onChapters,
}: {
  lesson: Lesson
  done: boolean
  onDone: (id: string) => void
  onChapterQuiz: (ch: Chapter) => void
  onChapters: () => void
}) {
  const { t, lang } = useLang()
  const [tab, setTab] = useState<'video' | 'cards'>('video')
  const [line, setLine] = useState(-1)
  const lines = useMemo(() => lessonLines(lesson, lang), [lesson, lang])
  const hot = (i: number) => (line === i ? 'rounded-xl bg-warn-bg px-2 -mx-2' : '')
  const todoLine = 2 + lesson.signs.length

  // Find the chapter that includes this lesson topic
  const matchingChapter = CHAPTERS.find((c) => c.topics.includes(lesson.id as any))

  return (
    <article className="flex flex-col gap-3">
      <h1 className={`text-[28px] font-bold leading-[1.3] ${hot(0)}`}>{pick(lesson.title, lang)}</h1>
      <p className="text-[16px] text-muted">{t('learn.minutes', { n: lessonMinutes(lesson) })}</p>

      {/* Tab Switcher: Video Explainer vs Visual Cards */}
      <div className="flex rounded-xl border border-line bg-soft p-1">
        <button
          type="button"
          onClick={() => setTab('video')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-[16px] font-bold transition-all ${
            tab === 'video' ? 'bg-brand text-white shadow-sm' : 'text-muted hover:text-ink'
          }`}
        >
          <Film size={18} />
          <span>{t('learn.video.tab_video')}</span>
        </button>
        <button
          type="button"
          onClick={() => setTab('cards')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-[16px] font-bold transition-all ${
            tab === 'cards' ? 'bg-brand text-white shadow-sm' : 'text-muted hover:text-ink'
          }`}
        >
          <LayoutGrid size={18} />
          <span>{t('learn.video.tab_cards')}</span>
        </button>
      </div>

      {tab === 'video' ? (
        <LessonVideo lesson={lesson} />
      ) : (
        <>
          <LessonAudio lesson={lesson} lines={lines} onLine={setLine} />
          <LessonCards cards={lessonCards(lesson)} />
        </>
      )}

      <section className="card">
        <h2 className="mb-1 text-[18px] font-bold text-brand">{t('learn.example')}</h2>
        <p className={`text-[20px] leading-[1.7] ${hot(1)}`}>{pick(lesson.example, lang)}</p>
      </section>
      <section className="card">
        <h2 className="mb-1 flex items-center gap-2 text-[18px] font-bold text-warn">
          <Icon name="warn" size={24} />
          {t('learn.signs')}
        </h2>
        <ul className="list-disc space-y-1 pl-6 text-[20px] leading-[1.6]">
          {lesson.signs.map((s, i) => (
            <li key={i} className={hot(2 + i)}>
              {pick(s, lang)}
            </li>
          ))}
        </ul>
      </section>
      <Banner tone="ok" className="!border-ok-line">
        <h2 className="mb-1 flex items-center gap-2 text-[18px] font-bold">
          <Icon name="check" size={24} stroke={2.5} />
          {t('learn.todo')}
        </h2>
        <p className={`text-[20px] leading-[1.6] ${hot(todoLine)}`}>{pick(lesson.todo, lang)}</p>
      </Banner>

      <button className="btn btn-primary" disabled={done} onClick={() => onDone(lesson.id)}>
        {done ? `✔ ${t('learn.done')}` : t('learn.mark_done')}
      </button>

      {/* Chapter Quiz Trigger Button */}
      {matchingChapter && (
        <button
          className="btn btn-secondary !min-h-[58px] !text-[18px] flex items-center justify-between"
          onClick={() => onChapterQuiz(matchingChapter)}
        >
          <span>
            {lang === 'hi'
              ? `अध्याय ${matchingChapter.number} की प्रश्नोत्तरी दें (20 प्रश्न)`
              : lang === 'cg'
              ? `अध्याय ${matchingChapter.number} के सवाल-जवाब देवव (20 सवाल)`
              : `Take Chapter ${matchingChapter.number} Quiz (20 Qs)`}
          </span>
          <ChevronRight size={20} />
        </button>
      )}

      <button className="self-center py-1 text-[16px] font-bold text-brand underline" onClick={onChapters}>
        {lang === 'hi' ? 'सभी 5 अध्याय प्रश्नोत्तरी देखें' : lang === 'cg' ? 'जम्मो 5 अध्याय सवाल-जवाब देखव' : 'Browse All 5 Chapters'}
      </button>
    </article>
  )
}

function QuizView({
  pack,
  chapter,
  isMuted = false,
  onToggleMute,
  onFinish,
  onFinishChapter,
  onQuit,
}: {
  pack: ContentPack
  chapter?: Chapter
  isMuted?: boolean
  onToggleMute?: () => void
  onFinish: (a: Attempt, prev: number | null) => void
  onFinishChapter?: (ch: Chapter, a: ChapterAttempt, prev: number | null) => void
  onQuit: () => void
}) {
  const { t, lang } = useLang()

  // Select 20 questions for chapter quiz, or 15 for grand speed quiz
  const { session, orders } = useMemo(() => {
    const seed = Date.now()
    if (chapter) {
      const qs = selectChapterQuestions(pack.questions, chapter, CHAPTER_QUESTIONS_COUNT, seed)
      return { session: qs, orders: qs.map((q) => displayOrder(q, seed)) }
    }
    const s = selectQuestions(pack.questions, QUIZ_LENGTH, usedQuestions(), seed)
    saveUsedQuestions(s.used)
    return { session: s.questions, orders: s.questions.map((q) => displayOrder(q, seed)) }
  }, [pack, chapter])

  const [i, setI] = useState(0)
  const [chosen, setChosen] = useState<number | null>(null)
  const [answers, setAnswers] = useState<Answer[]>([])

  // Gamification & Surprise states
  const [streak, setStreak] = useState(0)
  const [streakRecord, setStreakRecord] = useState(0)
  const [confettiActive, setConfettiActive] = useState(false)
  const [showVideoScenario, setShowVideoScenario] = useState(false)
  const [showClue, setShowClue] = useState(false)
  const [eliminatedOptions, setEliminatedOptions] = useState<number[]>([])
  const [hasMysteryChest, setHasMysteryChest] = useState(false)
  const [lifelines, setLifelines] = useState<LifelineState>({
    fiftyFiftyAvailable: 1,
    clueAvailable: 1,
    shieldActive: false,
  })

  useEffect(() => {
    setBusy('quiz', true)
    return () => setBusy('quiz', false)
  }, [])

  const q: Question = session[i]
  const res = chosen === null ? null : checkAnswer(q, chosen)

  const pickOption = (idx: number) => {
    if (chosen !== null || eliminatedOptions.includes(idx)) return
    setChosen(idx)
    const check = checkAnswer(q, idx)
    setAnswers((a) => [...a, check.answer])

    if (check.correct) {
      playQuizSound('correct', isMuted)
      setConfettiActive(true)
      const nextStreak = streak + 1
      setStreak(nextStreak)
      setStreakRecord((prev) => Math.max(prev, nextStreak))

      if (nextStreak >= 3) {
        playQuizSound('streak', isMuted)
      }
      if (nextStreak === 3 || (i + 1) % 5 === 0) {
        setHasMysteryChest(true)
      }
    } else {
      if (lifelines.shieldActive) {
        // Shield protected streak!
        playQuizSound('lifeline', isMuted)
        setLifelines((prev) => ({ ...prev, shieldActive: false }))
      } else {
        playQuizSound('wrong', isMuted)
        setStreak(0)
      }
    }
  }

  // 50:50 Lifeline handler
  const handleUseFiftyFifty = () => {
    if (lifelines.fiftyFiftyAvailable <= 0 || eliminatedOptions.length > 0 || chosen !== null) return
    const wrongOptions = q.options
      .map((_, idx) => idx)
      .filter((idx) => idx !== q.answer)

    // Pick 2 wrong options to eliminate if available
    const toEliminate = wrongOptions.slice(0, 2)
    setEliminatedOptions(toEliminate)
    setLifelines((prev) => ({ ...prev, fiftyFiftyAvailable: prev.fiftyFiftyAvailable - 1 }))
    playQuizSound('lifeline', isMuted)
  }

  // Clue Lifeline handler
  const handleUseClue = () => {
    if (lifelines.clueAvailable <= 0) return
    setShowClue(true)
    setLifelines((prev) => ({ ...prev, clueAvailable: prev.clueAvailable - 1 }))
    playQuizSound('mystery', isMuted)
  }

  // Mystery Chest reward handler
  const handleOpenMysteryChest = (reward: 'fiftyFifty' | 'clue' | 'shield') => {
    setHasMysteryChest(false)
    if (reward === 'fiftyFifty') {
      setLifelines((prev) => ({ ...prev, fiftyFiftyAvailable: prev.fiftyFiftyAvailable + 1 }))
    } else if (reward === 'clue') {
      setLifelines((prev) => ({ ...prev, clueAvailable: prev.clueAvailable + 1 }))
    } else {
      setLifelines((prev) => ({ ...prev, shieldActive: true }))
    }
  }

  const next = () => {
    if (i + 1 < session.length) {
      setI(i + 1)
      setChosen(null)
      setConfettiActive(false)
      setShowVideoScenario(false)
      setShowClue(false)
      setEliminatedOptions([])
      return
    }

    // Finished
    if (chapter && onFinishChapter) {
      const correctCount = answers.filter((a) => a.correct).length
      const score = Math.round((correctCount / session.length) * 100)
      const stars = score >= 90 ? 3 : score >= 70 ? 2 : score >= 50 ? 1 : 0
      const prevAttempt = chapterAttempts()[chapter.id]
      const prevScore = prevAttempt ? prevAttempt.score : null

      const attempt: ChapterAttempt = {
        at: Date.now(),
        chapterId: chapter.id,
        score,
        correctCount,
        totalQuestions: session.length,
        stars,
        bestStreak: streakRecord,
      }
      saveChapterAttempt(attempt)
      onFinishChapter(chapter, attempt, prevScore)
    } else {
      const topics = computeTopicScores(answers)
      const { score, level } = computeLiteracyScore(topics)
      const prev = attemptHistory().slice(-1)[0]?.score ?? null
      const attempt: Attempt = { at: Date.now(), score, level, topics }
      storeAttemptHistory(attempt)
      onFinish(attempt, prev)
    }
  }

  const letters = ['A', 'B', 'C', 'D']

  return (
    <section className="relative flex flex-col gap-3.5" data-testid="quiz">
      <QuizConfetti active={confettiActive} count={35} />

      {/* Quiz Top Bar with Chapter Tag & Sound Control */}
      <div className="flex items-center justify-between border-b border-line pb-2">
        <div>
          {chapter ? (
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-brand px-2 py-0.5 text-[12px] font-black text-white">
                {lang === 'hi' ? `अध्याय ${chapter.number}` : lang === 'cg' ? `अध्याय ${chapter.number}` : `Chapter ${chapter.number}`}
              </span>
              <span className="text-[15px] font-bold text-ink truncate max-w-[190px]">
                {pick(chapter.title, lang)}
              </span>
            </div>
          ) : (
            <span className="text-[14px] font-bold text-brand uppercase tracking-wider">
              {lang === 'hi' ? 'संपूर्ण गति परीक्षा' : lang === 'cg' ? 'जम्मो गति परीक्षा' : 'Comprehensive Speed Quiz'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onToggleMute && (
            <button
              type="button"
              onClick={onToggleMute}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-white text-muted hover:text-ink"
              aria-label={isMuted ? 'Unmute sounds' : 'Mute sounds'}
            >
              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
          )}
          <span className="text-[15px] font-bold text-ink">
            {t('learn.quiz.progress', { n: i + 1, total: session.length })}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-3 rounded-full bg-soft overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 transition-all duration-300"
          style={{ width: `${((i + (chosen !== null ? 1 : 0)) / session.length) * 100}%` }}
        />
      </div>

      {/* Surprise Bar: Streaks, Power-ups, Mystery Box */}
      <QuizSurprise
        streak={streak}
        streakRecord={streakRecord}
        lifelines={lifelines}
        onUseFiftyFifty={handleUseFiftyFifty}
        onUseClue={handleUseClue}
        hasMysteryChest={hasMysteryChest}
        onOpenMysteryChest={handleOpenMysteryChest}
        lang={lang}
        isMuted={isMuted}
      />

      {/* Clue Reveal Box */}
      {showClue && (
        <div className="flex items-start gap-2.5 rounded-2xl border-2 border-amber-300 bg-amber-50 p-3.5 text-amber-900 shadow-xs animate-fadeIn">
          <Lightbulb size={22} className="shrink-0 text-amber-600 mt-0.5" />
          <div className="text-[15px] leading-relaxed">
            <span className="font-black">{lang === 'hi' ? '💡 गुप्त संकेत: ' : lang === 'cg' ? '💡 गुप्त संकेत: ' : '💡 Clue: '}</span>
            <span>{pick(q.explanation, lang).split('.')[0]}.</span>
          </div>
        </div>
      )}

      {/* Question Card Header (Topic Chip + Difficulty) */}
      <div className="flex items-center justify-between px-1">
        <span className="rounded-lg bg-blue-50 border border-blue-200 px-2 py-0.5 text-[12px] font-bold text-brand uppercase">
          {q.topic.replace(/_/g, ' ')}
        </span>
        <span className="flex items-center gap-1 text-[12px] font-semibold text-muted">
          <span>{lang === 'hi' ? 'कठिनाई:' : lang === 'cg' ? 'कठिनाई:' : 'Difficulty:'}</span>
          <span className="text-amber-500 font-bold">
            {'★'.repeat(q.difficulty)}{'☆'.repeat(3 - q.difficulty)}
          </span>
        </span>
      </div>

      {/* Video Elements: Toggle Simulated Video Scene Player */}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setShowVideoScenario((prev) => !prev)}
          className="flex items-center justify-between rounded-xl border border-indigo-200 bg-indigo-50/70 px-3.5 py-2 text-[14px] font-bold text-indigo-900 hover:bg-indigo-100/70 transition-all"
        >
          <span className="flex items-center gap-2">
            <Film size={17} className="text-indigo-700" />
            <span>
              {showVideoScenario ? t('learn.quiz.hide_scenario') : t('learn.quiz.simulate_scenario')}
            </span>
          </span>
          <span className="text-[12px] font-semibold text-indigo-600">
            {showVideoScenario ? '▲' : '▼'}
          </span>
        </button>

        {showVideoScenario && (
          <div className="animate-fadeIn">
            <QuizVideoScenario question={q} lang={lang} />
          </div>
        )}
      </div>

      {/* Pictures & Scenario Visual Illustrations */}
      <QuizScenarioVisual question={q} lang={lang} questionIndex={i} />

      {/* Question Text */}
      <h2 className="text-[22px] font-black leading-snug text-ink pt-1">
        {pick(q.question, lang)}
      </h2>

      {/* Options List */}
      <div className="flex flex-col gap-2.5">
        {orders[i].map((idx) => {
          const isEliminated = eliminatedOptions.includes(idx)
          const state =
            chosen === null
              ? isEliminated
                ? 'opacity-35 line-through cursor-not-allowed border-dashed bg-slate-100 text-muted'
                : 'hover:border-brand/70 hover:bg-soft/40'
              : idx === q.answer
              ? '!border-ok-line !bg-ok-bg text-ok font-bold ring-2 ring-emerald-300'
              : idx === chosen
              ? '!border-bad-line !bg-bad-bg text-bad'
              : 'opacity-50'

          const letterIndex = orders[i].indexOf(idx)
          const letter = letters[letterIndex] || String(letterIndex + 1)

          return (
            <button
              key={idx}
              className={`btn btn-secondary !min-h-[64px] !justify-start !text-left !text-[19px] !px-4 flex items-center gap-3.5 transition-all shadow-2xs ${state}`}
              disabled={chosen !== null || isEliminated}
              onClick={() => pickOption(idx)}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[14px] font-black border transition-colors ${
                  chosen !== null && idx === q.answer
                    ? 'bg-ok text-white border-ok'
                    : chosen !== null && idx === chosen
                    ? 'bg-bad text-white border-bad'
                    : 'bg-soft text-brand border-line'
                }`}
              >
                {letter}
              </span>
              <span className="flex-1 leading-snug">{pick(q.options[idx], lang)}</span>
            </button>
          )
        })}
      </div>

      {/* Answer Feedback Banner */}
      {res && (
        <Banner
          tone={res.correct ? 'ok' : 'bad'}
          role="status"
          className={`${res.correct ? '!border-ok-line' : ''} shadow-md mt-2 animate-fadeIn`}
        >
          <div className="flex items-center gap-2">
            <span className="text-[22px]">
              {res.correct ? '✅' : '❌'}
            </span>
            <p className="text-[22px] font-black">
              {res.correct ? t('learn.quiz.correct') : t('learn.quiz.wrong')}
            </p>
          </div>
          <p className="text-[19px] leading-[1.6] mt-1.5">{pick(q.explanation, lang)}</p>
          <button className="btn btn-primary mt-3.5 w-full !min-h-[58px] !text-[20px]" onClick={next}>
            <span>{i + 1 < session.length ? t('learn.quiz.next') : t('learn.quiz.finish')}</span>
            <ChevronRight size={20} />
          </button>
        </Banner>
      )}

      {/* Leave Quiz Button */}
      <button
        type="button"
        className="self-start py-2 text-[16px] font-bold text-muted underline hover:text-ink transition-colors"
        onClick={onQuit}
      >
        {t('learn.quiz.quit')}
      </button>
    </section>
  )
}

function ScoreRing({ score }: { score: number }) {
  const C = 2 * Math.PI * 50
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" role="img" aria-label={`${score} / 100`} style={{ flex: 'none' }}>
      <circle cx="60" cy="60" r="50" fill="none" stroke="#e3ebff" strokeWidth="14" />
      <circle
        cx="60"
        cy="60"
        r="50"
        fill="none"
        stroke="#1747c4"
        strokeWidth="14"
        strokeLinecap="round"
        strokeDasharray={`${(C * score) / 100} ${C}`}
        transform="rotate(-90 60 60)"
      />
      <text x="60" y="68" textAnchor="middle" fontSize="30" fontWeight="700" fill="#0f1b3d">
        {score}
      </text>
    </svg>
  )
}

function ResultView({
  pack,
  attempt,
  previous,
  title,
  onRetry,
  onChapters,
  onLesson,
}: {
  pack: ContentPack
  attempt: Attempt
  previous: number | null
  title: (l: Lesson) => string
  onRetry: () => void
  onChapters: () => void
  onLesson: (id: string) => void
}) {
  const { t, lang } = useLang()
  const rec = recommendNextLesson(attempt.topics, attempt.score)
  const weakest = rec.kind === 'lesson' ? pack.lessons.find((l) => l.id === rec.topic) : null

  return (
    <section className="flex flex-1 flex-col gap-3" data-testid="score-card">
      <div className="card flex items-center gap-[18px] !p-4">
        <ScoreRing score={attempt.score} />
        <div>
          <div className="text-[26px] font-bold leading-tight text-brand">{t(`learn.score.level.${attempt.level}`)}</div>
          <div className="text-[18px] leading-snug text-muted">{t(`learn.score.desc.${attempt.level}`, { score: attempt.score })}</div>
          {previous !== null && <div className="mt-1 text-[15px] text-muted">{t('learn.score.previous', { score: previous })}</div>}
        </div>
      </div>

      <div className="card flex flex-col gap-3">
        {pack.lessons
          .filter((l) => l.id in attempt.topics)
          .map((l) => {
            const weak = weakest?.id === l.id
            return (
              <div key={l.id}>
                <div className={`flex justify-between gap-2 text-[19px] leading-snug ${weak ? 'text-warn' : ''}`}>
                  <span>
                    {weak ? (
                      <>
                        <b>{title(l)}</b> · {t('learn.weakest_tag')}
                      </>
                    ) : (
                      title(l)
                    )}
                  </span>
                  <b>{attempt.topics[l.id]}</b>
                </div>
                <div className={`h-3.5 rounded-[7px] ${weak ? 'bg-warn-bg' : 'bg-soft'}`}>
                  <div
                    className={`h-3.5 rounded-[7px] ${weak ? 'bg-warn-line' : 'bg-brand'}`}
                    style={{ width: `${attempt.topics[l.id]}%` }}
                  />
                </div>
              </div>
            )
          })}
      </div>

      <div className="mt-auto flex flex-col gap-2.5 pt-2">
        {/* Chapters Hub link button */}
        <button
          type="button"
          onClick={onChapters}
          className="btn btn-primary !min-h-[64px] !text-[20px] flex items-center justify-between"
        >
          <span>{lang === 'hi' ? '5 अध्याय प्रश्नोत्तरी खेलें' : lang === 'cg' ? '5 अध्याय सवाल-जवाब खेलव' : 'Try 5-Chapter Quiz Hub'}</span>
          <ChevronRight size={22} />
        </button>

        {weakest ? (
          <a
            className="btn btn-secondary !min-h-[58px] !text-[18px]"
            href={`#/learn?lesson=${weakest.id}`}
            onClick={(e) => {
              e.preventDefault()
              onLesson(weakest.id)
            }}
          >
            {t('learn.score.next', { topic: title(weakest) })}
          </a>
        ) : (
          <a className="btn btn-secondary !min-h-[58px] !text-[18px]" href="#/message">
            {t('learn.score.try_checker')}
          </a>
        )}
        <button className="btn btn-secondary" onClick={onRetry}>
          {t('learn.score.retry')}
        </button>
        <p className="text-[16px] leading-snug text-muted">{t('learn.score.indicative')}</p>
      </div>
    </section>
  )
}

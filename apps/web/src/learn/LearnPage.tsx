import { useEffect, useMemo, useState } from 'react'
import { Award, CheckCircle2, Film, LayoutGrid } from 'lucide-react'
import { categoryFromSignals, LESSON_FOR_CATEGORY } from '../shared/categories'
import { setBusy } from '../shell/busy'
import { useLang } from '../shell/i18n'
import { closeThenGo, useBackStep, useInnerScreenOnReturn } from '../shell/backStep'
import { Layout } from '../shell/Layout'
import { currentQuery, navigate } from '../shell/router'
import { Banner, Icon } from '../shell/ui'
import { lessonLines } from './audio'
import { loadContentPack, lessonCards, lessonMinutes, pick, type ContentPack, type Lesson, type Question } from './content'
import { LessonAudio } from './LessonAudio'
import { LessonCards } from './LessonCards'
import { LessonThumbnail } from './LessonThumbnail'
import { LessonVideo } from './LessonVideo'
import { OfflineDownload } from './OfflineDownload'
import { attemptHistory, doneLessons, markLessonComplete, saveUsedQuestions, storeAttemptHistory, usedQuestions, type Attempt } from './progress'
import { displayOrder, QUIZ_LENGTH, selectQuestions } from './quiz'
import { checkAnswer, computeLiteracyScore, computeTopicScores, recommendNextLesson, type Answer } from './score'

type View = { kind: 'home' } | { kind: 'lesson'; id: string } | { kind: 'quiz' } | { kind: 'result'; attempt: Attempt; previous: number | null }

/** The screen the address asks for: a lesson (?lesson=<id>, or ?from=<signals> from a check result) or the lesson list. */
function baseView(p: URLSearchParams): View {
  const id = p.get('lesson')
  const from = p.get('from')
  if (id) return { kind: 'lesson', id }
  if (from) return { kind: 'lesson', id: LESSON_FOR_CATEGORY[categoryFromSignals(from.split(',').filter(Boolean))] }
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

  useEffect(() => { loadContentPack().then(setPack).catch(() => setError(true)) }, [])

  // deep links: ?lesson=<id> or ?from=<signal,signal> (from the detector result)
  useEffect(() => {
    const b = baseView(params)
    setView((v) => (b.kind === 'lesson' || v.kind === 'lesson' ? b : v))
  }, [params])

  const title = (l: Lesson) => pick(l.title, lang)
  const startQuiz = () => setView({ kind: 'quiz' })
  const isResult = view.kind === 'result'
  useInnerScreenOnReturn()
  const back = useBackStep(view.kind === 'quiz' || isResult, () => setView(baseView(params)))
  const onBack = view.kind === 'quiz' || isResult ? back : undefined

  return (
    <Layout title={isResult ? t('learn.score.title') : view.kind === 'home' ? t('learn.title') : undefined} onBack={onBack}>
      {error && <Banner tone="bad" role="alert">{t('learn.error')}</Banner>}
      {!pack && !error && <p className="text-muted">{t('learn.loading')}</p>}
      {pack && view.kind === 'home' && <Home pack={pack} done={done} title={title} onOpen={(id) => navigate(`/learn?lesson=${id}`)} onQuiz={startQuiz} />}
      {pack && view.kind === 'lesson' && (
        <LessonView lesson={pack.lessons.find((l) => l.id === view.id) ?? pack.lessons[0]} done={done.includes(view.id)} onDone={(id) => { markLessonComplete(id); setDone(doneLessons()) }} onQuiz={startQuiz} />
      )}
      {pack && view.kind === 'quiz' && <QuizView pack={pack} onFinish={(attempt, previous) => setView({ kind: 'result', attempt, previous })} onQuit={back} />}
      {pack && view.kind === 'result' && <ResultView pack={pack} attempt={view.attempt} previous={view.previous} title={title} onRetry={startQuiz} onLesson={(id) => closeThenGo(back, `/learn?lesson=${id}`)} />}
    </Layout>
  )
}

function Home({ pack, done, title, onOpen, onQuiz }: { pack: ContentPack; done: string[]; title: (l: Lesson) => string; onOpen: (id: string) => void; onQuiz: () => void }) {
  const { t } = useLang()
  const last = attemptHistory().slice(-1)[0]
  const rec = last ? recommendNextLesson(last.topics, last.score) : null
  const completedCount = pack.lessons.filter((l) => done.includes(l.id)).length
  const totalCount = pack.lessons.length
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  // Prefer the quiz-recommended lesson if undone; otherwise fall back to the first uncompleted lesson
  const recommendedId =
    rec?.kind === 'lesson' && !done.includes(rec.topic)
      ? rec.topic
      : pack.lessons.find((l) => !done.includes(l.id))?.id ?? null

  return (
    <div className="space-y-5">
      {/* Light Civic Progress & Quiz Card */}
      <section className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-md shadow-blue-950/6 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EFF4FF] px-3 py-1 text-xs font-extrabold text-[#163264] ring-1 ring-blue-200/80">
                <CheckCircle2 className="size-3.5 text-[#1747c4]" strokeWidth={2.4} />
                <span>{completedCount} / {totalCount} {t('learn.done')}</span>
              </span>
              {last && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-extrabold text-[#14583a] ring-1 ring-emerald-200">
                  <Award className="size-3.5 text-emerald-600" strokeWidth={2.4} />
                  <span>{t('learn.score.previous', { score: last.score })}</span>
                </span>
              )}
            </div>

            <div className="h-2 w-full max-w-md overflow-hidden rounded-full bg-[#E3EBFF]">
              <div
                className="h-full rounded-full bg-[#1747c4] transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          <button
            className="btn btn-primary shrink-0 !min-h-12 !rounded-xl !px-5 !text-[16px] shadow-sm shadow-blue-950/15"
            onClick={onQuiz}
          >
            {t('learn.take_quiz', { n: QUIZ_LENGTH })}
          </button>
        </div>
      </section>

      {/* Section Header */}
      <div className="flex items-center justify-between px-0.5">
        <h2 className="text-[19px] font-extrabold tracking-tight text-[#0F1B3D]">
          {t('learn.lessons')}
        </h2>
        <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-500">
          <Film className="size-3.5 text-[#1747c4]" />
          <span>{totalCount} {t('learn.video.badge')}</span>
        </span>
      </div>

      {/* YouTube-Style Video Card Grid */}
      <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {pack.lessons.map((l, i) => {
          const isDone = done.includes(l.id)
          const isRec = recommendedId === l.id
          return (
            <li key={l.id}>
              <button
                type="button"
                onClick={() => onOpen(l.id)}
                className="group flex h-full w-full flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white text-left shadow-md shadow-blue-950/6 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#1747c4]/40 hover:shadow-xl hover:shadow-blue-950/12"
              >
                <LessonThumbnail
                  lessonId={l.id}
                  index={i}
                  durationLabel={t('learn.minutes', { n: lessonMinutes(l) })}
                  done={isDone}
                  doneLabel={t('learn.done')}
                  recommended={isRec}
                  recommendedLabel={t('learn.recommended')}
                />

                <div className="flex flex-1 flex-col justify-between gap-2 p-3.5">
                  <span className="line-clamp-2 text-[16.5px] font-bold leading-snug text-[#0F1B3D] transition-colors group-hover:text-[#1747c4]">
                    {title(l)}
                  </span>

                  <span className="flex items-center gap-2 text-[13px] font-medium text-slate-500">
                    <span>{t('learn.minutes', { n: lessonMinutes(l) })}</span>
                    <span aria-hidden="true">•</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-[#1747c4]">
                      <Film size={13} />
                      <span>{t('learn.video.badge')}</span>
                    </span>
                  </span>
                </div>
              </button>
            </li>
          )
        })}
      </ol>

      <OfflineDownload lessons={pack.lessons} />
    </div>
  )
}

function LessonView({ lesson, done, onDone, onQuiz }: { lesson: Lesson; done: boolean; onDone: (id: string) => void; onQuiz: () => void }) {
  const { t, lang } = useLang()
  const [tab, setTab] = useState<'video' | 'cards'>('video')
  const [line, setLine] = useState(-1)
  const lines = useMemo(() => lessonLines(lesson, lang), [lesson, lang])
  const hot = (i: number) => (line === i ? 'rounded-xl bg-warn-bg px-2 -mx-2' : '')
  const todoLine = 2 + lesson.signs.length

  return (
    <article className="flex flex-col gap-4">
      <div className="space-y-1">
        <h1 className={`text-[26px] font-extrabold leading-tight tracking-tight text-[#0F1B3D] ${hot(0)}`}>
          {pick(lesson.title, lang)}
        </h1>
        <p className="text-[14.5px] font-medium text-slate-500">
          {t('learn.minutes', { n: lessonMinutes(lesson) })}
        </p>
      </div>

      {/* Light Civic Tab Switcher: Video Explainer vs Visual Cards */}
      <div className="flex rounded-2xl border border-slate-200/90 bg-white p-1 shadow-xs">
        <button
          type="button"
          onClick={() => setTab('video')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-[15px] font-bold transition-all ${
            tab === 'video' ? 'bg-[#163264] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-[#0F1B3D]'
          }`}
        >
          <Film size={17} />
          <span>{t('learn.video.tab_video')}</span>
        </button>
        <button
          type="button"
          onClick={() => setTab('cards')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-[15px] font-bold transition-all ${
            tab === 'cards' ? 'bg-[#163264] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-[#0F1B3D]'
          }`}
        >
          <LayoutGrid size={17} />
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

      <section className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm shadow-blue-950/5">
        <h2 className="mb-1.5 text-[16px] font-extrabold text-[#1747c4]">{t('learn.example')}</h2>
        <p className={`text-[18px] leading-[1.65] text-slate-800 ${hot(1)}`}>{pick(lesson.example, lang)}</p>
      </section>

      <section className="rounded-2xl border border-amber-200/90 bg-white p-4 shadow-sm shadow-amber-950/5">
        <h2 className="mb-2 flex items-center gap-2 text-[16px] font-extrabold text-warn">
          <Icon name="warn" size={22} />
          {t('learn.signs')}
        </h2>
        <ul className="list-disc space-y-1.5 pl-6 text-[17.5px] leading-[1.6] text-slate-800">
          {lesson.signs.map((s, i) => <li key={i} className={hot(2 + i)}>{pick(s, lang)}</li>)}
        </ul>
      </section>

      <Banner tone="ok" className="!rounded-2xl !border-ok-line shadow-sm">
        <h2 className="mb-1 flex items-center gap-2 text-[16px] font-extrabold">
          <Icon name="check" size={22} stroke={2.5} />
          {t('learn.todo')}
        </h2>
        <p className={`text-[18px] leading-[1.6] ${hot(todoLine)}`}>{pick(lesson.todo, lang)}</p>
      </Banner>

      <div className="flex flex-col gap-2.5 sm:flex-row">
        <button className="btn btn-primary flex-1 shadow-sm" disabled={done} onClick={() => onDone(lesson.id)}>
          {done ? `✔ ${t('learn.done')}` : t('learn.mark_done')}
        </button>
        <button className="btn btn-secondary flex-1 shadow-xs" onClick={onQuiz}>
          {t('learn.take_quiz', { n: QUIZ_LENGTH })}
        </button>
      </div>
    </article>
  )
}

function QuizView({ pack, onFinish, onQuit }: { pack: ContentPack; onFinish: (a: Attempt, prev: number | null) => void; onQuit: () => void }) {
  const { t, lang } = useLang()
  const { session, orders } = useMemo(() => {
    const seed = Date.now()
    const s = selectQuestions(pack.questions, QUIZ_LENGTH, usedQuestions(), seed)
    saveUsedQuestions(s.used)
    return { session: s.questions, orders: s.questions.map((q) => displayOrder(q, seed)) }
  }, [pack])
  const [i, setI] = useState(0)
  const [chosen, setChosen] = useState<number | null>(null)
  const [answers, setAnswers] = useState<Answer[]>([])
  useEffect(() => { setBusy('quiz', true); return () => setBusy('quiz', false) }, [])

  const q: Question = session[i]
  const res = chosen === null ? null : checkAnswer(q, chosen)
  const pickOption = (idx: number) => {
    if (chosen !== null) return
    setChosen(idx)
    setAnswers((a) => [...a, checkAnswer(q, idx).answer])
  }
  const next = () => {
    if (i + 1 < session.length) { setI(i + 1); setChosen(null); return }
    const topics = computeTopicScores(answers)
    const { score, level } = computeLiteracyScore(topics)
    const prev = attemptHistory().slice(-1)[0]?.score ?? null
    const attempt: Attempt = { at: Date.now(), score, level, topics }
    storeAttemptHistory(attempt)
    onFinish(attempt, prev)
  }

  return (
    <section className="flex flex-col gap-3" data-testid="quiz">
      <p className="text-[18px] font-bold">{t('learn.quiz.progress', { n: i + 1, total: session.length })}</p>
      <div className="h-3.5 rounded-[7px] bg-soft"><div className="h-3.5 rounded-[7px] bg-brand" style={{ width: `${((i + (chosen !== null ? 1 : 0)) / session.length) * 100}%` }} /></div>
      <h2 className="text-[22px] font-bold leading-snug">{pick(q.question, lang)}</h2>
      <div className="flex flex-col gap-2.5">
        {orders[i].map((idx) => {
          const state = chosen === null ? '' : idx === q.answer ? '!border-ok-line !bg-ok-bg' : idx === chosen ? '!border-bad-line !bg-bad-bg' : ''
          return <button key={idx} className={`btn btn-secondary !justify-start !text-left !text-[20px] ${state}`} disabled={chosen !== null} onClick={() => pickOption(idx)}>{pick(q.options[idx], lang)}</button>
        })}
      </div>
      {res && (
        <Banner tone={res.correct ? 'ok' : 'bad'} role="status" className={res.correct ? '!border-ok-line' : ''}>
          <p className="text-[21px] font-bold">{res.correct ? `✅ ${t('learn.quiz.correct')}` : `❌ ${t('learn.quiz.wrong')}`}</p>
          <p className="text-[19px] leading-[1.6]">{pick(q.explanation, lang)}</p>
          <button className="btn btn-primary mt-3 w-full" onClick={next}>{i + 1 < session.length ? t('learn.quiz.next') : t('learn.quiz.finish')}</button>
        </Banner>
      )}
      <button className="self-start text-[17px] font-bold text-muted underline" onClick={onQuit}>{t('learn.quiz.quit')}</button>
    </section>
  )
}

function ScoreRing({ score }: { score: number }) {
  const C = 2 * Math.PI * 50
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" role="img" aria-label={`${score} / 100`} style={{ flex: 'none' }}>
      <circle cx="60" cy="60" r="50" fill="none" stroke="#e3ebff" strokeWidth="14" />
      <circle cx="60" cy="60" r="50" fill="none" stroke="#1747c4" strokeWidth="14" strokeLinecap="round" strokeDasharray={`${(C * score) / 100} ${C}`} transform="rotate(-90 60 60)" />
      <text x="60" y="68" textAnchor="middle" fontSize="30" fontWeight="700" fill="#0f1b3d">{score}</text>
    </svg>
  )
}

function ResultView({ pack, attempt, previous, title, onRetry, onLesson }: { pack: ContentPack; attempt: Attempt; previous: number | null; title: (l: Lesson) => string; onRetry: () => void; onLesson: (id: string) => void }) {
  const { t } = useLang()
  const rec = recommendNextLesson(attempt.topics, attempt.score)
  const weakest = rec.kind === 'lesson' ? pack.lessons.find((l) => l.id === rec.topic) : null
  return (
    <section className="flex flex-1 flex-col gap-3" data-testid="score-card">
      <div className="card flex items-center gap-[18px] !p-4 shadow-md shadow-blue-950/6">
        <ScoreRing score={attempt.score} />
        <div>
          <div className="text-[26px] font-bold leading-tight text-brand">{t(`learn.score.level.${attempt.level}`)}</div>
          <div className="text-[18px] leading-snug text-muted">{t(`learn.score.desc.${attempt.level}`, { score: attempt.score })}</div>
          {previous !== null && <div className="mt-1 text-[15px] text-muted">{t('learn.score.previous', { score: previous })}</div>}
        </div>
      </div>

      <div className="card flex flex-col gap-3 shadow-sm shadow-blue-950/5">
        {pack.lessons.filter((l) => l.id in attempt.topics).map((l) => {
          const weak = weakest?.id === l.id
          return (
            <div key={l.id}>
              <div className={`flex justify-between gap-2 text-[19px] leading-snug ${weak ? 'text-warn' : ''}`}><span>{weak ? <><b>{title(l)}</b> · {t('learn.weakest_tag')}</> : title(l)}</span><b>{attempt.topics[l.id]}</b></div>
              <div className={`h-3.5 rounded-[7px] ${weak ? 'bg-warn-bg' : 'bg-soft'}`}><div className={`h-3.5 rounded-[7px] ${weak ? 'bg-warn-line' : 'bg-brand'}`} style={{ width: `${attempt.topics[l.id]}%` }} /></div>
            </div>
          )
        })}
      </div>

      <div className="mt-auto flex flex-col gap-2.5 pt-2">
        {weakest ? (
          <a className="btn btn-primary !min-h-[68px] !text-[22px]" href={`#/learn?lesson=${weakest.id}`} onClick={(e) => { e.preventDefault(); onLesson(weakest.id) }}>{t('learn.score.next', { topic: title(weakest) })}</a>
        ) : (
          <a className="btn btn-primary !min-h-[68px] !text-[22px]" href="#/message">{t('learn.score.try_checker')}</a>
        )}
        <button className="btn btn-secondary" onClick={onRetry}>{t('learn.score.retry')}</button>
        <p className="text-[16px] leading-snug text-muted">{t('learn.score.indicative')}</p>
      </div>
    </section>
  )
}
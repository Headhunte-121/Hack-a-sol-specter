import { useEffect, useMemo, useState } from 'react'
import { categoryFromSignals, LESSON_FOR_CATEGORY } from '../shared/categories'
import { setBusy } from '../shell/busy'
import { useLang } from '../shell/i18n'
import { Layout } from '../shell/Layout'
import { currentQuery, navigate } from '../shell/router'
import { loadContentPack, pick, type ContentPack, type Lesson, type Question } from './content'
import { attemptHistory, doneLessons, markLessonComplete, saveUsedQuestions, storeAttemptHistory, usedQuestions, type Attempt } from './progress'
import { selectQuestions } from './quiz'
import { checkAnswer, computeLiteracyScore, computeTopicScores, recommendNextLesson, type Answer } from './score'

type View = { kind: 'home' } | { kind: 'lesson'; id: string } | { kind: 'quiz' } | { kind: 'result'; attempt: Attempt; previous: number | null }

function useHashParams() {
  const [q, setQ] = useState(currentQuery)
  useEffect(() => {
    const on = () => setQ(currentQuery())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return q
}

function Speak({ text, lang }: { text: string; lang: string }) {
  const { t } = useLang()
  const [on, setOn] = useState(false)
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null // hide the icon rather than fail
  const toggle = () => {
    if (on) { speechSynthesis.cancel(); setOn(false); return }
    const u = new SpeechSynthesisUtterance(text)
    u.lang = lang === 'en' ? 'en-IN' : 'hi-IN'
    u.onend = () => setOn(false)
    speechSynthesis.cancel(); speechSynthesis.speak(u); setOn(true)
  }
  return <button className="btn btn-secondary min-h-11" onClick={toggle}>🔊 {on ? t('learn.stop_audio') : t('learn.read_aloud')}</button>
}

export default function LearnPage() {
  const { t, lang } = useLang()
  const params = useHashParams()
  const [pack, setPack] = useState<ContentPack | null>(null)
  const [error, setError] = useState(false)
  const [view, setView] = useState<View>({ kind: 'home' })
  const [done, setDone] = useState<string[]>(doneLessons())

  useEffect(() => {
    loadContentPack().then(setPack).catch(() => setError(true))
  }, [])

  // deep links: ?lesson=<id> or ?from=<signal,signal> (from the detector result)
  useEffect(() => {
    const id = params.get('lesson')
    const from = params.get('from')
    if (id) setView({ kind: 'lesson', id })
    else if (from) setView({ kind: 'lesson', id: LESSON_FOR_CATEGORY[categoryFromSignals(from.split(',').filter(Boolean))] })
    else setView((v) => (v.kind === 'lesson' ? { kind: 'home' } : v))
  }, [params])

  const title = (l: Lesson) => pick(l.title, lang)
  const startQuiz = () => setView({ kind: 'quiz' })

  return (
    <Layout title={t('learn.title')}>
      {error && <p role="alert" className="rounded-xl border-2 border-red-600 bg-red-50 p-3 text-red-900">{t('learn.error')}</p>}
      {!pack && !error && <p>{t('learn.loading')}</p>}
      {pack && view.kind === 'home' && <Home pack={pack} done={done} title={title} onOpen={(id) => navigate(`/learn?lesson=${id}`)} onQuiz={startQuiz} />}
      {pack && view.kind === 'lesson' && (
        <LessonView lesson={pack.lessons.find((l) => l.id === view.id) ?? pack.lessons[0]} done={done.includes(view.id)} onDone={(id) => { markLessonComplete(id); setDone(doneLessons()) }} onBack={() => navigate('/learn')} onQuiz={startQuiz} />
      )}
      {pack && view.kind === 'quiz' && (
        <QuizView pack={pack} onFinish={(attempt, previous) => setView({ kind: 'result', attempt, previous })} onQuit={() => setView({ kind: 'home' })} />
      )}
      {pack && view.kind === 'result' && (
        <ResultView pack={pack} attempt={view.attempt} previous={view.previous} title={title} onRetry={startQuiz} />
      )}
    </Layout>
  )
}

function Home({ pack, done, title, onOpen, onQuiz }: { pack: ContentPack; done: string[]; title: (l: Lesson) => string; onOpen: (id: string) => void; onQuiz: () => void }) {
  const { t } = useLang()
  const last = attemptHistory().slice(-1)[0]
  const rec = last ? recommendNextLesson(last.topics, last.score) : null
  return (
    <>
      <button className="btn btn-primary w-full" onClick={onQuiz}>📝 {t('learn.take_quiz')}</button>
      {last && <p className="text-sm">{t('learn.score.previous', { score: last.score })}</p>}
      <h2 className="font-bold">{t('learn.lessons')}</h2>
      <ol className="space-y-3">
        {pack.lessons.map((l, i) => (
          <li key={l.id}>
            <button className="card flex min-h-16 w-full items-center gap-3 text-left font-bold" onClick={() => onOpen(l.id)}>
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-teal-700 text-white">{i + 1}</span>
              <span className="flex-1">{title(l)}</span>
              {done.includes(l.id) && <span className="text-sm text-green-800">✔ {t('learn.done')}</span>}
              {rec?.kind === 'lesson' && rec.topic === l.id && <span className="rounded bg-amber-200 px-2 text-xs">{t('learn.recommended')}</span>}
            </button>
          </li>
        ))}
      </ol>
    </>
  )
}

function LessonView({ lesson, done, onDone, onBack, onQuiz }: { lesson: Lesson; done: boolean; onDone: (id: string) => void; onBack: () => void; onQuiz: () => void }) {
  const { t, lang } = useLang()
  const spoken = [pick(lesson.title, lang), pick(lesson.example, lang), ...lesson.signs.map((s) => pick(s, lang)), pick(lesson.todo, lang)].join('. ')
  return (
    <article className="space-y-4">
      <h2 className="text-xl font-bold">{pick(lesson.title, lang)}</h2>
      <Speak text={spoken} lang={lang} />
      <section className="card"><h3 className="mb-1 font-bold">{t('learn.example')}</h3><p className="leading-8">{pick(lesson.example, lang)}</p></section>
      <section className="card"><h3 className="mb-1 font-bold">⚠️ {t('learn.signs')}</h3><ul className="list-disc space-y-1 pl-5 leading-8">{lesson.signs.map((s, i) => <li key={i}>{pick(s, lang)}</li>)}</ul></section>
      <section className="card border-green-700"><h3 className="mb-1 font-bold">✅ {t('learn.todo')}</h3><p className="leading-8">{pick(lesson.todo, lang)}</p></section>
      <button className="btn btn-primary w-full" disabled={done} onClick={() => onDone(lesson.id)}>{done ? `✔ ${t('learn.done')}` : t('learn.mark_done')}</button>
      <button className="btn btn-secondary w-full" onClick={onQuiz}>📝 {t('learn.take_quiz')}</button>
      <button className="underline" onClick={onBack}>← {t('common.back')}</button>
    </article>
  )
}

function QuizView({ pack, onFinish, onQuit }: { pack: ContentPack; onFinish: (a: Attempt, prev: number | null) => void; onQuit: () => void }) {
  const { t, lang } = useLang()
  const session = useMemo(() => {
    const s = selectQuestions(pack.questions, 12, usedQuestions())
    saveUsedQuestions(s.used)
    return s.questions
  }, [pack])
  const [i, setI] = useState(0)
  const [chosen, setChosen] = useState<number | null>(null)
  const [answers, setAnswers] = useState<Answer[]>([])
  useEffect(() => { setBusy('quiz', true); return () => setBusy('quiz', false) }, []) // never refresh the app mid-quiz

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
    <section className="space-y-4" data-testid="quiz">
      <p className="font-bold">{t('learn.quiz.progress', { n: i + 1, total: session.length })}</p>
      <div className="h-2 rounded bg-slate-300"><div className="h-2 rounded bg-teal-700" style={{ width: `${((i + (chosen !== null ? 1 : 0)) / session.length) * 100}%` }} /></div>
      <h2 className="text-lg font-bold leading-8">{pick(q.question, lang)}</h2>
      <div className="space-y-2">
        {q.options.map((o, idx) => {
          const state = chosen === null ? '' : idx === q.answer ? 'border-green-700 bg-green-100' : idx === chosen ? 'border-red-700 bg-red-100' : ''
          return <button key={idx} className={`btn btn-secondary w-full justify-start text-left ${state}`} disabled={chosen !== null} onClick={() => pickOption(idx)}>{pick(o, lang)}</button>
        })}
      </div>
      {res && (
        <div role="status" className={`card ${res.correct ? 'border-green-700' : 'border-red-700'}`}>
          <p className="font-bold">{res.correct ? `✅ ${t('learn.quiz.correct')}` : `❌ ${t('learn.quiz.wrong')}`}</p>
          <p className="leading-8">{pick(q.explanation, lang)}</p>
          <button className="btn btn-primary mt-3 w-full" onClick={next}>{i + 1 < session.length ? t('learn.quiz.next') : t('learn.quiz.finish')}</button>
        </div>
      )}
      <button className="underline" onClick={onQuit}>{t('learn.quiz.quit')}</button>
    </section>
  )
}

function ResultView({ pack, attempt, previous, title, onRetry }: { pack: ContentPack; attempt: Attempt; previous: number | null; title: (l: Lesson) => string; onRetry: () => void }) {
  const { t } = useLang()
  const rec = recommendNextLesson(attempt.topics, attempt.score)
  const weakest = rec.kind === 'lesson' ? pack.lessons.find((l) => l.id === rec.topic) : null
  return (
    <section className="space-y-4" data-testid="score-card">
      <h2 className="text-lg font-bold">{t('learn.score.title')}</h2>
      <div className="card text-center">
        <p className="text-6xl font-bold text-teal-800">{attempt.score}<span className="text-2xl">/100</span></p>
        <p className="mt-1 text-xl font-bold">{t(`learn.score.level.${attempt.level}`)}</p>
        {previous !== null && <p className="text-sm">{t('learn.score.previous', { score: previous })}</p>}
      </div>
      <div className="card space-y-2">
        <h3 className="font-bold">{t('learn.topic_bars')}</h3>
        {pack.lessons.filter((l) => l.id in attempt.topics).map((l) => (
          <div key={l.id}>
            <div className="flex justify-between text-sm"><span>{title(l)}</span><span>{attempt.topics[l.id]}</span></div>
            <div className="h-3 rounded bg-slate-200"><div className="h-3 rounded bg-teal-700" style={{ width: `${attempt.topics[l.id]}%` }} /></div>
          </div>
        ))}
      </div>
      {weakest ? (
        <>
          <p className="font-bold">{t('learn.score.weakest', { topic: title(weakest) })}</p>
          <a className="btn btn-primary" href={`#/learn?lesson=${weakest.id}`}>📖 {t('learn.score.read_next')}</a>
        </>
      ) : (
        <a className="btn btn-primary" href="#/message">🔍 {t('learn.score.try_checker')}</a>
      )}
      <button className="btn btn-secondary w-full" onClick={onRetry}>{t('learn.score.retry')}</button>
      <p className="text-xs text-slate-600">{t('learn.score.indicative')}</p>
    </section>
  )
}

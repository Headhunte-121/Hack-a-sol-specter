import { useEffect, useMemo, useState } from 'react'
import { categoryFromSignals, LESSON_FOR_CATEGORY } from '../shared/categories'
import { setBusy } from '../shell/busy'
import { useLang } from '../shell/i18n'
import { Layout } from '../shell/Layout'
import { currentQuery, navigate } from '../shell/router'
import { Banner, Icon } from '../shell/ui'
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
  return <button className="btn btn-secondary" onClick={toggle}><Icon name="speaker" size={26} />{on ? t('learn.stop_audio') : t('learn.read_aloud')}</button>
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
    const id = params.get('lesson')
    const from = params.get('from')
    if (id) setView({ kind: 'lesson', id })
    else if (from) setView({ kind: 'lesson', id: LESSON_FOR_CATEGORY[categoryFromSignals(from.split(',').filter(Boolean))] })
    else setView((v) => (v.kind === 'lesson' ? { kind: 'home' } : v))
  }, [params])

  const title = (l: Lesson) => pick(l.title, lang)
  const startQuiz = () => setView({ kind: 'quiz' })
  const isResult = view.kind === 'result'
  const onBack = view.kind === 'quiz' || isResult ? () => setView({ kind: 'home' }) : view.kind === 'lesson' ? () => navigate('/learn') : undefined

  return (
    <Layout title={isResult ? t('learn.score.title') : view.kind === 'home' ? t('learn.title') : undefined} onBack={onBack}>
      {error && <Banner tone="bad" role="alert">{t('learn.error')}</Banner>}
      {!pack && !error && <p className="text-muted">{t('learn.loading')}</p>}
      {pack && view.kind === 'home' && <Home pack={pack} done={done} title={title} onOpen={(id) => navigate(`/learn?lesson=${id}`)} onQuiz={startQuiz} />}
      {pack && view.kind === 'lesson' && (
        <LessonView lesson={pack.lessons.find((l) => l.id === view.id) ?? pack.lessons[0]} done={done.includes(view.id)} onDone={(id) => { markLessonComplete(id); setDone(doneLessons()) }} onQuiz={startQuiz} />
      )}
      {pack && view.kind === 'quiz' && <QuizView pack={pack} onFinish={(attempt, previous) => setView({ kind: 'result', attempt, previous })} onQuit={() => setView({ kind: 'home' })} />}
      {pack && view.kind === 'result' && <ResultView pack={pack} attempt={view.attempt} previous={view.previous} title={title} onRetry={startQuiz} />}
    </Layout>
  )
}

function Home({ pack, done, title, onOpen, onQuiz }: { pack: ContentPack; done: string[]; title: (l: Lesson) => string; onOpen: (id: string) => void; onQuiz: () => void }) {
  const { t } = useLang()
  const last = attemptHistory().slice(-1)[0]
  const rec = last ? recommendNextLesson(last.topics, last.score) : null
  return (
    <>
      <button className="btn btn-primary !min-h-[68px] !text-[24px]" onClick={onQuiz}>{t('learn.take_quiz')}</button>
      {last && <p className="text-[16px] text-muted">{t('learn.score.previous', { score: last.score })}</p>}
      <div className="text-[22px] font-bold">{t('learn.lessons')}</div>
      <ol className="flex flex-col gap-3">
        {pack.lessons.map((l, i) => (
          <li key={l.id}>
            <button className="flex min-h-[76px] w-full items-center gap-3.5 rounded-2xl border-2 border-line bg-white px-4 py-3 text-left" onClick={() => onOpen(l.id)}>
              <span className="num bg-brand">{i + 1}</span>
              <span className="flex-1 text-[20px] font-bold leading-snug">{title(l)}</span>
              {done.includes(l.id) && <span className="text-[15px] font-bold text-ok">✔ {t('learn.done')}</span>}
              {rec?.kind === 'lesson' && rec.topic === l.id && <span className="rounded-lg bg-warn-bg px-2 py-0.5 text-[13px] font-bold text-warn">{t('learn.recommended')}</span>}
            </button>
          </li>
        ))}
      </ol>
    </>
  )
}

function LessonView({ lesson, done, onDone, onQuiz }: { lesson: Lesson; done: boolean; onDone: (id: string) => void; onQuiz: () => void }) {
  const { t, lang } = useLang()
  const spoken = [pick(lesson.title, lang), pick(lesson.example, lang), ...lesson.signs.map((s) => pick(s, lang)), pick(lesson.todo, lang)].join('. ')
  return (
    <article className="flex flex-col gap-3">
      <h1 className="text-[28px] font-bold leading-[1.3]">{pick(lesson.title, lang)}</h1>
      <Speak text={spoken} lang={lang} />
      <section className="card"><h2 className="mb-1 text-[18px] font-bold text-brand">{t('learn.example')}</h2><p className="text-[20px] leading-[1.7]">{pick(lesson.example, lang)}</p></section>
      <section className="card"><h2 className="mb-1 flex items-center gap-2 text-[18px] font-bold text-warn"><Icon name="warn" size={24} />{t('learn.signs')}</h2><ul className="list-disc space-y-1 pl-6 text-[20px] leading-[1.6]">{lesson.signs.map((s, i) => <li key={i}>{pick(s, lang)}</li>)}</ul></section>
      <Banner tone="ok" className="!border-ok-line"><h2 className="mb-1 flex items-center gap-2 text-[18px] font-bold"><Icon name="check" size={24} stroke={2.5} />{t('learn.todo')}</h2><p className="text-[20px] leading-[1.6]">{pick(lesson.todo, lang)}</p></Banner>
      <button className="btn btn-primary" disabled={done} onClick={() => onDone(lesson.id)}>{done ? `✔ ${t('learn.done')}` : t('learn.mark_done')}</button>
      <button className="btn btn-secondary" onClick={onQuiz}>{t('learn.take_quiz')}</button>
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
    <section className="flex flex-col gap-3" data-testid="quiz">
      <p className="text-[18px] font-bold">{t('learn.quiz.progress', { n: i + 1, total: session.length })}</p>
      <div className="h-3.5 rounded-[7px] bg-soft"><div className="h-3.5 rounded-[7px] bg-brand" style={{ width: `${((i + (chosen !== null ? 1 : 0)) / session.length) * 100}%` }} /></div>
      <h2 className="text-[22px] font-bold leading-snug">{pick(q.question, lang)}</h2>
      <div className="flex flex-col gap-2.5">
        {q.options.map((o, idx) => {
          const state = chosen === null ? '' : idx === q.answer ? '!border-ok-line !bg-ok-bg' : idx === chosen ? '!border-bad-line !bg-bad-bg' : ''
          return <button key={idx} className={`btn btn-secondary !justify-start !text-left !text-[20px] ${state}`} disabled={chosen !== null} onClick={() => pickOption(idx)}>{pick(o, lang)}</button>
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

function ResultView({ pack, attempt, previous, title, onRetry }: { pack: ContentPack; attempt: Attempt; previous: number | null; title: (l: Lesson) => string; onRetry: () => void }) {
  const { t } = useLang()
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
          <a className="btn btn-primary !min-h-[68px] !text-[22px]" href={`#/learn?lesson=${weakest.id}`}>{t('learn.score.next', { topic: title(weakest) })}</a>
        ) : (
          <a className="btn btn-primary !min-h-[68px] !text-[22px]" href="#/message">{t('learn.score.try_checker')}</a>
        )}
        <button className="btn btn-secondary" onClick={onRetry}>{t('learn.score.retry')}</button>
        <p className="text-[16px] leading-snug text-muted">{t('learn.score.indicative')}</p>
      </div>
    </section>
  )
}

import { useEffect } from 'react'
import { Award, CheckCircle, ChevronRight, Flame, RotateCcw, Sparkles, Star, Trophy } from 'lucide-react'
import { useLang } from '../shell/i18n'
import { CHAPTERS, type Chapter } from './chapters'
import { pick, type ContentPack } from './content'
import { Chapter5Artwork } from './PaintedArtwork'
import type { ChapterAttempt } from './progress'
import { QuizConfetti } from './QuizConfetti'
import { playQuizSound } from './quizAudio'

interface ChapterResultViewProps {
  pack: ContentPack
  chapter: Chapter
  attempt: ChapterAttempt
  previous: number | null
  onNextChapter?: (nextChapter: Chapter) => void
  onRetry: () => void
  onBackToChapters: () => void
  isMuted?: boolean
}

export function ChapterResultView({
  pack,
  chapter,
  attempt,
  previous,
  onNextChapter,
  onRetry,
  onBackToChapters,
  isMuted = false,
}: ChapterResultViewProps) {
  const { t, lang } = useLang()

  useEffect(() => {
    playQuizSound('complete', isMuted)
  }, [isMuted])

  const nextChapter = CHAPTERS.find((c) => c.number === chapter.number + 1)
  const isPerfect = attempt.score === 100
  const isHighPass = attempt.score >= 80

  const C = 2 * Math.PI * 52
  const strokeDash = `${(C * attempt.score) / 100} ${C}`

  return (
    <section className="relative flex flex-1 flex-col gap-4" data-testid="chapter-result-card">
      <QuizConfetti active={isHighPass} count={60} />

      {/* Hero Banner with Painted Family Artwork */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-indigo-700 to-brand p-5 text-center text-white shadow-lg">
        {/* Large Painted Family Banner Image */}
        <div className="overflow-hidden rounded-2xl mb-4 max-h-44 border border-white/25 shadow-xl">
          <img
            src="images/quiz/chapter_5_banner.jpg"
            alt="Chapter Completion Hero"
            className="w-full h-full object-cover"
          />
        </div>

        <span className="rounded-full bg-white/20 px-3.5 py-1 text-[13px] font-bold uppercase tracking-wider text-blue-100">
          {lang === 'hi' ? `अध्याय ${chapter.number} पूरा हुआ!` : lang === 'cg' ? `अध्याय ${chapter.number} पूरा होगे!` : `Chapter ${chapter.number} Completed!`}
        </span>

        <h2 className="mt-2 text-[26px] font-black leading-tight">
          {pick(chapter.title, lang)}
        </h2>

        {/* Stars Earned */}
        <div className="mt-3 flex items-center justify-center gap-2">
          {[1, 2, 3].map((starIdx) => (
            <Star
              key={starIdx}
              size={32}
              className={`transition-all duration-300 ${
                starIdx <= attempt.stars
                  ? 'fill-amber-300 text-amber-300 drop-shadow-md scale-110'
                  : 'text-white/30'
              }`}
            />
          ))}
        </div>
        <p className="mt-1 text-[14px] text-blue-100">
          {attempt.stars === 3
            ? (lang === 'hi' ? 'उत्कृष्ट! पूर्ण 3 सितारे प्राप्त हुए!' : lang === 'cg' ? 'बब्बाल! पूरा 3 सितारा मिलिस!' : 'Outstanding! All 3 Stars Earned!')
            : attempt.stars === 2
            ? (lang === 'hi' ? 'बहुत अच्छा! 2 सितारे प्राप्त हुए।' : lang === 'cg' ? 'बने हे! 2 सितारा मिलिस।' : 'Great Job! 2 Stars Earned.')
            : (lang === 'hi' ? 'अच्छा प्रयास! 1 सितारा प्राप्त हुआ।' : lang === 'cg' ? 'बने कोसिस! 1 सितारा मिलिस।' : 'Good Effort! 1 Star Earned.')}
        </p>
      </div>

      {/* Score & Streak Stats Card */}
      <div className="card flex items-center justify-around gap-4 !p-5">
        {/* Animated Score Ring */}
        <div className="flex flex-col items-center">
          <svg width="124" height="124" viewBox="0 0 124 124" className="shrink-0" aria-label={`${attempt.score}%`}>
            <circle cx="62" cy="62" r="52" fill="none" stroke="#e3ebff" strokeWidth="12" />
            <circle
              cx="62"
              cy="62"
              r="52"
              fill="none"
              stroke="#1747c4"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={strokeDash}
              transform="rotate(-90 62 62)"
            />
            <text x="62" y="65" textAnchor="middle" fontSize="28" fontWeight="800" fill="#0f1b3d">
              {attempt.score}%
            </text>
            <text x="62" y="82" textAnchor="middle" fontSize="12" fontWeight="600" fill="#64748b">
              {attempt.correctCount}/{attempt.totalQuestions}
            </text>
          </svg>
          <span className="mt-1 text-[13px] font-bold text-muted">
            {lang === 'hi' ? 'सटीकता स्कोर' : lang === 'cg' ? 'सटीक स्कोर' : 'Accuracy Score'}
          </span>
        </div>

        {/* Best Streak & Previous */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2 rounded-2xl bg-amber-50 border border-amber-200 px-3.5 py-2.5">
            <Flame size={24} className="text-orange-500" />
            <div>
              <p className="text-[12px] font-bold text-amber-900 uppercase">
                {lang === 'hi' ? 'सर्वश्रेष्ठ स्ट्रीक' : lang === 'cg' ? 'सबले बने स्ट्रीक' : 'Best Streak'}
              </p>
              <p className="text-[18px] font-black text-amber-950">
                {attempt.bestStreak} {lang === 'hi' ? 'लगातार सही' : lang === 'cg' ? 'लगातार सही' : 'in a row'} 🔥
              </p>
            </div>
          </div>

          {previous !== null && (
            <div className="rounded-xl bg-soft px-3 py-1.5 text-[13px] text-muted font-medium">
              {lang === 'hi' ? `पिछला प्रयास: ${previous}%` : lang === 'cg' ? `पिछला प्रयास: ${previous}%` : `Previous Score: ${previous}%`}
            </div>
          )}
        </div>
      </div>

      {/* Topics Breakdown */}
      <div className="card flex flex-col gap-3">
        <h3 className="text-[17px] font-bold text-brand flex items-center gap-2">
          <Award size={20} />
          <span>{lang === 'hi' ? 'अध्याय में शामिल विषय' : lang === 'cg' ? 'अध्याय म सामिल विषय' : 'Topics Covered in Chapter'}</span>
        </h3>
        {chapter.topics.map((topicId) => {
          const lesson = pack.lessons.find((l) => l.id === topicId)
          if (!lesson) return null
          return (
            <div key={topicId} className="flex items-center justify-between gap-3 rounded-xl border border-line p-3">
              <span className="text-[16px] font-bold text-ink">
                {pick(lesson.title, lang)}
              </span>
              <span className="flex items-center gap-1 text-[14px] font-bold text-ok">
                <CheckCircle size={16} />
                <span>{lang === 'hi' ? 'समीक्षित' : lang === 'cg' ? 'जांचे' : 'Tested'}</span>
              </span>
            </div>
          )
        })}
      </div>

      {/* Action Buttons */}
      <div className="mt-auto flex flex-col gap-2.5 pt-2">
        {nextChapter && (
          <button
            type="button"
            onClick={() => onNextChapter?.(nextChapter)}
            className="btn btn-primary !min-h-[64px] !text-[20px]"
          >
            <span>{lang === 'hi' ? `अगला: अध्याय ${nextChapter.number}` : lang === 'cg' ? `अगिला: अध्याय ${nextChapter.number}` : `Next: Chapter ${nextChapter.number}`}</span>
            <ChevronRight size={22} />
          </button>
        )}

        <button
          type="button"
          onClick={onRetry}
          className="btn btn-secondary !min-h-[52px] !text-[17px]"
        >
          <RotateCcw size={18} />
          <span>{lang === 'hi' ? 'यह अध्याय पुनः खेलें' : lang === 'cg' ? 'ए अध्याय ला फिर ले खेलव' : 'Retry This Chapter'}</span>
        </button>

        <button
          type="button"
          onClick={onBackToChapters}
          className="self-center py-2 text-[16px] font-bold text-brand underline"
        >
          {lang === 'hi' ? 'सभी अध्याय देखें' : lang === 'cg' ? 'जम्मो अध्याय देखव' : 'View All Chapters'}
        </button>
      </div>
    </section>
  )
}

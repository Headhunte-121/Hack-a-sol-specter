import { BookOpen, CheckCircle, ChevronRight, Sparkles, Star, Trophy, Volume2, VolumeX } from 'lucide-react'
import { useLang } from '../shell/i18n'
import { CHAPTERS, CHAPTER_QUESTIONS_COUNT, type Chapter } from './chapters'
import { pick } from './content'
import { chapterAttempts } from './progress'

interface ChapterSelectProps {
  onSelectChapter: (chapter: Chapter) => void
  onSelectGrandQuiz: () => void
  isMuted: boolean
  onToggleMute: () => void
}

const CHAPTER_BANNERS: Record<number, string> = {
  1: 'images/quiz/chapter_1_banner.jpg',
  2: 'images/quiz/chapter_2_banner.jpg',
  3: 'images/quiz/chapter_3_banner.jpg',
  4: 'images/quiz/chapter_4_banner.jpg',
  5: 'images/quiz/chapter_5_banner.jpg',
}

export function ChapterSelect({
  onSelectChapter,
  onSelectGrandQuiz,
  isMuted,
  onToggleMute,
}: ChapterSelectProps) {
  const { t, lang } = useLang()
  const attempts = chapterAttempts()

  const completedCount = CHAPTERS.filter((c) => !!attempts[c.id]).length
  const totalStars = CHAPTERS.reduce((acc, c) => acc + (attempts[c.id]?.stars || 0), 0)

  return (
    <div className="flex flex-col gap-4" data-testid="chapter-select">
      {/* Top Hero Banner with Large Painted Artwork */}
      <div className="group relative overflow-hidden rounded-3xl border-2 border-line bg-slate-950 shadow-xl">
        <img
          src="images/quiz/quiz_hero_banner.jpg"
          alt="Suraksha Quiz Hero"
          className="h-48 sm:h-64 w-full object-cover transition-transform duration-500 group-hover:scale-102"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent p-5 flex flex-col justify-end text-white">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="rounded-full bg-amber-500 px-3 py-0.5 text-[12px] font-black uppercase tracking-wider text-slate-950">
              ⭐ {lang === 'hi' ? '5 अध्याय प्रश्नोत्तरी' : lang === 'cg' ? '5 अध्याय सवाल-जवाब' : '5 Quiz Chapters'}
            </span>

            <button
              type="button"
              onClick={onToggleMute}
              className="flex items-center gap-1.5 rounded-xl bg-white/20 px-3 py-1 text-[13px] font-bold text-white backdrop-blur-xs hover:bg-white/30 transition-all"
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              <span>{isMuted ? (lang === 'hi' ? 'ध्वनि बंद' : lang === 'cg' ? 'अवाज बंद' : 'Muted') : (lang === 'hi' ? 'ध्वनि चालू' : lang === 'cg' ? 'ध्वनि चालू' : 'Sound ON')}</span>
            </button>
          </div>

          <h2 className="mt-2 text-[24px] sm:text-[28px] font-black leading-tight drop-shadow-md">
            {lang === 'hi' ? 'वित्तीय सुरक्षा महा-अभियान' : lang === 'cg' ? 'वित्तीय सुरक्षा महा-अभियान' : 'Interactive Cybersecurity Academy'}
          </h2>
          <p className="text-[14px] text-blue-100 drop-shadow-sm">
            {lang === 'hi'
              ? `प्रगति: ${completedCount}/5 अध्याय पूरे हुए · ${totalStars}/15 सितारे अर्जित`
              : lang === 'cg'
              ? `प्रगति: ${completedCount}/5 अध्याय पूरा होगे · ${totalStars}/15 सितारा मिले`
              : `Progress: ${completedCount}/5 Chapters Completed · ${totalStars}/15 Stars Earned`}
          </p>
        </div>
      </div>

      {/* 5 Chapters List with Large High-Res Painted Artwork Banners */}
      <div className="flex flex-col gap-4">
        {CHAPTERS.map((chapter) => {
          const attempt = attempts[chapter.id]
          const isDone = !!attempt
          const stars = attempt?.stars || 0
          const bannerSrc = CHAPTER_BANNERS[chapter.number] || 'images/quiz/chapter_1_banner.jpg'

          return (
            <div
              key={chapter.id}
              className="group relative flex flex-col overflow-hidden rounded-3xl border-2 border-line bg-white shadow-sm transition-all hover:border-brand hover:shadow-xl"
            >
              {/* Large Painted Artwork Card Image */}
              <div className="relative h-44 sm:h-56 w-full overflow-hidden bg-slate-900">
                <img
                  src={bannerSrc}
                  alt={`Chapter ${chapter.number} Banner`}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-103"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

                <div className="absolute top-3.5 left-3.5 flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand text-white font-black text-[15px] shadow-md">
                    {chapter.number}
                  </span>
                  <span className="rounded-lg bg-slate-900/80 px-2.5 py-1 text-[12px] font-black uppercase tracking-wider text-amber-300 backdrop-blur-xs border border-white/20">
                    {lang === 'hi' ? `अध्याय ${chapter.number}` : lang === 'cg' ? `अध्याय ${chapter.number}` : `Chapter ${chapter.number}`}
                  </span>
                </div>

                <div className="absolute top-3.5 right-3.5">
                  <span className="rounded-lg bg-blue-600/90 px-2.5 py-1 text-[12px] font-black text-white shadow-md backdrop-blur-xs">
                    {CHAPTER_QUESTIONS_COUNT} {lang === 'hi' ? 'प्रश्न' : lang === 'cg' ? 'सवाल' : 'Questions'}
                  </span>
                </div>

                <div className="absolute bottom-3 inset-x-4">
                  <h3 className="text-[22px] sm:text-[24px] font-black leading-tight text-white drop-shadow-lg">
                    {pick(chapter.title, lang)}
                  </h3>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 sm:p-5 flex flex-col gap-3">
                <p className="text-[15px] leading-relaxed text-muted font-medium">
                  {pick(chapter.description, lang)}
                </p>

                {/* Stars and Score if completed */}
                {isDone && (
                  <div className="flex items-center justify-between rounded-2xl bg-amber-50 border border-amber-200 px-3.5 py-2">
                    <span className="flex items-center gap-1.5 text-[14px] font-bold text-ok">
                      <CheckCircle size={16} />
                      <span>{attempt.score}% {lang === 'hi' ? 'सटीकता' : lang === 'cg' ? 'सटीक' : 'Accuracy'}</span>
                    </span>

                    <div className="flex items-center gap-1 text-amber-400">
                      {[1, 2, 3].map((s) => (
                        <Star
                          key={s}
                          size={16}
                          className={s <= stars ? 'fill-amber-400 text-amber-400 drop-shadow-xs' : 'text-slate-300'}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Footer */}
                <div className="pt-2 border-t border-line/60 flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-muted">
                    {isDone
                      ? (lang === 'hi' ? `सर्वश्रेष्ठ: ${attempt.correctCount}/${attempt.totalQuestions} सही` : lang === 'cg' ? `सबले बने: ${attempt.correctCount}/${attempt.totalQuestions} सही` : `Best: ${attempt.correctCount}/${attempt.totalQuestions} correct`)
                      : (lang === 'hi' ? '20 नए इंटरएक्टिव प्रश्न' : lang === 'cg' ? '20 नवा इंटरएक्टिव सवाल' : '20 Curated Questions')}
                  </span>

                  <button
                    type="button"
                    onClick={() => onSelectChapter(chapter)}
                    className="flex items-center gap-1.5 rounded-2xl bg-brand px-5 py-2.5 text-[16px] font-black text-white shadow-md hover:bg-brand/90 hover:scale-102 transition-all"
                  >
                    <span>{isDone ? (lang === 'hi' ? 'पुनः खेलें' : lang === 'cg' ? 'फिर ले खेलव' : 'Retake') : (lang === 'hi' ? 'अध्याय शुरू करें' : lang === 'cg' ? 'अध्याय शुरू करव' : 'Start Chapter')}</span>
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Alternative Grand Speed Assessment (15 Qs) */}
      <div className="mt-2 flex flex-col items-center gap-2 rounded-3xl border-2 border-dashed border-line bg-soft/50 p-5 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand/10 text-brand">
          <BookOpen size={24} />
        </div>
        <h4 className="text-[19px] font-bold text-ink">
          {lang === 'hi' ? 'संपूर्ण मिश्रित गति परीक्षा (15 प्रश्न)' : lang === 'cg' ? 'जम्मो मिलाके गति परीक्षा (15 सवाल)' : 'Comprehensive Speed Quiz (15 Questions)'}
        </h4>
        <p className="max-w-md text-[14px] text-muted">
          {lang === 'hi'
            ? 'सभी 10 विषयों में से मिश्रित 15 प्रश्नों के साथ अपनी वित्तीय डिजिटल साक्षरता का त्वरित परीक्षण करें।'
            : lang === 'cg'
            ? 'जम्मो 10 विषय म ले मिलाके 15 सवाल के संग अपन साक्षरता स्कोर जल्दी जांचव।'
            : 'Quick assessment across all 10 topics to measure your overall Digital Financial Literacy Score.'}
        </p>
        <button
          type="button"
          onClick={onSelectGrandQuiz}
          className="btn btn-secondary mt-1 !min-h-[50px] !text-[16px]"
        >
          <Sparkles size={16} />
          <span>{lang === 'hi' ? '15 प्रश्नों की परीक्षा दें' : lang === 'cg' ? '15 सवाल के परीक्षा देवव' : 'Take 15-Question Speed Quiz'}</span>
        </button>
      </div>
    </div>
  )
}

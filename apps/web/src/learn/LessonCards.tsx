import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Layers } from 'lucide-react'
import { useLang } from '../shell/i18n'
import { Icon } from '../shell/ui'
import { CardIcon } from './cardIcons'
import { canGoBack, canGoForward, cardPosition, clampIndex, indexForKey, indexFromScroll } from './cards'
import { pick, type LessonCard } from './content'

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** LessonCards: the lesson as a row of large cards, one idea each. Scroll or swipe, press the arrow buttons, or use the arrow keys on the
 *  row. It needs nothing from the network. With "reduce motion" on the phone it jumps instead of gliding. */
export function LessonCards({ cards }: { cards: LessonCard[] }) {
  const { t, lang } = useLang()
  const total = cards.length
  const [index, setIndex] = useState(0)
  const track = useRef<HTMLDivElement>(null)
  const target = useRef<number | null>(null) // a move we started ourselves: ignore the scroll events on the way there
  const timer = useRef<number | undefined>(undefined)

  const goTo = useCallback(
    (i: number) => {
      const next = clampIndex(i, total)
      setIndex(next)
      const el = track.current
      if (!el) return
      target.current = next
      window.clearTimeout(timer.current)
      const left = next * el.clientWidth
      // If the glide has not arrived after a moment (a background page, or the browser dropped it), jump there so the card shown always
      // matches the label.
      timer.current = window.setTimeout(() => {
        target.current = null
        if (Math.abs(el.scrollLeft - left) > 2) el.scrollTo?.({ left, behavior: 'auto' })
      }, 700)
      el.scrollTo?.({ left, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
    },
    [total]
  )

  useEffect(() => () => window.clearTimeout(timer.current), [])
  // The person took over (touch, mouse or wheel): stop steering the row ourselves.
  const interrupt = () => {
    window.clearTimeout(timer.current)
    target.current = null
  }
  useEffect(() => {
    setIndex(0)
    track.current?.scrollTo?.({ left: 0 })
  }, [cards])

  const onScroll = () => {
    const el = track.current
    if (!el) return
    const nearest = indexFromScroll(el.scrollLeft, el.clientWidth, total)
    if (target.current !== null) {
      if (nearest !== target.current) return
      target.current = null
    }
    setIndex((i) => (i === nearest ? i : nearest))
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const next = indexForKey(e.key, index, total)
    if (next === null) return
    e.preventDefault()
    goTo(next)
  }

  if (total === 0) return null
  const pos = cardPosition(index, total)
  const progressPct = Math.round(((index + 1) / total) * 100)

  return (
    <section
      aria-roledescription="carousel"
      aria-label={t('learn.cards.region')}
      className="flex flex-col gap-3 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-md shadow-blue-950/6 sm:p-5"
      data-testid="lesson-cards"
    >
      {/* Header + Progress Pill */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-xl bg-[#EFF4FF] text-[#1747c4] ring-1 ring-blue-200/80">
              <Layers className="size-4" strokeWidth={2.3} />
            </span>
            <h2 className="text-[16.5px] font-extrabold text-[#163264]">{t('learn.cards.title')}</h2>
          </div>

          <p
            className="rounded-full bg-[#EFF4FF] px-3 py-1 text-xs font-extrabold text-[#163264] ring-1 ring-blue-200/80 tabular-nums"
            aria-live="polite"
            data-testid="card-position"
          >
            {t('learn.cards.position', pos)}
          </p>
        </div>

        {/* Smooth Step Progress Bar */}
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#E3EBFF]">
          <div
            className="h-full rounded-full bg-[#1747c4] transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Swipeable Civic Flashcard Deck */}
      <div
        ref={track}
        tabIndex={0}
        role="group"
        aria-label={t('learn.cards.hint')}
        onScroll={onScroll}
        onPointerDown={interrupt}
        onWheel={interrupt}
        onKeyDown={onKeyDown}
        className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-[#1747c4] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {cards.map((c, i) => (
          <article
            key={c.id}
            role="group"
            aria-roledescription="slide"
            aria-label={t('learn.cards.position', { n: i + 1, total })}
            className="relative flex min-h-[15.5rem] shrink-0 basis-full snap-center flex-col justify-between gap-4 overflow-hidden rounded-2xl border border-blue-200/80 bg-linear-to-br from-[#F4F8FF] via-white to-[#EEF4FF] p-5 shadow-inner sm:min-h-[16.5rem] sm:p-6"
          >
            {/* Subtle civic dot-grid texture */}
            <div
              className="pointer-events-none absolute inset-0 opacity-40"
              style={{
                backgroundImage: 'radial-gradient(rgba(22, 50, 100, 0.11) 1px, transparent 1px)',
                backgroundSize: '20px 20px',
              }}
              aria-hidden="true"
            />

            <div className="relative z-10 flex items-start justify-between gap-3">
              <span className="flex size-14 items-center justify-center rounded-2xl bg-white text-[#1747c4] shadow-md shadow-blue-950/10 ring-1 ring-[#1747c4]/15">
                <CardIcon name={c.icon} size={32} />
              </span>
              <span className="rounded-lg bg-white/90 px-2.5 py-1 font-mono text-[11px] font-extrabold text-[#163264] shadow-2xs ring-1 ring-blue-900/10">
                {String(i + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
              </span>
            </div>

            <div className="relative z-10 flex flex-1 flex-col justify-center gap-2">
              <h3 className="text-[22px] font-extrabold leading-snug tracking-tight text-[#0F1B3D] sm:text-[24px]">
                {pick(c.title, lang)}
              </h3>
              <p className="text-[17px] leading-[1.65] text-slate-700 sm:text-[18.5px]">
                {pick(c.body, lang)}
              </p>
            </div>
          </article>
        ))}
      </div>

      {/* Accessible Touch-Target Dot Indicators */}
      <div className="flex flex-wrap items-center justify-center" role="group" aria-label={t('learn.cards.dots')}>
        {cards.map((c, i) => (
          <button
            key={c.id}
            type="button"
            aria-label={t('learn.cards.goto', { n: i + 1 })}
            aria-current={i === index ? 'true' : undefined}
            onClick={() => goTo(i)}
            className="flex h-11 w-11 items-center justify-center"
          >
            <span
              className={`block rounded-full transition-all duration-200 ${
                i === index ? 'h-2.5 w-7 bg-[#1747c4]' : 'h-2.5 w-2.5 bg-slate-300 hover:bg-slate-400'
              }`}
            />
          </button>
        ))}
      </div>

      {/* Back / Next Navigation Bar */}
      <div className="flex items-center justify-between gap-2.5">
        <button
          type="button"
          className="inline-flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-4 text-[15.5px] font-bold text-[#163264] shadow-2xs transition-colors hover:border-[#1747c4]/40 hover:bg-[#F4F8FF] disabled:opacity-45 disabled:hover:border-slate-200/90 disabled:hover:bg-white"
          aria-label={t('learn.cards.prev')}
          disabled={!canGoBack(index)}
          onClick={() => goTo(index - 1)}
        >
          <Icon name="back" size={20} />
          <span>{t('learn.cards.prev_short')}</span>
        </button>

        <button
          type="button"
          className="inline-flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#163264] px-4 text-[15.5px] font-extrabold text-white shadow-sm shadow-blue-950/15 transition-colors hover:bg-[#1747c4] disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
          aria-label={t('learn.cards.next')}
          disabled={!canGoForward(index, total)}
          onClick={() => goTo(index + 1)}
        >
          <span>{t('learn.cards.next_short')}</span>
          <span className="inline-flex rotate-180">
            <Icon name="back" size={20} />
          </span>
        </button>
      </div>
    </section>
  )
}
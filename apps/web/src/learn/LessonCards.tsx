import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useLang } from '../shell/i18n'
import { Icon } from '../shell/ui'
import { CardIcon } from './cardIcons'
import { canGoBack, canGoForward, cardPosition, clampIndex, indexForKey, indexFromScroll } from './cards'
import { pick, type LessonCard } from './content'

const prefersReducedMotion = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** LessonCards: the lesson as a row of large cards, one idea each. Scroll or swipe, press the arrow buttons, or use the arrow keys on the
 *  row. It needs nothing from the network. With "reduce motion" on the phone it jumps instead of gliding. */
export function LessonCards({ cards }: { cards: LessonCard[] }) {
  const { t, lang } = useLang()
  const total = cards.length
  const [index, setIndex] = useState(0)
  const track = useRef<HTMLDivElement>(null)
  const target = useRef<number | null>(null) // a move we started ourselves: ignore the scroll events on the way there
  const timer = useRef<number | undefined>(undefined)

  const goTo = useCallback((i: number) => {
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
  }, [total])

  useEffect(() => () => window.clearTimeout(timer.current), [])
  // The person took over (touch, mouse or wheel): stop steering the row ourselves.
  const interrupt = () => { window.clearTimeout(timer.current); target.current = null }
  useEffect(() => { setIndex(0); track.current?.scrollTo?.({ left: 0 }) }, [cards])

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
  return (
    <section aria-roledescription="carousel" aria-label={t('learn.cards.region')} className="flex flex-col gap-2.5" data-testid="lesson-cards">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[1.15rem] font-bold text-brand">{t('learn.cards.title')}</h2>
        <p className="text-[1.05rem] font-bold text-muted" aria-live="polite" data-testid="card-position">{t('learn.cards.position', pos)}</p>
      </div>

      <div
        ref={track}
        tabIndex={0}
        role="group"
        aria-label={t('learn.cards.hint')}
        onScroll={onScroll}
        onPointerDown={interrupt}
        onWheel={interrupt}
        onKeyDown={onKeyDown}
        className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-2xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {cards.map((c, i) => (
          <article
            key={c.id}
            role="group"
            aria-roledescription="slide"
            aria-label={t('learn.cards.position', { n: i + 1, total })}
            className="flex min-h-[19rem] shrink-0 basis-full snap-center flex-col gap-3 rounded-2xl border-2 border-line bg-white px-5 py-6"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-soft text-brand"><CardIcon name={c.icon} size={40} /></span>
            <h3 className="text-[1.5rem] font-bold leading-[1.3]">{pick(c.title, lang)}</h3>
            <p className="text-[1.25rem] leading-[1.65]">{pick(c.body, lang)}</p>
          </article>
        ))}
      </div>

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
            <span className={`block rounded-full ${i === index ? 'h-4 w-4 bg-brand' : 'h-3 w-3 bg-line'}`} />
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2">
        <button type="button" className="btn btn-secondary flex-1" aria-label={t('learn.cards.prev')} disabled={!canGoBack(index)} onClick={() => goTo(index - 1)}>
          <Icon name="back" size={24} />
          {t('learn.cards.prev_short')}
        </button>
        <button type="button" className="btn btn-secondary flex-1" aria-label={t('learn.cards.next')} disabled={!canGoForward(index, total)} onClick={() => goTo(index + 1)}>
          {t('learn.cards.next_short')}
          <span className="inline-flex rotate-180"><Icon name="back" size={24} /></span>
        </button>
      </div>
    </section>
  )
}

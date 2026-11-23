// State logic of the lesson-card carousel, kept free of the page so it can be tested: which card is showing, what the keys do,
// and how a scroll position maps to a card. LessonCards.tsx only wires these to the page.

export const clampIndex = (i: number, total: number): number => (total <= 0 ? 0 : Math.min(Math.max(Math.trunc(i) || 0, 0), total - 1))

/** The card a key moves to, or null when the key does nothing here. Left/Right (and PageUp/PageDown) step; Home/End jump. */
export function indexForKey(key: string, current: number, total: number): number | null {
  const next = (() => {
    switch (key) {
      case 'ArrowRight':
      case 'PageDown':
        return current + 1
      case 'ArrowLeft':
      case 'PageUp':
        return current - 1
      case 'Home':
        return 0
      case 'End':
        return total - 1
      default:
        return null
    }
  })()
  return next === null ? null : clampIndex(next, total)
}

/** The card nearest to a scroll position: each card is one viewport wide, so it is scrollLeft divided by the width. */
export function indexFromScroll(scrollLeft: number, width: number, total: number): number {
  if (width <= 0) return 0
  return clampIndex(Math.round(scrollLeft / width), total)
}

export const canGoBack = (i: number) => i > 0
export const canGoForward = (i: number, total: number) => i < total - 1
/** "n of N" numbers for the label (the text itself comes from the language files). */
export const cardPosition = (i: number, total: number) => ({ n: clampIndex(i, total) + 1, total })

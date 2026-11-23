import { describe, expect, it } from 'vitest'
import { canGoBack, canGoForward, cardPosition, clampIndex, indexForKey, indexFromScroll } from './cards'

describe('lesson card carousel logic', () => {
  it('keeps the index inside the cards', () => {
    expect(clampIndex(-3, 7)).toBe(0)
    expect(clampIndex(99, 7)).toBe(6)
    expect(clampIndex(3, 7)).toBe(3)
    expect(clampIndex(2, 0)).toBe(0)
    expect(clampIndex(Number.NaN, 7)).toBe(0)
  })
  it('arrow keys step, Home and End jump, other keys do nothing', () => {
    expect(indexForKey('ArrowRight', 2, 7)).toBe(3)
    expect(indexForKey('ArrowLeft', 2, 7)).toBe(1)
    expect(indexForKey('PageDown', 2, 7)).toBe(3)
    expect(indexForKey('PageUp', 2, 7)).toBe(1)
    expect(indexForKey('Home', 4, 7)).toBe(0)
    expect(indexForKey('End', 4, 7)).toBe(6)
    expect(indexForKey('a', 4, 7)).toBeNull()
    expect(indexForKey('Tab', 4, 7)).toBeNull()
  })
  it('does not run past either end', () => {
    expect(indexForKey('ArrowLeft', 0, 7)).toBe(0)
    expect(indexForKey('ArrowRight', 6, 7)).toBe(6)
  })
  it('maps a scroll position to the nearest card', () => {
    expect(indexFromScroll(0, 320, 7)).toBe(0)
    expect(indexFromScroll(150, 320, 7)).toBe(0)
    expect(indexFromScroll(170, 320, 7)).toBe(1)
    expect(indexFromScroll(320 * 6, 320, 7)).toBe(6)
    expect(indexFromScroll(320 * 9, 320, 7)).toBe(6)
    expect(indexFromScroll(500, 0, 7)).toBe(0) // not laid out yet
  })
  it('knows when the buttons should be off, and gives the "n of N" numbers', () => {
    expect(canGoBack(0)).toBe(false)
    expect(canGoBack(1)).toBe(true)
    expect(canGoForward(6, 7)).toBe(false)
    expect(canGoForward(5, 7)).toBe(true)
    expect(cardPosition(0, 7)).toEqual({ n: 1, total: 7 })
    expect(cardPosition(6, 7)).toEqual({ n: 7, total: 7 })
  })
})

import { beforeEach, describe, expect, it } from 'vitest'
import { isDemoMode, setDemoMode } from './demoMode'

describe('demoMode toggle', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('defaults to true (demo mode on) when nothing is stored', () => {
    expect(isDemoMode()).toBe(true)
  })

  it('can be turned off and persisted', () => {
    setDemoMode(false)
    expect(isDemoMode()).toBe(false)
  })

  it('can be turned back on', () => {
    setDemoMode(false)
    expect(isDemoMode()).toBe(false)
    setDemoMode(true)
    expect(isDemoMode()).toBe(true)
  })
})

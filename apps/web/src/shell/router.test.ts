import { beforeEach, describe, expect, it } from 'vitest'
import { currentPath, currentQuery, navigate } from './router'

describe('router navigation and hash parsing', () => {
  beforeEach(() => {
    window.location.hash = ''
  })

  it('currentPath returns / when hash is empty or root', () => {
    window.location.hash = ''
    expect(currentPath()).toBe('/')

    window.location.hash = '#'
    expect(currentPath()).toBe('/')

    window.location.hash = '#/'
    expect(currentPath()).toBe('/')
  })

  it('currentPath extracts path ignoring query parameters', () => {
    window.location.hash = '#/report?from=qr'
    expect(currentPath()).toBe('/report')

    window.location.hash = '#/learn?lesson=upi_pin&step=2'
    expect(currentPath()).toBe('/learn')
  })

  it('currentQuery parses query string from hash', () => {
    window.location.hash = '#/report?from=qr'
    expect(currentQuery().get('from')).toBe('qr')

    window.location.hash = '#/learn'
    expect(currentQuery().get('from')).toBeNull()
  })

  it('navigate sanitizes leading hashes avoiding duplicate #', () => {
    navigate('/message')
    expect(window.location.hash).toBe('#/message')

    navigate('#/report?from=qr')
    expect(window.location.hash).toBe('#/report?from=qr')

    navigate('##/during-call')
    expect(window.location.hash).toBe('#/during-call')
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildReportPayload, channelFromKind, validateReportSchema } from './report'
import { REGIONS } from './regionsData'
import { rotateClientToken } from './token'
import { setConsent } from '../shell/consent'

const codes = REGIONS.map((r) => r.code)

beforeEach(() => {
  localStorage.clear()
})

describe('report builder: no message text can enter a report', () => {
  it('keeps only the four fixed fields even if extra data is passed in', () => {
    const sneaky = { category: 'kyc_bank', channel: 'sms', region: 'raipur', band: 'likely_scam', text: 'Your OTP is 482913', phone: '9876543210' } as never
    const p = buildReportPayload(sneaky)
    expect(Object.keys(p).sort()).toEqual(['channel', 'region_code', 'risk_band', 'scam_category'])
    const json = JSON.stringify(p)
    expect(json).not.toContain('482913')
    expect(json).not.toContain('9876543210')
  })
  it('validateReportSchema rejects extra fields and unknown values', () => {
    const ok = buildReportPayload({ category: 'otp', channel: 'call', region: 'durg', band: 'suspicious' })
    expect(validateReportSchema(ok, codes)).toBe(true)
    expect(validateReportSchema({ ...ok, text: 'x' }, codes)).toBe(false)
    expect(validateReportSchema({ ...ok, region_code: 'nowhere' }, codes)).toBe(false)
    expect(validateReportSchema({ ...ok, channel: 'email' }, codes)).toBe(false)
    expect(validateReportSchema(null, codes)).toBe(false)
  })
  it('maps result kinds to channels and unknown bands to "unknown"', () => {
    expect(channelFromKind('message')).toBe('sms')
    expect(channelFromKind('call')).toBe('call')
    expect(buildReportPayload({ category: 'other', channel: 'other', region: 'raipur', band: 'looks_genuine' }).risk_band).toBe('unknown')
  })
})

describe('client token', () => {
  it('is stable within a day and replaced the next day', () => {
    const d1 = new Date('2026-11-23T10:00:00Z')
    const a = rotateClientToken(d1)
    expect(rotateClientToken(new Date('2026-11-23T20:00:00Z'))).toBe(a)
    expect(rotateClientToken(new Date('2026-11-24T01:00:00Z'))).not.toBe(a)
    expect(a).toMatch(/^[0-9a-f]{32}$/)
  })
})

describe('consent gate (acceptance: with consent off, no network request carries report data)', () => {
  it('queueReport does nothing and fetch is never called when consent is off', async () => {
    const { queueReport, syncQueue } = await import('./sync')
    const spy = vi.spyOn(globalThis, 'fetch')
    setConsent(false)
    const p = buildReportPayload({ category: 'kyc_bank', channel: 'sms', region: 'raipur', band: 'likely_scam' })
    expect(await queueReport(p)).toBe('no_consent')
    await syncQueue()
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })
})

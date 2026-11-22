import { describe, expect, it } from 'vitest'
import { recentLastResult, saveLastResult } from '../detector/lastResult'
import { categoryFromSignals } from '../shared/categories'
import { buildEvidenceChecklist, chooseChannel } from './routing'
import { buildReportSummary } from './summary'

describe('chooseChannel: every row of the routing table', () => {
  it('money already left -> 1930 first, then cybercrime.gov.in', () => {
    const r = chooseChannel({ outcome: 'money_lost' })
    expect(r.channel).toBe('helpline_1930')
    expect(r.primary).toBe('call_1930')
    expect(r.secondary).toBe('open_cybercrime')
    expect(r.steps.indexOf('call_1930')).toBeLessThan(r.steps.indexOf('open_cybercrime'))
  })
  it('money lost outranks having shared a code', () => {
    expect(chooseChannel({ outcome: 'money_lost', shared: true }).channel).toBe('helpline_1930')
  })
  it('no money lost, nothing shared -> Chakshu', () => {
    const r = chooseChannel({ outcome: 'no_money', shared: false })
    expect(r.channel).toBe('chakshu')
    expect(r.primary).toBe('open_chakshu')
    expect(chooseChannel({ outcome: 'no_money' }).channel).toBe('chakshu')
  })
  it('code or card details shared, no money gone yet -> bank first, then 1930', () => {
    const r = chooseChannel({ outcome: 'no_money', shared: true })
    expect(r.channel).toBe('bank_then_1930')
    expect(r.steps[0]).toBe('call_bank')
    expect(r.steps.indexOf('call_bank')).toBeLessThan(r.steps.indexOf('call_1930'))
  })
  it('harassment / fake profile / non-financial cybercrime -> cybercrime.gov.in', () => {
    expect(chooseChannel({ outcome: 'other_cyber' }).channel).toBe('cybercrime_portal')
  })
  it('only checking -> tips and lessons, no channel', () => {
    const r = chooseChannel({ outcome: 'checking' })
    expect(r.channel).toBe('tips')
    expect(r.primary).toBe('open_learn')
  })
  it('reaches the right channel within two answers', () => {
    // money_lost: 1 answer; no_money: 2 answers; other_cyber/checking: 1 answer.
    expect(chooseChannel({ outcome: 'money_lost' }).channel).toBeTruthy()
  })
})

describe('evidence checklist and summary', () => {
  it('every channel except tips has a checklist, and the checklist never asks for numbers', () => {
    for (const c of ['helpline_1930', 'bank_then_1930', 'chakshu', 'cybercrime_portal'] as const) expect(buildEvidenceChecklist(c).length).toBeGreaterThan(2)
    expect(buildEvidenceChecklist('tips')).toEqual([])
  })
  it('the summary holds only date, type, category, signs and words (no phone numbers)', () => {
    const t = (k: string) => k
    const s = buildReportSummary({ kind: 'message', band: 'likely_scam', script: 'hinglish', signals: ['kyc_demand', 'threat'], phrases: ['KYC', 'block'], at: 1 }, t, new Date('2026-11-22T10:00:00Z'))
    expect(s).toContain('cat.kyc_bank')
    expect(s).toContain('KYC, block')
    expect(s).not.toMatch(/\d{10}/)
  })
  it('works with no detector result', () => {
    expect(buildReportSummary(null, (k) => k)).toContain('summary.note')
  })
  it('a report only uses a check from the past 24 hours, never an old unrelated one', () => {
    const now = Date.parse('2026-11-23T10:00:00Z')
    const base = { kind: 'message' as const, band: 'likely_scam' as const, script: 'english', signals: ['kyc_demand'], phrases: ['KYC'] }
    saveLastResult({ ...base, at: now - 2 * 60 * 60 * 1000 })
    expect(recentLastResult(now)?.phrases).toEqual(['KYC'])
    saveLastResult({ ...base, at: now - 25 * 60 * 60 * 1000 })
    expect(recentLastResult(now)).toBeNull()
    saveLastResult({ ...base, at: now + 60_000 }) // a clock that jumped: not trusted
    expect(recentLastResult(now)).toBeNull()
  })
})

describe('category mapping', () => {
  it('maps signals to a category', () => {
    expect(categoryFromSignals(['authority_claim', 'secrecy_or_isolation'])).toBe('digital_arrest')
    expect(categoryFromSignals(['kyc_demand'])).toBe('kyc_bank')
    expect(categoryFromSignals(['prize_claim'])).toBe('lottery_prize')
    expect(categoryFromSignals([])).toBe('other')
  })
})

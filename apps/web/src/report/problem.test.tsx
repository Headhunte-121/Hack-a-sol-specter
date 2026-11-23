import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import en from '../i18n/en.json'
import hi from '../i18n/hi.json'
import cg from '../i18n/cg.json'
import { saveLastResult, type LastResult } from '../detector/lastResult'
import { CATEGORY_CODES } from '../shared/categories'
import { markConsentAsked, setConsent } from '../shell/consent'
import { LangProvider } from '../shell/i18n'
import ReportPage from './ReportPage'
import { adviceKey, categoryOfCheck, channelOfCheck, checkApplies, problemFromCheck, reportBand } from './problem'
import { chooseChannel, PAY_METHODS, withPaymentStep } from './routing'
import { buildReportSummary } from './summary'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const now = Date.now()
const kycCall: LastResult = { kind: 'call', band: 'likely_scam', script: 'hinglish', signals: ['kyc_demand', 'threat'], phrases: ['KYC', 'block'], category: 'kyc_bank', at: now - 60_000 }

describe('what the check pre-fills', () => {
  it('takes the type and channel from a flagged check', () => {
    expect(problemFromCheck(kycCall)).toEqual({ category: 'kyc_bank', channel: 'call' })
    expect(channelOfCheck({ ...kycCall, kind: 'message' })).toBe('sms')
    expect(channelOfCheck({ ...kycCall, kind: 'url' })).toBe('other')
  })
  it('pre-fills nothing from a genuine check or one with no clear type', () => {
    expect(problemFromCheck({ ...kycCall, band: 'looks_genuine' })).toEqual({ category: null, channel: null })
    expect(categoryOfCheck({ ...kycCall, category: undefined, signals: [] })).toBeNull()
    expect(problemFromCheck(null)).toEqual({ category: null, channel: null })
  })
  it('uses the check only when the person agrees on the type', () => {
    expect(checkApplies(kycCall, 'kyc_bank')).toBe(true)
    expect(checkApplies(kycCall, 'fake_qr')).toBe(false)
    expect(checkApplies(kycCall, null)).toBe(false)
    expect(reportBand(kycCall, 'kyc_bank')).toBe('likely_scam')
    expect(reportBand(kycCall, 'fake_qr')).toBe('unknown')
  })
})

describe('summary built from what the person said', () => {
  const t = (k: string) => k
  it('states the person\'s answers, and the check\'s words only when they agree', () => {
    const agree = buildReportSummary(kycCall, t, new Date('2026-11-23T10:00:00Z'), 'en', { category: 'kyc_bank', channel: 'call', moneyLost: true })
    expect(agree).toContain('summary.happened: cat.kyc_bank')
    expect(agree).toContain('summary.channel: trends.channel.call')
    expect(agree).toContain('summary.money: common.yes')
    expect(agree).toContain('KYC, block')
    const differ = buildReportSummary(kycCall, t, new Date('2026-11-23T10:00:00Z'), 'en', { category: 'fake_qr', channel: 'qr', moneyLost: false, shared: true })
    expect(differ).toContain('summary.happened: cat.fake_qr')
    expect(differ).toContain('summary.money: common.no')
    expect(differ).toContain('summary.shared: common.yes')
    expect(differ).not.toContain('KYC, block')
  })
  it('never carries digits that look like a phone number', () => {
    expect(buildReportSummary(kycCall, t, new Date(), 'en', { category: 'kyc_bank', channel: 'call' })).not.toMatch(/\d{10}/)
  })
})

describe('advice for every kind of scam', () => {
  it('exists in English, Hindi and Chhattisgarhi', () => {
    for (const c of CATEGORY_CODES) {
      const k = adviceKey(c)
      for (const d of [en, hi, cg] as Record<string, string>[]) expect(d[k], `${k}`).toBeTruthy()
    }
  })
  it('Hindi and Chhattisgarhi advice has no English letters', () => {
    for (const c of CATEGORY_CODES) for (const d of [hi, cg] as Record<string, string>[]) expect(d[adviceKey(c)]).not.toMatch(/[A-Za-z]/)
  })
})

describe('how the money left', () => {
  const money = chooseChannel({ outcome: 'money_lost' }).steps
  it('adds one step right after calling 1930 and replaces none', () => {
    for (const m of PAY_METHODS) {
      const steps = withPaymentStep(money, m)
      expect(steps.length).toBe(money.length + 1)
      expect(steps[0]).toBe('call_1930')
      expect(steps[1]).toBe(`pay_${m}`)
      expect(steps.filter((x) => !x.startsWith('pay_'))).toEqual(money)
    }
  })
  it('leaves the steps unchanged when the person did not say', () => {
    expect(withPaymentStep(money, null)).toEqual(money)
  })
  it('only applies where 1930 is called first', () => {
    const chakshu = chooseChannel({ outcome: 'no_money', shared: false }).steps
    expect(withPaymentStep(chakshu, 'upi')).toEqual(chakshu)
  })
  it('has wording in all three languages, with no English letters in Hindi or Chhattisgarhi', () => {
    for (const m of PAY_METHODS) {
      for (const k of [`pay.${m}`, `step.pay_${m}`]) {
        for (const d of [en, hi, cg] as Record<string, string>[]) expect(d[k], k).toBeTruthy()
        for (const d of [hi, cg] as Record<string, string>[]) expect(d[k]).not.toMatch(/[A-Za-z]/)
      }
    }
  })
  it('is written into the summary as the answer given', () => {
    const s = buildReportSummary(null, (k) => k, new Date(), 'en', { category: null, channel: null, moneyLost: true, paid: 'card' })
    expect(s).toContain('summary.paid: pay.card')
  })
})

describe('the Report screen follows what the person says', () => {
  let host: HTMLDivElement
  let root: Root
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('gt02:lang', '"en"')
    history.replaceState(null, '', '#/report')
    // jsdom has no matchMedia: report a phone-sized, touch screen
    window.matchMedia = ((q: string) => ({ matches: q.includes('pointer: coarse'), media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as unknown as typeof window.matchMedia
    host = document.createElement('div')
    document.body.appendChild(host)
  })
  afterEach(() => { act(() => root.unmount()); host.remove() })

  const mount = () => act(() => { root = createRoot(host); root.render(<LangProvider><ReportPage /></LangProvider>) })
  const click = (el: Element | null | undefined) => act(() => { (el as HTMLElement).click() })
  const button = (text: string) => [...host.querySelectorAll('button')].find((b) => b.textContent?.includes(text))
  const radio = (attr: string, v: string) => host.querySelector<HTMLElement>(`[${attr}="${v}"]`)!

  it('pre-fills a recent flagged check, shows it, and lets the person change it', async () => {
    saveLastResult(kycCall)
    setConsent(true); markConsentAsked()
    await mount()
    await click(button('Yes, it was taken'))
    expect(host.querySelector('[data-testid="problem"]')).toBeTruthy()
    expect(radio('data-category', 'kyc_bank').getAttribute('aria-checked')).toBe('true')
    expect(radio('data-channel-pick', 'call').getAttribute('aria-checked')).toBe('true')
    expect(host.textContent).toContain(en['report.happened.prefilled'])
    expect(host.querySelector('[data-testid="advice"]')?.textContent).toContain(en['advice.kyc_bank'])
    expect(host.querySelector('[data-testid="share-counted-as"]')?.textContent).toContain('Fake KYC / bank impersonation · Phone call')

    await click(radio('data-category', 'fake_qr'))
    expect(radio('data-category', 'kyc_bank').getAttribute('aria-checked')).toBe('false')
    expect(host.querySelector('[data-testid="advice"]')?.textContent).toContain(en['advice.fake_qr'])
    expect(host.textContent).not.toContain(en['report.happened.prefilled'])
    expect(host.querySelector('[data-testid="share-counted-as"]')?.textContent).toContain('Fake QR code · Phone call')
    const summary = host.querySelector('pre')!.textContent!
    expect(summary).toContain('What happened: Fake QR code')
    expect(summary).toContain('Money taken: Yes')
    expect(summary).not.toContain('KYC, block')
  })

  it('with no recent check, asks what happened and adds no report until it is answered', async () => {
    setConsent(true); markConsentAsked()
    await mount()
    await click(button('Yes, it was taken'))
    expect(host.textContent).toContain(en['report.happened.pick'])
    expect(host.querySelector('[data-category][aria-checked="true"]')).toBeNull()
    expect(host.querySelector('[data-testid="advice"]')).toBeNull()
    expect(host.querySelector('[data-testid="send-hint"]')).toBeTruthy()
    expect(host.querySelector('[data-testid="share-report"]')).toBeNull()
    await click(radio('data-category', 'loan_app'))
    expect(host.querySelector('[data-testid="send-hint"]')).toBeTruthy() // still needs how it reached them
    await click(radio('data-channel-pick', 'other'))
    expect(host.querySelector('[data-testid="send-hint"]')).toBeNull()
    expect(host.querySelector('[data-testid="share-counted-as"]')?.textContent).toContain('Loan app / advance fee · Other')
  })

  it('does not reuse an unrelated check for harassment or other cybercrime', async () => {
    saveLastResult(kycCall)
    await mount()
    await click(button('Harassment, fake profile or other cybercrime'))
    expect(host.querySelector('[data-testid="problem"]')).toBeNull()
    expect(host.querySelector('[data-testid="share-report"]')).toBeNull()
    expect(host.querySelector('pre')!.textContent).not.toContain('KYC, block')
  })

  it('offers an optional "how did the money leave" choice only when money was lost, and adds that step', async () => {
    await mount()
    await click(button('No'))
    await click(button('No'))
    expect(host.querySelector('[data-testid="paid"]')).toBeNull()
    act(() => root.unmount())
    history.replaceState(null, '', '#/report') // the first screen left a history entry behind; a fresh visit has none
    await mount()
    await click(button('Yes, it was taken'))
    expect(host.querySelector('[data-testid="paid"]')).toBeTruthy()
    expect(host.querySelector('[data-pay][aria-checked="true"]')).toBeNull()
    const stepsBefore = host.querySelectorAll('ol li').length
    await click(radio('data-pay', 'upi'))
    expect(radio('data-pay', 'upi').getAttribute('aria-checked')).toBe('true')
    expect(host.querySelectorAll('ol li').length).toBe(stepsBefore + 1)
    expect(host.querySelectorAll('ol li')[1].textContent).toContain(en['step.pay_upi'])
    expect(host.querySelector('pre')!.textContent).toContain('How the money left: UPI (a payment app)')
    await click(radio('data-pay', 'upi')) // tapping again clears it
    expect(host.querySelectorAll('ol li').length).toBe(stepsBefore)
    expect(host.querySelector('pre')!.textContent).not.toContain('How the money left')
  })

  it('records the money and code answers in the summary', async () => {
    saveLastResult({ ...kycCall, kind: 'message' })
    await mount()
    await click(button('No'))
    await click(button('Yes'))
    const summary = host.querySelector('pre')!.textContent!
    expect(summary).toContain('Money taken: No')
    expect(summary).toContain('Shared a code or detail: Yes')
    expect(summary).toContain('How it reached me: SMS / message')
  })
})

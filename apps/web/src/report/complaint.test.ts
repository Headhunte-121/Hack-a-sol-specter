import { describe, expect, it } from 'vitest'
import { translate } from '../shell/i18n'
import { CATEGORY_CODES } from '../shared/categories'
import {
  applyExtracted, buildCallSheet, buildComplaint, buildFieldList, buildPlan, emptyFacts, extractDetails, missingDetails, SHARED_ITEMS, type ComplaintFacts,
} from './complaint'

const en = (k: string, v?: Record<string, string | number>) => translate('en', k, v)
const hi = (k: string, v?: Record<string, string | number>) => translate('hi', k, v)
const NOW = new Date('2026-11-24T10:00:00')

const bankSms = 'Dear Customer, INR 25,000.00 debited from A/c XX1234 on 23-Nov-26 17:42 and credited to VPA fraudster99@ybl (UPI Ref No 412398765012). If not done by you, call 18002586161. -SBI'
const loss = (over: Partial<ComplaintFacts> = {}): ComplaintFacts => ({
  ...emptyFacts(), category: 'digital_arrest', channel: 'call', moneyLost: true, paid: 'upi', amount: '25000', date: '2026-11-23', time: '17:42', bankApp: 'SBI',
  txnId: '412398765012', payee: 'fraudster99@ybl', suspectPhone: '9876543210', claimedAs: 'Mumbai police', ...over,
})

describe('reading details out of a pasted message', () => {
  it('finds the amount, date, time, transaction number, UPI id and bank in a bank payment SMS', () => {
    const x = extractDetails(bankSms)
    expect(x.amount).toBe('25000')
    expect(x.date).toBe('2026-11-23')
    expect(x.time).toBe('17:42')
    expect(x.txnId).toBe('412398765012')
    expect(x.upiIds).toEqual(['fraudster99@ybl'])
    expect(x.bank).toBe('SBI')
  })
  it('finds a phone number and a link in the scam message, and ignores e-mail addresses and short numbers', () => {
    const x = extractDetails('Call +91 98765 43210 now or visit http://sbi-kyc-update.top/login. Mail help@example.com. Code 1234')
    expect(x.phones).toEqual(['9876543210'])
    expect(x.links).toEqual(['http://sbi-kyc-update.top/login'])
    expect(x.upiIds).toEqual([])
    expect(x.txnId).toBeUndefined()
  })
  it('reads Hindi digits and the rupee sign, and picks the amount next to a payment word', () => {
    expect(extractDetails('आपके खाते से ₹५,००० डेबिट हुए').amount).toBe('5000')
    expect(extractDetails('Cashback Rs 50 earned. Rs 1,200.50 debited from your account').amount).toBe('1200.5')
  })
  it('finds nothing in an ordinary message and never throws', () => {
    expect(extractDetails('')).toEqual({ upiIds: [], phones: [], links: [] })
    expect(extractDetails('See you tomorrow at the market').amount).toBeUndefined()
  })
  it('fills only the empty fields, so what the person typed is never overwritten', () => {
    const { facts, filled } = applyExtracted({ ...emptyFacts(), amount: '999' }, extractDetails(bankSms))
    expect(facts.amount).toBe('999')
    expect(facts.txnId).toBe('412398765012')
    expect(facts.payee).toBe('fraudster99@ybl')
    expect(filled).toBeGreaterThanOrEqual(5)
  })
})

describe('what to do now', () => {
  const ids = (f: ComplaintFacts) => buildPlan(f).map((s) => s.id)
  it('starts with 1930 and the bank when money was lost, and always keeps the evidence', () => {
    expect(ids(loss()).slice(0, 2)).toEqual(['call_1930', 'ask_bank_hold'])
    expect(ids(loss())).toContain('keep_evidence')
    expect(ids(loss())).toContain('file_online')
  })
  it('adds steps for exactly what was shared or done', () => {
    expect(ids(loss({ shared: ['otp'] }))).toContain('block_card_upi')
    expect(ids(loss({ shared: ['installed_app'] }))).toContain('remove_app')
    expect(ids(loss({ shared: ['id_docs'] }))).toContain('watch_identity')
    expect(ids(loss({ shared: ['bank_login'] }))).toContain('change_passwords')
    expect(ids(loss({ shared: [] }))).not.toContain('block_card_upi')
    expect(ids(loss({ shared: [] }))).not.toContain('remove_app')
  })
  it('does not send a person who lost no money to the helpline first, and explains the scam type', () => {
    const none = ids({ ...emptyFacts(), category: 'fake_qr', moneyLost: false })
    expect(none).not.toContain('call_1930')
    expect(none).toContain('qr_only_pays')
    expect(ids(loss())).toContain('no_arrest_by_phone')
    expect(ids(loss()).at(-1)).toBe('not_your_fault')
  })
  it('puts every urgent step before the ones that can wait', () => {
    const w = buildPlan(loss({ shared: ['otp', 'installed_app', 'id_docs'] })).map((s) => s.when)
    const lastNow = w.lastIndexOf('now')
    expect(w.indexOf('next')).toBeGreaterThan(lastNow)
    expect(w.indexOf('know')).toBeGreaterThan(w.lastIndexOf('next'))
  })
})

describe('what is still missing', () => {
  it('asks for the amount, date, transaction number, receiver and bank only when money was lost', () => {
    expect(missingDetails({ ...emptyFacts(), moneyLost: true })).toEqual(['amount', 'date', 'txnId', 'payee', 'bankApp'])
    expect(missingDetails(loss())).toEqual([])
    expect(missingDetails({ ...emptyFacts(), moneyLost: false, date: '2026-11-23' })).toEqual([])
  })
})

describe('the report text', () => {
  it('writes only what the person gave, in English for the website', () => {
    const t = buildComplaint(loss({ shared: ['otp'] }), en, 'en', NOW)
    expect(t).toContain('COMPLAINT: ONLINE FINANCIAL FRAUD')
    expect(t).toContain('Amount lost: Rs 25,000')
    expect(t).toContain('Transaction ID / UTR: 412398765012')
    expect(t).toContain('Payment method: UPI - SBI')
    expect(t).toContain('Money was sent to: fraudster99@ybl')
    expect(t).toContain("Fraudster's phone number: 9876543210")
    expect(t).toContain('What I shared or did: I told them an OTP')
    expect(t).toContain('The fraudster claimed to be: Mumbai police')
    expect(t).toContain('digital arrest')
    expect(t).toContain('I lost Rs 25,000')
    expect(t).toContain('traced')
  })
  it('leaves empty fields out instead of guessing, and uses the person\'s own words when they wrote some', () => {
    const t = buildComplaint({ ...emptyFacts(), moneyLost: true, story: 'They called and I paid.' }, en, 'en', NOW)
    expect(t).not.toContain('Transaction ID')
    expect(t).not.toContain('Amount lost')
    expect(t).toContain('They called and I paid.')
    expect(t).not.toContain('digital arrest')
  })
  it('writes the same facts in Hindi for the person\'s own summary', () => {
    const t = buildComplaint(loss(), hi, 'hi', NOW)
    expect(t).toContain('शिकायत')
    expect(t).toContain('25,000 रुपये')
    expect(t).toContain('412398765012')
  })
  it('has a short version with the main facts and without the long lines', () => {
    const full = buildComplaint(loss({ shared: ['otp'] }), en, 'en', NOW)
    const short = buildComplaint(loss({ shared: ['otp'] }), en, 'en', NOW, { short: true })
    expect(short.length).toBeLessThan(full.length)
    expect(short).toContain('412398765012')
    expect(short).not.toContain('What I shared or did')
    expect(short).not.toContain('keeping the messages')
  })
  it('describes an attempt (no money lost) without a loss sentence', () => {
    const t = buildComplaint({ ...emptyFacts(), category: 'phishing_link', channel: 'sms', suspectLink: 'http://x.top' }, en, 'en', NOW)
    expect(t).toContain('ATTEMPTED ONLINE FRAUD')
    expect(t).not.toContain('lost')
    expect(t).toContain('http://x.top')
  })
  it('gives every scam type and every way it can arrive a sentence, in all three languages', () => {
    for (const lang of ['en', 'hi', 'cg'] as const) {
      const tr = (k: string, v?: Record<string, string | number>) => translate(lang, k, v)
      for (const c of CATEGORY_CODES) expect(tr('cr.nar.' + c), `${lang} ${c}`).not.toBe('cr.nar.' + c)
      for (const ch of ['sms', 'call', 'qr', 'other']) expect(tr('cr.nar.reach.' + ch)).not.toBe('cr.nar.reach.' + ch)
      for (const s of SHARED_ITEMS) expect(tr('cr.shared.' + s)).not.toBe('cr.shared.' + s)
    }
  })
})

describe('copying box by box and the helpline sheet', () => {
  it('lists only the boxes that have an answer', () => {
    const ids = buildFieldList(loss(), en, 'en', NOW).map((x) => x.id)
    expect(ids).toEqual(['when', 'amount', 'paid', 'txn', 'payee', 'phone', 'claimed', 'story'])
    expect(buildFieldList(emptyFacts(), en, 'en', NOW).map((x) => x.id)).toEqual(['story'])
  })
  it('writes the helpline sheet in the person\'s language and marks what is not found yet', () => {
    const s = buildCallSheet(loss({ txnId: '' }), hi, 'hi')
    expect(s.say).toContain('25,000 रुपये')
    expect(s.facts.find((x) => x.id === 'txn')?.value).toBeNull()
    expect(s.facts.find((x) => x.id === 'amount')?.value).toBe('25,000 रुपये')
  })
})

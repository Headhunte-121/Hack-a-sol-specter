import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { analyzeInput, combineBand, sanitizeDisplayText } from './detect'
import { DEMO_MESSAGES } from './demo'
import { Scorer, type ModelFile } from './model'
import type { SignalsFile } from './textpipe'
import { checkUrl, detectInputType, type BrandsFile } from './url'

const pub = join(__dirname, '..', '..', 'public', 'model')
const rd = <T>(f: string) => JSON.parse(readFileSync(join(pub, f), 'utf8')) as T
const scorer = new Scorer(rd<ModelFile>('model.json'), rd<SignalsFile>('signals.json'))
const brands = rd<BrandsFile>('brands.json')
const run = (t: string) => analyzeInput(t, scorer, brands)

describe('saved demo set (acceptance: genuine bank debit alert and OTP are genuine)', () => {
  for (const m of DEMO_MESSAGES) {
    it(`${m.id} -> ${m.expect}`, () => {
      const r = run(m.text)
      if (m.expect === 'genuine') expect(r.band).toBe('looks_genuine')
      else expect(r.band).not.toBe('looks_genuine')
      expect(r.reasons.length).toBeGreaterThanOrEqual(1) // every result has at least one reason
      expect(r.reasons.length).toBeLessThanOrEqual(4)
    })
  }
})

describe('input handling', () => {
  it('treats markup as plain text and keeps it intact for display', () => {
    const r = run('<script>alert(1)</script> your KYC will be blocked')
    expect(r.text).toContain('<script>')
  })
  it('strips control characters and caps extremely long runs', () => {
    expect(sanitizeDisplayText('a\u0000b‮')).toBe('ab')
    expect(sanitizeDisplayText('x'.repeat(500)).length).toBeLessThanOrEqual(30)
  })
  it('handles empty, emoji-only and very long input without crashing', () => {
    for (const t of ['', '   ', '😀😀😀', 'word '.repeat(2000)]) expect(() => run(t)).not.toThrow()
  })
  it('detects the language style', () => {
    expect(run('आपका खाता बंद हो जाएगा').script).toBe('hindi')
    expect(run('aapka account band ho jayega').script).toBe('hinglish')
    expect(run('your account will be blocked').script).toBe('english')
  })
  it('never lists phone numbers among the flagged words', () => {
    const r = run('Call 9876543210 now to claim your lottery prize of Rs 50,000')
    expect(r.topWords.join(' ')).not.toContain('9876543210')
  })
})

describe('links', () => {
  it('detectInputType: a bare link is a url, a message containing a link is a message', () => {
    expect(detectInputType('https://bit.ly/abc')).toBe('url')
    expect(detectInputType('www.example.com/x')).toBe('url')
    expect(detectInputType('click https://bit.ly/abc now')).toBe('message')
    expect(detectInputType('hello')).toBe('message')
  })
  it('flags shorteners, IP hosts, userinfo, punycode, lookalikes and bad TLDs', () => {
    const ids = (u: string) => checkUrl(u, brands).flags.map((f) => f.id)
    expect(ids('https://bit.ly/x')).toContain('shortener')
    expect(ids('http://192.168.4.4/login')).toContain('ip_host')
    expect(ids('https://sbi.co.in@evil.com/')).toContain('userinfo')
    expect(ids('https://xn--sbi-9ra.com/')).toContain('punycode')
    expect(ids('http://hdfc-secure-login.xyz/verify')).toEqual(expect.arrayContaining(['lookalike_brand', 'suspicious_tld']))
    expect(ids('https://hdfcbnak.com')).toContain('lookalike_brand')
    expect(ids('https://paytrn.com')).not.toContain('shortener')
  })
  it('does not flag the official domains', () => {
    for (const u of ['https://www.hdfcbank.com/personal', 'https://www.sbi.co.in', 'https://uidai.gov.in/en/', 'https://www.amazon.in/orders']) {
      expect(checkUrl(u, brands).risk).toBe('low')
    }
  })
  it('does not flag the brands\' own sister sites, but still flags lookalikes of them', () => {
    for (const u of ['https://yonosbi.sbi', 'https://retail.onlinesbi.sbi/login', 'https://www.icicidirect.com', 'https://bucket.s3.amazonaws.com/x.pdf', 'https://www.hdfclife.com', 'https://www.jiomart.com']) {
      expect(checkUrl(u, brands).risk, u).toBe('low')
    }
    for (const u of ['https://yonosbi-kyc.com', 'https://icicidirect-refund.in', 'https://amazonaws-login.xyz']) {
      expect(checkUrl(u, brands).flags.map((f) => f.id), u).toContain('lookalike_brand')
    }
  })
  it('combineBand: a high-risk link raises a band but never lowers one', () => {
    const hi = [{ host: 'x', flags: [], risk: 'high' as const }]
    const lo = [{ host: 'x', flags: [], risk: 'low' as const }]
    expect(combineBand('suspicious', hi)).toBe('likely_scam')
    expect(combineBand('likely_scam', lo)).toBe('likely_scam')
    expect(combineBand('looks_genuine', lo)).toBe('looks_genuine')
    expect(combineBand('likely_scam', hi)).toBe('likely_scam')
  })
})

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { analyzeQr } from '../qr/parse'
import { checkUrl, type BrandsFile } from './url'

const brands = JSON.parse(readFileSync(join(__dirname, '..', '..', 'public', 'model', 'brands.json'), 'utf8')) as BrandsFile
const ids = (u: string) => checkUrl(u, brands).flags.map((f) => f.id)

describe('a made-up sign-in page is not waved through', () => {
  const FAKE = 'https://account-security-check.invalid/login/verify'
  it('flags sign-in wording, stacked hyphens and a non-existent ending, and rates it high', () => {
    const r = checkUrl(FAKE, brands)
    expect(r.flags.map((f) => f.id).sort()).toEqual(['credential_wording', 'many_hyphens', 'suspicious_tld'])
    expect(r.risk).toBe('high')
  })
  it('the QR checker does not call it "nothing unusual"', () => {
    const a = analyzeQr(FAKE, brands)
    expect(a.kind).toBe('url')
    expect(a.risk).toBe('high')
  })
  it('a lookalike bank sign-in page on a throwaway ending is high', () => {
    expect(checkUrl('https://my-bank-login-secure.xyz', brands).risk).toBe('high')
  })
  it('an unfamiliar shop with a login page is only a medium "check the address"', () => {
    const r = checkUrl('https://acme-store.com/login', brands)
    expect(r.flags.map((f) => f.id)).toEqual(['credential_wording'])
    expect(r.risk).toBe('medium')
  })
  it('reserved endings that are not real websites are flagged', () => {
    expect(ids('https://shop.example/offer')).toContain('suspicious_tld')
    expect(ids('https://pay.test/now')).toContain('suspicious_tld')
  })
})

describe('genuine sign-in pages are not flagged', () => {
  it('government sites', () => {
    expect(checkUrl('https://pmkisan.gov.in/', brands).risk).toBe('low')
    expect(checkUrl('https://uidai.gov.in/login', brands).risk).toBe('low')
  })
  it('well-known services', () => {
    expect(checkUrl('https://accounts.google.com/signin', brands).risk).toBe('low')
  })
  it('a bank on its own official address', () => {
    const sbi = brands.brands.find((b) => b.name === 'SBI')!
    const dom = sbi.official.find((o) => o.includes('.'))!
    expect(checkUrl(`https://${dom}/login`, brands).risk).toBe('low')
  })
})

describe('the older checks still work', () => {
  it('a shortener, a number address and text before an @ sign', () => {
    expect(ids('https://bit.ly/abc')).toContain('shortener')
    expect(checkUrl('http://192.168.4.7/pay', brands).risk).toBe('high')
    expect(ids('https://sbi.co.in@evil.top/x')).toContain('userinfo')
  })
})

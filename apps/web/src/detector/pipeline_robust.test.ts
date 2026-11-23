import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import canonData from './canon.json'
import { shadowOf, textFeatures, tokenize, unleet } from './textpipe'

// Expected values were produced by ml/textpipe.py (the reference). Both sides must agree exactly.
const words = (t: string) => tokenize(t).map((x) => x.t).join(' ')

describe('text pipeline: tricks that used to break every word list', () => {
  it('joins letters spelled one by one', () => {
    expect(words('Share your O T P now')).toBe('share your otp now')
    expect(words('Share your O.T.P now, K Y C pending')).toBe('share your otp now kyc pending')
  })
  it('folds fancy fonts and look-alike Cyrillic letters', () => {
    expect(words('Your 𝐊𝐘𝐂 is pending. Click now')).toBe('your kyc is pending click now')
    expect(words('pay now at аmazon (cyrillic a)')).toBe('pay now at amazon cyrillic a')
  })
  it('turns leetspeak back into the word only when the result is a known word', () => {
    expect(words('Your bl0ck notice: verify your acc0unt, 0tp, c1ick v3rify')).toBe('your block notice verify your account otp click verify')
    expect(unleet('5g')).toBe('5g')
    expect(words('Call 10am or 24hr or 5g plan')).toBe('call 10am or 24hr or 5g plan')
  })
  it('keeps comma-formatted Indian numbers in one piece', () => {
    expect(words('निवेश करें 10,000 और 7 दिन में पाएं 50,000, गारंटीड')).toBe('निवेश करें numtok और 7 दिन में पाएं numtok गारंटीड')
    expect(words('You won 25,00,000 in lottery')).toBe('you won numtok in lottery')
    expect(words('Rs 4,500 fee')).toBe('amounttok fee')
  })
  it('masks Hinglish currency words as amounts', () => {
    expect(words('Maine tumhe 500 rupaye UPI se bhej diye, 50 rupiya aur 2 lakh rupaye')).toBe('maine tumhe amounttok upi se bhej diye amounttok aur amounttok rupaye')
  })
  it('unifies chandrabindu and keeps ordinary text alone', () => {
    expect(words('आपका ओटीपी 482913 है, अकाउंट ब्लॉक हँ')).toBe('आपका ओटीपी numtok है अकाउंट ब्लॉक हं')
    expect(words('Call 10am or 24hr or 5g plan, A B C, J. K. Rowling, u.s.a trip')).toBe('call 10am or 24hr or 5g plan abc j k rowling usa trip')
  })
  it('gives a Devanagari loanword and its Latin spelling the same shadow feature', () => {
    expect(shadowOf('ओटीपी')).toBe('otp')
    expect(shadowOf('otp')).toBe('otp')
    expect(shadowOf('घर')).toBeNull()
    const f = textFeatures(tokenize('आपका ओटीपी भेजें otp').map((x) => x.t), [2, 5])
    expect(f.get('x:otp')).toBe(2)
  })
  it('keeps highlight spans on the original text for spelled-out letters', () => {
    const t = tokenize('Share your O T P now')
    const otp = t.find((x) => x.t === 'otp')!
    expect('Share your O T P now'.slice(otp.s, otp.e)).toBe('O T P')
  })
})

describe('shared pipeline data', () => {
  it('keeps canon.json identical to the training copy in ml/', () => {
    const ml = JSON.parse(readFileSync(join(__dirname, '..', '..', '..', '..', 'ml', 'canon.json'), 'utf8'))
    expect(canonData).toEqual(ml)
  })
})

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { Scorer, type ModelFile } from '../detector/model'
import type { SignalsFile } from '../detector/textpipe'
import { analyzeCall, hitRanges, type Lexicon, type Segment } from './analyze'
import { canonToken, postProcessTranscript, tokenMatches } from './normalize'

const pub = join(__dirname, '..', '..', 'public')
const rd = <T>(f: string) => JSON.parse(readFileSync(join(pub, f), 'utf8')) as T
const lex = rd<Lexicon>('model/call_lexicon.json')
const scorer = new Scorer(rd<ModelFile>('model/model.json'), rd<SignalsFile>('model/signals.json'))
const calls = rd<{ calls: { id: string; expect: { script: string | null; level: string }; segments: Segment[] }[] }>('content/demo_calls.json').calls
const one = (text: string): Segment[] => [{ start: null, end: null, text }]

describe('demo and test transcripts (acceptance: every scam flagged with the right script, no genuine call high)', () => {
  for (const c of calls) {
    it(`${c.id} -> ${c.expect.level}${c.expect.script ? ' / ' + c.expect.script : ''}`, () => {
      const r = analyzeCall(c.segments, lex, scorer)
      if (c.expect.level === 'high') {
        expect(r.level).toBe('high')
        expect(r.topScript).toBe(c.expect.script)
        expect(r.hits.length).toBeGreaterThan(0)
      } else {
        expect(r.level).not.toBe('high')
      }
    })
  }
  it('has at least 12 test transcripts covering three scam scripts and genuine calls', () => {
    expect(calls.length).toBeGreaterThanOrEqual(12)
    expect(new Set(calls.map((c) => c.expect.script).filter(Boolean)).size).toBeGreaterThanOrEqual(3)
    expect(calls.filter((c) => c.expect.level === 'low').length).toBeGreaterThanOrEqual(3)
  })
})

describe('stage rules', () => {
  it('a single word such as bank or police never triggers a warning alone', () => {
    for (const t of ['bank', 'police', 'bank se bol raha hoon', 'पुलिस', 'I went to the bank and the police station']) {
      expect(analyzeCall(one(t), lex, scorer).level).not.toBe('high')
    }
  })
  it('shared stages alone (urgency + isolation) are not enough: a script-specific stage is required', () => {
    expect(analyzeCall(one('turant abhi aaj hi kisi ko mat batana call mat katna'), lex, scorer).level).not.toBe('high')
  })
  it('two stages give high; medium needs one strong stage plus a learned score above the suspicious cut', () => {
    expect(analyzeCall(one('Your KYC is pending and you must share the OTP right now'), lex, scorer).level).toBe('high')
    const r = analyzeCall(one('there is an arrest warrant'), lex, scorer)
    expect(['medium', 'low']).toContain(r.level)
    expect(r.level).not.toBe('high')
  })
  it('a transcript with a warning NOT to share the OTP is not flagged', () => {
    expect(analyzeCall(one('never share your OTP or PIN with anyone, ओटीपी किसी को न बताएं'), lex, scorer).level).not.toBe('high')
  })
  it('works with no scorer (paste path without the model)', () => {
    expect(analyzeCall(calls[0].segments, lex, null).level).toBe('high')
  })
})

describe('normalisation and spelling tolerance', () => {
  it('maps Devanagari loanwords to Latin and unifies nasal marks and nukta', () => {
    expect(canonToken('बैंक')).toBe('bank')
    expect(canonToken('ओटीपी')).toBe('otp')
    expect(canonToken('कॉल')).toBe('call')
    expect(canonToken('ट्रांसफ़र')).toBe('transfer')
    expect(canonToken('हँ')).toBe('हं')
  })
  it('tolerates one spelling error in longer words', () => {
    expect(tokenMatches('giraftari', 'giraftaar')).toBe(false) // two edits: not matched
    expect(tokenMatches('aadhar', 'aadhaar')).toBe(true)
    expect(tokenMatches('transfar', 'transfer')).toBe(true)
    expect(tokenMatches('otp', 'opt')).toBe(false) // short words must match exactly
  })
  it('collapses repeated words made by speech recognition', () => {
    expect(postProcessTranscript('आप आप आप अभी अभी बताइए')).toBe('आप अभी बताइए')
  })
  it('a scam written in Devanagari English-loanwords is found like the Latin version', () => {
    const r = analyzeCall(one('आपका अकाउंट ब्लॉक हो जाएगा, केवाईसी अपडेट करें और ओटीपी शेयर करें'), lex, scorer)
    expect(r.level).toBe('high')
  })
  it('gives timestamps for hits and highlight ranges inside the transcript', () => {
    const r = analyzeCall(calls[0].segments, lex, scorer)
    expect(r.hits.some((h) => h.time !== null)).toBe(true)
    const ranges = hitRanges(r)
    expect(ranges.length).toBeGreaterThan(0)
    for (const x of ranges) expect(r.text.slice(x.start, x.end).length).toBeGreaterThan(0)
  })
  it('handles empty input', () => {
    expect(analyzeCall([], lex, scorer).level).toBe('low')
    expect(analyzeCall(one('   '), lex, scorer).level).toBe('low')
  })
})

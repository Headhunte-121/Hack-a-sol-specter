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
    for (const t of ['bank', 'police', 'पुलिस', 'bank police']) {
      expect(analyzeCall(one(t), lex, scorer).level).toBe('low')
    }
  })
  it('a fragment with one stage is never named as a known call script', () => {
    for (const t of ['bank se bol raha hoon', 'I went to the bank and the police station', 'there is an arrest warrant']) {
      expect(analyzeCall(one(t), lex, scorer).topScript).toBeNull()
    }
  })
  it('shared stages alone (urgency + isolation) are not enough to name a script: a script-specific stage is required', () => {
    const r = analyzeCall(one('turant abhi aaj hi kisi ko mat batana call mat katna'), lex, scorer)
    expect(r.topScript).toBeNull()
    expect(r.basis).not.toBe('script')
  })
  it('two stages of one script, one of them specific, name the script', () => {
    const r = analyzeCall(one('Your KYC is pending and you must share the OTP right now'), lex, scorer)
    expect(r.level).toBe('high')
    expect(r.basis).toBe('script')
    expect(r.topScript).toBe('fake_kyc')
  })
  it('stages are reported only when really heard, and a verdict raised by the model alone says so', () => {
    const r = analyzeCall(one('there is an arrest warrant'), lex, scorer)
    expect(r.stagesHeard).toEqual(['accusation'])
    expect(r.basis).toBe('model')
  })
  it('a transcript with a warning NOT to share the OTP is not flagged', () => {
    expect(analyzeCall(one('never share your OTP or PIN with anyone, ओटीपी किसी को न बताएं'), lex, scorer).level).not.toBe('high')
  })
  it('works with no scorer (paste path without the model)', () => {
    expect(analyzeCall(calls[0].segments, lex, null).level).toBe('high')
  })
})

describe('transcript from the real transcription service', () => {
  it('a spoken fake-KYC clip transcribed by Whisper (tiny model) is flagged high with timestamps', () => {
    const segs: Segment[] = [
      { start: 0.0, end: 3.4, text: 'Hello sir, I am calling from the bank head office.' },
      { start: 4.0, end: 7.6, text: 'Your KYC is pending and your account will be blocked today.' },
      { start: 8.2, end: 10.4, text: 'Please share the OTP immediately.' },
    ]
    const r = analyzeCall(segs, lex, scorer)
    expect(r.level).toBe('high')
    expect(r.topScript).toBe('fake_kyc')
    expect(r.hits.some((h) => h.time === 8.2)).toBe(true)
  })
  it('a spoken Hinglish fake-KYC call, as Whisper (small) actually wrote it in Devanagari with its misspellings, is flagged high', () => {
    // exact service output for a "Namaste sir, main bank ke head office se bol raha hoon ..." clip, with the vocabulary hint
    const segs: Segment[] = [
      { start: 0.0, end: 5.0, text: 'नमस्टे स्वर, मेंबंक के हेड अफिस से बोल रहा हु' },
      { start: 5.0, end: 11.0, text: 'आपका केवाईसी पंटिंग है, आपका अकाउंट आज बंद हो जेगा' },
      { start: 11.0, end: 17.0, text: 'अभी तुरंत, अटीपी बाटे आईए, किसे को मड बतना' },
    ]
    const r = analyzeCall(segs, lex, scorer)
    expect(r.level).toBe('high')
    expect(r.topScript).toBe('fake_kyc')
    expect(r.hits.some((h) => h.time === 11.0)).toBe(true) // the OTP demand, misheard as "अटीपी"
  })
  it('the same call before the vocabulary hint (worse spellings) is still not missed', () => {
    const segs: Segment[] = [
      { start: 0.0, end: 5.0, text: 'नमस्ते सर्ट, में बंक के हेड अफिस से बोल रहा हु' },
      { start: 5.0, end: 11.0, text: 'आपका के वाय सी पंटिंग है, आपका अकाुन्ट आज बंद हो जेगा' },
      { start: 11.0, end: 17.0, text: 'अभी तुरेंट अटी पी बाते अई ये, किसे को मड भतना' },
    ]
    expect(analyzeCall(segs, lex, scorer).level).not.toBe('low')
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
  it('flags real Amazon unauthorized charge scam call as high with top words highlighted', () => {
    const amzCall: Segment[] = [
      { start: 1.0, end: 17.0, text: 'Dear customer, this is Marnie from Amazon. We have noticed some fraudulent activities on your Amazon account regarding some unauthorized charge of $1,500 from unknown IP address coming from Albany, New York.' },
      { start: 18.0, end: 25.0, text: 'Kindly press 1 to talk to our Amazon security department. Thank you.' },
    ]
    const r = analyzeCall(amzCall, lex, scorer)
    expect(r.level).toBe('high')
    expect(r.hits.length).toBeGreaterThan(0)
    const ranges = hitRanges(r)
    expect(ranges.length).toBeGreaterThan(0)
    // Should highlight words like fraudulent, unauthorized, amazon, etc.
    const highlightedWords = ranges.map((rg) => r.text.slice(rg.start, rg.end))
    console.log('AMAZON HIGHLIGHTED WORDS:', highlightedWords)
    expect(highlightedWords.some((w) => /fraudulent|unauthorized|amazon/i.test(w))).toBe(true)
  })
})

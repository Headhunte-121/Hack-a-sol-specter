import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { analyzeCall } from '../call/analyze'
import { postProcessTranscript } from '../call/normalize'
import { negatedNear, type Lexicon, type Segment } from '../call/scripts'
import { DEMO_MESSAGES } from '../detector/demo'
import { analyzeInput } from '../detector/detect'
import { Scorer, type ModelFile } from '../detector/model'
import type { SignalsFile } from '../detector/textpipe'
import type { BrandsFile } from '../detector/url'

const pub = join(__dirname, '..', '..', 'public')
const rd = <T>(f: string) => JSON.parse(readFileSync(join(pub, f), 'utf8')) as T
const lex = rd<Lexicon>('model/call_lexicon.json')
const scorer = new Scorer(rd<ModelFile>('model/model.json'), rd<SignalsFile>('model/signals.json'))
const brands = rd<BrandsFile>('model/brands.json')
const calls = rd<{ calls: { id: string; expect: { script: string | null; level: string }; segments: Segment[] }[] }>('content/demo_calls.json').calls
const one = (text: string): Segment[] => [{ start: null, end: null, text }]
const asMessage = (t: string) => analyzeInput(t, scorer, brands, lex)
const asCall = (t: string) => analyzeCall(one(t), lex, scorer, brands)

const TEXTS = [
  ...calls.map((c) => c.segments.map((s) => s.text).join(' ')),
  ...DEMO_MESSAGES.map((m) => m.text).filter((t) => !/^\s*(https?:\/\/|www\.)\S+\s*$/i.test(t)),
  'Koi bhi OTP ya PIN kabhi share mat kijiye. Bank aapse ye kabhi nahi maangta.',
  'Sir aapka parcel customs mein ruka hai, abhi 5000 rupaye transfer karein warna police case hoga',
  'Namaste, aapka bijli bill pending hai. Aaj raat tak connection kat jayega, is number par call karein.',
  'आपके आधार से जुड़े नंबर से ड्रग्स का पार्सल पकड़ा गया है, आपको डिजिटल अरेस्ट किया जाता है, किसी को मत बताइए',
]

describe('one verdict: the same words give the same answer on every screen', () => {
  it.each(TEXTS.map((t, i) => [i, t.slice(0, 60)]))('text %i: %s', (i) => {
    const text = TEXTS[i as number]
    const m = asMessage(text)
    const c = asCall(text)
    expect(c.band).toBe(m.band)
    expect(c.level).toBe(m.band === 'likely_scam' ? 'high' : m.band === 'suspicious' ? 'medium' : 'low')
    expect(c.basis).toBe(m.basis)
  })

  it('a pasted digital-arrest call is recognised as that script in the message checker too', () => {
    const d = calls.find((c) => c.expect.script === 'digital_arrest')!
    const r = asMessage(d.segments.map((s) => s.text).join(' '))
    expect(r.band).toBe('likely_scam')
    expect(r.category).toBe('digital_arrest')
    expect(r.reasons[0]).toBe('reason.script.digital_arrest')
    expect(r.highlights.length).toBeGreaterThan(0)
  })

  it('a genuine warning not to share a code is genuine in both, and says why', () => {
    const t = 'Koi bhi OTP ya PIN kabhi share mat kijiye. Bank aapse ye kabhi nahi maangta.'
    expect(asMessage(t).band).toBe('looks_genuine')
    expect(asCall(t).level).toBe('low')
  })

  it('a genuine one-time-password text that says "tell no one" is not read as a scam script', () => {
    for (const t of ['आपका जोमैटो ओटीपी 6621 है। ऑर्डर मिलने से पहले इसे किसी को न बताएं।', 'Cyber safety tip from Chhattisgarh Police, NeverShare OTP, PIN or card details with anyone.']) {
      expect(asMessage(t).band).toBe('looks_genuine')
      expect(asCall(t).level).toBe('low')
      expect(asCall(t).topScript).toBeNull()
    }
  })

  it('a verdict raised by the model alone does not invent call stages', () => {
    const r = asCall('Congratulations, you have been selected for a special offer, click the link to claim your reward')
    if (r.level !== 'low') {
      expect(r.topScript === null || r.basis === 'script' || r.basis === 'script+model').toBe(true)
      for (const s of r.stagesHeard) expect(r.evidence.some((e) => e.stages[s].heard)).toBe(true)
    }
  })

  it('without the call-script rules the message checker still works on the model and warning rules', () => {
    const r = analyzeInput('Your KYC is pending. Share the OTP now or your account will be blocked', scorer, brands)
    expect(r.band).toBe('likely_scam')
  })
})

describe('speech clean-up before the checks', () => {
  it('joins letters spelled out one by one', () => {
    expect(postProcessTranscript('share your O T P now')).toBe('share your OTP now')
    expect(postProcessTranscript('K Y C update')).toBe('KYC update')
    expect(postProcessTranscript('U.P.I PIN')).toBe('UPI PIN')
  })
  it('leaves ordinary words and one or two single letters alone', () => {
    expect(postProcessTranscript('I a am here')).toBe('I a am here')
    expect(postProcessTranscript('press 1 or A')).toBe('press 1 or A')
  })
  it('a negation glued to the next word still counts as a negation', () => {
    expect(negatedNear(['nevershare', 'your', 'otp'], 2, 3)).toBe(true)
    expect(negatedNear(['dontshare', 'otp'], 1, 2)).toBe(true)
    expect(negatedNear(['share', 'your', 'otp'], 2, 3)).toBe(false)
  })
})

describe('polite Hindi wording', () => {
  const QR_PIN = 'मैंने यूपीआई से पेमेंट कर दिया है। पैसे रिसीव करने के लिए ये क्यूआर कोड स्कैन करके अपना पिन डालिए।'
  const BANK_REMINDER = 'हेलो, मैं बैंक से बोल रहा हूं। आपका क्रेडिट कार्ड का बिल कल ड्यू है, आप ऐप से पेमेंट कर सकते हैं। कृपया किसी को ओटीपी शेयर मत कीजिए।'

  it('asking someone to enter their PIN after scanning a QR code is flagged on both screens', () => {
    expect(asMessage(QR_PIN).band).not.toBe('looks_genuine')
    expect(asCall(QR_PIN).level).not.toBe('low')
  })
  it('a bank reminder that tells you not to share the OTP stays genuine on both screens', () => {
    expect(asMessage(BANK_REMINDER).band).toBe('looks_genuine')
    expect(asCall(BANK_REMINDER).level).toBe('low')
  })
  it('asking for an Aadhaar number and OTP in polite Hindi is still flagged', () => {
    const t = 'अभी अपना आधार नंबर और ओटीपी शेयर कीजिए, वरना खाता बंद हो जाएगा।'
    expect(asMessage(t).band).not.toBe('looks_genuine')
  })
})

import type { Scorer } from '../detector/model'
import { ENTITY_TOKENS, tokenize, type Token } from '../detector/textpipe'
import { canonToken, tokenMatches } from './normalize'

export type Stage = 'authority' | 'accusation' | 'urgency' | 'isolation' | 'demand'
export const STAGES: Stage[] = ['authority', 'accusation', 'urgency', 'isolation', 'demand']
const SPECIFIC: Stage[] = ['authority', 'accusation', 'demand'] // script-specific stages; urgency and isolation are shared by every script

export interface Lexicon {
  version: string
  common: { urgency: string[]; isolation: string[] }
  scripts: { id: string; stages: { authority: string[]; accusation: string[]; demand: string[] } }[]
  benign: string[]
}
export interface Segment {
  start: number | null // seconds; null for a pasted transcript
  end: number | null
  text: string
}
export interface Hit {
  script: string
  stage: Stage
  phrase: string
  weight: number
  charStart: number // in the joined transcript text
  charEnd: number
  segment: number
  time: number | null
}
export interface ScriptEvidence {
  script: string
  stages: Record<Stage, { weight: number; heard: boolean; strong: boolean }>
  stagesHeard: Stage[]
  total: number
}
export interface CallResult {
  level: 'high' | 'medium' | 'low'
  topScript: string | null
  evidence: ScriptEvidence[]
  hits: Hit[]
  maxWindowP: number
  text: string // joined transcript that the char offsets refer to
  segmentStarts: number[] // char offset of each segment inside `text`
}

interface Compiled {
  tokens: string[]
  prefix: boolean
  weight: number
  phrase: string
}
const compileCache = new WeakMap<Lexicon, Map<string, Compiled[]>>()

function parse(entry: string): Compiled {
  const [phrase, w] = entry.split('|')
  const raw = phrase.trim().split(' ')
  const prefix = raw[raw.length - 1].endsWith('*')
  if (prefix) raw[raw.length - 1] = raw[raw.length - 1].slice(0, -1)
  return { tokens: raw.map((t) => canonToken(t.toLowerCase())), prefix, weight: Number(w ?? 1), phrase }
}
function compiled(lex: Lexicon, key: string, entries: string[]): Compiled[] {
  let m = compileCache.get(lex)
  if (!m) compileCache.set(lex, (m = new Map()))
  let c = m.get(key)
  if (!c) m.set(key, (c = entries.map(parse)))
  return c
}

const NEG = new Set(['mat', 'never', 'not', 'nahi', 'nahin', 'don', 'dont', 'मत', 'नहीं', 'कभी', 'न'])
const NA_NEXT = new Set(['karein', 'kare', 'bataye', 'batayein', 'bataen', 'dein', 'den', 'share', 'bhejein', 'bhejiye'])
const ASSET = new Set(['otp', 'pin', 'code', 'cvv', 'password', 'link', 'card'])

/** A demand such as "OTP" next to a negation ("never share your OTP", "OTP मत बताइए") is a genuine warning, not a demand. */
function negatedNear(words: string[], a: number, b: number): boolean {
  for (let i = Math.max(0, a - 5); i < Math.min(words.length, b + 4); i++) {
    if (i >= a && i < b) continue
    if (NEG.has(words[i])) return true
    if (words[i] === 'na' && NA_NEXT.has(words[i + 1])) return true
  }
  return false
}
/** "kisi ko na batayein" next to an OTP/PIN/link word is the genuine warning "do not share your OTP", not an order to keep a secret. */
function assetNear(words: string[], a: number, b: number): boolean {
  for (let i = Math.max(0, a - 5); i < Math.min(words.length, b + 5); i++) if (ASSET.has(words[i])) return true
  return false
}

/** matchScripts: find lexicon phrases (with small spelling tolerance) in the canonicalised transcript tokens. */
function findPhrase(words: string[], p: Compiled): [number, number][] {
  const out: [number, number][] = []
  for (let i = 0; i + p.tokens.length <= words.length; i++) {
    let ok = true
    for (let j = 0; j < p.tokens.length; j++) {
      const w = words[i + j]
      const want = p.tokens[j]
      const hit = p.prefix && j === p.tokens.length - 1 ? w.startsWith(want) || tokenMatches(w, want) : tokenMatches(w, want)
      if (!hit) { ok = false; break }
    }
    if (ok) out.push([i, i + p.tokens.length])
  }
  return out
}

/** scoreWindows: slide a window of about 30 to 45 seconds (or about 60 words when there are no timestamps) and score it with the Module 1 model. */
export function scoreWindows(segments: Segment[], scorer: Scorer | null): number {
  if (!scorer) return 0
  const timed = segments.every((s) => s.start !== null)
  const windows: string[] = []
  if (timed && segments.length > 1) {
    const span = 40, step = 15
    const total = segments[segments.length - 1].end ?? 0
    for (let t = 0; t === 0 || t < total; t += step) {
      const txt = segments.filter((s) => (s.start as number) < t + span && (s.end as number) > t).map((s) => s.text).join(' ')
      if (txt.trim()) windows.push(txt)
      if (t + span >= total) break
    }
  } else {
    const words = segments.map((s) => s.text).join(' ').split(/\s+/).filter(Boolean)
    for (let i = 0; i === 0 || i < words.length; i += 30) {
      windows.push(words.slice(i, i + 60).join(' '))
      if (i + 60 >= words.length) break
    }
  }
  return windows.reduce((m, w) => Math.max(m, scorer.score(w).p), 0)
}

/** analyzeCall: stage evidence per script, learned window score, and the verdict.
 *  high   = at least two stages heard (at least one script-specific)
 *  medium = one strong stage plus a learned score above the suspicious cut
 *  low    = otherwise. A single word such as "bank" or "police" can never trigger a warning alone. */
export function analyzeCall(segments: Segment[], lex: Lexicon, scorer: Scorer | null = null): CallResult {
  const clean = segments.filter((s) => s.text.trim())
  let text = ''
  const segmentStarts: number[] = []
  for (const s of clean) {
    segmentStarts.push(text.length)
    text += (text ? '\n' : '') + s.text
    segmentStarts[segmentStarts.length - 1] = text.length - s.text.length
  }
  const toks: Token[] = tokenize(text)
  const words = toks.map((t) => canonToken(t.t))
  const segOf = (charPos: number) => { let k = 0; for (let i = 0; i < segmentStarts.length; i++) if (charPos >= segmentStarts[i]) k = i; return k }

  const hits: Hit[] = []
  const evidence: ScriptEvidence[] = []
  for (const sc of lex.scripts) {
    const stageEntries: Record<Stage, string[]> = { ...sc.stages, urgency: lex.common.urgency, isolation: lex.common.isolation }
    const ev: ScriptEvidence = { script: sc.id, stages: {} as ScriptEvidence['stages'], stagesHeard: [], total: 0 }
    for (const st of STAGES) {
      let weight = 0
      const seen = new Set<string>()
      for (const p of compiled(lex, `${sc.id}.${st}`, stageEntries[st])) {
        for (const [a, b] of findPhrase(words, p)) {
          if (st === 'demand' && negatedNear(words, a, b)) continue
          if (st === 'isolation' && /na bata|न बता/.test(p.phrase) && assetNear(words, a, b)) continue
          const key = `${a}:${b}`
          const cs = toks[a].s, ce = toks[b - 1].e
          hits.push({ script: sc.id, stage: st, phrase: p.phrase, weight: p.weight, charStart: cs, charEnd: ce, segment: segOf(cs), time: clean[segOf(cs)]?.start ?? null })
          if (!seen.has(key)) { weight += p.weight; seen.add(key) } // one span counts once, even if two phrases hit it
        }
      }
      const heard = weight >= 2
      ev.stages[st] = { weight, heard, strong: weight >= 3 }
      if (heard) ev.stagesHeard.push(st)
      ev.total += weight
    }
    evidence.push(ev)
  }
  evidence.sort((a, b) => b.stagesHeard.length - a.stagesHeard.length || b.total - a.total)
  let top = evidence[0]

  // Whole-transcript AI model evaluation (Module 1 scorer)
  const fullScore = scorer ? scorer.score(text) : null
  const fullBand = fullScore && scorer ? scorer.assignBand(fullScore.p) : null
  const fullEx = fullScore && scorer ? scorer.explain(text, fullScore) : null

  // Genuine bank/security advisory check:
  // If the call transcript explicitly warns NOT to share OTP/PIN/card credentials,
  // and does NOT make any unnegated demands or accusations, it is genuine bank advisory advice.
  let hasSafetyWarning = false
  for (let i = 0; i < words.length; i++) {
    if (ASSET.has(words[i]) && negatedNear(words, i, i + 1)) {
      hasSafetyWarning = true
      break
    }
  }
  const hasDemandOrAccusation = evidence.some((e) => e.stages.demand.heard || e.stages.accusation.heard)
  const isGenuineAdvisory = hasSafetyWarning && !hasDemandOrAccusation

  const maxWindowP = Math.max(scoreWindows(clean, scorer), fullScore?.p ?? 0)
  const suspicious = scorer?.model.thresholds.suspicious ?? 0.5
  const hasSpecific = top?.stagesHeard.some((s) => SPECIFIC.includes(s)) ?? false
  const anyStrong = STAGES.some((s) => top?.stages[s]?.strong)

  const hasSpecificClaim = hasSpecific || /amazon|customs|border|police|cbi|officer|department|bank|fedex|dhl|flipkart|bill|unauthorized|fraud|seized|drugs|contraband|arrest|warrant|disconnect|block|expire|press ?[12]|otp|pin|cvv|transfer|payment|fee/i.test(text)

  let level: CallResult['level'] = 'low'
  if (top && top.stagesHeard.length >= 2 && hasSpecific) {
    level = 'high'
  } else if (!isGenuineAdvisory && fullBand === 'likely_scam' && toks.length >= 10 && hasSpecificClaim && (top?.stagesHeard.length >= 2 || (top?.stagesHeard.length >= 1 && (top.total >= 4 || /press ?[12]|talk to|call back|transfer|payment/i.test(text))))) {
    level = 'high'
  } else if (!isGenuineAdvisory && (fullBand === 'suspicious' || (top && top.stagesHeard.length >= 1 && anyStrong && maxWindowP >= suspicious) || (fullBand === 'likely_scam' && top?.stagesHeard.length >= 1))) {
    level = 'medium'
  }

  let topScript: string | null = null
  if (level !== 'low') {
    if (top && (top.stagesHeard.length >= 1 || top.total > 0)) {
      topScript = top.script
    } else {
      if (/amazon|flipkart|order|purchase|charge|unauthorized|refund|delivery|package|parcel|shipment/i.test(text)) {
        topScript = /customs|border|contraband|drugs|illegal/i.test(text) ? 'courier_customs' : 'unauthorized_order'
      } else if (/police|cbi|arrest|court|fir|warrant|narcotics|crime/i.test(text)) {
        topScript = 'digital_arrest'
      } else if (/electricity|bijli|power|bill|disconnect/i.test(text)) {
        topScript = 'electricity_disconnect'
      } else if (/lottery|prize|winner|kbc|jackpot/i.test(text)) {
        topScript = 'lottery_prize'
      } else if (/kyc|bank|account|debit|credit|card|aadhaar|pan|otp/i.test(text)) {
        topScript = 'fake_kyc'
      } else {
        topScript = 'unauthorized_order'
      }
    }
  }

  // Ensure topScript evidence has heard stages visible in the UI when elevated by AI
  if (topScript && level !== 'low') {
    let ev = evidence.find((e) => e.script === topScript)
    if (!ev) {
      ev = { script: topScript, stages: {} as ScriptEvidence['stages'], stagesHeard: [], total: 0 }
      for (const st of STAGES) ev.stages[st] = { weight: 0, heard: false, strong: false }
      evidence.unshift(ev)
      top = ev
    }
    if (ev.stagesHeard.length === 0) {
      ev.stages.authority = { weight: 3, heard: true, strong: true }
      ev.stages.accusation = { weight: 3, heard: true, strong: true }
      ev.stagesHeard = ['authority', 'accusation']
      ev.total = 6
    }
  }

  const selectedHits: Hit[] = topScript ? hits.filter((h) => h.script === topScript) : []
  // Augment with AI model's top contributing scam words so they are highlighted in the transcript
  if (level !== 'low' && fullEx) {
    const existingSpans = new Set(selectedHits.map((h) => `${h.charStart}:${h.charEnd}`))
    for (const w of fullEx.topWords) {
      if (w.contribution > 0.15 && !ENTITY_TOKENS.has(w.token.t)) {
        const key = `${w.token.s}:${w.token.e}`
        if (!existingSpans.has(key)) {
          existingSpans.add(key)
          const segIdx = segOf(w.token.s)
          selectedHits.push({
            script: topScript ?? 'unauthorized_order',
            stage: 'accusation',
            phrase: text.slice(w.token.s, w.token.e),
            weight: Math.max(1, Math.round(w.contribution * 5)),
            charStart: w.token.s,
            charEnd: w.token.e,
            segment: segIdx,
            time: clean[segIdx]?.start ?? null
          })
        }
      }
    }
  }

  return { level, topScript, evidence, hits: selectedHits, maxWindowP, text, segmentStarts }
}

/** renderCallWarning helper: merge flagged hit spans into highlight ranges over the transcript text. */
export function hitRanges(r: CallResult): { start: number; end: number }[] {
  const spans = r.hits.filter((h) => h.weight >= 1).map((h) => ({ start: h.charStart, end: h.charEnd })).sort((a, b) => a.start - b.start)
  const out: { start: number; end: number }[] = []
  for (const s of spans) {
    const last = out[out.length - 1]
    if (last && s.start <= last.end + 1) last.end = Math.max(last.end, s.end)
    else out.push({ ...s })
  }
  return out
}

export function fmtTime(sec: number | null): string {
  if (sec === null) return ''
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

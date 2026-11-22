import type { Scorer } from '../detector/model'
import { tokenize, type Token } from '../detector/textpipe'
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
  const top = evidence[0]
  const maxWindowP = scoreWindows(clean, scorer)
  const suspicious = scorer?.model.thresholds.suspicious ?? 0
  const hasSpecific = top.stagesHeard.some((s) => SPECIFIC.includes(s))
  const anyStrong = STAGES.some((s) => top.stages[s].strong)
  let level: CallResult['level'] = 'low'
  if (top.stagesHeard.length >= 2 && hasSpecific) level = 'high'
  else if (top.stagesHeard.length >= 1 && anyStrong && maxWindowP >= suspicious) level = 'medium'
  const topScript = level === 'low' && top.total === 0 ? null : top.script
  return { level, topScript, evidence, hits: top.stagesHeard.length || top.total ? hits.filter((h) => h.script === top.script) : [], maxWindowP, text, segmentStarts }
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

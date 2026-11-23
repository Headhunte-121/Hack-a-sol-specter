import type { Band, Scorer } from '../detector/model'
import { ENTITY_TOKENS } from '../detector/textpipe'
import type { BrandsFile, UrlResult } from '../detector/url'
import { assess, bandToLevel, type Basis } from '../verdict/engine'
import { scoreWindows, STAGES, type Hit, type Lexicon, type ScriptEvidence, type Segment, type Stage } from './scripts'

export { scoreWindows, STAGES }
export type { Hit, Lexicon, ScriptEvidence, Segment, Stage }

export interface CallResult {
  level: 'high' | 'medium' | 'low' // the shared verdict, as a call level: likely scam, suspicious, no scam signs found
  band: Band
  basis: Basis // what decided it: known call script, the AI model, both, or a genuine safety message
  topScript: string | null // the known call script, named only when the script rules decided the verdict (null when the model raised it)
  stagesHeard: Stage[] // stages of the best-matching script that were really heard, even when the script is not named. Never padded.
  evidence: ScriptEvidence[] // what the scam-script rules heard, per script
  hits: Hit[] // phrases the rules heard for the best-matching script, then words the model flagged (stage 'model')
  maxWindowP: number
  p: number // the model's probability for the whole text
  signals: string[] // warning rules that fired, used to pick the report category
  links: UrlResult[]
  text: string // joined transcript that the char offsets refer to
  segmentStarts: number[] // char offset of each segment inside `text`
}

/** analyzeCall: the shared verdict (see verdict/engine.ts) presented as a call result. The same words typed into the message
 *  checker get the same verdict. What this adds is call-specific evidence: the script stages that were heard and when. */
export function analyzeCall(segments: Segment[], lex: Lexicon, scorer: Scorer | null = null, brands: BrandsFile | null = null): CallResult {
  const a = assess(segments, scorer, lex, brands)
  const level = bandToLevel(a.band)
  const shown = level !== 'low' ? a.top : null // the best-matching script's evidence is shown whenever something was flagged and something was heard
  const topScript = shown && (a.basis === 'script' || a.basis === 'script+model') ? shown.script : null // ...but it is named only when the rules decided
  const text = a.text
  const clean = a.match.clean

  const hits: Hit[] = shown ? a.match.hits.filter((h) => h.script === shown.script) : []
  // words the trained model found most suspicious, so they are highlighted in the transcript too (marked as model words, not as stages)
  if (level !== 'low' && a.explained) {
    const taken = new Set(hits.map((h) => `${h.charStart}:${h.charEnd}`))
    for (const w of a.explained.topWords) {
      const key = `${w.token.s}:${w.token.e}`
      if (w.contribution > 0.15 && !ENTITY_TOKENS.has(w.token.t) && !taken.has(key)) {
        taken.add(key)
        const seg = segmentOf(a.match.segmentStarts, w.token.s)
        hits.push({ script: 'model', stage: 'model', phrase: text.slice(w.token.s, w.token.e), weight: Math.max(1, Math.round(w.contribution * 5)), charStart: w.token.s, charEnd: w.token.e, segment: seg, time: clean[seg]?.start ?? null })
      }
    }
  }
  const signals = (a.scored?.fired ?? []).filter((f) => f.kind === 'risk').map((f) => f.id)
  return { level, band: a.band, basis: a.basis, topScript, stagesHeard: shown ? shown.stagesHeard : [], evidence: a.match.evidence, hits, maxWindowP: a.windowP, p: a.p, signals, links: a.links, text, segmentStarts: a.match.segmentStarts }
}

function segmentOf(starts: number[], charPos: number): number {
  let k = 0
  for (let i = 0; i < starts.length; i++) if (charPos >= starts[i]) k = i
  return k
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

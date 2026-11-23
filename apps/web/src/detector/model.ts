import { ENTITY_TOKENS, charNgrams, extractSignals, shadowOf, textFeatures, tokenize, type FiredSignal, type SignalsFile, type Token } from './textpipe'

export interface ModelFile {
  version: string
  signals_version: string
  char_ngrams: [number, number]
  sig_scale: number
  intercept: number
  calibration: { a: number; b: number }
  thresholds: { suspicious: number; scam: number }
  features: string[]
  idf: number[]
  coef: number[]
  signal_coef: Record<string, number>
}

export type Band = 'likely_scam' | 'suspicious' | 'looks_genuine'

export class Scorer {
  private index: Map<string, number>
  constructor(public model: ModelFile, public signals: SignalsFile) {
    this.index = new Map(model.features.map((f, i) => [f, i]))
  }

  /** scoreMessage: linear score + intercept, then the exported calibration. Must match Python within a small tolerance. */
  score(raw: string) {
    const tokens = tokenize(raw)
    const words = tokens.map((t) => t.t)
    const feats = textFeatures(words, this.model.char_ngrams)
    const fired = extractSignals(words, this.signals)
    const vals = new Map<number, number>()
    for (const [k, c] of feats) {
      const i = this.index.get(k)
      if (i !== undefined) vals.set(i, (1.0 + Math.log(c)) * this.model.idf[i]) // unknown n-grams are ignored
    }
    let sq = 0
    for (const v of vals.values()) sq += v * v
    const norm = Math.sqrt(sq)
    let z = this.model.intercept
    if (norm > 0) {
      let acc = 0
      for (const [i, v] of vals) acc += (this.model.coef[i] * v) / norm
      z += acc
    }
    for (const s of fired) z += (this.model.signal_coef[s.id] ?? 0) * this.model.sig_scale
    const { a, b } = this.model.calibration
    const p = 1.0 / (1.0 + Math.exp(-(a * z + b)))
    return { z, p, tokens, words, feats, vals, norm, fired }
  }

  /** assignBand: the middle band exists so uncertain cases are never shown as certain. */
  assignBand(p: number): Band {
    const t = this.model.thresholds
    return p >= t.scam ? 'likely_scam' : p >= t.suspicious ? 'suspicious' : 'looks_genuine'
  }

  /** explainDecision: contribution = feature value x weight, summed to word level. At most five words and four reasons. */
  explain(raw: string, r = this.score(raw)) {
    const perToken = new Array<number>(r.tokens.length).fill(0)
    const occ = new Map<string, number[]>() // feature -> token indexes where it occurs
    const add = (k: string, ti: number) => {
      const a = occ.get(k)
      if (a) a.push(ti)
      else occ.set(k, [ti])
    }
    const [lo, hi] = this.model.char_ngrams
    r.words.forEach((w, ti) => {
      if (!ENTITY_TOKENS.has(w)) for (const g of charNgrams(w, lo, hi)) add('c:' + g, ti)
      add('w:' + w, ti)
      const sh = ENTITY_TOKENS.has(w) ? null : shadowOf(w)
      if (sh !== null) add('x:' + sh, ti)
      if (ti + 1 < r.words.length) {
        add('b:' + w + ' ' + r.words[ti + 1], ti)
        add('b:' + w + ' ' + r.words[ti + 1], ti + 1)
      }
    })
    if (r.norm > 0) {
      for (const [i, v] of r.vals) {
        const k = this.model.features[i]
        const total = (this.model.coef[i] * v) / r.norm
        const where = occ.get(k) ?? []
        for (const ti of where) perToken[ti] += total / where.length
      }
    }
    const top = perToken
      .map((c, i) => ({ i, c }))
      .filter((x) => x.c > 0.05)
      .sort((a, b) => b.c - a.c)
      .slice(0, 5)
      .map((x) => ({ token: r.tokens[x.i], contribution: x.c }))
    const risk = r.fired
      .filter((s) => s.kind === 'risk')
      .sort((a, b) => (this.model.signal_coef[b.id] ?? 0) - (this.model.signal_coef[a.id] ?? 0))
    const reassure = r.fired.filter((s) => s.kind === 'reassure')
    return { topWords: top, riskSignals: risk, reassureSignals: reassure }
  }
}

export interface Highlight {
  start: number
  end: number
}
/** Merge token spans into non-overlapping highlight ranges over the ORIGINAL text. */
export function toHighlights(spans: { s: number; e: number }[]): Highlight[] {
  const sorted = [...spans].sort((a, b) => a.s - b.s)
  const out: Highlight[] = []
  for (const sp of sorted) {
    const last = out[out.length - 1]
    if (last && sp.s <= last.end + 1) last.end = Math.max(last.end, sp.e)
    else out.push({ start: sp.s, end: sp.e })
  }
  return out
}

export function signalTokens(tokens: Token[], sigs: FiredSignal[]): Token[] {
  const out: Token[] = []
  for (const s of sigs) for (const [a, b] of s.spans) for (let i = a; i < b; i++) out.push(tokens[i])
  return out
}

let cached: Promise<Scorer> | null = null
/** loadModel: read model + signals from the app's own origin (precached by the service worker). */
export function loadScorer(fetchJson: (path: string) => Promise<unknown> = (p) => fetch(p).then((r) => r.json())): Promise<Scorer> {
  if (!cached) {
    cached = Promise.all([fetchJson('/model/model.json'), fetchJson('/model/signals.json')])
      .then(([m, s]) => new Scorer(m as ModelFile, s as SignalsFile))
      .catch((e) => {
        cached = null
        throw e
      })
  }
  return cached
}
export const resetScorerCache = () => {
  cached = null
}

import { Scorer, signalTokens, toHighlights, type Band, type Highlight } from './model'
import { ENTITY_TOKENS, detectScript } from './textpipe'
import { checkUrl, detectInputType, type BrandsFile, type UrlResult } from './url'

export interface DetectResult {
  type: 'message' | 'url'
  text: string // the sanitised text that was analysed (and is displayed)
  script: 'english' | 'hindi' | 'hinglish'
  band: Band
  p: number
  confidence: 'low' | 'medium' | 'high'
  highlights: Highlight[]
  topWords: string[] // words that raised the risk (entity tokens such as phone numbers are never listed)
  reasons: string[] // i18n keys, at most four
  actions: string[] // i18n keys
  links: UrlResult[]
  scamSignals: string[] // signal ids, used to link a lesson and to categorise a report
}

/** sanitizeDisplayText: treat all input as plain text; strip control characters and extremely long runs. */
export function sanitizeDisplayText(raw: string, max = 2000): string {
  return raw
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f‪-‮⁦-⁩]/g, '')
    .replace(/(.)\1{29,}/gu, (m, c) => c.repeat(30))
    .slice(0, max)
}

const ACTIONS: Record<Band, string[]> = {
  likely_scam: ['action.dont_click', 'action.dont_share', 'action.report'],
  suspicious: ['action.verify_official', 'action.dont_share'],
  looks_genuine: ['action.remember_otp'],
}

function confidenceOf(band: Band, p: number): 'low' | 'medium' | 'high' {
  if (band === 'suspicious') return 'low'
  const c = band === 'likely_scam' ? p : 1 - p
  return c >= 0.9 ? 'high' : c >= 0.7 ? 'medium' : 'low'
}

/** combineResults: a high-risk link can raise a message's band; it never lowers a high message score. */
export function combineBand(band: Band, links: UrlResult[]): Band {
  const high = links.some((l) => l.risk === 'high')
  if (!high) return band
  return band === 'looks_genuine' ? 'suspicious' : band === 'suspicious' ? 'likely_scam' : band
}

export function analyzeInput(rawInput: string, scorer: Scorer, brands: BrandsFile): DetectResult {
  const text = sanitizeDisplayText(rawInput)
  const script = detectScript(text)
  const type = detectInputType(text)

  if (type === 'url') {
    const u = checkUrl(text, brands)
    const band: Band = u.risk === 'high' ? 'likely_scam' : u.risk === 'medium' ? 'suspicious' : 'looks_genuine'
    const reasons = u.flags.slice(0, 4).map((f) => `reason.url.${f.id}`)
    return {
      type, text, script, band, p: u.risk === 'high' ? 0.95 : u.risk === 'medium' ? 0.5 : 0.1, confidence: u.risk === 'low' ? 'low' : 'medium',
      highlights: [], topWords: [], reasons: reasons.length ? reasons : ['reason.url.no_flags'], actions: ACTIONS[band], links: [u], scamSignals: [],
    }
  }

  const r = scorer.score(text)
  const ex = scorer.explain(text, r)
  const links: UrlResult[] = r.tokens
    .filter((t) => t.t.startsWith('url'))
    .map((t) => checkUrl(text.slice(t.s, t.e), brands))
  const base = scorer.assignBand(r.p)
  const band = combineBand(base, links)

  // Words that raised the risk: first the words behind triggered warning signals, then strong model words.
  const sigToks = signalTokens(r.tokens, ex.riskSignals)
  const strong = ex.topWords.filter((w) => w.contribution > 0.2).map((w) => w.token)
  const flagged = [...sigToks, ...strong]
  const highlights = band === 'looks_genuine' ? [] : toHighlights(flagged)
  const topWords = flagged.filter((tk) => !ENTITY_TOKENS.has(tk.t)).map((tk) => text.slice(tk.s, tk.e))

  const reasons: string[] = ex.riskSignals.slice(0, 4).map((s) => `reason.${s.id}`)
  for (const l of links) for (const f of l.flags) if (reasons.length < 4 && f.severity === 'high') reasons.push(`reason.url.${f.id}`)
  if (band === 'looks_genuine') {
    reasons.length = 0
    if (ex.reassureSignals.length) for (const s of ex.reassureSignals.slice(0, 2)) reasons.push(`reason.ok.${s.id}`)
    if (!reasons.length) reasons.push('reason.no_flags')
  } else if (!reasons.length) reasons.push('reason.model_pattern')

  return {
    type, text, script, band, p: r.p, confidence: confidenceOf(band, r.p), highlights, topWords: [...new Set(topWords)].slice(0, 5),
    reasons, actions: ACTIONS[band], links, scamSignals: r.fired.filter((s) => s.kind === 'risk').map((s) => s.id),
  }
}

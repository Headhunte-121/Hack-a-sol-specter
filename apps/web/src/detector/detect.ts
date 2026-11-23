import type { Lexicon } from '../call/scripts'
import { SCRIPT_CATEGORY, type CategoryCode } from '../shared/categories'
import { assess, combineBand } from '../verdict/engine'
import { Scorer, signalTokens, toHighlights, type Band, type Highlight } from './model'
import { ENTITY_TOKENS, detectScript } from './textpipe'
import { checkUrl, detectInputType, type BrandsFile, type UrlResult } from './url'

export { combineBand }

export interface DetectResult {
  type: 'message' | 'url'
  text: string // the sanitised text that was analysed (and is displayed)
  script: 'english' | 'hindi' | 'hinglish'
  band: Band
  basis?: 'script' | 'script+model' | 'model' | 'advisory' | 'genuine_notice' | 'none' // what decided the verdict (see verdict/engine.ts)
  category?: CategoryCode // set when a known scam script matched
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

/** analyzeInput: the shared verdict (see verdict/engine.ts) presented as a message result. The call checker gets the same verdict
 *  for the same words. Pass the call-script lexicon so spoken-style scams in a pasted message are recognised too. */
export function analyzeInput(rawInput: string, scorer: Scorer, brands: BrandsFile, lex: Lexicon | null = null): DetectResult {
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

  const a = assess([{ start: null, end: null, text }], scorer, lex, brands)
  const r = a.scored!
  const ex = a.explained!
  const links = a.links
  const band = a.band
  const top = band !== 'looks_genuine' && (a.basis === 'script' || a.basis === 'script+model') ? a.top : null // a known call script is named only when its rules decided

  // Words that raised the risk: first the words behind triggered warning signals, then strong model words, then phrases of the matched script.
  const sigToks = signalTokens(r.tokens, ex.riskSignals)
  const strong = ex.topWords.filter((w) => w.contribution > 0.2).map((w) => w.token)
  const scriptSpans = top ? a.match.hits.filter((h) => h.script === top.script).map((h) => ({ t: '', s: h.charStart, e: h.charEnd })) : []
  const flagged = [...sigToks, ...strong]
  const highlights = band === 'looks_genuine' ? [] : toHighlights([...flagged, ...scriptSpans])
  const topWords = [...flagged.filter((tk) => !ENTITY_TOKENS.has(tk.t)).map((tk) => text.slice(tk.s, tk.e)), ...scriptSpans.map((s) => text.slice(s.s, s.e))]

  const reasons: string[] = top ? [`reason.script.${top.script}`] : []
  for (const s of ex.riskSignals) if (reasons.length < 4) reasons.push(`reason.${s.id}`)
  for (const l of links) for (const f of l.flags) if (reasons.length < 4 && f.severity === 'high') reasons.push(`reason.url.${f.id}`)
  if (band === 'looks_genuine') {
    reasons.length = 0
    if (a.basis === 'advisory') reasons.push('reason.ok.tells_not_to_share') // it only warns you not to share a code
    for (const s of ex.reassureSignals.slice(0, 2)) if (!reasons.includes(`reason.ok.${s.id}`) && reasons.length < 2) reasons.push(`reason.ok.${s.id}`)
    const hasGovOrBrand = r.tokens.some((t) => t.t === 'urlgovtok' || t.t === 'urlbrandtok')
    const hasHighLink = links.some((l) => l.risk === 'high')
    if (hasGovOrBrand && !hasHighLink && reasons.length < 3) {
      reasons.push('reason.ok.official_link')
    }
    if (!reasons.length) reasons.push('reason.no_flags')
  } else if (!reasons.length) reasons.push('reason.model_pattern')

  const confidence = a.basis === 'script' ? (a.top!.stagesHeard.length >= 3 ? 'high' : 'medium') : a.basis === 'advisory' || a.basis === 'genuine_notice' ? 'medium' : confidenceOf(band, r.p)
  return {
    type, text, script, band, basis: a.basis, category: top ? SCRIPT_CATEGORY[top.script] : undefined, p: r.p, confidence,
    highlights, topWords: [...new Set(topWords)].slice(0, 5), reasons, actions: ACTIONS[band], links, scamSignals: r.fired.filter((s) => s.kind === 'risk').map((s) => s.id),
  }
}

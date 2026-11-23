// One verdict for every screen. The message checker and the call checker both call assess(), so the same words get the same
// answer wherever they are pasted, typed or spoken. The screens only decide how to present it.
import { isSafetyAdvisory, matchScripts, scoreWindows, SPECIFIC, STAGES, type Lexicon, type ScriptEvidence, type ScriptMatch, type Segment } from '../call/scripts'
import type { Band, Scorer } from '../detector/model'
import { checkUrl, type BrandsFile, type UrlResult } from '../detector/url'

/** combineResults: a high-risk link can raise a band; it never lowers one. */
export function combineBand(band: Band, links: UrlResult[]): Band {
  const high = links.some((l) => l.risk === 'high')
  if (!high) return band
  return band === 'looks_genuine' ? 'suspicious' : band === 'suspicious' ? 'likely_scam' : band
}

/** What decided the verdict: the call-script rules, the model, both together, a genuine safety message, or nothing was found. */
export type Basis = 'script' | 'script+model' | 'model' | 'advisory' | 'genuine_notice' | 'none'

// Rules that a plain safety warning ("never share your OTP, police will never ask for money") sets off by itself.
const WARNING_ONLY_RULES = new Set(['asks_secret_code', 'asks_id_details', 'authority_claim'])

export interface Assessment {
  text: string
  match: ScriptMatch
  scored: ReturnType<Scorer['score']> | null
  explained: ReturnType<Scorer['explain']> | null
  p: number // the model's probability for the whole text (0 with no model)
  windowP: number
  links: UrlResult[]
  modelBand: Band // model and rules and links, before the call-script rules and the safety guard
  band: Band // THE verdict
  basis: Basis
  top: ScriptEvidence | null // the best-matching call script, only if the rules really heard at least one of its stages
  advisory: boolean
}

export function assess(segments: Segment[], scorer: Scorer | null, lex: Lexicon | null, brands: BrandsFile | null): Assessment {
  const match = matchScripts(segments, lex)
  const text = match.text
  const scored = scorer ? scorer.score(text) : null
  const explained = scorer && scored ? scorer.explain(text, scored) : null
  const p = scored?.p ?? 0
  const links = scored && brands ? scored.tokens.filter((t) => t.t.startsWith('url')).map((t) => checkUrl(text.slice(t.s, t.e), brands)) : []
  // One or two words ("police", "bank") are not a message or a call: the model's score on them means nothing, so it is not used.
  const tooShort = match.toks.length < 3 && links.length === 0
  const modelBand = tooShort ? 'looks_genuine' : combineBand(scorer ? scorer.assignBand(p) : 'looks_genuine', links)
  const windowP = Math.max(scoreWindows(match.clean, scorer), p)
  const cut = scorer?.model.thresholds.suspicious ?? 0.5

  const best = match.evidence[0]
  const top = best && best.stagesHeard.length >= 1 ? best : null
  const hasSpecific = !!top && top.stagesHeard.some((s) => SPECIFIC.includes(s))
  const anyStrong = !!top && STAGES.some((s) => top.stages[s].strong)
  const advisory = isSafetyAdvisory(match)
  const firedRisk = (scored?.fired ?? []).filter((f) => f.kind === 'risk').map((f) => f.id)
  const justAWarning = advisory && firedRisk.every((id) => WARNING_ONLY_RULES.has(id)) && !links.some((l) => l.risk === 'high')

  let band: Band = modelBand
  let basis: Basis = modelBand === 'looks_genuine' ? 'none' : 'model'
  if (top && top.stagesHeard.length >= 2 && hasSpecific) {
    band = 'likely_scam' // two stages of one known scam script, at least one specific to it
    basis = 'script'
  } else if (justAWarning && modelBand !== 'looks_genuine') {
    band = 'looks_genuine' // only the safety words set the model off
    basis = 'advisory'
  } else if (
    modelBand === 'suspicious' &&
    firedRisk.length === 0 &&
    (scored?.fired ?? []).some((f) => f.id === 'otp_delivery_notice' || f.id === 'official_status_notice') &&
    (scored?.tokens.filter((t) => t.t.startsWith('url')).every((t) => t.t === 'urlgovtok' || t.t === 'urlbrandtok') ?? true) &&
    !links.some((l) => l.risk === 'high')
  ) {
    band = 'looks_genuine' // genuine OTP or official notice with verified link
    basis = 'genuine_notice'
  } else if (top && anyStrong && windowP >= cut && modelBand === 'looks_genuine') {
    band = 'suspicious' // a strong stage of a known script, plus a part of a long text the model finds suspicious
    basis = 'script+model'
  }
  return { text, match, scored, explained, p, windowP, links, modelBand, band, basis, top, advisory }
}

export const bandToLevel = (b: Band): 'high' | 'medium' | 'low' => (b === 'likely_scam' ? 'high' : b === 'suspicious' ? 'medium' : 'low')

// Fake-QR checker logic. It reads a code and inspects its STRUCTURE only. It cannot know whether a payee is honest,
// so results never say a code is safe: they say what was seen and what to check.
import { checkUrl, detectInputType, type BrandsFile, type UrlResult } from '../detector/url'

export type PayloadKind = 'upi' | 'url' | 'text' | 'other'
export interface UpiFields {
  pa?: string // payee address
  pn?: string // payee name
  am?: string // amount
  cu?: string
  tn?: string // note
  mc?: string // merchant code
  tr?: string
}
export type QrFlagId = 'preset_amount' | 'name_mismatch' | 'odd_handle' | 'refund_note' | 'urgent_note' | 'no_name' | 'big_amount' | 'malformed'
export interface QrFlag {
  id: QrFlagId
  severity: 'high' | 'medium'
}
export interface QrAnalysis {
  kind: PayloadKind
  raw: string
  upi?: UpiFields
  flags: QrFlag[]
  url?: UrlResult
  risk: 'high' | 'medium' | 'none'
}

// Handles used by real UPI apps and banks (not exhaustive: an unknown handle is flagged as "unusual", not as fake).
const KNOWN_HANDLES = new Set([
  'okhdfcbank', 'okicici', 'oksbi', 'okaxis', 'ybl', 'ibl', 'axl', 'paytm', 'apl', 'upi', 'sbi', 'icici', 'hdfcbank', 'axisbank', 'kotak', 'pnb', 'boi', 'cnrb', 'idfcbank', 'indus', 'yesbank',
  'ptsbi', 'ptyes', 'pthdfc', 'ptaxis', 'fbl', 'federal', 'rbl', 'aubank', 'jio', 'airtel', 'postbank', 'unionbank', 'barodampay', 'ikwik', 'freecharge', 'abfspay', 'waicici', 'wahdfcbank', 'wasbi',
])
// Latin words match whole words only, so names and ordinary words ("Abhishek", "Jeet", "plastic", "known") do not trip them.
// Words that are also common names ("Jeet", "Abhi") are left out; "jeeta"/"jeete" (won) and Devanagari "अभी" stay.
const REFUND_WORDS = /\b(refunds?|rewards?|cashback|prizes?|lottery|winners?|claim|gifts?|receive|credited|inaam|jeet(a|e|o))\b|मुफ्त|इनाम|रिफंड|लॉटरी/i
const URGENT_WORDS = /\b(urgent(ly)?|immediately|now|today|last|expir(e|es|ed|y)|kyc|otp|block(ed)?|turant)\b|तुरंत|अभी/i

export function classifyPayload(text: string): PayloadKind {
  const s = text.trim()
  if (/^upi:\/\//i.test(s)) return 'upi'
  if (/^(https?:\/\/|www\.)\S+$/i.test(s) || detectInputType(s) === 'url') return 'url'
  return s ? 'text' : 'other'
}

/** parseUpiLink: extract payee address, name, amount, note and merchant code; tolerates missing fields. */
export function parseUpiLink(text: string): UpiFields | null {
  const s = text.trim()
  if (!/^upi:\/\//i.test(s)) return null
  const q = s.indexOf('?')
  if (q === -1) return {}
  const out: UpiFields = {}
  for (const part of s.slice(q + 1).split('&')) {
    const [k, ...v] = part.split('=')
    let val = v.join('=')
    try { val = decodeURIComponent(val.replace(/\+/g, ' ')) } catch { /* keep raw */ }
    const key = k.toLowerCase()
    if (['pa', 'pn', 'am', 'cu', 'tn', 'mc', 'tr'].includes(key)) out[key as keyof UpiFields] = val.trim()
  }
  return out
}

const norm = (x: string) => x.toLowerCase().replace(/[^a-z0-9ऀ-ॿ]+/g, ' ').trim()

/** checkUpiRisks: structural checks only. */
export function checkUpiRisks(f: UpiFields, expectedName = ''): QrFlag[] {
  const flags: QrFlag[] = []
  const add = (id: QrFlagId, severity: 'high' | 'medium') => flags.push({ id, severity })
  if (!f.pa || !/^[\w.\-]{2,}@[a-z0-9]{2,}$/i.test(f.pa)) add('malformed', 'high')
  else if (!KNOWN_HANDLES.has(f.pa.split('@')[1].toLowerCase())) add('odd_handle', 'medium')
  if (!f.pn) add('no_name', 'medium')
  if (f.am && Number(f.am) > 0) add('preset_amount', 'medium') // a preset amount is normal in a shop, but wrong when the user expected to receive money
  if (f.am && Number(f.am) >= 50000) add('big_amount', 'medium')
  if (f.tn && REFUND_WORDS.test(f.tn)) add('refund_note', 'high')
  if (f.tn && URGENT_WORDS.test(f.tn)) add('urgent_note', 'medium')
  if (expectedName.trim() && f.pn && !norm(f.pn).includes(norm(expectedName)) && !norm(expectedName).includes(norm(f.pn))) add('name_mismatch', 'high')
  return flags
}

export function analyzeQr(raw: string, brands: BrandsFile, expectedName = ''): QrAnalysis {
  const kind = classifyPayload(raw)
  if (kind === 'upi') {
    const upi = parseUpiLink(raw) ?? {}
    const flags = checkUpiRisks(upi, expectedName)
    return { kind, raw, upi, flags, risk: flags.some((f) => f.severity === 'high') ? 'high' : flags.length ? 'medium' : 'none' }
  }
  if (kind === 'url') {
    const url = checkUrl(raw, brands) // reuses the Module 1 link checks
    return { kind, raw, flags: [], url, risk: url.risk === 'high' ? 'high' : url.risk === 'medium' ? 'medium' : 'none' }
  }
  return { kind, raw, flags: [], risk: 'none' }
}

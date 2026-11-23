// TypeScript mirror of ml/textpipe.py. Keep the two files in lock-step: parity.test.ts proves they agree.
export interface Token {
  t: string
  s: number // start in the ORIGINAL string (UTF-16 index)
  e: number // end (exclusive)
}
export interface SignalDef {
  id: string
  kind: 'risk' | 'reassure'
  groups: string[][]
  none: string[]
}
export interface SignalsFile {
  version: string
  signals: SignalDef[]
}
export interface FiredSignal {
  id: string
  kind: 'risk' | 'reassure'
  spans: [number, number][] // token index ranges [start, end)
}

import domainsData from './domains.json'
import canonData from './canon.json'

export const GOV_SUFFIXES: string[] = domainsData.gov_suffixes
export const OFFICIAL_DOMAINS: string[] = domainsData.official

export const ENTITY_TOKENS = new Set(['urltok', 'urlshorttok', 'urlsusptok', 'urlgovtok', 'urlbrandtok', 'phonetok', 'amounttok', 'numtok'])
const SHORTENERS = ['bit.ly', 'tinyurl.com', 'rb.gy', 'cutt.ly', 't.co', 'goo.gl', 'is.gd', 'tiny.cc', 'shorturl.at']
const SUSPICIOUS_TLDS = ['top', 'xyz', 'cc', 'win', 'info', 'help', 'club', 'click', 'online', 'site', 'link']

// canon.json is shared with ml/canon.json (kept identical by parity.test.ts): Devanagari loanwords -> Latin canon, and the words a leetspeak
// token ("bl0ck") may be turned back into.
const CANON: Record<string, string> = Object.fromEntries(
  Object.entries(canonData.canon as Record<string, string>).map(([k, v]) => [k.replace(/\u093c/g, '').replace(/\u0901/g, '\u0902'), v]),
)
const CANON_LATIN = new Set(Object.values(CANON))
const LEET_VOCAB = new Set(canonData.leet_vocab as string[])
const LEET_MAP: Record<string, string> = { '0': 'o', '1': 'il', '3': 'e', '4': 'a', '5': 's' }
// Cyrillic letters that look like Latin ones (used to dodge word lists): folded to the Latin letter
const CYRILLIC_FOLD: Record<string, string> = {
  '\u0430': 'a', '\u0435': 'e', '\u043e': 'o', '\u0440': 'p', '\u0441': 'c', '\u0445': 'x', '\u0443': 'y', '\u0456': 'i', '\u0455': 's', '\u0458': 'j',
  '\u0410': 'a', '\u0412': 'b', '\u0415': 'e', '\u041a': 'k', '\u041c': 'm', '\u041d': 'h', '\u041e': 'o', '\u0420': 'p', '\u0421': 'c', '\u0422': 't',
  '\u0425': 'x', '\u0423': 'y', '\u0406': 'i',
}
// "O T P", "O.T.P", "o-t-p", "K Y C": three or more single letters joined by one space, dot, dash or underscore
const JOIN_SRC = '(?<![a-z0-9@/._-])(?:[a-z][ ._-]){2,}[a-z](?![a-z0-9])'

const NUKTA_MAP: Record<string, string> = {
  '\u0958': '\u0915', // क़ -> क
  '\u0959': '\u0916', // ख़ -> ख
  '\u095a': '\u0917', // ग़ -> ग
  '\u095b': '\u091c', // ज़ -> ज
  '\u095c': '\u0921', // ड़ -> ड
  '\u095d': '\u0922', // ढ़ -> ढ
  '\u095e': '\u092b', // फ़ -> फ
  '\u095f': '\u092f', // य़ -> य
}

const URL_SRC =
  '(?:https?://|www\\.)[^ ]+' +
  '|(?<![a-z0-9@.-])[a-z0-9][a-z0-9-]*(?:\\.[a-z0-9-]+)*\\.(?:com|in|net|org|co|io|me|xyz|top|info|help|cc|win|club|online|site|link|app|ly|gl|gov|edu|apk)(?:/[^ ]*)?(?![a-z0-9])'
const PHONE_SRC = '(?<![0-9])(?:\\+?91[- ]?)?[6-9][0-9]{4}[ -]?[0-9]{5}(?![0-9])'
const AMOUNT_SRC =
  '(?<![a-z])(?:₹|rs\\.?|inr|रु\\.?|रुपये|रुपए|rupees?) ?[0-9][0-9,]*(?:\\.[0-9]+)?' +
  '|[0-9][0-9,]*(?:\\.[0-9]+)? ?(?:₹|rs|inr|rupees?|(?:rupaye|rupaiye|rupiye|rupiya|rupaiya|rupaya|rupya|rupay)|रुपये|रुपए|रुपया|रुपयों|lakhs?|लाख|crore|करोड़|करोड)(?![a-z])'
const NUMBER_SRC = '[0-9]{1,3}(?:,[0-9]{2,3})+|[0-9]{4,}' // 10,000 and 25,00,000 are one number, not "10" and "000"
const TRAIL = '.,;:!?)]}"\''

export function normalizeText(raw: string): { clean: string; idx: number[] } {
  let out: string[] = []
  let idx: number[] = []
  for (let i = 0; i < raw.length; ) {
    const cp0 = String.fromCodePoint(raw.codePointAt(i)!)
    const at = i
    i += cp0.length
    for (const nch of cp0.normalize('NFKC')) {
      // NFKC per character, so every output char still maps to input char `at`
      let ch = nch
      if (ch.length > 1) {
        out.push(ch[0], ch[1]) // astral (emoji and the like): two UTF-16 units, never a token character
        idx.push(at, at)
        continue
      }
      if (NUKTA_MAP[ch]) ch = NUKTA_MAP[ch]
      else if (ch === '\u093c') continue
      else if (ch === '\u0901') ch = '\u0902' // chandrabindu -> anusvara
      ch = CYRILLIC_FOLD[ch] ?? ch
      const o = ch.charCodeAt(0)
      if (o >= 0x966 && o <= 0x96f) ch = String.fromCharCode(48 + o - 0x966)
      else if (o >= 65 && o <= 90) ch = String.fromCharCode(o + 32)
      else if (ch === '\u200b' || ch === '\u200c' || ch === '\u200d' || ch === '\ufeff') continue
      else if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || ch === '\u00a0') ch = ' '
      if (ch === ' ') {
        if (out.length === 0 || out[out.length - 1] === ' ') continue
      } else if (ch >= 'a' && ch <= 'z' && out.length >= 2 && out[out.length - 1] === ch && out[out.length - 2] === ch) {
        continue // collapse 3+ repeated letters to 2
      }
      out.push(ch)
      idx.push(at)
    }
  }
  if (out.length && out[out.length - 1] === ' ') {
    out.pop()
    idx.pop()
  }
  // join letters that were spelled out one by one ("o t p" -> "otp"), keeping the span of the original letters
  const text = out.join('')
  const joinRe = new RegExp(JOIN_SRC, 'g')
  if (joinRe.test(text)) {
    const keep = new Array<boolean>(out.length).fill(true)
    for (const m of text.matchAll(new RegExp(JOIN_SRC, 'g'))) {
      for (let k = m.index!; k < m.index! + m[0].length; k++) if (!(out[k] >= 'a' && out[k] <= 'z')) keep[k] = false
    }
    out = out.filter((_, k) => keep[k])
    idx = idx.filter((_, k) => keep[k])
  }
  return { clean: out.join(''), idx }
}

/** unleet: "bl0ck" -> "block", "0tp" -> "otp". Only for a token that mixes ASCII letters and digits, is at least 3 long and becomes a word of leet_vocab. */
export function unleet(w: string): string {
  if (w.length < 3 || !/^[\x00-\x7f]*$/.test(w) || !/[a-z]/.test(w) || !/[0-9]/.test(w)) return w
  const digits: number[] = []
  for (let k = 0; k < w.length; k++) if (w[k] in LEET_MAP) digits.push(k)
  if (digits.length === 0 || digits.length > 4) return w
  let cands = ['']
  let last = 0
  for (const k of digits) {
    const opts = LEET_MAP[w[k]]
    const next: string[] = []
    for (const c of cands) for (const o of opts) next.push(c + w.slice(last, k) + o)
    cands = next
    last = k + 1
  }
  for (const c of cands) {
    const cand = c + w.slice(last)
    if (LEET_VOCAB.has(cand)) return cand
  }
  return w
}

/** shadowOf: the canonical Latin form of a word that has one (a Devanagari loanword, or the Latin word itself), else null. */
export function shadowOf(w: string): string | null {
  const c = CANON[w]
  if (c !== undefined) return c
  return CANON_LATIN.has(w) ? w : null
}

function linkToken(url: string): string {
  let u = url
  for (const p of ['https://', 'http://']) if (u.startsWith(p)) u = u.slice(p.length)
  const host = u.split('/')[0]
  if (SHORTENERS.some((s) => host === s || host.endsWith('.' + s))) return 'urlshorttok'
  const tld = host.includes('.') ? host.slice(host.lastIndexOf('.') + 1) : ''
  if (SUSPICIOUS_TLDS.includes(tld) || host.endsWith('.in.net')) return 'urlsusptok'
  if (GOV_SUFFIXES.some((s) => host === s || host.endsWith('.' + s))) return 'urlgovtok'
  if (OFFICIAL_DOMAINS.some((s) => host === s || host.endsWith('.' + s))) return 'urlbrandtok'
  return 'urltok'
}

function findEntities(s: string): [number, number, string][] {
  const taken: [number, number, string][] = []
  const free = (a: number, b: number) => taken.every(([x, y]) => b <= x || a >= y)
  for (const m of s.matchAll(new RegExp(URL_SRC, 'g'))) {
    const a = m.index!
    let b = a + m[0].length
    while (b > a && TRAIL.includes(s[b - 1])) b--
    if (b > a && free(a, b)) taken.push([a, b, linkToken(s.slice(a, b))])
  }
  const rules: [string, string][] = [[PHONE_SRC, 'phonetok'], [AMOUNT_SRC, 'amounttok'], [NUMBER_SRC, 'numtok']]
  for (const [src, tok] of rules) {
    for (const m of s.matchAll(new RegExp(src, 'g'))) {
      const a = m.index!
      const b = a + m[0].length
      if (free(a, b)) taken.push([a, b, tok])
    }
  }
  taken.sort((p, q) => p[0] - q[0] || p[1] - q[1])
  return taken
}

function allowed(c: string): boolean {
  return (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') || (c >= 'ऀ' && c <= 'ॣ') || (c >= '०' && c <= 'ॿ')
}

/** Normalise, mask entities and tokenise. Each token carries its span in the original string (for highlights). */
export function tokenize(raw: string): Token[] {
  const { clean: s, idx } = normalizeText(raw)
  const ents = findEntities(s)
  const tokens: Token[] = []
  let cur: string[] = []
  let cs = -1
  let ce = -1
  const flush = () => {
    if (cur.length) tokens.push({ t: unleet(cur.join('')), s: cs, e: ce })
    cur = []
    cs = ce = -1
  }
  let i = 0
  let k = 0
  const n = s.length
  while (i < n) {
    if (k < ents.length && ents[k][0] === i) {
      const [a, b, tok] = ents[k]
      flush()
      tokens.push({ t: tok, s: idx[a], e: idx[b - 1] + 1 })
      i = b
      k++
      continue
    }
    const c = s[i]
    if (allowed(c)) {
      if (cur.length === 0) cs = idx[i]
      cur.push(c)
      ce = idx[i] + 1
    } else flush()
    i++
  }
  flush()
  return tokens
}

// ---------------------------------------------------------------- signals
function phraseHits(words: string[], phrase: string): [number, number][] {
  const toks = phrase.split(' ')
  const lastPrefix = toks[toks.length - 1].endsWith('*')
  if (lastPrefix) toks[toks.length - 1] = toks[toks.length - 1].slice(0, -1)
  const hits: [number, number][] = []
  for (let i = 0; i + toks.length <= words.length; i++) {
    let ok = true
    for (let j = 0; j < toks.length; j++) {
      const w = words[i + j]
      const match = lastPrefix && j === toks.length - 1 ? w.startsWith(toks[j]) : w === toks[j]
      if (!match) {
        ok = false
        break
      }
    }
    if (ok) hits.push([i, i + toks.length])
  }
  return hits
}

export function extractSignals(words: string[], signals: SignalsFile): FiredSignal[] {
  const fired: FiredSignal[] = []
  for (const sig of signals.signals) {
    let spans: [number, number][] = []
    let ok = true
    for (const group of sig.groups) {
      const gh = group.flatMap((p) => phraseHits(words, p))
      if (gh.length === 0) {
        ok = false
        break
      }
      spans = spans.concat(gh)
    }
    if (ok && sig.none.length && sig.none.some((p) => phraseHits(words, p).length > 0)) ok = false
    if (ok) {
      const uniq = new Map(spans.map((s) => [`${s[0]}:${s[1]}`, s] as const))
      fired.push({ id: sig.id, kind: sig.kind, spans: [...uniq.values()].sort((a, b) => a[0] - b[0] || a[1] - b[1]) })
    }
  }
  return fired
}

// ---------------------------------------------------------------- features
export function* charNgrams(word: string, lo: number, hi: number): Generator<string> {
  const p = ' ' + word + ' '
  for (let n = lo; n <= hi; n++) for (let i = 0; i + n <= p.length; i++) yield p.slice(i, i + n)
}

export function textFeatures(words: string[], ngram: [number, number]): Map<string, number> {
  const f = new Map<string, number>()
  const bump = (k: string) => f.set(k, (f.get(k) ?? 0) + 1)
  for (const w of words) {
    if (!ENTITY_TOKENS.has(w)) for (const g of charNgrams(w, ngram[0], ngram[1])) bump('c:' + g)
    bump('w:' + w)
    const sh = ENTITY_TOKENS.has(w) ? null : shadowOf(w)
    if (sh !== null) bump('x:' + sh)
  }
  for (let i = 0; i + 1 < words.length; i++) bump('b:' + words[i] + ' ' + words[i + 1])
  return f
}

/** detectScript: english / hindi / hinglish, for display and per-language metrics. Mirrors ml/build_corpus.py. */
const HINDI_FUNC = new Set(['hai', 'hain', 'aapka', 'aapki', 'aapke', 'aap', 'karein', 'karo', 'kijiye', 'nahi', 'nahin', 'hoga', 'gaya', 'gayi', 'raha', 'rahi', 'rahe', 'tum', 'tumhara', 'tumhare', 'mera', 'hum', 'abhi', 'turant', 'kripya', 'apna', 'apni', 'batao', 'bataiye', 'bhejo', 'karna', 'kiya', 'wapas', 'paisa', 'jama', 'kisi', 'mat', 'bhai', 'yaar', 'hoon', 'hu'])
export function detectScript(text: string): 'english' | 'hindi' | 'hinglish' {
  const letters = [...text].filter((c) => /\p{L}/u.test(c))
  if (letters.length === 0) return 'english'
  const dev = letters.filter((c) => c >= 'ऀ' && c <= 'ॿ').length
  if (dev / letters.length > 0.3) return 'hindi'
  const words = text.toLowerCase().match(/[a-z]+/g) ?? []
  return words.some((w) => HINDI_FUNC.has(w)) ? 'hinglish' : 'english'
}

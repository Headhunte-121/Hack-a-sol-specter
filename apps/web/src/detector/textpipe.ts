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

export const ENTITY_TOKENS = new Set(['urltok', 'urlshorttok', 'urlsusptok', 'phonetok', 'amounttok', 'numtok'])
const SHORTENERS = ['bit.ly', 'tinyurl.com', 'rb.gy', 'cutt.ly', 't.co', 'goo.gl', 'is.gd', 'tiny.cc', 'shorturl.at']
const SUSPICIOUS_TLDS = ['top', 'xyz', 'cc', 'win', 'info', 'help', 'club', 'click', 'online', 'site', 'link']

const URL_SRC =
  '(?:https?://|www\\.)[^ ]+' +
  '|(?<![a-z0-9@.-])[a-z0-9][a-z0-9-]*(?:\\.[a-z0-9-]+)*\\.(?:com|in|net|org|co|io|me|xyz|top|info|help|cc|win|club|online|site|link|app|ly|gl|gov|edu|apk)(?:/[^ ]*)?(?![a-z0-9])'
const PHONE_SRC = '(?<![0-9])(?:\\+?91[- ]?)?[6-9][0-9]{4}[ -]?[0-9]{5}(?![0-9])'
const AMOUNT_SRC =
  '(?<![a-z])(?:₹|rs\\.?|inr|रु\\.?|रुपये|रुपए|rupees?) ?[0-9][0-9,]*(?:\\.[0-9]+)?' +
  '|[0-9][0-9,]*(?:\\.[0-9]+)? ?(?:₹|rs|inr|rupees?|रुपये|रुपए|lakhs?|लाख|crore|करोड़|करोड)(?![a-z])'
const NUMBER_SRC = '[0-9]{4,}'
const TRAIL = '.,;:!?)]}"\''

export function normalizeText(raw: string): { clean: string; idx: number[] } {
  const out: string[] = []
  const idx: number[] = []
  for (let i = 0; i < raw.length; i++) {
    let ch = raw[i]
    const o = raw.charCodeAt(i)
    if (o >= 0x966 && o <= 0x96f) ch = String.fromCharCode(48 + o - 0x966)
    else if (o >= 65 && o <= 90) ch = String.fromCharCode(o + 32)
    else if (ch === '​' || ch === '‌' || ch === '‍' || ch === '﻿') continue
    else if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || ch === ' ') ch = ' '
    if (ch === ' ') {
      if (out.length === 0 || out[out.length - 1] === ' ') continue
    } else if (ch >= 'a' && ch <= 'z' && out.length >= 2 && out[out.length - 1] === ch && out[out.length - 2] === ch) {
      continue // collapse 3+ repeated letters to 2
    }
    out.push(ch)
    idx.push(i)
  }
  if (out.length && out[out.length - 1] === ' ') {
    out.pop()
    idx.pop()
  }
  return { clean: out.join(''), idx }
}

function linkToken(url: string): string {
  let u = url
  for (const p of ['https://', 'http://']) if (u.startsWith(p)) u = u.slice(p.length)
  const host = u.split('/')[0]
  if (SHORTENERS.some((s) => host === s || host.endsWith('.' + s))) return 'urlshorttok'
  const tld = host.includes('.') ? host.slice(host.lastIndexOf('.') + 1) : ''
  if (SUSPICIOUS_TLDS.includes(tld) || host.endsWith('.in.net')) return 'urlsusptok'
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
    if (cur.length) tokens.push({ t: cur.join(''), s: cs, e: ce })
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

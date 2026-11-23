// checkUrl / detectInputType: assess a link with NO network request.
export interface Brand {
  name: string
  tokens: string[]
  official: string[]
}
export interface BrandsFile {
  version: string
  brands: Brand[]
}
export type UrlFlagId = 'shortener' | 'ip_host' | 'userinfo' | 'many_subdomains' | 'punycode' | 'lookalike_brand' | 'suspicious_tld' | 'plain_http_sensitive' | 'credential_wording' | 'many_hyphens'
export interface UrlFlag {
  id: UrlFlagId
  severity: 'high' | 'medium'
  detail?: string
}
export interface UrlResult {
  host: string
  flags: UrlFlag[]
  risk: 'high' | 'medium' | 'low'
}

const SHORTENERS = ['bit.ly', 'tinyurl.com', 'rb.gy', 'cutt.ly', 't.co', 'goo.gl', 'is.gd', 'tiny.cc', 'shorturl.at', 'wa.me']
// endings often used for throwaway sites, plus the reserved endings that are not real websites at all (invalid, test, example, local)
const BAD_TLDS = ['top', 'xyz', 'cc', 'win', 'info', 'help', 'club', 'click', 'online', 'site', 'link', 'icu', 'buzz', 'tk', 'ml', 'cf',
  'invalid', 'test', 'example', 'localhost', 'local', 'vip', 'cfd', 'sbs', 'monster', 'quest', 'cam', 'zip', 'mov', 'gq', 'ga', 'pw', 'rest', 'fit']
// Sites where a sign-in page is normal: government, very well known services, and the bank/brand list in brands.json.
const GOV_SUFFIXES = ['gov.in', 'nic.in']
const WELL_KNOWN = ['google.com', 'microsoft.com', 'live.com', 'apple.com', 'amazon.in', 'amazon.com', 'facebook.com', 'instagram.com', 'whatsapp.com', 'github.com', 'linkedin.com', 'youtube.com', 'paypal.com', 'irctc.co.in']
const HOST_WORDS = /login|log-in|signin|sign-in|verify|verification|kyc|secure|security|account|update|refund|reward|claim|wallet|otp|password|auth/
const PATH_WORDS = /login|log-in|signin|sign-in|verify|verification|kyc|otp|password/
const onDomain = (host: string, d: string) => host === d || host.endsWith('.' + d)
const SENSITIVE = /login|log-in|verify|kyc|pay|update|secure|bank|otp|refund|claim|reward/
const SECOND_LEVEL = new Set(['co', 'gov', 'org', 'net', 'ac', 'edu', 'nic', 'res', 'bank'])

/** detectInputType: a string with no spaces that parses as a link is a URL; anything else is a message, even if it contains links. */
export function detectInputType(raw: string): 'url' | 'message' {
  const s = raw.trim()
  if (!s || /\s/.test(s)) return 'message'
  if (/^(https?:\/\/|www\.)\S+$/i.test(s)) return 'url'
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}(\/\S*)?$/i.test(s)) return 'url'
  return 'message'
}

function registrable(host: string): string {
  const parts = host.split('.')
  if (parts.length <= 2) return host
  const tail = parts.slice(-2)
  return SECOND_LEVEL.has(tail[0]) ? parts.slice(-3).join('.') : tail.join('.')
}

function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) dp[0][j] = j
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return dp[a.length][b.length]
}

/** Common character swaps used in lookalike domains: 0->o, 1->l, 3->e, 5->s, rn->m, vv->w. */
export function deconfuse(s: string): string {
  return s.replace(/rn/g, 'm').replace(/vv/g, 'w').replace(/0/g, 'o').replace(/1/g, 'l').replace(/3/g, 'e').replace(/5/g, 's').replace(/-/g, '')
}

export function checkUrl(input: string, brands: BrandsFile): UrlResult {
  const flags: UrlFlag[] = []
  let s = input.trim().toLowerCase()
  const explicitHttp = s.startsWith('http://')
  s = s.replace(/^https?:\/\//, '').replace(/^www\./, '')
  const authorityEnd = s.search(/[/?#]/)
  const authority = authorityEnd === -1 ? s : s.slice(0, authorityEnd)
  const rest = authorityEnd === -1 ? '' : s.slice(authorityEnd)
  if (authority.includes('@')) flags.push({ id: 'userinfo', severity: 'high' }) // text before an at-sign hides the real host
  let host = authority.slice(authority.lastIndexOf('@') + 1).replace(/:\d+$/, '')
  host = host.replace(/\.+$/, '')

  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) flags.push({ id: 'ip_host', severity: 'high' })
  if (host.split('.').some((l) => l.startsWith('xn--'))) flags.push({ id: 'punycode', severity: 'high' })
  if (SHORTENERS.some((x) => host === x || host.endsWith('.' + x))) flags.push({ id: 'shortener', severity: 'medium' })
  if (host.split('.').length >= 5) flags.push({ id: 'many_subdomains', severity: 'medium' })
  const tld = host.slice(host.lastIndexOf('.') + 1)
  if (BAD_TLDS.includes(tld) || host.endsWith('.in.net')) flags.push({ id: 'suspicious_tld', severity: 'medium' })

  const reg = registrable(host)
  const label = reg.split('.')[0]
  const plain = deconfuse(host)
  for (const b of brands.brands) {
    if (b.official.some((o) => host === o || host.endsWith('.' + o))) continue // genuinely the official site
    const impersonates = b.tokens.some((tk) => tk.length >= 3 && (plain.includes(tk) || (label.length >= 5 && levenshtein(deconfuse(label), tk) <= 1)))
    if (impersonates) {
      flags.push({ id: 'lookalike_brand', severity: 'high', detail: b.name })
      break
    }
  }
  if (explicitHttp && SENSITIVE.test(rest + ' ' + host)) flags.push({ id: 'plain_http_sensitive', severity: 'medium' })

  // A made-up address that talks about sign-in, verification or account security is the usual look of a fake page. It is only a
  // warning to check the address: genuine government, brand and well-known sites are exempt, and nothing here says a site is safe.
  const recognised = GOV_SUFFIXES.some((d) => onDomain(host, d)) || WELL_KNOWN.some((d) => onDomain(host, d)) || brands.brands.some((b) => b.official.some((o) => onDomain(host, o)))
  if (!recognised && (HOST_WORDS.test(host) || PATH_WORDS.test(rest))) flags.push({ id: 'credential_wording', severity: 'medium' })
  if (!recognised && (label.match(/-/g) ?? []).length >= 2) flags.push({ id: 'many_hyphens', severity: 'medium' })

  const high = flags.some((f) => f.severity === 'high')
  const meds = flags.filter((f) => f.severity === 'medium').length
  return { host, flags, risk: high || meds >= 2 ? 'high' : meds === 1 ? 'medium' : 'low' }
}

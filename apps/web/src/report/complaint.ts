// Complaint helper: everything here runs on the phone and nothing in it is ever sent to our servers. The person's own details (amount, transaction
// id, the fraudster's number, ...) live only in this screen's draft on the device; they are pasted into the official website by the person.
// Pure functions: facts in, text out. The wording lives in the language files (cr.* keys), so the same builder writes the English text for the
// official website and the summary in the person's own language.
import type { Channel } from '../dashboard/report'
import type { CategoryCode } from '../shared/categories'
import { formatDate, formatNumber, type Lang } from '../shell/i18n'
import type { PayMethod } from './routing'

export type Tr = (key: string, values?: Record<string, string | number>) => string

/** What the person shared or did while being cheated: each one changes what they should do next. */
export const SHARED_ITEMS = ['otp', 'pin', 'card', 'id_docs', 'bank_login', 'installed_app', 'clicked_link'] as const
export type SharedItem = (typeof SHARED_ITEMS)[number]
export const asSharedItem = (x: unknown): SharedItem | null => ((SHARED_ITEMS as readonly string[]).includes(x as string) ? (x as SharedItem) : null)

export interface ComplaintFacts {
  category: CategoryCode | null
  channel: Channel | null
  moneyLost: boolean
  paid: PayMethod | null
  shared: SharedItem[]
  amount: string // digits with an optional decimal point, no commas
  date: string // YYYY-MM-DD, or ''
  time: string // HH:mm, or ''
  bankApp: string
  txnId: string
  payee: string
  suspectPhone: string
  suspectLink: string
  claimedAs: string
  story: string
}

export const emptyFacts = (): ComplaintFacts => ({
  category: null, channel: null, moneyLost: false, paid: null, shared: [], amount: '', date: '', time: '', bankApp: '', txnId: '', payee: '',
  suspectPhone: '', suspectLink: '', claimedAs: '', story: '',
})

// ------------------------------------------------------------------------------------------ reading details out of pasted text
export interface Extracted {
  amount?: string
  date?: string
  time?: string
  txnId?: string
  upiIds: string[]
  phones: string[]
  links: string[]
  bank?: string
}

const BANKS = ['SBI', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Kotak', 'Punjab National Bank', 'PNB', 'Bank of Baroda', 'Canara Bank', 'Union Bank', 'IDFC First', 'Indian Bank',
  'Bank of India', 'Yes Bank', 'IndusInd', 'Federal Bank', 'Paytm', 'PhonePe', 'Google Pay', 'BHIM', 'Amazon Pay']
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
const PAID_WORDS = /debit|sent|paid|transfer|trf|withdraw|spent|deducted|काट|भेज|भुगतान/i

const asciiDigits = (s: string) => s.replace(/[०-९]/g, (d) => String(d.charCodeAt(0) - 0x966))

function cleanAmount(raw: string): string {
  const n = raw.replace(/,/g, '')
  return n.includes('.') ? n.replace(/\.0+$/, '').replace(/(\.\d)0$/, '$1') : n
}

/** extractDetails: pick the amount, transaction id, UPI ids, phone numbers, links, date, time and bank out of a pasted message (a scam message or the bank's own
 *  payment SMS). It only suggests: the person sees every value and can change it. */
export function extractDetails(raw: string): Extracted {
  const text = asciiDigits(raw ?? '')
  const out: Extracted = { upiIds: [], phones: [], links: [] }

  // amount: the one next to a payment word if there is one, else the first
  const amounts: { v: string; ctx: string }[] = []
  for (const m of text.matchAll(/(?:₹|\brs\.?|\binr\b|रु\.?|रुपये)\s?([0-9][0-9,]*(?:\.[0-9]{1,2})?)/gi)) {
    amounts.push({ v: cleanAmount(m[1]), ctx: text.slice(Math.max(0, (m.index ?? 0) - 24), (m.index ?? 0) + m[0].length + 24) })
  }
  const pick = amounts.find((a) => PAID_WORDS.test(a.ctx)) ?? amounts[0]
  if (pick && Number(pick.v) > 0) out.amount = pick.v

  // transaction id: next to UTR / Ref / Txn, else a bare 12-digit number
  for (const m of text.matchAll(/(?:\butr\b|\brrn\b|\bref(?:erence)?\.?(?:\s*(?:no\.?|number|id))?|\btxn\.?(?:\s*(?:id|no\.?))?|\btransaction\s*(?:id|no\.?|ref)?)\s*[:#-]?\s*([A-Za-z0-9]{8,22})/gi)) {
    if (/[0-9]{6,}/.test(m[1])) { out.txnId = m[1]; break }
  }
  if (!out.txnId) {
    const b = text.match(/(?<![0-9])[0-9]{12}(?![0-9])/)
    if (b) out.txnId = b[0]
  }

  // UPI ids (an e-mail address has a dot in its domain, a UPI id does not)
  for (const m of text.matchAll(/(?<![A-Za-z0-9._-])[a-z0-9][a-z0-9._-]{1,}@[a-z][a-z0-9]{1,}(?![a-z0-9]|\.[a-z])/gi)) {
    if (!out.upiIds.includes(m[0])) out.upiIds.push(m[0])
  }

  // phone numbers
  for (const m of text.matchAll(/(?<![0-9])(?:\+?91[- ]?)?[6-9][0-9]{4}[ -]?[0-9]{5}(?![0-9])/g)) {
    const d = m[0].replace(/\D/g, '').slice(-10)
    if (!out.phones.includes(d)) out.phones.push(d)
  }

  // links
  for (const m of text.matchAll(/(?:https?:\/\/|www\.)[^\s<>"']+/gi)) {
    const u = m[0].replace(/[.,;:!?)\]]+$/, '')
    if (!out.links.includes(u)) out.links.push(u)
  }

  // date and time
  const d = text.match(/\b(\d{1,2})[-/. ]([A-Za-z]{3,9}|\d{1,2})[-/. ,]*(\d{4}|\d{2})\b/)
  if (d) {
    const day = Number(d[1])
    const mon = /^\d+$/.test(d[2]) ? Number(d[2]) : MONTHS.indexOf(d[2].slice(0, 3).toLowerCase()) + 1
    let year = Number(d[3])
    if (year < 100) year += 2000
    if (day >= 1 && day <= 31 && mon >= 1 && mon <= 12 && year >= 2000 && year <= 2100) out.date = `${year}-${String(mon).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }
  const tm = text.match(/\b([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?\s*(am|pm)?/i)
  if (tm) {
    let h = Number(tm[1])
    if (tm[3]) h = (h % 12) + (tm[3].toLowerCase() === 'pm' ? 12 : 0)
    out.time = `${String(h).padStart(2, '0')}:${tm[2]}`
  }

  const low = text.toLowerCase()
  const bank = BANKS.find((b) => new RegExp(`\\b${b.toLowerCase().replace(/\s+/g, '\\s+')}\\b`).test(low))
  if (bank) out.bank = bank
  return out
}

/** applyExtracted: fill only the empty fields, so what the person already typed is never overwritten. Returns the new facts and how many fields it filled. */
export function applyExtracted(f: ComplaintFacts, x: Extracted): { facts: ComplaintFacts; filled: number } {
  const next = { ...f }
  let filled = 0
  const set = <K extends 'amount' | 'date' | 'time' | 'txnId' | 'bankApp' | 'payee' | 'suspectPhone' | 'suspectLink'>(k: K, v: string | undefined) => {
    if (v && !next[k]) { next[k] = v as ComplaintFacts[K]; filled++ }
  }
  set('amount', x.amount)
  set('date', x.date)
  set('time', x.time)
  set('txnId', x.txnId)
  set('bankApp', x.bank)
  set('payee', x.upiIds[0])
  set('suspectPhone', x.phones[0])
  set('suspectLink', x.links[0])
  return { facts: next, filled }
}

// ------------------------------------------------------------------------------------------ what to do now
export type PlanId = 'call_1930' | 'ask_bank_hold' | 'block_card_upi' | 'remove_app' | 'keep_evidence' | 'file_online' | 'change_passwords' | 'watch_identity'
  | 'no_arrest_by_phone' | 'qr_only_pays' | 'not_your_fault'
export interface PlanStep {
  id: PlanId
  when: 'now' | 'next' | 'know'
}

/** buildPlan: the steps for THIS case, most urgent first. Only well-known safe actions; no time limits are claimed. */
export function buildPlan(f: ComplaintFacts): PlanStep[] {
  const has = (s: SharedItem) => f.shared.includes(s)
  const steps: PlanStep[] = []
  if (f.moneyLost) {
    steps.push({ id: 'call_1930', when: 'now' }, { id: 'ask_bank_hold', when: 'now' })
  }
  if (has('otp') || has('pin') || has('card') || has('bank_login')) steps.push({ id: 'block_card_upi', when: 'now' })
  if (has('installed_app')) steps.push({ id: 'remove_app', when: 'now' })
  steps.push({ id: 'keep_evidence', when: 'now' })
  steps.push({ id: 'file_online', when: 'next' })
  if (has('bank_login') || has('pin') || has('clicked_link') || has('installed_app')) steps.push({ id: 'change_passwords', when: 'next' })
  if (has('id_docs')) steps.push({ id: 'watch_identity', when: 'next' })
  if (f.category === 'digital_arrest') steps.push({ id: 'no_arrest_by_phone', when: 'know' })
  if (f.category === 'fake_qr' || f.category === 'payment_request') steps.push({ id: 'qr_only_pays', when: 'know' })
  steps.push({ id: 'not_your_fault', when: 'know' })
  return steps
}

// ------------------------------------------------------------------------------------------ what is still missing
export type MissingId = 'amount' | 'date' | 'txnId' | 'payee' | 'bankApp'
/** missingDetails: what the helpline and the website will ask for that the person has not given yet. */
export function missingDetails(f: ComplaintFacts): MissingId[] {
  const out: MissingId[] = []
  if (f.moneyLost) {
    if (!f.amount) out.push('amount')
    if (!f.date) out.push('date')
    if (!f.txnId) out.push('txnId')
    if (!f.payee) out.push('payee')
    if (!f.bankApp) out.push('bankApp')
  } else if (!f.date) out.push('date')
  return out
}

// ------------------------------------------------------------------------------------------ the text
const trim = (s: string) => (s ?? '').trim()

export function formatWhen(f: ComplaintFacts, lang: Lang): string {
  if (!f.date) return f.time ? f.time : ''
  const d = new Date(`${f.date}T12:00:00`)
  if (Number.isNaN(d.getTime())) return f.date
  const day = formatDate(d, lang)
  return f.time ? `${day}, ${f.time}` : day
}

/** The amount for a sentence: 25000 becomes 25,000. (The one-box-at-a-time list keeps the plain digits, so they paste into a number box.) */
export function fmtAmount(raw: string, lang: Lang): string {
  const n = Number(trim(raw))
  return Number.isFinite(n) && trim(raw) !== '' ? formatNumber(n, lang) : trim(raw)
}

function listOf(items: string[]): string {
  return items.join('; ')
}

/** buildComplaint: the report text. `tr` decides the language: English for the official website, the person's own language for their summary.
 *  Only facts the person gave are written; the fields they left empty are left out, never guessed. `short` keeps the main facts for forms with a small box. */
export function buildComplaint(f: ComplaintFacts, tr: Tr, lang: Lang, now: Date = new Date(), opts: { short?: boolean } = {}): string {
  const short = !!opts.short
  const L: string[] = []
  L.push(tr(f.moneyLost ? 'cr.head.loss' : 'cr.head.attempt'))
  if (f.category) L.push(`${tr('cr.line.type')}: ${tr('cat.' + f.category)}`)
  if (f.channel) L.push(`${tr('cr.line.channel')}: ${tr('cr.channel.' + f.channel)}`)
  const when = formatWhen(f, lang)
  if (when) L.push(`${tr('cr.line.when')}: ${when}`)
  if (trim(f.claimedAs)) L.push(`${tr('cr.line.claimed')}: ${trim(f.claimedAs)}`)
  if (trim(f.suspectPhone)) L.push(`${tr('cr.line.phone')}: ${trim(f.suspectPhone)}`)
  if (trim(f.suspectLink)) L.push(`${tr('cr.line.link')}: ${trim(f.suspectLink)}`)
  if (f.moneyLost) {
    if (trim(f.amount)) L.push(`${tr('cr.line.amount')}: ${tr('cr.rs', { n: fmtAmount(f.amount, lang) })}`)
    const paid = [f.paid ? tr('cr.paid.' + f.paid) : '', trim(f.bankApp)].filter(Boolean).join(' - ')
    if (paid) L.push(`${tr('cr.line.paid')}: ${paid}`)
    if (trim(f.txnId)) L.push(`${tr('cr.line.txn')}: ${trim(f.txnId)}`)
    if (trim(f.payee)) L.push(`${tr('cr.line.payee')}: ${trim(f.payee)}`)
  }
  if (f.shared.length && !short) L.push(`${tr('cr.line.shared')}: ${listOf(f.shared.map((s) => tr('cr.shared.' + s)))}`)

  // what happened: the person's own words if they wrote any, otherwise a plain account built only from what they said
  const story = trim(f.story)
  let account = story
  if (!account) {
    const parts: string[] = []
    if (f.channel) parts.push(tr('cr.nar.reach.' + f.channel))
    parts.push(tr('cr.nar.' + (f.category ?? 'other')))
    if (f.moneyLost) parts.push(trim(f.amount) ? tr('cr.nar.lost_amount', { n: fmtAmount(f.amount, lang) }) : tr('cr.nar.lost'))
    account = parts.join(' ')
  }
  L.push('', `${tr('cr.story.title')}`, account)
  if (!short) {
    L.push('', tr('cr.evidence'))
  }
  L.push('', tr(f.moneyLost ? 'cr.request.loss' : 'cr.request.attempt'), `${tr('cr.reported_on')}: ${formatDate(now, lang)}`)
  return L.join('\n')
}

/** buildFieldList: the same facts one box at a time, for copying into the website's boxes. Empty boxes are left out. */
export interface FieldItem {
  id: string
  label: string
  value: string
}
export function buildFieldList(f: ComplaintFacts, tr: Tr, lang: Lang, now: Date = new Date()): FieldItem[] {
  const out: FieldItem[] = []
  const add = (id: string, value: string) => { if (trim(value)) out.push({ id, label: tr('cr.field.' + id), value: trim(value) }) }
  add('when', formatWhen(f, lang))
  if (f.moneyLost) {
    add('amount', f.amount)
    add('paid', [f.paid ? tr('cr.paid.' + f.paid) : '', trim(f.bankApp)].filter(Boolean).join(' - '))
    add('txn', f.txnId)
    add('payee', f.payee)
  }
  add('phone', f.suspectPhone)
  add('link', f.suspectLink)
  add('claimed', f.claimedAs)
  // the "description" box: the account without the header lines, so it can be pasted on its own
  const full = buildComplaint(f, tr, lang, now)
  const i = full.indexOf(`${tr('cr.story.title')}\n`)
  if (i >= 0) add('story', full.slice(i + tr('cr.story.title').length + 1).split('\n\n')[0])
  return out
}

/** buildCallSheet: what to say to the helpline, in the person's language, and which facts to have ready. */
export interface CallSheet {
  say: string
  facts: { id: string; label: string; value: string | null }[]
}
export function buildCallSheet(f: ComplaintFacts, tr: Tr, lang: Lang): CallSheet {
  const method = f.paid ? tr('cr.paid.' + f.paid) : ''
  const when = formatWhen(f, lang)
  let say = tr(f.moneyLost ? 'cr.say.loss' : 'cr.say.attempt')
  if (f.moneyLost && trim(f.amount)) say += ` ${tr('cr.say.amount', { n: fmtAmount(f.amount, lang) })}`
  if (f.moneyLost && method) say += ` ${tr('cr.say.method', { m: method })}`
  if (when) say += ` ${tr('cr.say.when', { w: when })}`
  const facts = [
    ...(f.moneyLost ? [{ id: 'amount', label: tr('cr.field.amount'), value: trim(f.amount) ? tr('cr.rs', { n: fmtAmount(f.amount, lang) }) : null }] : []),
    { id: 'when', label: tr('cr.field.when'), value: when || null },
    ...(f.moneyLost ? [
      { id: 'paid', label: tr('cr.field.paid'), value: [method, trim(f.bankApp)].filter(Boolean).join(' - ') || null },
      { id: 'txn', label: tr('cr.field.txn'), value: trim(f.txnId) || null },
      { id: 'payee', label: tr('cr.field.payee'), value: trim(f.payee) || null },
    ] : []),
    { id: 'phone', label: tr('cr.field.phone'), value: trim(f.suspectPhone) || trim(f.suspectLink) || null },
  ]
  return { say, facts }
}

import { CATEGORY_CODES, type CategoryCode } from '../shared/categories'
import { kvGet, kvSet } from '../shell/storage'
import type { Channel, ReportPayload } from './report'
import { REGIONS } from './regionsData'

// What the trends screens show when no server is configured or reachable: labelled demo numbers (only while Demo mode is on)
// plus the anonymous reports this device has sent. Same response shapes as services/api, so the screens do not care which they get.

export interface LocalAnonymousReport {
  date: string // YYYY-MM-DD (never a precise time)
  scam_category: CategoryCode
  channel: Channel
  region_code: string
}

const LOCAL_REPORTS_KEY = 'local_anon_reports'
const MIN_COUNT = 5 // the same small-group rule as the server: a group with fewer reports is hidden

/** Remember an opted-in anonymous report on this device (no text, no numbers, no names) so the charts can update even offline. */
export function recordLocalAnonymousReport(p: ReportPayload): void {
  const cur = kvGet<LocalAnonymousReport[]>(LOCAL_REPORTS_KEY, [])
  const date = new Date().toISOString().slice(0, 10)
  kvSet(LOCAL_REPORTS_KEY, [...cur, { date, scam_category: p.scam_category, channel: p.channel, region_code: p.region_code }].slice(-200))
}

/** Forget them again (consent withdrawn). */
export function clearLocalAnonymousReports(): void {
  kvSet(LOCAL_REPORTS_KEY, [])
}

function getLocalReports(): LocalAnonymousReport[] {
  return kvGet<LocalAnonymousReport[]>(LOCAL_REPORTS_KEY, [])
}

function mondayOf(d: Date): string {
  const copy = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const day = copy.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  copy.setUTCDate(copy.getUTCDate() + diff)
  return copy.toISOString().slice(0, 10)
}

function daysAgo(n: number): Date {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - n)
  return d
}

// Mirrors services/api/app/seed.py so the unconnected demo looks like the server's.
const WEIGHT: Record<string, number> = {
  raipur: 10, durg: 8, bilaspur: 8, korba: 5, raigarh: 4, rajnandgaon: 4,
  bastar: 2, surguja: 2, janjgir_champa: 3, mahasamund: 2, dhamtari: 2,
  kanker: 1, sukma: 0.15, narayanpur: 0.15, bijapur: 0.15,
}
const CAT_BASE: Record<CategoryCode, number> = {
  kyc_bank: 5, otp: 4, digital_arrest: 2, courier_customs: 2, lottery_prize: 2,
  loan_app: 2, investment_job: 3, phishing_link: 4, payment_request: 3, fake_qr: 1, other: 1,
}
const CHANNEL_FOR: Partial<Record<CategoryCode, Channel[]>> = {
  kyc_bank: ['sms', 'call'], otp: ['call', 'sms'], digital_arrest: ['call'],
  courier_customs: ['call', 'sms'], fake_qr: ['qr'],
}

interface DailyCell {
  date: string
  week_start: string
  region_code: string
  scam_category: CategoryCode
  channel: Channel
  source: 'seed' | 'app'
  count: number
}

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

let cachedSeed: DailyCell[] | null = null
let cachedSeedDay = ''

function getSeedCells(): DailyCell[] {
  const today = new Date().toISOString().slice(0, 10)
  if (cachedSeed && cachedSeedDay === today) return cachedSeed
  const rnd = mulberry32(42)
  const cells: DailyCell[] = []
  const weeks = 8
  const channels: Channel[] = ['sms', 'call', 'qr', 'other']

  for (let w = 0; w < weeks; w++) {
    const age = weeks - 1 - w
    for (const r of REGIONS) {
      const wt = WEIGHT[r.code] ?? 0.6
      for (const cat of CATEGORY_CODES) {
        let base = CAT_BASE[cat] * wt * (0.8 + 0.4 * rnd())
        if (cat === 'digital_arrest') base *= 0.5 + (weeks - age) * 0.35
        if (cat === 'fake_qr') base *= age > 2 ? 0.2 : 1.6
        const count = Math.round(base / 2)
        if (count <= 0) continue
        const day = daysAgo(age * 7 + Math.floor(rnd() * 6))
        const pool = CHANNEL_FOR[cat] ?? channels
        const ch = pool[Math.floor(rnd() * pool.length)]
        cells.push({
          date: day.toISOString().slice(0, 10),
          week_start: mondayOf(day),
          region_code: r.code,
          scam_category: cat,
          channel: ch,
          source: 'seed',
          count,
        })
      }
    }
  }
  cachedSeed = cells
  cachedSeedDay = today
  return cells
}

function allCells(includeDemo: boolean): DailyCell[] {
  const local: DailyCell[] = getLocalReports().map((r) => ({
    date: r.date,
    week_start: mondayOf(new Date(`${r.date}T00:00:00Z`)),
    region_code: r.region_code,
    scam_category: r.scam_category,
    channel: r.channel,
    source: 'app',
    count: 1,
  }))
  return includeDemo ? [...getSeedCells(), ...local] : local
}

export function buildLocalDashboardResponse(path: string): unknown | null {
  const url = new URL(path, 'https://local.suraksha')
  const p = url.pathname
  const region = url.searchParams.get('region') || ''
  const channel = url.searchParams.get('channel') || ''
  const category = url.searchParams.get('category') || ''
  const demo = url.searchParams.get('demo') !== '0'

  if (p === '/alerts') {
    if (!demo) return { rows: [] }
    const expires = daysAgo(-14).toISOString().slice(0, 10)
    return {
      rows: [
        {
          id: 901,
          title_en: 'Digital arrest video-call scams rising in Raipur & Durg',
          title_hi: 'रायपुर और दुर्ग में डिजिटल अरेस्ट वीडियो कॉल ठगी बढ़ रही है',
          title_cg: 'रायपुर अउ दुर्ग म डिजिटल अरेस्ट वीडियो कॉल ठगी बाढ़त हे',
          summary_en: 'Scammers pretend to be CBI or Mumbai Police on video calls and demand money into a "safe account". Hang up and call 1930.',
          summary_hi: 'ठग वीडियो कॉल पर सीबीआई या पुलिस बनकर "सुरक्षित खाते" में पैसे माँगते हैं। कॉल काटें और 1930 पर कॉल करें।',
          summary_cg: 'ठग वीडियो कॉल म सीबीआई या पुलिस बनके "सुरक्षित खाता" म पइसा मांगथे। कॉल काटव अउ 1930 म कॉल करव।',
          scam_category: 'digital_arrest',
          region_scope: 'all',
          expires_at: expires,
          source_note: 'Demo alert · Suraksha Chhattisgarh',
        },
        {
          id: 902,
          title_en: 'Fake QR refund trap targeting UPI users',
          title_hi: 'यूपीआई उपयोगकर्ताओं के लिए फ़र्ज़ी क्यूआर रिफंड जाल',
          title_cg: 'यूपीआई उपयोगकर्ता मन बर फर्जी क्यूआर रिफंड जाल',
          summary_en: 'Never scan a QR code or enter your UPI PIN to receive a refund or cashback.',
          summary_hi: 'रिफंड या कैशबैक पाने के लिए कभी क्यूआर कोड स्कैन न करें और न ही यूपीआई पिन डालें।',
          summary_cg: 'रिफंड या कैशबैक पाए बर कभू क्यूआर कोड स्कैन झन करव अउ यूपीआई पिन झन डारव।',
          scam_category: 'fake_qr',
          region_scope: 'all',
          expires_at: expires,
          source_note: 'Demo alert · Suraksha Chhattisgarh',
        },
      ],
    }
  }

  const filter = (c: DailyCell) =>
    (!region || c.region_code === region) &&
    (!channel || c.channel === channel) &&
    (!category || c.scam_category === category)

  const cells = allCells(demo).filter(filter)
  const includes_seed = cells.some((c) => c.source === 'seed')

  const cutCur = daysAgo(6).toISOString().slice(0, 10)
  const cutPrev = daysAgo(13).toISOString().slice(0, 10)

  if (p === '/trends/overview') {
    const cur = new Map<string, number>()
    const prev = new Map<string, number>()
    const chMap = new Map<string, number>()
    for (const c of cells) {
      if (c.date >= cutCur) {
        cur.set(c.scam_category, (cur.get(c.scam_category) ?? 0) + c.count)
        chMap.set(c.channel, (chMap.get(c.channel) ?? 0) + c.count)
      } else if (c.date >= cutPrev) {
        prev.set(c.scam_category, (prev.get(c.scam_category) ?? 0) + c.count)
      }
    }
    const curShown = [...cur.entries()].filter(([, n]) => n >= MIN_COUNT)
    const prevShown = [...prev.entries()].filter(([, n]) => n >= MIN_COUNT)
    const total = curShown.reduce((s, [, n]) => s + n, 0)
    const ptotal = prevShown.reduce((s, [, n]) => s + n, 0)
    const change_pct = ptotal === 0 ? null : Math.round(((total - ptotal) / ptotal) * 1000) / 10
    const top3 = curShown
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([scam_category, report_count]) => ({ scam_category, report_count }))
    const channels = [...chMap.entries()]
      .filter(([, n]) => n >= MIN_COUNT)
      .sort((a, b) => b[1] - a[1])
      .map(([ch, report_count]) => ({ channel: ch, report_count }))

    return { this_week_total: total, last_week_total: ptotal, change_pct, min_count: MIN_COUNT, top3, channels, includes_seed }
  }

  if (p === '/trends/rising') {
    const cur = new Map<string, number>()
    const prev = new Map<string, number>()
    for (const c of cells) {
      if (c.date >= cutCur) cur.set(c.scam_category, (cur.get(c.scam_category) ?? 0) + c.count)
      else if (c.date >= cutPrev) prev.set(c.scam_category, (prev.get(c.scam_category) ?? 0) + c.count)
    }
    const rows = [...cur.entries()]
      .map(([scam_category, this_week]) => ({ scam_category, this_week, last_week: prev.get(scam_category) ?? 0 }))
      .filter((r) => r.this_week >= MIN_COUNT && r.this_week >= Math.max(MIN_COUNT, Math.round(r.last_week * 1.25)))
      .sort((a, b) => b.this_week - a.this_week)
      .slice(0, 4)
    return { rows }
  }

  if (p === '/trends') {
    const group = url.searchParams.get('group') || 'week'
    const map = new Map<string, number>()
    for (const c of cells) {
      const key = `${group === 'region' ? c.region_code : c.week_start}|${c.scam_category}`
      map.set(key, (map.get(key) ?? 0) + c.count)
    }
    const all = [...map.entries()].map(([key, report_count]) => {
      const [first, scam_category] = key.split('|')
      return group === 'region' ? { region_code: first, scam_category, report_count } : { week_start: first, scam_category, report_count }
    })
    const rows = all
      .filter((r) => r.report_count >= MIN_COUNT)
      .sort((a, b) => ((a as { week_start?: string }).week_start ?? '').localeCompare((b as { week_start?: string }).week_start ?? ''))
    return { group, min_count: MIN_COUNT, suppressed_cells: all.length - rows.length, includes_seed, rows }
  }

  return null
}

/** The CSV the Download button saves when there is no server: the same hidden-small-groups rule, one row per week, district and type. */
export function downloadLocalTrendsCsv(includeDemo: boolean): void {
  const cells = allCells(includeDemo)
  const map = new Map<string, { n: number; seed: boolean }>()
  for (const c of cells) {
    const key = `${c.week_start},${c.region_code},${c.scam_category}`
    const prev = map.get(key)
    map.set(key, { n: (prev?.n ?? 0) + c.count, seed: (prev?.seed ?? false) || c.source === 'seed' })
  }
  const lines = ['week_start,region_code,scam_category,report_count,includes_demo_data']
  for (const [k, v] of [...map.entries()].sort()) {
    if (v.n >= MIN_COUNT) lines.push(`${k},${v.n},${v.seed ? 1 : 0}`)
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'suraksha_scam_trends.csv'
  a.click()
  URL.revokeObjectURL(a.href)
}

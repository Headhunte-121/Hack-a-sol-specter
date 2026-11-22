import { CATEGORY_CODES, type CategoryCode } from '../shared/categories'

// The ONLY fields an anonymous report may contain. No message text, no numbers, no names, no device identifier.
export const CHANNELS = ['sms', 'call', 'qr', 'other'] as const
export const RISK_BANDS = ['likely_scam', 'suspicious', 'unknown'] as const
export type Channel = (typeof CHANNELS)[number]
export type RiskBand = (typeof RISK_BANDS)[number]
export interface ReportPayload {
  scam_category: CategoryCode
  channel: Channel
  region_code: string
  risk_band: RiskBand
}
const FIELDS = ['scam_category', 'channel', 'region_code', 'risk_band'] as const

/** validateReportSchema: used on the client before queueing (and mirrored on the server). Rejects any extra field. */
export function validateReportSchema(x: unknown, regionCodes: string[]): x is ReportPayload {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  const keys = Object.keys(o)
  if (keys.length !== FIELDS.length || !keys.every((k) => (FIELDS as readonly string[]).includes(k))) return false
  return (
    (CATEGORY_CODES as readonly string[]).includes(o.scam_category as string) &&
    (CHANNELS as readonly string[]).includes(o.channel as string) &&
    regionCodes.includes(o.region_code as string) &&
    (RISK_BANDS as readonly string[]).includes(o.risk_band as string)
  )
}

export function channelFromKind(kind: 'message' | 'url' | 'call'): Channel {
  return kind === 'message' ? 'sms' : kind === 'call' ? 'call' : 'other'
}

/** buildReportPayload: builds the minimal record from explicit fields only. Anything else passed in is dropped, so free text cannot enter. */
export function buildReportPayload(input: { category: CategoryCode; channel: Channel; region: string; band: string }): ReportPayload {
  return {
    scam_category: input.category,
    channel: input.channel,
    region_code: input.region,
    risk_band: (RISK_BANDS as readonly string[]).includes(input.band) ? (input.band as RiskBand) : 'unknown',
  }
}

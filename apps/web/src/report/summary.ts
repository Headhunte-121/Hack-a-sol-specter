import type { LastResult } from '../detector/lastResult'
import { categoryFromSignals } from '../shared/categories'

type T = (key: string, values?: Record<string, string | number>) => string

/** buildReportSummary: plain text the user can paste into a report. Contains no personal data unless the user types it:
 *  only date/time, channel type, a category and the flagged words (never phone numbers: entity tokens are excluded upstream). */
export function buildReportSummary(last: LastResult | null, t: T, now: Date = new Date()): string {
  const lines = [`${t('summary.date')}: ${now.toLocaleString()}`]
  if (last) {
    lines.push(`${t('summary.type')}: ${t(last.kind === 'call' ? 'summary.type.call' : 'summary.type.message')}`)
    lines.push(`${t('summary.looks_like')}: ${t('cat.' + categoryFromSignals(last.signals))}`)
    if (last.signals.length) lines.push(`${t('summary.signs')}: ${last.signals.map((s) => t('reason.' + s)).filter(Boolean).join('; ')}`)
    if (last.phrases.length) lines.push(`${t('summary.phrases')}: ${last.phrases.join(', ')}`)
    if (last.durationSec) lines.push(`${t('summary.duration')}: ${Math.round(last.durationSec)} s`)
  }
  lines.push(t('summary.note'))
  return lines.join('\n')
}

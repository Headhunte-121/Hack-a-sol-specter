import type { Channel } from '../dashboard/report'
import type { LastResult } from '../detector/lastResult'
import { categoryFromSignals, type CategoryCode } from '../shared/categories'
import { formatDateTime, type Lang } from '../shell/i18n'
import { checkApplies } from './problem'
import type { PayMethod } from './routing'

type T = (key: string, values?: Record<string, string | number>) => string

/** What the person said happened. Only answers to the on-screen questions: never a number, a name or an amount. */
export interface ReportFacts {
  category: CategoryCode | null
  channel: Channel | null
  moneyLost?: boolean
  paid?: PayMethod | null // how the money left, if the person said
  shared?: boolean | null
}

/** buildReportSummary: plain text the user can paste into a report. Contains no personal data unless the user types it:
 *  only date/time, what the person said happened, and (when the check agrees with them) the flagged words. Never phone numbers:
 *  entity tokens are excluded upstream. Without `facts` it describes the last check, as before. */
export function buildReportSummary(last: LastResult | null, t: T, now: Date = new Date(), lang: Lang = 'en', facts?: ReportFacts): string {
  const lines = [`${t('summary.date')}: ${formatDateTime(now, lang)}`]
  if (facts) {
    if (facts.category) lines.push(`${t('summary.happened')}: ${t('cat.' + facts.category)}`)
    if (facts.channel) lines.push(`${t('summary.channel')}: ${t('trends.channel.' + facts.channel)}`)
    if (facts.moneyLost !== undefined) lines.push(`${t('summary.money')}: ${t(facts.moneyLost ? 'common.yes' : 'common.no')}`)
    if (facts.paid) lines.push(`${t('summary.paid')}: ${t('pay.' + facts.paid)}`)
    if (typeof facts.shared === 'boolean') lines.push(`${t('summary.shared')}: ${t(facts.shared ? 'common.yes' : 'common.no')}`)
    if (last && checkApplies(last, facts.category)) {
      if (last.signals.length) lines.push(`${t('summary.signs')}: ${last.signals.map((s) => t('reason.' + s)).filter(Boolean).join('; ')}`)
      if (last.phrases.length) lines.push(`${t('summary.phrases')}: ${last.phrases.join(', ')}`)
      if (last.durationSec) lines.push(`${t('summary.duration')}: ${t('summary.seconds', { n: Math.round(last.durationSec) })}`)
    }
  } else if (last) {
    lines.push(`${t('summary.type')}: ${t(last.kind === 'call' ? 'summary.type.call' : 'summary.type.message')}`)
    lines.push(`${t('summary.looks_like')}: ${t('cat.' + (last.category ?? categoryFromSignals(last.signals)))}`)
    if (last.signals.length) lines.push(`${t('summary.signs')}: ${last.signals.map((s) => t('reason.' + s)).filter(Boolean).join('; ')}`)
    if (last.phrases.length) lines.push(`${t('summary.phrases')}: ${last.phrases.join(', ')}`)
    if (last.durationSec) lines.push(`${t('summary.duration')}: ${t('summary.seconds', { n: Math.round(last.durationSec) })}`)
  }
  lines.push(t('summary.note'))
  return lines.join('\n')
}

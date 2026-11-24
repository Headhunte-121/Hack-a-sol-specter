import { CHANNELS, type Channel } from '../dashboard/report'
import type { LastResult } from '../detector/lastResult'
import { CATEGORY_CODES, categoryFromSignals, type CategoryCode } from '../shared/categories'

// The reporting flow works from what the PERSON says happened (the kind of scam and how it reached them). A recent flagged check
// only pre-fills those two answers; they stay on screen and can be changed, and nothing is guessed when the check had no clear type.

export interface Problem {
  category: CategoryCode | null
  channel: Channel | null
}

export const asCategory = (x: unknown): CategoryCode | null => ((CATEGORY_CODES as readonly string[]).includes(x as string) ? (x as CategoryCode) : null)
export const asChannel = (x: unknown): Channel | null => ((CHANNELS as readonly string[]).includes(x as string) ? (x as Channel) : null)

const flagged = (last: LastResult | null): last is LastResult => !!last && last.band !== 'looks_genuine'

/** The scam type a flagged check found, or null when it found no clear type (the person is then asked). */
export function categoryOfCheck(last: LastResult | null): CategoryCode | null {
  if (!flagged(last)) return null
  const c = asCategory(last.category) ?? categoryFromSignals(last.signals)
  return c === 'other' ? null : c
}

/** How the flagged thing reached the person, as far as the check knows. */
export function channelOfCheck(last: LastResult | null): Channel | null {
  if (!flagged(last)) return null
  if (last.script === 'qr' || last.category === 'fake_qr') return 'qr'
  return last.kind === 'message' ? 'sms' : last.kind === 'call' ? 'call' : 'other'
}

export const problemFromCheck = (last: LastResult | null): Problem => ({ category: categoryOfCheck(last), channel: channelOfCheck(last) })

/** The check's own signs and words describe this case only when the person agrees on the scam type. */
export const checkApplies = (last: LastResult | null, category: CategoryCode | null): boolean => category !== null && categoryOfCheck(last) === category

/** The risk level that goes into the anonymous report: the check's, if it applies, otherwise unknown. */
export const reportBand = (last: LastResult | null, category: CategoryCode | null): 'likely_scam' | 'suspicious' | 'unknown' =>
  checkApplies(last, category) ? (last as LastResult).band as 'likely_scam' | 'suspicious' : 'unknown'

export const adviceKey = (c: CategoryCode): string => `advice.${c}`

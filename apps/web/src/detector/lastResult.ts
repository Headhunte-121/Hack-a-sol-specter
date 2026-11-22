import { kvGet, kvSet } from '../shell/storage'

// The most recent detector result, kept ON THE DEVICE ONLY so the reporting flow can pre-fill a summary.
// It holds the verdict, the script type and flagged words, never the full message, numbers or names.
export interface LastResult {
  kind: 'message' | 'url' | 'call'
  band: 'likely_scam' | 'suspicious' | 'looks_genuine'
  script: string
  signals: string[]
  phrases: string[]
  durationSec?: number
  category?: string // set by the call detector (script -> category)
  at: number
}
export const saveLastResult = (r: LastResult) => kvSet('last_result', r)
export const loadLastResult = () => kvGet<LastResult | null>('last_result', null)
/** recentLastResult: the last check only if it was made in the past 24 hours, so a report never carries an old, unrelated check. */
export const LAST_RESULT_MAX_AGE_MS = 24 * 60 * 60 * 1000
export function recentLastResult(now: number = Date.now()): LastResult | null {
  const r = loadLastResult()
  return r && typeof r.at === 'number' && r.at <= now && now - r.at <= LAST_RESULT_MAX_AGE_MS ? r : null
}
export const clearLastResult = () => kvSet('last_result', null)

/** handleFeedback: local counter only, used for the error-analysis demo; never uploaded and never with text. */
export function handleFeedback(kind: 'message' | 'call', right: boolean) {
  const key = `feedback.${kind}`
  const cur = kvGet<{ right: number; wrong: number }>(key, { right: 0, wrong: 0 })
  kvSet(key, right ? { ...cur, right: cur.right + 1 } : { ...cur, wrong: cur.wrong + 1 })
}

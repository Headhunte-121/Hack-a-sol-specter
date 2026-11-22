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
  at: number
}
export const saveLastResult = (r: LastResult) => kvSet('last_result', r)
export const loadLastResult = () => kvGet<LastResult | null>('last_result', null)
export const clearLastResult = () => kvSet('last_result', null)

/** handleFeedback: local counter only, used for the error-analysis demo; never uploaded and never with text. */
export function handleFeedback(kind: 'message' | 'call', right: boolean) {
  const key = `feedback.${kind}`
  const cur = kvGet<{ right: number; wrong: number }>(key, { right: 0, wrong: 0 })
  kvSet(key, right ? { ...cur, right: cur.right + 1 } : { ...cur, wrong: cur.wrong + 1 })
}

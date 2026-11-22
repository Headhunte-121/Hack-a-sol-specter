import { clearQueue } from './queue'
import { kvGet, kvSet } from './storage'

// Consent to share anonymous counts is OFF by default and can be switched off at any time.
export const hasConsent = (): boolean => kvGet<boolean>('consent.share', false)
/** setConsent: switching it off also discards anything still waiting to be sent, right away. */
export const setConsent = (on: boolean) => {
  kvSet('consent.share', on)
  if (!on) void clearQueue().catch(() => {})
}
export const consentAsked = (): boolean => kvGet<boolean>('consent.asked', false)
export const markConsentAsked = () => kvSet('consent.asked', true)

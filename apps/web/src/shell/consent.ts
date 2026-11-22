import { kvGet, kvSet } from './storage'

// Consent to share anonymous counts is OFF by default and can be switched off at any time.
export const hasConsent = (): boolean => kvGet<boolean>('consent.share', false)
export const setConsent = (on: boolean) => kvSet('consent.share', on)
export const consentAsked = (): boolean => kvGet<boolean>('consent.asked', false)
export const markConsentAsked = () => kvSet('consent.asked', true)

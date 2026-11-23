// Shared scam categories (used by reports, the dashboard and lessons). Labels live in the i18n dictionaries as cat.<code>.
export const CATEGORY_CODES = ['kyc_bank', 'otp', 'digital_arrest', 'courier_customs', 'lottery_prize', 'loan_app', 'investment_job', 'phishing_link', 'payment_request', 'fake_qr', 'other'] as const
export type CategoryCode = (typeof CATEGORY_CODES)[number]

/** The category a known call script belongs to (used when a script matched, whether the text was pasted, typed or spoken). */
export const SCRIPT_CATEGORY: Record<string, CategoryCode> = {
  fake_kyc: 'kyc_bank', digital_arrest: 'digital_arrest', courier_customs: 'courier_customs', electricity_disconnect: 'phishing_link', lottery_prize: 'lottery_prize', unauthorized_order: 'phishing_link',
}

/** categoryFromSignals: map detector signals to one category for the (optional) anonymous report. */
export function categoryFromSignals(signals: string[]): CategoryCode {
  const has = (s: string) => signals.includes(s)
  if (has('authority_claim') && (has('secrecy_or_isolation') || has('threat'))) return 'digital_arrest'
  if (has('kyc_demand')) return 'kyc_bank'
  if (has('asks_secret_code')) return 'otp'
  if (has('prize_claim')) return 'lottery_prize'
  if (has('easy_money')) return 'investment_job'
  if (has('upfront_fee')) return 'loan_app'
  if (has('install_app') || has('short_or_odd_link') || has('has_link')) return 'phishing_link'
  if (has('payment_request')) return 'payment_request'
  return 'other'
}

export const LESSON_FOR_CATEGORY: Record<CategoryCode, string> = {
  kyc_bank: 'fake_kyc', otp: 'otp_pin_card', digital_arrest: 'digital_arrest', courier_customs: 'courier_customs', lottery_prize: 'upi_qr',
  loan_app: 'links_apps', investment_job: 'links_apps', phishing_link: 'links_apps', payment_request: 'upi_qr', fake_qr: 'upi_qr', other: 'what_to_do',
}

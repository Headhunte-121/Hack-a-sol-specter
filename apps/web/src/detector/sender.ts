/**
 * sender.ts: Sender Phone Number & Telecom Header Intelligence
 *
 * In India, TRAI mandates that all commercial, banking, and utility SMS must use registered
 * 6-character Alpha Headers on the DLT platform (e.g. AD-HDFCBK, VK-SBIINB).
 * Legitimate banks, electricity boards, and government departments NEVER send official notices
 * or KYC alerts from 10-digit personal mobile numbers or foreign WhatsApp numbers.
 */

export type SenderKind = 'dlt_header' | 'personal_mobile' | 'foreign_number' | 'shortcode' | 'unknown'
export type SenderRisk = 'high' | 'medium' | 'none'

export interface SenderAnalysis {
  sender: string
  normalized: string
  kind: SenderKind
  risk: SenderRisk
  flag?: string
  dltEntity?: string
  countryCode?: string
}

// Known high-risk country codes frequently used in cross-border scam campaigns targeting India
const SUSPICIOUS_COUNTRY_CODES: Record<string, string> = {
  '+92': 'Pakistan',
  '+855': 'Cambodia',
  '+95': 'Myanmar',
  '+234': 'Nigeria',
  '+84': 'Vietnam',
  '+62': 'Indonesia',
  '+1': 'US/Canada (often virtual VoIP)',
  '+44': 'UK (often virtual VoIP)',
}

// Keywords that indicate official, banking, utility, or authority claims
const OFFICIAL_CLAIM_PATTERN =
  /\b(sbi|hdfc|icici|axis|pnb|bob|kotak|canara|union|bank|banking|kyc|pan|aadhaar|electricity|bijli|power|discom|challan|traffic|ebill|lottery|kbc|prize|inaam|blocked|suspended|debit|credited|otp|cbi|police|customs|parcel|arrest)\b|बिजली|बैंक|खाता|केवाईसी|लॉटरी|इनाम|ब्लॉक|चालान/i

/**
 * parseSenderAndText: extracts sender header/number and clean message text
 * from shared or pasted text (supporting SMS forwards and WhatsApp chat exports).
 */
export function parseSenderAndText(rawText: string, explicitSender?: string): { sender: string | null; text: string } {
  let sender = (explicitSender ?? '').trim()
  let text = rawText.trim()

  if (sender) {
    return { sender, text }
  }

  // 1. WhatsApp chat export/share format:
  // e.g. "[12:30 PM, 23/11/2026] +91 98765 43210: Dear customer..." or "[23/11/26, 12:30:15] +92 300 1234567: ..."
  // or "12/23/26, 12:30 PM - +91 98765 43210: ..."
  const waMatch = text.match(/^(?:\[[^\]\n]{5,35}\]\s*|(?:\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4},?\s*|\d{1,2}:\d{2}(?::\d{2})?(?:\s*[APap][Mm])?,?\s*)+[-–—]\s*)([+A-Za-z0-9 -]{3,30}):\s*([\s\S]+)$/)
  if (waMatch) {
    return { sender: waMatch[1].trim(), text: waMatch[2].trim() }
  }

  // 2. Standard SMS header line format:
  // e.g. "From: AD-HDFCBK\nDear customer..." or "Sender: +919876543210\n..."
  const headerLineMatch = text.match(/^(?:from|sender):\s*([+A-Za-z0-9 -]{3,30})\n+([\s\S]+)$/i)
  if (headerLineMatch) {
    return { sender: headerLineMatch[1].trim(), text: headerLineMatch[2].trim() }
  }

  // 3. Leading DLT header prefix:
  // e.g. "AD-HDFCBK: Your OTP is 123456" or "VK-SBIINB - Account alert..."
  const dltPrefixMatch = text.match(/^([A-Za-z]{2}-[A-Za-z0-9]{6})[:\s-]\s*([\s\S]+)$/)
  if (dltPrefixMatch) {
    return { sender: dltPrefixMatch[1].trim(), text: dltPrefixMatch[2].trim() }
  }

  // 4. Leading Indian mobile number:
  // e.g. "+919876543210: Dear user electricity cut..." or "9876543210 - Your account..."
  const phonePrefixMatch = text.match(/^((?:\+91[- ]?)?[6-9]\d{4}[- ]?\d{5})[:\s-]\s*([\s\S]+)$/)
  if (phonePrefixMatch) {
    return { sender: phonePrefixMatch[1].trim(), text: phonePrefixMatch[2].trim() }
  }

  return { sender: null, text }
}

/**
 * analyzeSender: evaluates sender identity against Indian telecom DLT rules and scam patterns.
 */
export function analyzeSender(rawSender: string, messageText = ''): SenderAnalysis {
  const clean = rawSender.trim()
  const normalized = clean.replace(/[\s-]/g, '')

  // 1. TRAI DLT 6-Character Header check (e.g. AD-HDFCBK, VK-SBIINB, CP-AXISBK)
  const dltMatch = clean.match(/^([A-Za-z]{2})-([A-Za-z0-9]{6})$/i)
  if (dltMatch) {
    const entity = dltMatch[2].toUpperCase()
    return {
      sender: clean,
      normalized: clean.toUpperCase(),
      kind: 'dlt_header',
      risk: 'none',
      dltEntity: entity,
    }
  }

  // 2. Check for Foreign Country Codes (+92, +855, +95, +234, +1, etc.)
  for (const [code, country] of Object.entries(SUSPICIOUS_COUNTRY_CODES)) {
    if (clean.startsWith(code) || normalized.startsWith(code.replace('+', ''))) {
      const claimsOfficial = OFFICIAL_CLAIM_PATTERN.test(messageText)
      return {
        sender: clean,
        normalized,
        kind: 'foreign_number',
        countryCode: code,
        risk: claimsOfficial ? 'high' : 'medium',
        flag: claimsOfficial ? 'sender.foreign_claiming_official' : 'sender.foreign_unknown',
      }
    }
  }

  // 3. Indian Personal Mobile Number (10 digits starting with 6-9)
  const isIndianMobile =
    /^(?:\+91)?[6-9]\d{9}$/.test(normalized) ||
    /^[6-9]\d{9}$/.test(normalized)

  if (isIndianMobile) {
    const claimsOfficial = OFFICIAL_CLAIM_PATTERN.test(messageText)
    return {
      sender: clean,
      normalized,
      kind: 'personal_mobile',
      risk: claimsOfficial ? 'high' : 'none',
      flag: claimsOfficial ? 'sender.personal_claiming_official' : undefined,
    }
  }

  // 4. Shortcode (e.g. 56767, 56161)
  if (/^\d{4,6}$/.test(normalized)) {
    return {
      sender: clean,
      normalized,
      kind: 'shortcode',
      risk: 'none',
    }
  }

  return {
    sender: clean,
    normalized,
    kind: 'unknown',
    risk: 'none',
  }
}

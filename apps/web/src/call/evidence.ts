import type { CallResult } from './analyze'
import { fmtTime } from './analyze'

type T = (key: string, values?: Record<string, string | number>) => string

/** buildEvidenceNote: copyable text with date, duration and flagged phrases (no audio, no phone numbers) that feeds the reporting checklist. */
export function buildEvidenceNote(r: CallResult, durationSec: number | null, t: T, now: Date = new Date()): string {
  const lines = [`${t('evidence.title')} · ${now.toLocaleString()}`]
  if (durationSec) lines.push(`${t('summary.duration')}: ${Math.round(durationSec)} s`)
  if (r.topScript) lines.push(`${t('summary.looks_like')}: ${t(`call.script.${r.topScript}`)}`)
  const seen = new Set<string>()
  for (const h of r.hits) {
    const word = r.text.slice(h.charStart, h.charEnd)
    const key = `${h.segment}:${word}`
    if (seen.has(key) || /\d{6,}/.test(word)) continue // never copy long digit runs such as phone numbers
    seen.add(key)
    lines.push(`${fmtTime(h.time) || '–'}  ${word}`)
  }
  lines.push(t('evidence.note'))
  return lines.join('\n')
}

export const SCRIPT_CATEGORY: Record<string, string> = {
  fake_kyc: 'kyc_bank', digital_arrest: 'digital_arrest', courier_customs: 'courier_customs', electricity_disconnect: 'phishing_link', lottery_prize: 'lottery_prize',
}

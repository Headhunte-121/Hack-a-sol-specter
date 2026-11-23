import { describe, expect, it } from 'vitest'
import { analyzeSender, parseSenderAndText } from './sender'

describe('parseSenderAndText', () => {
  it('extracts WhatsApp shared format with timestamp and contact', () => {
    const raw = '[12:30 PM, 23/11/2026] +91 98765 43210: Dear customer your electricity bill is unpaid.'
    const { sender, text } = parseSenderAndText(raw)
    expect(sender).toBe('+91 98765 43210')
    expect(text).toBe('Dear customer your electricity bill is unpaid.')
  })

  it('extracts SMS header line format', () => {
    const raw = 'From: AD-HDFCBK\nYour OTP for transaction of Rs 500 is 123456.'
    const { sender, text } = parseSenderAndText(raw)
    expect(sender).toBe('AD-HDFCBK')
    expect(text).toBe('Your OTP for transaction of Rs 500 is 123456.')
  })

  it('extracts leading DLT header prefix', () => {
    const raw = 'VK-SBIINB: Dear SBI User, your A/C has been credited with Rs 1,000.'
    const { sender, text } = parseSenderAndText(raw)
    expect(sender).toBe('VK-SBIINB')
    expect(text).toBe('Dear SBI User, your A/C has been credited with Rs 1,000.')
  })

  it('extracts leading Indian mobile phone number', () => {
    const raw = '+919876543210: Dear user, electricity will be disconnected tonight. Call JE Sharma.'
    const { sender, text } = parseSenderAndText(raw)
    expect(sender).toBe('+919876543210')
    expect(text).toBe('Dear user, electricity will be disconnected tonight. Call JE Sharma.')
  })

  it('prioritizes explicitly passed sender over inline text', () => {
    const { sender, text } = parseSenderAndText('Plain message body', '+91 99999 88888')
    expect(sender).toBe('+91 99999 88888')
    expect(text).toBe('Plain message body')
  })
})

describe('analyzeSender', () => {
  it('identifies official TRAI DLT 6-character bank headers with zero risk', () => {
    const res = analyzeSender('AD-HDFCBK', 'Your OTP is 948102')
    expect(res.kind).toBe('dlt_header')
    expect(res.risk).toBe('none')
    expect(res.dltEntity).toBe('HDFCBK')
  })

  it('flags 10-digit Indian personal mobile claiming to be a bank as HIGH RISK', () => {
    const res = analyzeSender('+91 98765 43210', 'Dear customer your SBI account is blocked update KYC immediately.')
    expect(res.kind).toBe('personal_mobile')
    expect(res.risk).toBe('high')
    expect(res.flag).toBe('sender.personal_claiming_official')
  })

  it('does not flag personal mobile sending benign chat message', () => {
    const res = analyzeSender('+91 98765 43210', 'Hey, are we still meeting for lunch today?')
    expect(res.kind).toBe('personal_mobile')
    expect(res.risk).toBe('none')
    expect(res.flag).toBeUndefined()
  })

  it('flags foreign country code (+92 Pakistan) targeting Indian banking as HIGH RISK', () => {
    const res = analyzeSender('+92 300 1234567', 'Congratulations you won Rs 25 lakh in KBC lottery claim now.')
    expect(res.kind).toBe('foreign_number')
    expect(res.risk).toBe('high')
    expect(res.countryCode).toBe('+92')
    expect(res.flag).toBe('sender.foreign_claiming_official')
  })

  it('flags foreign country code (+1 US/VoIP) without keywords as MEDIUM RISK', () => {
    const res = analyzeSender('+1 202 555 0143', 'Hello, how are you?')
    expect(res.kind).toBe('foreign_number')
    expect(res.risk).toBe('medium')
    expect(res.countryCode).toBe('+1')
  })

  it('recognizes 5-digit telecom shortcodes', () => {
    const res = analyzeSender('56767', 'SMS BAL to 56767')
    expect(res.kind).toBe('shortcode')
    expect(res.risk).toBe('none')
  })
})

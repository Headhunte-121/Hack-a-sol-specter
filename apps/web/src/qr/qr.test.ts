import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import QRCode from 'qrcode'
import { describe, expect, it } from 'vitest'
import type { BrandsFile } from '../detector/url'
import en from '../i18n/en.json'
import hi from '../i18n/hi.json'
import cg from '../i18n/cg.json'
import { decodeQr } from './decode'
import { analyzeQr, classifyPayload, parseUpiLink } from './parse'
import codes from './testCodes.json'

const brands = JSON.parse(readFileSync(join(__dirname, '..', '..', 'public', 'model', 'brands.json'), 'utf8')) as BrandsFile

/** Render a QR code to RGBA pixels (8 px per module, 4-module quiet zone) without a canvas. */
function pixels(text: string) {
  const qr = QRCode.create(text, { errorCorrectionLevel: 'M' })
  const n = qr.modules.size, scale = 8, quiet = 4, size = (n + quiet * 2) * scale
  const data = new Uint8ClampedArray(size * size * 4).fill(255)
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    if (!qr.modules.get(y, x)) continue
    for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
      const i = (((y + quiet) * scale + dy) * size + (x + quiet) * scale + dx) * 4
      data[i] = data[i + 1] = data[i + 2] = 0
    }
  }
  return { data, size }
}

describe('ten team-made test codes (acceptance: classified as designed)', () => {
  for (const c of codes) {
    it(`${c.id}: ${c.kind} / ${c.risk}`, () => {
      const a = analyzeQr(c.text, brands)
      expect(a.kind).toBe(c.kind)
      expect(a.risk).toBe(c.risk)
      expect(a.flags.map((f) => f.id).sort()).toEqual([...c.flags].sort())
    })
    it(`${c.id}: decodes from real QR pixels`, () => {
      const { data, size } = pixels(c.text)
      expect(decodeQr(data, size, size)).toBe(c.text)
    })
  }
  it('has exactly ten codes covering a genuine payment, a tampered amount, a look-alike link and plain text', () => {
    expect(codes.length).toBe(10)
    const ids = codes.map((c) => c.id)
    expect(ids).toEqual(expect.arrayContaining(['shop_static', 'tampered_refund', 'lookalike_link', 'plain_text']))
  })
})

describe('parsing and checks', () => {
  it('parses UPI fields and tolerates missing ones', () => {
    expect(parseUpiLink('upi://pay?pa=a@ybl&pn=Ravi%20Kumar&am=10.50&tn=hello+world')).toEqual({ pa: 'a@ybl', pn: 'Ravi Kumar', am: '10.50', tn: 'hello world' })
    expect(parseUpiLink('upi://pay')).toEqual({})
    expect(parseUpiLink('https://example.com')).toBeNull()
  })
  it('classifies the payload kind', () => {
    expect(classifyPayload('upi://pay?pa=x@ybl')).toBe('upi')
    expect(classifyPayload('https://example.com/a')).toBe('url')
    expect(classifyPayload('just words here')).toBe('text')
    expect(classifyPayload('')).toBe('other')
  })
  it('flags a payee name that does not match the name the user expected', () => {
    const t = 'upi://pay?pa=ramesh.store@okhdfcbank&pn=Ramesh%20General%20Store'
    expect(analyzeQr(t, brands, 'Ramesh General').flags).toEqual([])
    expect(analyzeQr(t, brands, 'Sunita Medical').flags.map((f) => f.id)).toContain('name_mismatch')
  })
  it('never uses the word "safe" in any QR result text, in any language', () => {
    const keys = Object.keys(en).filter((k) => /^qr\.(risk|none_note|flag|rule)/.test(k))
    expect(keys.length).toBeGreaterThan(8)
    for (const k of keys) {
      expect((en as Record<string, string>)[k]).not.toMatch(/\bsafe\b/i)
      expect((hi as Record<string, string>)[k]).not.toContain('सुरक्षित')
      expect((cg as Record<string, string>)[k]).not.toContain('सुरक्षित')
    }
  })
})

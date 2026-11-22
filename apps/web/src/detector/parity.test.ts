import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { Scorer, type ModelFile } from './model'
import type { SignalsFile } from './textpipe'

const pub = join(__dirname, '..', '..', 'public', 'model')
const model = JSON.parse(readFileSync(join(pub, 'model.json'), 'utf8')) as ModelFile
const signals = JSON.parse(readFileSync(join(pub, 'signals.json'), 'utf8')) as SignalsFile
const rows = JSON.parse(readFileSync(join(__dirname, '__fixtures__', 'parity.json'), 'utf8')) as {
  text: string
  words: string[]
  signals: string[]
  z: number
  p: number
}[]
const scorer = new Scorer(model, signals)

describe('parity with the Python scorer (ml/textpipe.py)', () => {
  it('has at least 200 saved examples', () => {
    expect(rows.length).toBeGreaterThanOrEqual(200)
  })

  it('produces identical tokens and signals, and probabilities within 1e-6', () => {
    const tokenMismatch: string[] = []
    let maxDz = 0
    let maxDp = 0
    for (const row of rows) {
      const r = scorer.score(row.text)
      if (r.words.join('|') !== row.words.join('|')) tokenMismatch.push(row.text.slice(0, 60))
      expect(r.fired.map((s) => s.id)).toEqual(row.signals)
      maxDz = Math.max(maxDz, Math.abs(r.z - row.z))
      maxDp = Math.max(maxDp, Math.abs(r.p - row.p))
    }
    expect(tokenMismatch).toEqual([])
    expect(maxDz).toBeLessThan(1e-6)
    expect(maxDp).toBeLessThan(1e-6)
  })

  it('scores a message in well under one second', () => {
    const t = performance.now()
    for (let i = 0; i < 50; i++) scorer.score(rows[10 + (i % 100)].text)
    expect((performance.now() - t) / 50).toBeLessThan(50) // ms per message on a laptop; the phone target is < 1000 ms
  })
})

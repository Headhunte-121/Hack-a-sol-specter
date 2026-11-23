import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { Lexicon } from '../call/scripts'
import { analyzeInput } from './detect'
import { Scorer, type ModelFile } from './model'
import type { SignalsFile } from './textpipe'
import type { BrandsFile } from './url'

const pub = join(__dirname, '..', '..', 'public', 'model')
const rd = <T>(f: string): T => JSON.parse(readFileSync(join(pub, f), 'utf8')) as T
const model = rd<ModelFile>('model.json')
const signals = rd<SignalsFile>('signals.json')
const brands = rd<BrandsFile>('brands.json')
const lex = rd<Lexicon>('call_lexicon.json')
const scorer = new Scorer(model, signals)

interface GoldenExample {
  id: string
  text: string
  lang: string
  expectedBand: 'likely_scam' | 'suspicious' | 'looks_genuine'
  notes?: string
}

const fixturePath = join(__dirname, '__fixtures__', 'golden.json')
const examples = JSON.parse(readFileSync(fixturePath, 'utf8')) as GoldenExample[]

describe('golden regression suite (detector accuracy)', () => {
  it('has at least 40 curated regression examples', () => {
    expect(examples.length).toBeGreaterThanOrEqual(40)
  })

  for (const ex of examples) {
    it(`classifies ${ex.id} (${ex.lang}) as ${ex.expectedBand}`, () => {
      const result = analyzeInput(ex.text, scorer, brands, lex)
      if (ex.expectedBand === 'looks_genuine') {
        expect(result.band, `${ex.id}: ${ex.text} (p=${result.p})`).toBe('looks_genuine')
      } else if (ex.expectedBand === 'suspicious') {
        expect(result.band, `${ex.id}: ${ex.text} (p=${result.p})`).toBe('suspicious')
      } else {
        expect(result.band, `${ex.id}: ${ex.text} (p=${result.p})`).not.toBe('looks_genuine')
      }
    })
  }
})

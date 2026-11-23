import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

// The build-time validator (scripts/validate-content.mjs), exercised on a copy of the real content with one thing broken at a time.
type Validator = {
  validateContent: (root: string) => string[]
  mp4Seconds: (b: Buffer) => number | null
  checkCaptions: (json: unknown, audioSeconds: number | null) => string[]
}
const web = join(__dirname, '..', '..')
const load = async (): Promise<Validator> => import(/* @vite-ignore */ join(web, 'scripts', 'validate-content.mjs'))

/** A minimal m4a header: an ftyp box and a moov box holding an mvhd of the given length (enough for the validator to read the duration). */
function fakeM4a(seconds: number, pad = 0): Buffer {
  const box = (type: string, body: Buffer) => { const h = Buffer.alloc(8); h.writeUInt32BE(8 + body.length, 0); h.write(type, 4, 'latin1'); return Buffer.concat([h, body]) }
  const mvhd = Buffer.alloc(100)
  mvhd.writeUInt32BE(1000, 12) // timescale
  mvhd.writeUInt32BE(Math.round(seconds * 1000), 16) // duration
  return Buffer.concat([box('ftyp', Buffer.from('M4A \0\0\0\0M4A ', 'latin1')), box('moov', box('mvhd', mvhd)), Buffer.alloc(pad)])
}

let root: string
const readJson = (rel: string) => JSON.parse(readFileSync(join(root, rel), 'utf8'))
const writeJson = (rel: string, v: unknown) => writeFileSync(join(root, rel), JSON.stringify(v))
const edit = (rel: string, fn: (j: any) => void) => { const j = readJson(rel); fn(j); writeJson(rel, j) }
const LESSONS = 'public/content/lessons.json'
const QUIZ = 'public/content/quiz.json'

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'validate-'))
  cpSync(join(web, 'src', 'i18n'), join(root, 'src', 'i18n'), { recursive: true })
  cpSync(join(web, 'public', 'content'), join(root, 'public', 'content'), { recursive: true })
  mkdirSync(join(root, 'public', 'audio'), { recursive: true })
})
afterEach(() => rmSync(root, { recursive: true, force: true }))

describe('content validator', () => {
  it('passes on the content that ships', async () => {
    expect((await load()).validateContent(root)).toEqual([])
  })

  it('catches a lesson with too few cards or no minutes', async () => {
    edit(LESSONS, (j) => { j.lessons[0].cards = j.lessons[0].cards.slice(0, 5); delete j.lessons[1].minutes })
    const p = (await load()).validateContent(root).join('\n')
    expect(p).toContain('needs 6 to 8 cards, has 5')
    expect(p).toContain('minutes must be a whole number')
  })
  it('catches a missing language in a card and in a lesson', async () => {
    edit(LESSONS, (j) => { delete j.lessons[0].cards[0].title.cg; delete j.lessons[2].todo.hi })
    const p = (await load()).validateContent(root).join('\n')
    expect(p).toMatch(/card c1: title or body is missing a language/)
    expect(p).toMatch(/todo is missing a language/)
  })
  it('catches Latin letters in Hindi and Chhattisgarhi, but lets web addresses and .apk stay', async () => {
    edit(LESSONS, (j) => { j.lessons[0].cards[0].body.hi = 'Call your bank'; j.lessons[0].cards[1].body.cg = 'कॉल करें cybercrime.gov.in या .apk फ़ाइल' })
    const p = (await load()).validateContent(root)
    expect(p.filter((x) => x.includes('Latin letters')).length).toBe(1)
    expect(p.join()).toContain('card c1 body.hi')
  })
  it('catches Latin letters in a quiz question or option', async () => {
    edit(QUIZ, (j) => { j.questions[0].options[0].hi = 'True'; j.questions[1].explanation.cg = 'OTP कभी न बताएँ' })
    expect((await load()).validateContent(root).filter((x) => x.includes('Latin letters')).length).toBe(2)
  })

  it('catches too few questions for a topic, duplicate ids and a bad topic', async () => {
    edit(QUIZ, (j) => {
      j.questions = j.questions.filter((q: { id: string }) => q.id !== 'q_atm_6')
      j.questions[1].id = j.questions[0].id
      j.questions[2].topic = 'nonsense'
    })
    const p = (await load()).validateContent(root).join('\n')
    expect(p).toContain('topic atm_pin: needs at least 6 questions, has 5')
    expect(p).toContain('missing or duplicate id')
    expect(p).toContain('topic nonsense is not a lesson')
  })
  it('catches a bad answer index, the wrong number of options and a missing explanation language', async () => {
    edit(QUIZ, (j) => {
      j.questions[0].answer = 5 // a true/false question
      j.questions[1].options = j.questions[1].options.slice(0, 2) // a multiple-choice question with two options
      delete j.questions[2].explanation.en
    })
    const p = (await load()).validateContent(root).join('\n')
    expect(p).toContain('the answer index 5 is not one of the options')
    expect(p).toContain('a mcq question needs 3 to 4 options, has 2')
    expect(p).toContain('the explanation is missing a language')
  })

  it('lessons with no audio declared are fine (nothing to check)', async () => {
    expect((await load()).validateContent(root)).toEqual([])
  })
  it('catches a declared recording that does not exist, or that is outside audio/', async () => {
    edit(LESSONS, (j) => { j.lessons[0].audio = { hi: 'audio/otp_pin_card.hi.m4a' }; j.lessons[1].audio = { hi: '../secret.m4a' } })
    const p = (await load()).validateContent(root).join('\n')
    expect(p).toContain('audio/otp_pin_card.hi.m4a does not exist')
    expect(p).toContain('the path must be under audio/')
  })
  it('accepts a recording under 1.5 MB and refuses one that is larger', async () => {
    writeFileSync(join(root, 'public/audio/otp_pin_card.hi.m4a'), fakeM4a(60, 100_000))
    writeFileSync(join(root, 'public/audio/fake_kyc.hi.m4a'), fakeM4a(60, 1_600_000))
    edit(LESSONS, (j) => { j.lessons[0].audio = { hi: 'audio/otp_pin_card.hi.m4a' }; j.lessons[3].audio = { hi: 'audio/fake_kyc.hi.m4a' } })
    const p = (await load()).validateContent(root).join('\n')
    expect(p).toContain('fake_kyc.hi.m4a is 1600')
    expect(p).not.toContain('otp_pin_card.hi.m4a is')
  })
  it('reads captions: valid ones pass; bad JSON, bad times, or captions that run past the audio are reported', async () => {
    writeFileSync(join(root, 'public/audio/otp_pin_card.hi.m4a'), fakeM4a(10))
    writeFileSync(join(root, 'public/audio/otp_pin_card.hi.json'), JSON.stringify({ lang: 'hi', duration: 10, segments: [{ start: 0, end: 4, text: 'एक' }, { start: 4, end: 9.8, text: 'दो' }] }))
    edit(LESSONS, (j) => { j.lessons[0].audio = { hi: 'audio/otp_pin_card.hi.m4a' }; j.lessons[0].captions = { hi: 'audio/otp_pin_card.hi.json' } })
    const v = await load()
    expect(v.validateContent(root)).toEqual([])

    writeFileSync(join(root, 'public/audio/otp_pin_card.hi.json'), JSON.stringify({ segments: [{ start: 0, end: 4, text: 'एक' }, { start: 4, end: 12, text: 'दो' }] }))
    expect(v.validateContent(root).join()).toContain('runs to 12s but the audio is 10s long')

    writeFileSync(join(root, 'public/audio/otp_pin_card.hi.json'), '{ not json')
    expect(v.validateContent(root).join()).toContain('is not valid JSON')

    writeFileSync(join(root, 'public/audio/otp_pin_card.hi.json'), JSON.stringify({ segments: [{ start: 5, end: 2, text: 'x' }] }))
    expect(v.validateContent(root).join()).toContain('ends before it starts')
  })
  it('captions without a recording are reported', async () => {
    writeFileSync(join(root, 'public/audio/otp_pin_card.hi.json'), JSON.stringify({ segments: [{ start: 0, end: 1, text: 'एक' }] }))
    edit(LESSONS, (j) => { j.lessons[0].captions = { hi: 'audio/otp_pin_card.hi.json' } })
    expect((await load()).validateContent(root).join()).toContain('there is no audio for hi')
  })
  it('reads the length of an m4a from its header', async () => {
    const v = await load()
    expect(v.mp4Seconds(fakeM4a(61.5))).toBeCloseTo(61.5, 2)
    expect(v.mp4Seconds(Buffer.from('not an mp4 file at all'))).toBeNull()
  })
  it('checks captions on their own', async () => {
    const v = await load()
    expect(v.checkCaptions({ segments: [] }, null)).toEqual(['has no segments'])
    expect(v.checkCaptions({ segments: [{ start: 2, end: 3, text: 'b' }, { start: 0, end: 1, text: 'a' }] }, null).join()).toContain('out of order')
    expect(v.checkCaptions([{ start: 0, end: 1, text: 'a' }], 5)).toEqual([])
  })
})

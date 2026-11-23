// Build-time check: every UI string key must exist in Hindi and Chhattisgarhi as well as English, and the lesson and quiz packs
// (public/content/*.json) must be complete: three languages everywhere, the lesson cards, the audio and caption files a lesson declares,
// no Latin letters in the Hindi and Chhattisgarhi text, and enough well-formed quiz questions for every topic.
// Exits 1 on any problem so a gap is never silently shown as blank. Also importable: validateContent(root) returns the list of problems.
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const LANGS = ['en', 'hi', 'cg']
export const MAX_AUDIO_BYTES = 1_500_000 // a recording must stay under 1.5 MB so it downloads quickly on a slow connection
export const MIN_CARDS = 6
export const MAX_CARDS = 8
export const MAX_MINUTES = 5
export const MIN_QUESTIONS_PER_TOPIC = 6
const CAPTION_TOLERANCE = 0.5 // seconds a caption may run past the end of the recording (rounding in the speech server)

// Text that must stay exactly as typed even in Hindi or Chhattisgarhi, because people need to recognise it: web addresses, .apk files and
// masked numbers. Everything else must be written in Devanagari (UPI, PIN, OTP and QR are written as यूपीआई, पिन, ओटीपी and क्यूआर).
const KEEP = /\b[a-z0-9-]+(\.[a-z0-9-]+)*\.(com|in|top|xyz|sbi|ly|net|org)\b(\/\S*)?|\.apk|98X+|\{\w+\}/gi
const latinLetters = (s) => (typeof s === 'string' ? s.replace(KEEP, '').match(/[A-Za-z]/g) !== null : false)

/** mp4Seconds: the length of an AAC/m4a file from its movie header (null when it is not an mp4 container). */
export function mp4Seconds(buf) {
  const find = (from, to, wanted) => {
    let p = from
    while (p + 8 <= to) {
      let size = buf.readUInt32BE(p)
      const type = buf.toString('latin1', p + 4, p + 8)
      let header = 8
      if (size === 1) {
        if (p + 16 > to) return null
        size = Number(buf.readBigUInt64BE(p + 8))
        header = 16
      } else if (size === 0) size = to - p
      if (size < header || p + size > to) return null
      if (type === wanted) return { start: p + header, end: p + size }
      p += size
    }
    return null
  }
  const moov = find(0, buf.length, 'moov')
  const mvhd = moov && find(moov.start, moov.end, 'mvhd')
  if (!mvhd) return null
  const v = buf.readUInt8(mvhd.start)
  const timescale = v === 1 ? buf.readUInt32BE(mvhd.start + 20) : buf.readUInt32BE(mvhd.start + 12)
  const duration = v === 1 ? Number(buf.readBigUInt64BE(mvhd.start + 24)) : buf.readUInt32BE(mvhd.start + 16)
  return timescale > 0 ? duration / timescale : null
}

/** checkCaptions: problems with a captions file's content (an empty list means it is usable). */
export function checkCaptions(json, audioSeconds) {
  const list = Array.isArray(json) ? json : json && typeof json === 'object' ? json.segments : null
  if (!Array.isArray(list) || list.length === 0) return ['has no segments']
  const problems = []
  let last = 0
  let lastEnd = 0
  list.forEach((s, i) => {
    if (!s || typeof s.text !== 'string' || !s.text.trim()) return problems.push(`segment ${i} has no text`)
    if (typeof s.start !== 'number' || typeof s.end !== 'number' || !Number.isFinite(s.start) || !Number.isFinite(s.end)) return problems.push(`segment ${i} has no valid times`)
    if (s.start < 0 || s.end < s.start) problems.push(`segment ${i} ends before it starts`)
    if (s.start < last) problems.push(`segment ${i} is out of order`)
    last = s.start
    lastEnd = Math.max(lastEnd, s.end)
  })
  const declared = !Array.isArray(json) && typeof json.duration === 'number' ? json.duration : null
  const limit = audioSeconds ?? declared
  if (limit !== null && lastEnd > limit + CAPTION_TOLERANCE) problems.push(`runs to ${lastEnd}s but the audio is ${limit}s long`)
  return problems
}

export function validateContent(root) {
  const problems = []
  const bad = (msg) => problems.push(msg)
  const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))

  // 1) UI dictionaries
  const dict = {}
  for (const l of LANGS) dict[l] = readJson(join(root, 'src/i18n', `${l}.json`))
  const ph = (s) => (s.match(/\{\w+\}/g) ?? []).sort().join(',')
  for (const key of Object.keys(dict.en)) {
    for (const l of ['hi', 'cg']) if (!dict[l][key] || dict[l][key].trim() === '') bad(`ui key "${key}" has no ${l} text`)
    for (const l of ['hi', 'cg']) if (dict[l][key] && ph(dict[l][key]) !== ph(dict.en[key])) bad(`ui key "${key}" placeholders differ in ${l}`)
  }
  for (const l of ['hi', 'cg']) for (const key of Object.keys(dict[l])) if (!(key in dict.en)) bad(`ui key "${key}" exists in ${l} but not en`)

  // 2) content packs: three languages wherever a text appears (the audio and caption path lists are checked separately below)
  const dir = join(root, 'public/content')
  if (!existsSync(dir)) return problems
  const packs = {}
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    const pack = readJson(join(dir, f))
    packs[f] = pack
    const walk = (node, path) => {
      if (Array.isArray(node)) node.forEach((n, i) => walk(n, `${path}[${i}]`))
      else if (node && typeof node === 'object') {
        const langKeys = LANGS.filter((k) => k in node)
        if (langKeys.length && langKeys.length < 3) bad(`${f} ${path}: has ${langKeys.join('+')} but is missing ${LANGS.filter((k) => !(k in node)).join('+')}`)
        else if (langKeys.length === 3) for (const k of langKeys) if (typeof node[k] === 'string' && node[k].trim() === '') bad(`${f} ${path}.${k} is empty`)
        for (const [k, v] of Object.entries(node)) if (!LANGS.includes(k) && k !== 'audio' && k !== 'captions') walk(v, `${path}.${k}`)
      }
    }
    walk(pack, f)
  }

  const tri = (t) => !!t && LANGS.every((l) => typeof t[l] === 'string' && t[l].trim() !== '')
  const noLatin = (where, t) => {
    for (const l of ['hi', 'cg']) if (t && latinLetters(t[l])) bad(`${where}.${l} contains Latin letters (write it in Devanagari): ${t[l]}`)
  }

  // 3) lessons
  const lessonPack = packs['lessons.json']
  const lessons = lessonPack?.lessons ?? []
  if (lessonPack && lessonPack.schema !== 2) bad('lessons.json: "schema" must be 2')
  const lessonIds = new Set()
  for (const l of lessons) {
    const at = `lesson ${l.id}`
    if (!l.id || lessonIds.has(l.id)) bad(`${at}: missing or duplicate id`)
    lessonIds.add(l.id)
    for (const field of ['title', 'example', 'todo']) {
      if (!tri(l[field])) bad(`${at}: ${field} is missing a language`)
      noLatin(`${at} ${field}`, l[field])
    }
    if (!Array.isArray(l.signs) || l.signs.length === 0 || !l.signs.every(tri)) bad(`${at}: warning signs are missing or missing a language`)
    ;(l.signs ?? []).forEach((s, i) => noLatin(`${at} sign ${i + 1}`, s))
    if (!Number.isInteger(l.minutes) || l.minutes < 1 || l.minutes > MAX_MINUTES) bad(`${at}: minutes must be a whole number from 1 to ${MAX_MINUTES}`)
    const cards = l.cards ?? []
    if (cards.length < MIN_CARDS || cards.length > MAX_CARDS) bad(`${at}: needs ${MIN_CARDS} to ${MAX_CARDS} cards, has ${cards.length}`)
    const cardIds = new Set()
    for (const c of cards) {
      if (!c.id || cardIds.has(c.id)) bad(`${at}: card with a missing or duplicate id ${c.id}`)
      cardIds.add(c.id)
      if (typeof c.icon !== 'string' || !c.icon) bad(`${at} card ${c.id}: no icon`)
      if (!tri(c.title) || !tri(c.body)) bad(`${at} card ${c.id}: title or body is missing a language`)
      noLatin(`${at} card ${c.id} title`, c.title)
      noLatin(`${at} card ${c.id} body`, c.body)
    }

    // audio and captions are optional: nothing to check when a lesson declares none
    const audioSeconds = {}
    for (const [kind, map] of [['audio', l.audio], ['captions', l.captions]]) {
      for (const [lang, rel] of Object.entries(map ?? {})) {
        const where = `${at} ${kind}.${lang}`
        if (!LANGS.includes(lang)) { bad(`${where}: unknown language`); continue }
        if (typeof rel !== 'string' || !rel.startsWith('audio/') || rel.includes('..')) { bad(`${where}: the path must be under audio/`); continue }
        const file = join(root, 'public', rel)
        if (!existsSync(file)) { bad(`${where}: ${rel} does not exist`); continue }
        if (kind === 'audio') {
          const size = statSync(file).size
          if (size >= MAX_AUDIO_BYTES) bad(`${where}: ${rel} is ${size} bytes, the limit is under ${MAX_AUDIO_BYTES}`)
          if (size === 0) bad(`${where}: ${rel} is empty`)
          audioSeconds[lang] = mp4Seconds(readFileSync(file))
        }
      }
    }
    for (const [lang, rel] of Object.entries(l.captions ?? {})) {
      const file = join(root, 'public', String(rel))
      if (!existsSync(file) || !String(rel).startsWith('audio/')) continue // already reported
      if (!l.audio?.[lang]) bad(`${at} captions.${lang}: captions are declared but there is no audio for ${lang}`)
      let json
      try {
        json = readJson(file)
      } catch {
        bad(`${at} captions.${lang}: ${rel} is not valid JSON`)
        continue
      }
      for (const p of checkCaptions(json, audioSeconds[lang] ?? null)) bad(`${at} captions.${lang}: ${p}`)
    }
  }

  // 4) quiz
  const quizPack = packs['quiz.json']
  const questions = quizPack?.questions ?? []
  if (quizPack && quizPack.schema !== 2) bad('quiz.json: "schema" must be 2')
  const qIds = new Set()
  const perTopic = {}
  for (const q of questions) {
    const at = `question ${q.id}`
    if (!q.id || qIds.has(q.id)) bad(`${at}: missing or duplicate id`)
    qIds.add(q.id)
    if (!lessonIds.has(q.topic)) bad(`${at}: topic ${q.topic} is not a lesson`)
    perTopic[q.topic] = (perTopic[q.topic] ?? 0) + 1
    if (![1, 2, 3].includes(q.difficulty)) bad(`${at}: difficulty must be 1, 2 or 3`)
    if (!['mcq', 'tf', 'scenario'].includes(q.type)) bad(`${at}: type must be mcq, tf or scenario`)
    const opts = q.options ?? []
    const [min, max] = q.type === 'tf' ? [2, 2] : q.type === 'mcq' ? [3, 4] : [2, 4]
    if (opts.length < min || opts.length > max) bad(`${at}: a ${q.type} question needs ${min === max ? min : `${min} to ${max}`} options, has ${opts.length}`)
    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= opts.length) bad(`${at}: the answer index ${q.answer} is not one of the options`)
    if (!tri(q.question)) bad(`${at}: the question is missing a language`)
    if (!tri(q.explanation)) bad(`${at}: the explanation is missing a language`)
    if (!opts.every(tri)) bad(`${at}: an option is missing a language`)
    noLatin(`${at} question`, q.question)
    noLatin(`${at} explanation`, q.explanation)
    opts.forEach((o, i) => noLatin(`${at} option ${i + 1}`, o))
  }
  for (const id of lessonIds) if ((perTopic[id] ?? 0) < MIN_QUESTIONS_PER_TOPIC) bad(`topic ${id}: needs at least ${MIN_QUESTIONS_PER_TOPIC} questions, has ${perTopic[id] ?? 0}`)
  return problems
}

// Run from the command line: node scripts/validate-content.mjs
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..')
  const problems = validateContent(root)
  for (const p of problems) console.error('MISSING:', p)
  console.log(problems.length === 0 ? 'content validator: zero missing strings' : `content validator: ${problems.length} problem(s)`)
  process.exit(problems.length === 0 ? 0 : 1)
}

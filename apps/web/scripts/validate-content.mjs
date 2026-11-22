// Build-time check (validateContentPack): every UI string key must exist in Hindi and Chhattisgarhi as well as English,
// and lesson/quiz content packs (public/content/*.json) must have identical ids in all three languages.
// Exits 1 on any missing string so a gap is never silently shown as blank.
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
let problems = 0
const bad = (msg) => {
  console.error('MISSING:', msg)
  problems++
}

// 1) UI dictionaries
const load = (l) => JSON.parse(readFileSync(join(root, 'src/i18n', `${l}.json`), 'utf8'))
const dict = { en: load('en'), hi: load('hi'), cg: load('cg') }
for (const key of Object.keys(dict.en)) {
  for (const l of ['hi', 'cg']) if (!dict[l][key] || dict[l][key].trim() === '') bad(`ui key "${key}" has no ${l} text`)
  const ph = (s) => (s.match(/\{\w+\}/g) ?? []).sort().join(',')
  for (const l of ['hi', 'cg']) if (dict[l][key] && ph(dict[l][key]) !== ph(dict.en[key])) bad(`ui key "${key}" placeholders differ in ${l}`)
}
for (const l of ['hi', 'cg']) for (const key of Object.keys(dict[l])) if (!(key in dict.en)) bad(`ui key "${key}" exists in ${l} but not en`)

// 2) content packs
const dir = join(root, 'public/content')
if (existsSync(dir)) {
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    const pack = JSON.parse(readFileSync(join(dir, f), 'utf8'))
    const walk = (node, path) => {
      if (Array.isArray(node)) node.forEach((n, i) => walk(n, `${path}[${i}]`))
      else if (node && typeof node === 'object') {
        const langKeys = ['en', 'hi', 'cg'].filter((k) => k in node)
        if (langKeys.length && langKeys.length < 3) bad(`${f} ${path}: has ${langKeys.join('+')} but is missing ${['en', 'hi', 'cg'].filter((k) => !(k in node)).join('+')}`)
        else if (langKeys.length === 3) for (const k of langKeys) if (typeof node[k] === 'string' && node[k].trim() === '') bad(`${f} ${path}.${k} is empty`)
        for (const [k, v] of Object.entries(node)) if (!['en', 'hi', 'cg'].includes(k)) walk(v, `${path}.${k}`)
      }
    }
    walk(pack, f)
  }
}
console.log(problems === 0 ? 'content validator: zero missing strings' : `content validator: ${problems} problem(s)`)
process.exit(problems === 0 ? 0 : 1)

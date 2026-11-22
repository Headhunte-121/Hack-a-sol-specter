// Writes the ten team-made test QR codes as PNG files into docs/qr-test-codes so they can be scanned from a screen or printed.
import QRCode from 'qrcode'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, '..', '..', 'docs', 'qr-test-codes')
mkdirSync(out, { recursive: true })
const codes = JSON.parse(readFileSync(join(root, 'src/qr/testCodes.json'), 'utf8'))
const lines = ['# Test QR codes', '', 'Scan each image with the app. Expected result in the last column. The app must never call a code "safe".', '', '| File | Content | Kind | Expected risk | Expected flags |', '|---|---|---|---|---|']
for (const c of codes) {
  await QRCode.toFile(join(out, `${c.id}.png`), c.text, { width: 360, margin: 4, errorCorrectionLevel: 'M' })
  lines.push(`| ${c.id}.png | \`${c.text}\` | ${c.kind} | ${c.risk} | ${c.flags.join(', ') || '-'} |`)
}
writeFileSync(join(out, 'README.md'), lines.join('\n') + '\n')
console.log(`wrote ${codes.length} codes to ${out}`)

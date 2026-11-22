import type { ReactNode } from 'react'

// Line icons from the Suraksha design (24 x 24, stroke 2, round caps).
const PATHS = {
  back: 'M15 5l-7 7 7 7',
  check: 'M5 12l5 5 9-10',
  warn: ['M12 4l9 16H3z', 'M12 10v4M12 17v.5'],
  message: 'M4 5h16v11H9l-5 4z',
  phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z',
  shield: ['M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z', 'M12 8v5M12 16v.5'],
  book: ['M4 4h6a3 3 0 0 1 2 1 3 3 0 0 1 2-1h6v15h-6a3 3 0 0 0-2 1 3 3 0 0 0-2-1H4z', 'M12 5v15'],
  clipboard: ['M8 4h8v2H8z', 'M6 5h12v16H6z'],
  search: ['M18 11a7 7 0 1 1-14 0 7 7 0 0 1 14 0z', 'M16 16l5 5'],
  lock: ['M5 11h14v9H5z', 'M8 11V8a4 4 0 0 1 8 0v3'],
  octagon: ['M8 3h8l5 5v8l-5 5H8l-5-5V8z', 'M12 8v5M12 16v.5'],
  speaker: ['M4 9v6h4l5 4V5L8 9z', 'M16 9a4 4 0 0 1 0 6'],
  qr: ['M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z', 'M14 14h3v3h-3zM19 14v3M14 19h3M19 19v1'],
  chart: ['M4 20V10M10 20V4M16 20v-7M22 20H2'],
  gear: ['M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3.9a7 7 0 0 0-2-1.2L14.2 3h-4.4l-.4 2.6a7 7 0 0 0-2 1.2l-2.3-.9-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.3-.9a7 7 0 0 0 2 1.2l.4 2.6h4.4l.4-2.6a7 7 0 0 0 2-1.2l2.3.9 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z'],
  mic: ['M9 4h6v8a3 3 0 0 1-6 0z', 'M5 11a7 7 0 0 0 14 0M12 18v3'],
  folder: ['M3 6h6l2 2h10v11H3z'],
  camera: ['M3 7h4l2-2h6l2 2h4v12H3z', 'M16 13a4 4 0 1 1-8 0 4 4 0 0 1 8 0z'],
  trash: ['M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13'],
  globe: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M3 12h18', 'M12 3c2.4 2.5 3.6 5.5 3.6 9s-1.2 6.5-3.6 9c-2.4-2.5-3.6-5.5-3.6-9s1.2-6.5 3.6-9z'],
  down: 'M6 9l6 6 6-6',
}
export type IconName = keyof typeof PATHS

export function Icon({ name, size = 28, color = 'currentColor', stroke = 2 }: { name: IconName; size?: number; color?: string; stroke?: number }) {
  const p: string | string[] = PATHS[name]
  const list: string[] = Array.isArray(p) ? p : [p]
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: 'none' }}>
      {list.map((d, i) => <path key={i} d={d} />)}
    </svg>
  )
}

const TONES = {
  ok: 'bg-ok-bg text-ok border-transparent',
  warn: 'bg-warn-bg text-warn border-warn-line',
  bad: 'bg-bad-bg text-bad border-bad-line',
  info: 'bg-soft text-info border-transparent',
  plain: 'bg-white text-ink border-line',
} as const
export type Tone = keyof typeof TONES

/** Banner: the coloured information boxes used across the design (green, amber, red, blue). */
export function Banner({ tone, children, role, className = '' }: { tone: Tone; children: ReactNode; role?: string; className?: string }) {
  return <div role={role} className={`rounded-2xl border-2 px-4 py-3 text-[19px] leading-snug ${TONES[tone]} ${className}`}>{children}</div>
}

/** Numbered step row (red circles for reasons, blue circles for steps). */
export function NumberedList({ items, tone = 'brand' }: { items: ReactNode[]; tone?: 'brand' | 'bad' | 'ok' }) {
  return (
    <ol className="flex flex-col gap-2">
      {items.map((it, i) => (
        <li key={i} className={`flex items-center gap-3 text-[20px] leading-snug ${tone === 'brand' ? 'card !py-2.5 min-h-16' : ''}`}>
          <span className={`num ${tone === 'brand' ? 'bg-brand' : tone === 'ok' ? 'bg-ok-line' : 'bg-bad-line'}`}>{i + 1}</span>
          <span>{it}</span>
        </li>
      ))}
    </ol>
  )
}

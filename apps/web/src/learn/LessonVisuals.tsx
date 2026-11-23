import type { Lang } from '../shell/i18n'
import { pick, type Lesson } from './content'
import type { VideoScene } from './videoTypes'

export type IllustrationId =
  | 'otp_shield'
  | 'fake_bank_call'
  | 'atm_card_guard'
  | 'upi_pin_lock'
  | 'qr_scan_trap'
  | 'screen_share_trap'
  | 'fake_link_sms'
  | 'digital_arrest_video'
  | 'courier_parcel_scam'
  | 'urgency_clock'
  | 'secrecy_trap'
  | 'hang_up_action'
  | 'verify_official'
  | 'helpline_1930'

export interface AudioVisualBeat {
  id: string
  scene: VideoScene
  sceneIndex: number
  beatInScene: number
  beatsInScene: number
  start: number
  end: number
  art: IllustrationId
  badge: string
  headline: string
  spokenLine: string
}

/** Split spoken narration into clean, natural sentences/clauses. */
export function splitSentences(text: string): string[] {
  const cleaned = text.replace(/\s+/g, ' ').trim()
  if (!cleaned) return []
  const parts = cleaned
    .split(/(?<=[.!?।])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
  if (parts.length > 1) return parts
  if (cleaned.length > 90) {
    const mid = Math.floor(cleaned.length / 2)
    const cut = cleaned.indexOf(' ', mid)
    if (cut > 20 && cut < cleaned.length - 15) {
      return [cleaned.slice(0, cut).trim(), cleaned.slice(cut + 1).trim()]
    }
  }
  return [cleaned]
}

/** Estimate spoken duration weight from characters, words, and natural punctuation pauses. */
function speechWeight(text: string): number {
  const clean = text.trim()
  if (!clean) return 1
  const words = clean.split(/\s+/).filter(Boolean).length
  const commas = (clean.match(/[,;:]/g) ?? []).length
  const stops = (clean.match(/[.!?।]/g) ?? []).length
  return Math.max(5, clean.length * 0.72 + words * 1.8 + commas * 3.5 + stops * 7)
}

/** Match what the AI voice is saying right now (EN / HI / CG) to the most accurate illustration. */
function pickIllustrationForLine(
  spokenText: string,
  lessonId: string,
  sceneKind: VideoScene['kind'],
  beatIdx: number
): IllustrationId {
  const s = spokenText.toLowerCase()
  const id = lessonId.toLowerCase()

  // 1. Direct spoken-content matches (English, Hindi, Chhattisgarhi)
  if (/1930|helpline|report|cybercrime|हेल्पलाइन|शिकायत|रिपोर्ट|साइबर/.test(s)) return 'helpline_1930'
  if (/hang up|disconnect|cut the call|फोन काट|कॉल काट|रख दें|काट देव/.test(s)) return 'hang_up_action'
  if (/official|branch|bank app|check in the app|आधिकारिक|शाखा|असली ऐप|बैंक जाकर/.test(s)) return 'verify_official'
  if (/screen|remote|anydesk|teamviewer|install|download|apk|स्क्रीन|रिमोट|ऐप इंस्टॉल|डाउनलोड/.test(s)) return 'screen_share_trap'
  if (/link|website|url|click|sms|message|लिंक|क्लिक|मैसेज|वेबसाइट/.test(s)) return 'fake_link_sms'
  if (/qr|scan|क्यूआर|स्कैन/.test(s)) return 'qr_scan_trap'
  if (/digital arrest|police|cbi|court|video call|warrant|पुलिस|सीबीआई|डिजिटल अरेस्ट|वीडियो कॉल|गिरफ्तार/.test(s)) return 'digital_arrest_video'
  if (/parcel|courier|customs|fedex|drugs|पार्सल|कूरियर|कस्टम/.test(s)) return 'courier_parcel_scam'
  if (/atm|card|cvv|machine|keypad|एटीएम|कार्ड|सीवीवी|मशीन/.test(s)) return 'atm_card_guard'
  if (/upi|refund|collect|pin|यूपीआई|पिन|रिफंड|पैसे पाने/.test(s)) return 'upi_pin_lock'
  if (/otp|code|ओटीपी|कोड/.test(s)) return 'otp_shield'
  if (/secret|do not tell|don't tell|anyone|alone|किसी को मत|किसी को न|चुपचाप|अकेले/.test(s)) return 'secrecy_trap'
  if (/hurry|urgent|immediately|blocked|suspend|minutes|today|तुरंत|जल्दी|बंद हो|ब्लॉक|अभी/.test(s)) return 'urgency_clock'
  if (/call|caller|officer|bank|कॉल|फोन|अधिकारी|बैंक/.test(s)) {
    return sceneKind === 'todo' ? 'hang_up_action' : 'fake_bank_call'
  }

  // 2. Topic + section fallback rotation so consecutive beats stay visually distinct
  const topicFallbacks: Record<VideoScene['kind'], IllustrationId[]> = {
    intro: id.includes('atm')
      ? ['atm_card_guard', 'otp_shield', 'verify_official']
      : id.includes('qr')
      ? ['qr_scan_trap', 'upi_pin_lock', 'verify_official']
      : id.includes('upi')
      ? ['upi_pin_lock', 'qr_scan_trap', 'otp_shield']
      : id.includes('arrest')
      ? ['digital_arrest_video', 'fake_bank_call', 'helpline_1930']
      : id.includes('courier')
      ? ['courier_parcel_scam', 'fake_bank_call', 'verify_official']
      : id.includes('link')
      ? ['screen_share_trap', 'fake_link_sms', 'otp_shield']
      : ['otp_shield', 'fake_bank_call', 'verify_official'],
    scenario: id.includes('link')
      ? ['fake_bank_call', 'screen_share_trap', 'fake_link_sms', 'otp_shield']
      : id.includes('qr')
      ? ['fake_bank_call', 'qr_scan_trap', 'upi_pin_lock', 'urgency_clock']
      : id.includes('atm')
      ? ['atm_card_guard', 'secrecy_trap', 'urgency_clock', 'otp_shield']
      : id.includes('arrest')
      ? ['fake_bank_call', 'digital_arrest_video', 'secrecy_trap', 'urgency_clock']
      : id.includes('courier')
      ? ['courier_parcel_scam', 'fake_bank_call', 'urgency_clock', 'secrecy_trap']
      : ['fake_bank_call', 'otp_shield', 'urgency_clock', 'secrecy_trap'],
    signs: ['urgency_clock', 'fake_bank_call', 'secrecy_trap', 'fake_link_sms'],
    todo: ['hang_up_action', 'verify_official', 'otp_shield', 'helpline_1930'],
  }

  const list = topicFallbacks[sceneKind]
  return list[beatIdx % list.length]
}

/** Build the full audio-synced visual storyboard directly from each scene's spoken narration. */
export function buildAudioStoryboard(
  lesson: Lesson,
  scenes: VideoScene[],
  lang: Lang,
  totalDur: number
): AudioVisualBeat[] {
  const breathSec = scenes.length > 1 ? Math.min(0.3, totalDur * 0.01) : 0
  const spokenTotalSec = Math.max(1, totalDur - breathSec * Math.max(0, scenes.length - 1))

  const sceneEntries = scenes.map((scene, sceneIndex) => {
    const rawNarration = pick(scene.narration, lang).trim() || pick(scene.caption, lang).trim()
    const lines =
      scene.kind === 'signs' && scene.details.length > 0
        ? scene.details.map((d) => pick(d, lang).trim()).filter(Boolean)
        : splitSentences(rawNarration)
    const safeLines = lines.length > 0 ? lines : [pick(scene.heading, lang)]
    const weight = speechWeight(rawNarration)
    return { scene, sceneIndex, lines: safeLines, weight }
  })

  const totalSceneWeight = sceneEntries.reduce((sum, e) => sum + e.weight, 0) || 1
  const beats: AudioVisualBeat[] = []
  let sceneCursor = 0

  for (const entry of sceneEntries) {
    const sceneSpan = (entry.weight / totalSceneWeight) * spokenTotalSec
    const sceneStart = sceneCursor
    const sceneEnd =
      entry.sceneIndex === scenes.length - 1 ? totalDur : sceneStart + sceneSpan + breathSec
    sceneCursor = sceneEnd

    const lineWeights = entry.lines.map(speechWeight)
    const lineWeightSum = lineWeights.reduce((sum, w) => sum + w, 0) || 1
    let beatCursor = sceneStart
    let prevArt: IllustrationId | null = null

    entry.lines.forEach((line, idx) => {
      const span = (lineWeights[idx] / lineWeightSum) * Math.max(0.5, sceneEnd - sceneStart)
      const start = beatCursor
      const end = idx === entry.lines.length - 1 ? sceneEnd : beatCursor + span
      beatCursor = end

      let art = pickIllustrationForLine(line, lesson.id, entry.scene.kind, idx)
      // Avoid repeating the identical artwork on two consecutive beats
      if (art === prevArt) {
        art = pickIllustrationForLine('', lesson.id, entry.scene.kind, idx + 1)
      }
      prevArt = art

      beats.push({
        id: `${lesson.id}-${entry.scene.kind}-${idx}`,
        scene: entry.scene,
        sceneIndex: entry.sceneIndex,
        beatInScene: idx,
        beatsInScene: entry.lines.length,
        start,
        end,
        art,
        badge: pick(entry.scene.subheading, lang),
        headline: pick(entry.scene.heading, lang),
        spokenLine: line,
      })
    })
  }

  return beats
}

/** Find the active visual beat matching the exact audio playback timestamp. */
export function getBeatAtTime(beats: AudioVisualBeat[], time: number): AudioVisualBeat {
  for (let i = 0; i < beats.length; i++) {
    if (time < beats[i].end || i === beats.length - 1) return beats[i]
  }
  return beats[0]
}

/**
 * Full-bleed 4:3 light-civic illustrated artwork rendered purely as crisp SVG.
 * No external image files required; works 100% offline across EN, HI, and CG.
 */
export function AudioSceneIllustration({
  art,
  accentColor,
}: {
  art: IllustrationId
  accentColor: string
}) {
  return (
    <div
      aria-hidden="true"
      className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-md shadow-blue-950/10"
    >
      <svg
        viewBox="0 0 320 240"
        className="h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="civicBg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F2F7FF" />
            <stop offset="100%" stopColor="#E1ECFF" />
          </linearGradient>
          <linearGradient id="dangerBg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFF5F5" />
            <stop offset="100%" stopColor="#FFE2E5" />
          </linearGradient>
          <linearGradient id="warnBg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFFBEB" />
            <stop offset="100%" stopColor="#FDECC8" />
          </linearGradient>
          <linearGradient id="safeBg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ECFDF5" />
            <stop offset="100%" stopColor="#D1FAE5" />
          </linearGradient>
        </defs>

        {/* Soft themed backdrop */}
        <rect
          width="320"
          height="240"
          fill={
            art === 'fake_bank_call' || art === 'screen_share_trap' || art === 'digital_arrest_video' || art === 'fake_link_sms'
              ? 'url(#dangerBg)'
              : art === 'urgency_clock' || art === 'secrecy_trap' || art === 'courier_parcel_scam' || art === 'qr_scan_trap'
              ? 'url(#warnBg)'
              : art === 'hang_up_action' || art === 'verify_official' || art === 'helpline_1930'
              ? 'url(#safeBg)'
              : 'url(#civicBg)'
          }
        />
        <circle cx="278" cy="40" r="56" fill="#FFFFFF" opacity="0.55" />
        <circle cx="42" cy="212" r="48" fill={accentColor} opacity="0.09" />

        {/* 1. OTP SHIELD */}
        {art === 'otp_shield' && (
          <g>
            {/* Smartphone */}
            <rect x="64" y="34" width="112" height="174" rx="18" fill="#163264" />
            <rect x="72" y="46" width="96" height="148" rx="12" fill="#FFFFFF" />
            <rect x="104" y="39" width="32" height="4" rx="2" fill="#64748B" />
            {/* SMS OTP Card */}
            <rect x="82" y="64" width="76" height="58" rx="10" fill="#EFF4FF" stroke="#BFDBFE" strokeWidth="1.5" />
            <text x="120" y="83" textAnchor="middle" fill="#1747C4" fontSize="11" fontWeight="800" fontFamily="sans-serif">
              OTP
            </text>
            <g fill="#163264">
              <circle cx="94" cy="102" r="4" />
              <circle cx="105" cy="102" r="4" />
              <circle cx="116" cy="102" r="4" />
              <circle cx="127" cy="102" r="4" />
              <circle cx="138" cy="102" r="4" />
              <circle cx="149" cy="102" r="4" />
            </g>
            {/* Warning bars */}
            <rect x="82" y="134" width="76" height="10" rx="5" fill="#E2E8F0" />
            <rect x="82" y="152" width="52" height="10" rx="5" fill="#CBD5E1" />
            {/* Large Shield Overlay */}
            <path d="M216 62 L264 78 V124 C264 156 242 178 216 190 C190 178 168 156 168 124 V78 Z" fill="#1747C4" />
            <path d="M216 74 L254 87 V123 C254 148 237 166 216 177 C195 166 178 148 178 123 V87 Z" fill="#163264" />
            <rect x="201" y="114" width="30" height="24" rx="5" fill="#FFFFFF" />
            <path d="M207 114 V106 C207 100 225 100 225 106 V114" fill="none" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
            <circle cx="216" cy="126" r="3" fill="#1747C4" />
          </g>
        )}

        {/* 2. FAKE BANK CALL */}
        {art === 'fake_bank_call' && (
          <g>
            {/* Pulsing Call Waves */}
            <circle cx="160" cy="118" r="94" fill="none" stroke="#EF4444" strokeWidth="2" strokeDasharray="6 6" opacity="0.45" />
            <circle cx="160" cy="118" r="76" fill="none" stroke="#DC2626" strokeWidth="2" opacity="0.25" />
            {/* Phone Frame */}
            <rect x="102" y="24" width="116" height="192" rx="20" fill="#0F1B3D" />
            <rect x="110" y="36" width="100" height="168" rx="13" fill="#FFFFFF" />
            {/* Caller Avatar with Red Alert */}
            <circle cx="160" cy="84" r="24" fill="#FEE2E2" stroke="#EF4444" strokeWidth="2.5" />
            <circle cx="160" cy="77" r="8" fill="#DC2626" />
            <path d="M145 99 C148 89 172 89 175 99" fill="#DC2626" />
            {/* Alert Pill */}
            <rect x="122" y="118" width="76" height="18" rx="9" fill="#DC2626" />
            <text x="160" y="131" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="800" fontFamily="sans-serif">
              +91 98XXX
            </text>
            {/* Fake Bank Badge */}
            <rect x="130" y="143" width="60" height="8" rx="4" fill="#E2E8F0" />
            {/* Call Action Buttons */}
            <circle cx="138" cy="176" r="14" fill="#DC2626" />
            <path d="M131 176 Q138 171 145 176" stroke="#FFFFFF" strokeWidth="3" fill="none" strokeLinecap="round" />
            <circle cx="182" cy="176" r="14" fill="#E2E8F0" />
            <path d="M177 172 L187 180 M187 172 L177 180" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        )}

        {/* 3. ATM CARD GUARD */}
        {art === 'atm_card_guard' && (
          <g>
            {/* ATM Frame */}
            <rect x="44" y="28" width="232" height="184" rx="18" fill="#163264" />
            <rect x="58" y="42" width="114" height="72" rx="10" fill="#DBEAFE" />
            {/* PIN Dots on Screen */}
            <text x="115" y="68" textAnchor="middle" fill="#163264" fontSize="11" fontWeight="800" fontFamily="sans-serif">
              ATM PIN
            </text>
            <rect x="76" y="78" width="78" height="22" rx="6" fill="#FFFFFF" />
            <g fill="#1747C4">
              <circle cx="94" cy="89" r="4" />
              <circle cx="108" cy="89" r="4" />
              <circle cx="122" cy="89" r="4" />
              <circle cx="136" cy="89" r="4" />
            </g>
            {/* Card Slot + Card */}
            <rect x="188" y="46" width="72" height="12" rx="4" fill="#0F172A" />
            <rect x="196" y="54" width="56" height="66" rx="8" fill="#2563EB" stroke="#93C5FD" strokeWidth="2" />
            <rect x="206" y="72" width="16" height="12" rx="2" fill="#FBBF24" />
            <rect x="206" y="94" width="36" height="5" rx="2.5" fill="#BFDBFE" />
            {/* Keypad + Protective Shield */}
            <rect x="58" y="128" width="114" height="68" rx="10" fill="#EFF6FF" />
            {[0, 1, 2, 3].map((col) =>
              [0, 1, 2].map((row) => (
                <rect
                  key={`${col}-${row}`}
                  x={70 + col * 24}
                  y={138 + row * 18}
                  width="16"
                  height="12"
                  rx="3"
                  fill={col === 3 && row === 2 ? '#16A34A' : '#94A3B8'}
                />
              ))
            )}
            {/* Green Shield Check */}
            <circle cx="224" cy="162" r="28" fill="#10B981" stroke="#FFFFFF" strokeWidth="4" />
            <path d="M212 162 L220 170 L236 154" fill="none" stroke="#FFFFFF" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        )}

        {/* 4. UPI PIN LOCK */}
        {art === 'upi_pin_lock' && (
          <g>
            <rect x="92" y="24" width="136" height="192" rx="20" fill="#163264" />
            <rect x="102" y="36" width="116" height="168" rx="13" fill="#FFFFFF" />
            {/* Top UPI Pay Header */}
            <rect x="112" y="48" width="96" height="44" rx="10" fill="#EFF4FF" />
            <text x="160" y="72" textAnchor="middle" fill="#1747C4" fontSize="22" fontWeight="900" fontFamily="sans-serif">
              ₹ →
            </text>
            <text x="160" y="86" textAnchor="middle" fill="#163264" fontSize="9.5" fontWeight="800" fontFamily="sans-serif">
              UPI PIN
            </text>
            {/* 4 PIN Boxes */}
            {[0, 1, 2, 3].map((i) => (
              <g key={i}>
                <rect x={112 + i * 25} y="106" width="20" height="24" rx="5" fill="#F8FAFC" stroke="#1747C4" strokeWidth="2" />
                <circle cx={122 + i * 25} cy="118" r="3.5" fill="#163264" />
              </g>
            ))}
            {/* Lock Badge */}
            <circle cx="160" cy="166" r="22" fill="#1747C4" />
            <rect x="151" y="164" width="18" height="14" rx="3" fill="#FFFFFF" />
            <path d="M155 164 V159 C155 154 165 154 165 159 V164" fill="none" stroke="#FFFFFF" strokeWidth="2.8" strokeLinecap="round" />
          </g>
        )}

        {/* 5. QR SCAN TRAP */}
        {art === 'qr_scan_trap' && (
          <g>
            {/* QR Card */}
            <rect x="86" y="40" width="148" height="160" rx="18" fill="#FFFFFF" stroke="#F59E0B" strokeWidth="3" />
            {/* Scanner Corner Brackets */}
            <path d="M104 68 V54 H118 M202 54 H216 V68 M104 156 V170 H118 M216 156 V170 H202" fill="none" stroke="#163264" strokeWidth="4" strokeLinecap="round" />
            {/* Detailed QR Matrix */}
            <rect x="118" y="68" width="28" height="28" rx="4" fill="none" stroke="#163264" strokeWidth="5" />
            <rect x="127" y="77" width="10" height="10" fill="#163264" />
            <rect x="174" y="68" width="28" height="28" rx="4" fill="none" stroke="#163264" strokeWidth="5" />
            <rect x="183" y="77" width="10" height="10" fill="#163264" />
            <rect x="118" y="124" width="28" height="28" rx="4" fill="none" stroke="#163264" strokeWidth="5" />
            <rect x="127" y="133" width="10" height="10" fill="#163264" />
            <g fill="#163264">
              <rect x="156" y="68" width="10" height="10" rx="2" />
              <rect x="156" y="88" width="10" height="18" rx="2" />
              <rect x="118" y="106" width="18" height="10" rx="2" />
              <rect x="144" y="106" width="26" height="10" rx="2" />
              <rect x="178" y="106" width="24" height="10" rx="2" />
              <rect x="156" y="124" width="12" height="28" rx="2" />
              <rect x="176" y="124" width="26" height="12" rx="2" />
              <rect x="176" y="142" width="14" height="10" rx="2" />
            </g>
            {/* Red Scan Line + Outflow Warning */}
            <line x1="100" y1="112" x2="220" y2="112" stroke="#DC2626" strokeWidth="3.5" />
            <rect x="190" y="24" width="84" height="28" rx="14" fill="#DC2626" />
            <text x="232" y="42" textAnchor="middle" fill="#FFFFFF" fontSize="11.5" fontWeight="800" fontFamily="sans-serif">
              ₹ PAY ✕
            </text>
          </g>
        )}

        {/* 6. SCREEN SHARE / REMOTE ACCESS TRAP */}
        {art === 'screen_share_trap' && (
          <g>
            {/* Victim Phone (Left) */}
            <rect x="36" y="44" width="90" height="152" rx="15" fill="#163264" />
            <rect x="44" y="56" width="74" height="128" rx="9" fill="#EFF6FF" />
            <rect x="52" y="72" width="58" height="24" rx="6" fill="#FFFFFF" stroke="#93C5FD" />
            <text x="81" y="88" textAnchor="middle" fill="#1747C4" fontSize="10" fontWeight="800" fontFamily="sans-serif">
              OTP: 4829
            </text>
            <rect x="52" y="106" width="58" height="12" rx="4" fill="#DBEAFE" />
            <rect x="52" y="126" width="44" height="12" rx="4" fill="#DBEAFE" />
            {/* Streaming Red Signal Beam */}
            <path d="M132 108 H188" stroke="#DC2626" strokeWidth="4" strokeDasharray="7 5" />
            <polygon points="186,100 198,108 186,116" fill="#DC2626" />
            <circle cx="160" cy="84" r="16" fill="#DC2626" />
            <text x="160" y="90" textAnchor="middle" fill="#FFFFFF" fontSize="16" fontWeight="900" fontFamily="sans-serif">
              !
            </text>
            {/* Scammer Device (Right) */}
            <rect x="198" y="44" width="90" height="152" rx="15" fill="#991B1B" />
            <rect x="206" y="56" width="74" height="128" rx="9" fill="#FEF2F2" />
            <rect x="214" y="72" width="58" height="24" rx="6" fill="#FFFFFF" stroke="#FCA5A5" />
            <text x="243" y="88" textAnchor="middle" fill="#DC2626" fontSize="10" fontWeight="800" fontFamily="sans-serif">
              OTP: 4829
            </text>
            {/* Eye watching icon */}
            <path d="M220 140 Q243 120 266 140 Q243 160 220 140 Z" fill="#FCA5A5" stroke="#DC2626" strokeWidth="2.5" />
            <circle cx="243" cy="140" r="7" fill="#991B1B" />
          </g>
        )}

        {/* 7. FAKE LINK SMS */}
        {art === 'fake_link_sms' && (
          <g>
            <rect x="74" y="26" width="172" height="188" rx="20" fill="#163264" />
            <rect x="84" y="38" width="152" height="164" rx="13" fill="#F8FAFC" />
            {/* Phishing SMS Bubble */}
            <rect x="96" y="56" width="128" height="74" rx="12" fill="#FFFFFF" stroke="#FCA5A5" strokeWidth="2" />
            <rect x="108" y="68" width="64" height="8" rx="4" fill="#CBD5E1" />
            <rect x="108" y="84" width="104" height="22" rx="6" fill="#FEE2E2" />
            <text x="160" y="99" textAnchor="middle" fill="#B91C1C" fontSize="10.5" fontWeight="800" fontFamily="monospace">
              http://kyc-xx.top
            </text>
            <rect x="108" y="113" width="84" height="7" rx="3.5" fill="#E2E8F0" />
            {/* Big Warning Triangle */}
            <polygon points="160,136 190,188 130,188" fill="#DC2626" stroke="#FFFFFF" strokeWidth="3" strokeLinejoin="round" />
            <rect x="157" y="153" width="6" height="16" rx="3" fill="#FFFFFF" />
            <circle cx="160" cy="178" r="3.5" fill="#FFFFFF" />
          </g>
        )}

        {/* 8. DIGITAL ARREST VIDEO CALL */}
        {art === 'digital_arrest_video' && (
          <g>
            {/* Video Call Window */}
            <rect x="52" y="30" width="216" height="180" rx="18" fill="#0F1B3D" />
            <rect x="64" y="42" width="192" height="126" rx="12" fill="#1E293B" />
            {/* Fake Uniform Silhouette */}
            <circle cx="160" cy="86" r="20" fill="#D97706" />
            <rect x="136" y="60" width="48" height="10" rx="4" fill="#92400E" />
            <path d="M122 152 C126 118 194 118 198 152 Z" fill="#B45309" />
            {/* Bold Red Cross-Out Overlay */}
            <circle cx="160" cy="105" r="44" fill="none" stroke="#EF4444" strokeWidth="7" />
            <line x1="130" y1="75" x2="190" y2="135" stroke="#EF4444" strokeWidth="7" strokeLinecap="round" />
            {/* Bottom Video Bar */}
            <circle cx="128" cy="188" r="11" fill="#334155" />
            <circle cx="160" cy="188" r="13" fill="#DC2626" />
            <path d="M153 188 Q160 183 167 188" stroke="#FFFFFF" strokeWidth="2.8" fill="none" strokeLinecap="round" />
            <circle cx="192" cy="188" r="11" fill="#334155" />
          </g>
        )}

        {/* 9. COURIER / CUSTOMS PARCEL SCAM */}
        {art === 'courier_parcel_scam' && (
          <g>
            {/* 3D Parcel Box */}
            <polygon points="160,44 244,82 160,120 76,82" fill="#FDE68A" stroke="#B45309" strokeWidth="2.5" strokeLinejoin="round" />
            <polygon points="76,82 160,120 160,196 76,158" fill="#F59E0B" stroke="#B45309" strokeWidth="2.5" strokeLinejoin="round" />
            <polygon points="244,82 160,120 160,196 244,158" fill="#D97706" stroke="#B45309" strokeWidth="2.5" strokeLinejoin="round" />
            {/* Tape Strip */}
            <polygon points="146,50 174,63 174,113 146,100" fill="#FFFBEB" opacity="0.85" />
            {/* Fake Fine Red Stamp */}
            <circle cx="222" cy="76" r="32" fill="#DC2626" stroke="#FFFFFF" strokeWidth="4" />
            <text x="222" y="73" textAnchor="middle" fill="#FFFFFF" fontSize="14" fontWeight="900" fontFamily="sans-serif">
              ₹
            </text>
            <text x="222" y="89" textAnchor="middle" fill="#FEE2E2" fontSize="10" fontWeight="800" fontFamily="sans-serif">
              FAKE
            </text>
          </g>
        )}

        {/* 10. URGENCY / PANIC CLOCK */}
        {art === 'urgency_clock' && (
          <g>
            {/* Alarm Bells */}
            <path d="M104 62 Q94 44 116 44" fill="none" stroke="#D97706" strokeWidth="7" strokeLinecap="round" />
            <path d="M216 62 Q226 44 204 44" fill="none" stroke="#D97706" strokeWidth="7" strokeLinecap="round" />
            {/* Clock Body */}
            <circle cx="160" cy="126" r="68" fill="#FFFFFF" stroke="#D97706" strokeWidth="8" />
            <circle cx="160" cy="126" r="56" fill="#FFFBEB" />
            {/* Clock Ticks */}
            <line x1="160" y1="78" x2="160" y2="88" stroke="#92400E" strokeWidth="3.5" strokeLinecap="round" />
            <line x1="160" y1="164" x2="160" y2="174" stroke="#92400E" strokeWidth="3.5" strokeLinecap="round" />
            <line x1="112" y1="126" x2="122" y2="126" stroke="#92400E" strokeWidth="3.5" strokeLinecap="round" />
            <line x1="198" y1="126" x2="208" y2="126" stroke="#92400E" strokeWidth="3.5" strokeLinecap="round" />
            {/* Hands */}
            <line x1="160" y1="126" x2="160" y2="92" stroke="#163264" strokeWidth="5" strokeLinecap="round" />
            <line x1="160" y1="126" x2="192" y2="138" stroke="#DC2626" strokeWidth="5" strokeLinecap="round" />
            <circle cx="160" cy="126" r="6" fill="#163264" />
            {/* Red Panic Exclamation */}
            <circle cx="234" cy="80" r="22" fill="#DC2626" stroke="#FFFFFF" strokeWidth="3.5" />
            <text x="234" y="88" textAnchor="middle" fill="#FFFFFF" fontSize="22" fontWeight="900" fontFamily="sans-serif">
              !
            </text>
          </g>
        )}

        {/* 11. SECRECY TRAP */}
        {art === 'secrecy_trap' && (
          <g>
            {/* Isolated User Bubble */}
            <circle cx="116" cy="118" r="54" fill="#FFFFFF" stroke="#F59E0B" strokeWidth="4" strokeDasharray="8 6" />
            <circle cx="116" cy="102" r="16" fill="#163264" />
            <path d="M90 148 C94 126 138 126 142 148" fill="#163264" />
            {/* Crossed Out Padlock / Secrecy Barrier */}
            <circle cx="212" cy="118" r="46" fill="#FEE2E2" stroke="#DC2626" strokeWidth="4" />
            <path d="M188 118 Q212 96 236 118 Q212 140 188 118 Z" fill="#FFFFFF" stroke="#DC2626" strokeWidth="3" />
            <circle cx="212" cy="118" r="8" fill="#DC2626" />
            <line x1="184" y1="90" x2="240" y2="146" stroke="#DC2626" strokeWidth="6" strokeLinecap="round" />
          </g>
        )}

        {/* 12. HANG UP ACTION */}
        {art === 'hang_up_action' && (
          <g>
            {/* Broken Red Scam Wave */}
            <path d="M40 120 Q68 92 94 120" fill="none" stroke="#EF4444" strokeWidth="5" strokeLinecap="round" opacity="0.6" />
            <path d="M226 120 Q252 148 280 120" fill="none" stroke="#EF4444" strokeWidth="5" strokeLinecap="round" opacity="0.6" />
            {/* Big Safe Green Ring + Red Hang Up Circle */}
            <circle cx="160" cy="120" r="68" fill="#FFFFFF" stroke="#10B981" strokeWidth="6" />
            <circle cx="160" cy="120" r="46" fill="#DC2626" />
            {/* Phone Receiver Down */}
            <path d="M132 126 C144 110 176 110 188 126" fill="none" stroke="#FFFFFF" strokeWidth="9" strokeLinecap="round" />
            {/* Checkmark Badge */}
            <circle cx="212" cy="70" r="22" fill="#10B981" stroke="#FFFFFF" strokeWidth="4" />
            <path d="M202 70 L209 77 L222 63" fill="none" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        )}

        {/* 13. VERIFY OFFICIALLY (BANK + OFFICIAL APP) */}
        {art === 'verify_official' && (
          <g>
            {/* Bank Building */}
            <polygon points="160,36 250,82 70,82" fill="#163264" />
            <rect x="78" y="82" width="164" height="12" fill="#1747C4" />
            <rect x="92" y="94" width="18" height="74" rx="3" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="2" />
            <rect x="132" y="94" width="18" height="74" rx="3" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="2" />
            <rect x="170" y="94" width="18" height="74" rx="3" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="2" />
            <rect x="210" y="94" width="18" height="74" rx="3" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="2" />
            <rect x="68" y="168" width="184" height="18" rx="5" fill="#163264" />
            {/* Verified Seal */}
            <circle cx="234" cy="158" r="30" fill="#10B981" stroke="#FFFFFF" strokeWidth="5" />
            <path d="M221 158 L230 167 L247 149" fill="none" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        )}

        {/* 14. HELPLINE 1930 */}
        {art === 'helpline_1930' && (
          <g>
            <rect x="46" y="38" width="228" height="164" rx="22" fill="#163264" />
            <rect x="58" y="50" width="204" height="140" rx="15" fill="#1E3A8A" stroke="#60A5FA" strokeWidth="1.5" strokeOpacity="0.4" />
            {/* Shield + Phone Emblem */}
            <circle cx="160" cy="86" r="22" fill="#10B981" />
            <path d="M150 86 L157 93 L171 79" fill="none" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            {/* 1930 Number */}
            <text x="160" y="144" textAnchor="middle" fill="#FFFFFF" fontSize="38" fontWeight="900" letterSpacing="3" fontFamily="sans-serif">
              1930
            </text>
            <rect x="86" y="156" width="148" height="22" rx="11" fill="#EFF4FF" />
            <text x="160" y="171" textAnchor="middle" fill="#163264" fontSize="11" fontWeight="800" fontFamily="sans-serif">
              cybercrime.gov.in
            </text>
          </g>
        )}
      </svg>
    </div>
  )
}
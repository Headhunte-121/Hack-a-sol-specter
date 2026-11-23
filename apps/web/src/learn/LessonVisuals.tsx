import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock,
  CreditCard,
  EyeOff,
  KeyRound,
  Link2,
  Lock,
  Package,
  PhoneCall,
  PhoneIncoming,
  PhoneOff,
  QrCode,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Video,
} from 'lucide-react'
import type { Lang } from '../shell/i18n'
import { lessonCards, pick, type Lesson } from './content'
import type { VideoScene } from './videoTypes'

export type ArtKind =
  | 'hero_shield'
  | 'phone_sms'
  | 'fake_call'
  | 'remote_app'
  | 'qr_trap'
  | 'atm_keypad'
  | 'upi_pin'
  | 'parcel_box'
  | 'video_arrest'
  | 'red_flag_clock'
  | 'red_flag_secret'
  | 'red_flag_money'
  | 'safe_hangup'
  | 'safe_verify'
  | 'safe_lock'
  | 'helpline_1930'

export interface StoryFrame {
  art: ArtKind
  tag: string
  heading: string
  explanation: string
  /** Optional real image path (e.g. '/images/lessons/links_apps/scenario-1.webp') */
  photoSrc?: string
}

/**
 * Optional override map for real photos.
 * Key format: `${lessonId}:${sceneKind}:${frameIndex}` (frameIndex is 1..4).
 * Example: 'links_apps:scenario:1': '/images/lessons/links_apps/scenario-1.webp'
 */
export const CUSTOM_FRAME_PHOTOS: Record<string, string> = {}

const FRAME_LABELS: Record<Lang, { step: string; redFlag: string; safeStep: string; tip: string; helpline: string; protect: string; hangup: string; verify: string }> = {
  en: {
    step: 'Key point',
    redFlag: 'Red flag',
    safeStep: 'Safe action',
    tip: 'Remember',
    helpline: 'Report on 1930',
    protect: 'Stay protected',
    hangup: 'Stop & disconnect',
    verify: 'Verify officially',
  },
  hi: {
    step: 'मुख्य बात',
    redFlag: 'खतरे का संकेत',
    safeStep: 'सुरक्षित कदम',
    tip: 'याद रखें',
    helpline: '1930 पर रिपोर्ट करें',
    protect: 'सुरक्षित रहें',
    hangup: 'रुकें और कॉल काटें',
    verify: 'आधिकारिक जांच करें',
  },
  cg: {
    step: 'खास बात',
    redFlag: 'खतरा के चिन्हा',
    safeStep: 'सुरक्षित कदम',
    tip: 'ध्यान रखव',
    helpline: '1930 म शिकायत करव',
    protect: 'सुरक्षित रहव',
    hangup: 'रुकव अउ फोन काटव',
    verify: 'सही जगह ले जांचव',
  },
}

/** Split a paragraph into clean sentence chunks for synced subtitles and storyboard frames. */
export function splitSentences(text: string): string[] {
  const cleaned = text.replace(/\s+/g, ' ').trim()
  if (!cleaned) return []
  const parts = cleaned
    .split(/(?<=[.!?।])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
  if (parts.length > 1) return parts
  // If a single long sentence, split gently near the middle on a comma or space
  if (cleaned.length > 95) {
    const mid = Math.floor(cleaned.length / 2)
    const cut = cleaned.indexOf(' ', mid)
    if (cut > 20 && cut < cleaned.length - 15) {
      return [cleaned.slice(0, cut).trim(), cleaned.slice(cut + 1).trim()]
    }
  }
  return [cleaned]
}

/** Topic-tailored sequence of 4 visual artworks for each of the 4 video sections. */
function topicArtworkMap(lessonId: string): Record<VideoScene['kind'], [ArtKind, ArtKind, ArtKind, ArtKind]> {
  const id = lessonId.toLowerCase()

  if (id.includes('link') || id.includes('app') || id.includes('remote')) {
    return {
      intro: ['hero_shield', 'phone_sms', 'remote_app', 'safe_lock'],
      scenario: ['fake_call', 'phone_sms', 'remote_app', 'red_flag_money'],
      signs: ['remote_app', 'phone_sms', 'red_flag_clock', 'red_flag_secret'],
      todo: ['safe_hangup', 'safe_lock', 'safe_verify', 'helpline_1930'],
    }
  }
  if (id.includes('atm')) {
    return {
      intro: ['atm_keypad', 'hero_shield', 'safe_lock', 'phone_sms'],
      scenario: ['atm_keypad', 'red_flag_secret', 'red_flag_clock', 'red_flag_money'],
      signs: ['atm_keypad', 'red_flag_secret', 'red_flag_clock', 'fake_call'],
      todo: ['safe_lock', 'safe_verify', 'safe_hangup', 'helpline_1930'],
    }
  }
  if (id.includes('qr')) {
    return {
      intro: ['qr_trap', 'upi_pin', 'hero_shield', 'safe_verify'],
      scenario: ['phone_sms', 'qr_trap', 'upi_pin', 'red_flag_money'],
      signs: ['qr_trap', 'red_flag_money', 'red_flag_clock', 'upi_pin'],
      todo: ['safe_hangup', 'qr_trap', 'safe_verify', 'helpline_1930'],
    }
  }
  if (id.includes('upi')) {
    return {
      intro: ['upi_pin', 'hero_shield', 'qr_trap', 'safe_lock'],
      scenario: ['fake_call', 'phone_sms', 'upi_pin', 'red_flag_money'],
      signs: ['upi_pin', 'red_flag_money', 'red_flag_clock', 'qr_trap'],
      todo: ['safe_lock', 'safe_hangup', 'safe_verify', 'helpline_1930'],
    }
  }
  if (id.includes('kyc') || id.includes('bank')) {
    return {
      intro: ['hero_shield', 'fake_call', 'phone_sms', 'safe_verify'],
      scenario: ['fake_call', 'red_flag_clock', 'phone_sms', 'red_flag_money'],
      signs: ['fake_call', 'red_flag_clock', 'phone_sms', 'remote_app'],
      todo: ['safe_hangup', 'safe_verify', 'safe_lock', 'helpline_1930'],
    }
  }
  if (id.includes('arrest') || id.includes('police')) {
    return {
      intro: ['video_arrest', 'hero_shield', 'fake_call', 'helpline_1930'],
      scenario: ['fake_call', 'video_arrest', 'red_flag_secret', 'red_flag_money'],
      signs: ['video_arrest', 'red_flag_secret', 'red_flag_clock', 'red_flag_money'],
      todo: ['safe_hangup', 'safe_verify', 'safe_lock', 'helpline_1930'],
    }
  }
  if (id.includes('courier') || id.includes('parcel') || id.includes('custom')) {
    return {
      intro: ['parcel_box', 'hero_shield', 'fake_call', 'safe_verify'],
      scenario: ['parcel_box', 'fake_call', 'red_flag_clock', 'red_flag_money'],
      signs: ['parcel_box', 'red_flag_clock', 'red_flag_secret', 'red_flag_money'],
      todo: ['safe_hangup', 'safe_verify', 'safe_lock', 'helpline_1930'],
    }
  }
  if (id.includes('otp') || id.includes('card')) {
    return {
      intro: ['hero_shield', 'phone_sms', 'atm_keypad', 'safe_lock'],
      scenario: ['fake_call', 'phone_sms', 'red_flag_clock', 'red_flag_money'],
      signs: ['phone_sms', 'red_flag_clock', 'fake_call', 'red_flag_secret'],
      todo: ['safe_hangup', 'safe_lock', 'safe_verify', 'helpline_1930'],
    }
  }
  if (id.includes('happen') || id.includes('scam') || id.includes('report')) {
    return {
      intro: ['helpline_1930', 'hero_shield', 'safe_lock', 'safe_verify'],
      scenario: ['red_flag_money', 'red_flag_clock', 'fake_call', 'phone_sms'],
      signs: ['red_flag_clock', 'phone_sms', 'red_flag_money', 'safe_lock'],
      todo: ['safe_lock', 'helpline_1930', 'safe_verify', 'hero_shield'],
    }
  }

  return {
    intro: ['hero_shield', 'phone_sms', 'upi_pin', 'safe_lock'],
    scenario: ['fake_call', 'phone_sms', 'red_flag_clock', 'red_flag_money'],
    signs: ['red_flag_clock', 'phone_sms', 'red_flag_secret', 'red_flag_money'],
    todo: ['safe_hangup', 'safe_verify', 'safe_lock', 'helpline_1930'],
  }
}

/** Build 4 distinct visual + explanation frames for the active video section using the lesson's own trilingual content. */
export function buildSectionFrames(lesson: Lesson, scene: VideoScene, lang: Lang): StoryFrame[] {
  const lbl = FRAME_LABELS[lang]
  const cards = lessonCards(lesson)
  const artMap = topicArtworkMap(lesson.id)[scene.kind]
  const cardAt = (idx: number) => (cards.length > 0 ? cards[idx % cards.length] : null)
  const exampleSentences = splitSentences(pick(lesson.example, lang))
  const todoSentences = splitSentences(pick(lesson.todo, lang))

  const attachPhoto = (frames: StoryFrame[]): StoryFrame[] =>
    frames.map((f, idx) => ({
      ...f,
      photoSrc: CUSTOM_FRAME_PHOTOS[`${lesson.id}:${scene.kind}:${idx + 1}`],
    }))

  if (scene.kind === 'intro') {
    const c0 = cardAt(0)
    const c1 = cardAt(1)
    const c2 = cardAt(2)
    return attachPhoto([
      {
        art: artMap[0],
        tag: pick(scene.subheading, lang),
        heading: pick(lesson.title, lang),
        explanation: pick(scene.caption, lang),
      },
      {
        art: artMap[1],
        tag: `${lbl.step} 1`,
        heading: c0 ? pick(c0.title, lang) : pick(lesson.title, lang),
        explanation: c0 ? pick(c0.body, lang) : exampleSentences[0] ?? pick(lesson.example, lang),
      },
      {
        art: artMap[2],
        tag: `${lbl.step} 2`,
        heading: c1 ? pick(c1.title, lang) : pick(scene.heading, lang),
        explanation: c1 ? pick(c1.body, lang) : pick(lesson.signs[0], lang),
      },
      {
        art: artMap[3],
        tag: lbl.protect,
        heading: c2 ? pick(c2.title, lang) : lbl.tip,
        explanation: c2 ? pick(c2.body, lang) : pick(lesson.todo, lang),
      },
    ])
  }

  if (scene.kind === 'scenario') {
    const c1 = cardAt(1)
    const c2 = cardAt(2)
    return attachPhoto([
      {
        art: artMap[0],
        tag: `${lbl.step} 1`,
        heading: pick(scene.heading, lang),
        explanation: exampleSentences[0] ?? pick(lesson.example, lang),
      },
      {
        art: artMap[1],
        tag: `${lbl.step} 2`,
        heading: c1 ? pick(c1.title, lang) : pick(scene.heading, lang),
        explanation: exampleSentences[1] ?? (c1 ? pick(c1.body, lang) : pick(lesson.example, lang)),
      },
      {
        art: artMap[2],
        tag: `${lbl.step} 3`,
        heading: c2 ? pick(c2.title, lang) : pick(scene.subheading, lang),
        explanation: exampleSentences[2] ?? (c2 ? pick(c2.body, lang) : pick(lesson.signs[0], lang)),
      },
      {
        art: artMap[3],
        tag: lbl.tip,
        heading: pick(scene.subheading, lang),
        explanation: pick(lesson.example, lang),
      },
    ])
  }

  if (scene.kind === 'signs') {
    const c3 = cardAt(3)
    const s0 = lesson.signs[0] ? pick(lesson.signs[0], lang) : pick(scene.caption, lang)
    const s1 = lesson.signs[1] ? pick(lesson.signs[1], lang) : s0
    const s2 = lesson.signs[2] ? pick(lesson.signs[2], lang) : s1
    return attachPhoto([
      {
        art: artMap[0],
        tag: `${lbl.redFlag} 1`,
        heading: pick(scene.heading, lang),
        explanation: s0,
      },
      {
        art: artMap[1],
        tag: `${lbl.redFlag} 2`,
        heading: pick(scene.heading, lang),
        explanation: s1,
      },
      {
        art: artMap[2],
        tag: `${lbl.redFlag} 3`,
        heading: pick(scene.heading, lang),
        explanation: s2,
      },
      {
        art: artMap[3],
        tag: lbl.tip,
        heading: c3 ? pick(c3.title, lang) : pick(scene.heading, lang),
        explanation: c3 ? pick(c3.body, lang) : s0,
      },
    ])
  }

  // scene.kind === 'todo'
  const c4 = cardAt(4)
  const c5 = cardAt(5)
  return attachPhoto([
    {
      art: artMap[0],
      tag: `${lbl.safeStep} 1`,
      heading: lbl.hangup,
      explanation: todoSentences[0] ?? pick(lesson.todo, lang),
    },
    {
      art: artMap[1],
      tag: `${lbl.safeStep} 2`,
      heading: c4 ? pick(c4.title, lang) : lbl.verify,
      explanation: c4 ? pick(c4.body, lang) : todoSentences[1] ?? pick(lesson.todo, lang),
    },
    {
      art: artMap[2],
      tag: `${lbl.safeStep} 3`,
      heading: c5 ? pick(c5.title, lang) : lbl.protect,
      explanation: c5 ? pick(c5.body, lang) : pick(lesson.todo, lang),
    },
    {
      art: artMap[3],
      tag: lbl.helpline,
      heading: '1930 · cybercrime.gov.in',
      explanation: pick(lesson.todo, lang),
    },
  ])
}

/** Rich light-civic visual illustration card (or real photo if photoSrc is provided). */
export function SceneArtwork({ frame, accentColor }: { frame: StoryFrame; accentColor: string }) {
  if (frame.photoSrc) {
    return (
      <div className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-md shadow-blue-950/10">
        <img src={frame.photoSrc} alt="" className="h-full w-full object-cover" />
      </div>
    )
  }

  return (
    <div
      aria-hidden="true"
      className="relative flex aspect-[4/3] w-full flex-col items-center justify-center overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-3 shadow-md shadow-blue-950/10"
    >
      {/* Subtle corner glow matching active scene accent */}
      <div
        className="pointer-events-none absolute -top-8 -right-8 size-24 rounded-full opacity-15 blur-xl"
        style={{ backgroundColor: accentColor }}
      />

      {frame.art === 'hero_shield' && (
        <div className="flex flex-col items-center gap-2">
          <div className="relative flex size-16 items-center justify-center rounded-2xl bg-[#EFF4FF] text-[#1747c4] ring-4 ring-[#1747c4]/10">
            <ShieldCheck className="size-9" strokeWidth={2.1} />
            <span className="absolute -right-1.5 -bottom-1.5 flex size-6 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xs">
              <CheckCircle2 className="size-3.5" strokeWidth={2.6} />
            </span>
          </div>
          <div className="flex gap-1.5">
            <span className="h-1.5 w-8 rounded-full bg-[#1747c4]/30" />
            <span className="h-1.5 w-4 rounded-full bg-emerald-400/60" />
          </div>
        </div>
      )}

      {frame.art === 'phone_sms' && (
        <div className="flex w-full max-w-[165px] flex-col gap-1.5 rounded-2xl border-2 border-slate-200 bg-slate-50 p-2.5 shadow-inner">
          <div className="flex items-center justify-between text-[9px] font-extrabold text-slate-400">
            <span>SMS ALERT</span>
            <span className="rounded bg-red-100 px-1.5 py-0.5 text-red-700">FAKE</span>
          </div>
          <div className="rounded-xl bg-white p-2 shadow-2xs ring-1 ring-red-200/80">
            <div className="flex items-center gap-1 text-[10px] font-bold text-red-700">
              <Link2 className="size-3 shrink-0" />
              <span className="truncate">bit.ly/kyc-now</span>
            </div>
            <div className="mt-1 flex items-center gap-1 text-[9.5px] font-semibold text-slate-500">
              <KeyRound className="size-3 text-amber-600" />
              <span>OTP: ••••••</span>
            </div>
          </div>
        </div>
      )}

      {frame.art === 'fake_call' && (
        <div className="flex w-full max-w-[160px] flex-col items-center gap-2 rounded-2xl border border-red-200 bg-red-50/70 p-3">
          <div className="flex size-12 items-center justify-center rounded-full bg-red-600 text-white shadow-md ring-4 ring-red-200">
            <PhoneIncoming className="size-6" strokeWidth={2.2} />
          </div>
          <div className="text-center">
            <div className="text-[10px] font-extrabold tracking-wide text-red-800">+91 98XXX XXXXX</div>
            <div className="mt-0.5 rounded-full bg-white px-2 py-0.5 text-[9px] font-bold text-red-600 ring-1 ring-red-200">
              IMPERSONATION
            </div>
          </div>
        </div>
      )}

      {frame.art === 'remote_app' && (
        <div className="flex w-full max-w-[170px] flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <div className="flex flex-col items-center rounded-xl border border-slate-200 bg-blue-50 px-2.5 py-2">
              <Smartphone className="size-6 text-[#1747c4]" />
              <span className="mt-1 text-[8.5px] font-extrabold text-[#163264]">YOUR PHONE</span>
            </div>
            <div className="flex flex-col items-center text-red-600">
              <AlertTriangle className="size-4" />
              <span className="font-mono text-[10px] font-extrabold">→→</span>
            </div>
            <div className="flex flex-col items-center rounded-xl border border-red-200 bg-red-50 px-2.5 py-2">
              <ShieldAlert className="size-6 text-red-600" />
              <span className="mt-1 text-[8.5px] font-extrabold text-red-700">SCAMMER</span>
            </div>
          </div>
          <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[9.5px] font-extrabold text-red-700">
            SCREEN SHARE TRAP
          </span>
        </div>
      )}

      {frame.art === 'qr_trap' && (
        <div className="flex flex-col items-center gap-1.5">
          <div className="relative flex size-16 items-center justify-center rounded-2xl border-2 border-dashed border-amber-400 bg-amber-50 text-[#163264]">
            <QrCode className="size-10" strokeWidth={1.9} />
            <span className="absolute -top-2 -right-2 rounded-full bg-red-600 px-1.5 py-0.5 text-[9px] font-extrabold text-white shadow-xs">
              PAY ONLY
            </span>
          </div>
          <span className="text-[10px] font-extrabold text-slate-600">SCAN ≠ RECEIVE MONEY</span>
        </div>
      )}

      {frame.art === 'atm_keypad' && (
        <div className="flex w-full max-w-[160px] flex-col items-center gap-2 rounded-2xl border border-blue-200 bg-[#F4F8FF] p-2.5">
          <div className="flex items-center gap-2">
            <CreditCard className="size-6 text-[#1747c4]" />
            <div className="grid grid-cols-3 gap-1">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <span key={n} className="size-2.5 rounded-xs bg-[#163264]/25" />
              ))}
            </div>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-[9.5px] font-extrabold text-[#163264] ring-1 ring-blue-200">
            <Lock className="size-3 text-[#1747c4]" />
            <span>COVER YOUR PIN</span>
          </span>
        </div>
      )}

      {frame.art === 'upi_pin' && (
        <div className="flex w-full max-w-[155px] flex-col items-center gap-2 rounded-2xl border border-indigo-200 bg-indigo-50/70 p-3">
          <div className="flex items-center gap-1.5">
            {[0, 1, 2, 3].map((dot) => (
              <span key={dot} className="flex size-6 items-center justify-center rounded-lg bg-white font-mono text-sm font-extrabold text-[#163264] shadow-2xs ring-1 ring-indigo-200">
                •
              </span>
            ))}
          </div>
          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-indigo-800">
            <Lock className="size-3" />
            <span>UPI PIN = SEND ONLY</span>
          </span>
        </div>
      )}

      {frame.art === 'parcel_box' && (
        <div className="flex flex-col items-center gap-2">
          <div className="relative flex size-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 ring-2 ring-amber-200">
            <Package className="size-9" strokeWidth={2} />
            <span className="absolute -right-2 -bottom-1.5 rounded bg-red-600 px-1.5 py-0.5 text-[8.5px] font-extrabold text-white shadow-xs">
              FAKE FINE
            </span>
          </div>
          <span className="text-[10px] font-bold text-slate-600">CUSTOMS / COURIER SCAM</span>
        </div>
      )}

      {frame.art === 'video_arrest' && (
        <div className="flex w-full max-w-[165px] flex-col items-center gap-2 rounded-2xl border border-red-200 bg-red-50/80 p-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-white text-red-600 shadow-xs ring-2 ring-red-200">
            <Video className="size-6" strokeWidth={2.2} />
          </div>
          <span className="rounded-full bg-red-600 px-2.5 py-0.5 text-[9.5px] font-extrabold text-white">
            NO DIGITAL ARREST IN LAW
          </span>
        </div>
      )}

      {frame.art === 'red_flag_clock' && (
        <div className="flex flex-col items-center gap-2">
          <div className="flex size-14 items-center justify-center rounded-full bg-amber-100 text-amber-700 ring-4 ring-amber-50">
            <Clock className="size-8" strokeWidth={2.2} />
          </div>
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[9.5px] font-extrabold text-amber-900">
            FAKE URGENCY / PANIC
          </span>
        </div>
      )}

      {frame.art === 'red_flag_secret' && (
        <div className="flex flex-col items-center gap-2">
          <div className="flex size-14 items-center justify-center rounded-full bg-rose-100 text-rose-700 ring-4 ring-rose-50">
            <EyeOff className="size-7" strokeWidth={2.2} />
          </div>
          <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[9.5px] font-extrabold text-rose-900">
            FORCED SECRECY TRAP
          </span>
        </div>
      )}

      {frame.art === 'red_flag_money' && (
        <div className="flex flex-col items-center gap-2">
          <div className="flex size-14 items-center justify-center rounded-full bg-red-100 text-red-700 ring-4 ring-red-50">
            <ShieldAlert className="size-8" strokeWidth={2.2} />
          </div>
          <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[9.5px] font-extrabold text-red-900">
            MONEY / CODE DEMAND
          </span>
        </div>
      )}

      {frame.art === 'safe_hangup' && (
        <div className="flex flex-col items-center gap-2">
          <div className="flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 ring-4 ring-emerald-50">
            <PhoneOff className="size-7" strokeWidth={2.3} />
          </div>
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[9.5px] font-extrabold text-emerald-900">
            DISCONNECT IMMEDIATELY
          </span>
        </div>
      )}

      {frame.art === 'safe_verify' && (
        <div className="flex flex-col items-center gap-2">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-[#EFF4FF] text-[#1747c4] ring-4 ring-blue-50">
            <Building2 className="size-7" strokeWidth={2.2} />
          </div>
          <span className="rounded-full bg-[#EFF4FF] px-2.5 py-0.5 text-[9.5px] font-extrabold text-[#163264]">
            OFFICIAL APP / BRANCH
          </span>
        </div>
      )}

      {frame.art === 'safe_lock' && (
        <div className="flex flex-col items-center gap-2">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 ring-4 ring-emerald-50">
            <Lock className="size-7" strokeWidth={2.3} />
          </div>
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[9.5px] font-extrabold text-emerald-900">
            PROTECT & LOCK ACCOUNT
          </span>
        </div>
      )}

      {frame.art === 'helpline_1930' && (
        <div className="flex w-full max-w-[165px] flex-col items-center gap-1.5 rounded-2xl border border-blue-200 bg-[#163264] p-3 text-white shadow-md">
          <div className="flex items-center gap-1.5 text-lg font-extrabold tracking-wider">
            <PhoneCall className="size-5 text-emerald-400" />
            <span>1930</span>
          </div>
          <span className="text-[9.5px] font-semibold text-blue-100">cybercrime.gov.in</span>
        </div>
      )}
    </div>
  )
}
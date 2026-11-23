import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  CreditCard,
  KeyRound,
  Link2,
  Package,
  Play,
  QrCode,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
} from 'lucide-react'

interface LessonThumbnailProps {
  lessonId: string
  index: number
  durationLabel: string
  done: boolean
  doneLabel: string
  recommended?: boolean
  recommendedLabel?: string
}

const THEMES = [
  { bg: 'from-[#E8F0FE] via-[#F5F9FF] to-[#D6E6FF]', iconBg: 'bg-white text-[#1747c4]', ring: 'ring-[#1747c4]/15', accent: '#1747c4' },
  { bg: 'from-[#EEF2FF] via-[#F7F8FF] to-[#E0E7FF]', iconBg: 'bg-white text-[#3730A3]', ring: 'ring-[#3730A3]/15', accent: '#3730A3' },
  { bg: 'from-[#ECFEFF] via-[#F4FDFF] to-[#CFFAFE]', iconBg: 'bg-white text-[#0E7490]', ring: 'ring-[#0E7490]/15', accent: '#0E7490' },
  { bg: 'from-[#FFFBEB] via-[#FFFDF5] to-[#FEF3C7]', iconBg: 'bg-white text-[#B45309]', ring: 'ring-[#B45309]/15', accent: '#B45309' },
  { bg: 'from-[#FFF1F2] via-[#FFF8F8] to-[#FFE4E6]', iconBg: 'bg-white text-[#BE123C]', ring: 'ring-[#BE123C]/15', accent: '#BE123C' },
  { bg: 'from-[#F0FDF4] via-[#F7FEF9] to-[#DCFCE7]', iconBg: 'bg-white text-[#15803D]', ring: 'ring-[#15803D]/15', accent: '#15803D' },
] as const

function TopicIcon({ lessonId }: { lessonId: string }) {
  const id = lessonId.toLowerCase()
  const cls = 'size-6 sm:size-7'
  if (id.includes('otp')) return <KeyRound className={cls} strokeWidth={2.1} />
  if (id.includes('atm') || id.includes('card')) return <CreditCard className={cls} strokeWidth={2.1} />
  if (id.includes('qr')) return <QrCode className={cls} strokeWidth={2.1} />
  if (id.includes('upi')) return <Smartphone className={cls} strokeWidth={2.1} />
  if (id.includes('kyc') || id.includes('bank')) return <Building2 className={cls} strokeWidth={2.1} />
  if (id.includes('arrest') || id.includes('police')) return <ShieldAlert className={cls} strokeWidth={2.1} />
  if (id.includes('courier') || id.includes('parcel') || id.includes('custom')) return <Package className={cls} strokeWidth={2.1} />
  if (id.includes('link') || id.includes('remote') || id.includes('app')) return <Link2 className={cls} strokeWidth={2.1} />
  if (id.includes('happen') || id.includes('scam') || id.includes('report')) return <AlertTriangle className={cls} strokeWidth={2.1} />
  return <ShieldCheck className={cls} strokeWidth={2.1} />
}

export function LessonThumbnail({
  lessonId,
  index,
  durationLabel,
  done,
  doneLabel,
  recommended = false,
  recommendedLabel,
}: LessonThumbnailProps) {
  const theme = THEMES[index % THEMES.length]

  return (
    <div className={`relative aspect-[16/8.5] w-full overflow-hidden bg-linear-to-br sm:aspect-video ${theme.bg}`}>
      {/* Soft civic dot pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage: 'radial-gradient(rgba(22, 50, 100, 0.14) 1px, transparent 1px)',
          backgroundSize: '18px 18px',
        }}
        aria-hidden="true"
      />

      {/* Soft light halo */}
      <div
        className="pointer-events-none absolute -top-10 -right-10 size-36 rounded-full bg-white/60 blur-2xl"
        aria-hidden="true"
      />

      {/* Top Bar: Episode Number + Status Pill */}
      <div className="relative z-10 flex items-start justify-between p-2.5">
        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-lg bg-[#163264] px-2 font-mono text-[11px] font-extrabold text-white shadow-xs">
          {String(index + 1).padStart(2, '0')}
        </span>

        <div className="flex flex-wrap justify-end gap-1.5">
          {done && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-0.5 text-[11px] font-bold text-[#14583a] shadow-xs ring-1 ring-emerald-200">
              <CheckCircle2 className="size-3.5 text-emerald-600" strokeWidth={2.5} />
              <span>{doneLabel}</span>
            </span>
          )}
          {recommended && recommendedLabel && (
            <span className="inline-flex items-center rounded-full bg-[#FFF7DF] px-2.5 py-0.5 text-[11px] font-bold text-[#7A4600] shadow-xs ring-1 ring-amber-300/80">
              {recommendedLabel}
            </span>
          )}
        </div>
      </div>

      {/* Center Emblem + YouTube-style Hover Play Pill */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className={`flex size-12 items-center justify-center rounded-2xl shadow-md shadow-blue-950/10 ring-1 transition-all duration-200 group-hover:scale-95 group-hover:opacity-25 sm:size-14 ${theme.iconBg} ${theme.ring}`}
        >
          <TopicIcon lessonId={lessonId} />
        </div>

        <div className="absolute flex size-11 scale-90 items-center justify-center rounded-full bg-[#163264] text-white opacity-0 shadow-lg shadow-blue-950/25 ring-4 ring-white/85 transition-all duration-200 group-hover:scale-100 group-hover:opacity-100 sm:size-12">
          <Play className="size-5 translate-x-0.5 fill-current" />
        </div>
      </div>

      {/* Bottom-Right Duration Pill */}
      <span className="absolute right-2.5 bottom-2.5 z-10 rounded-md bg-white/92 px-2 py-0.5 text-[11px] font-bold text-[#0F1B3D] shadow-xs ring-1 ring-slate-900/10 backdrop-blur-xs">
        {durationLabel}
      </span>

      {/* Thin YouTube-Style Watched Progress Bar */}
      <div className="absolute inset-x-0 bottom-0 h-1 bg-white/70">
        <div
          className="h-full transition-all duration-300"
          style={{
            width: done ? '100%' : '0%',
            backgroundColor: theme.accent,
          }}
        />
      </div>
    </div>
  )
}
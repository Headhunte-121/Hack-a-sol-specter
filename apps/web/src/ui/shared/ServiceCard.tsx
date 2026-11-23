import {
  BookOpen,
  MessageSquareText,
  PhoneCall,
  QrCode,
  ShieldAlert,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react'

export type ServiceIconKey = 'message' | 'phone' | 'shield' | 'book' | 'qr' | 'chart'
export type ServiceTone = 'blue' | 'indigo' | 'amber' | 'green' | 'purple' | 'teal'

export interface ServiceCardProps {
  to: string
  icon: ServiceIconKey | LucideIcon
  title: string
  sub?: string
  tone?: ServiceTone
  highlight?: boolean
}

const ICON_MAP: Record<ServiceIconKey, LucideIcon> = {
  message: MessageSquareText,
  phone: PhoneCall,
  shield: ShieldAlert,
  book: BookOpen,
  qr: QrCode,
  chart: TrendingUp,
}

const TONE_STYLES: Record<ServiceTone, { badge: string; ring: string; glow: string }> = {
  blue: {
    badge: 'bg-blue-50 text-blue-700 ring-1 ring-blue-600/15',
    ring: 'hover:border-blue-300',
    glow: 'group-hover:bg-blue-600 group-hover:text-white',
  },
  indigo: {
    badge: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600/15',
    ring: 'hover:border-indigo-300',
    glow: 'group-hover:bg-indigo-600 group-hover:text-white',
  },
  amber: {
    badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/15',
    ring: 'hover:border-amber-300',
    glow: 'group-hover:bg-amber-600 group-hover:text-white',
  },
  green: {
    badge: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/15',
    ring: 'hover:border-emerald-300',
    glow: 'group-hover:bg-emerald-600 group-hover:text-white',
  },
  purple: {
    badge: 'bg-purple-50 text-purple-700 ring-1 ring-purple-600/15',
    ring: 'hover:border-purple-300',
    glow: 'group-hover:bg-purple-600 group-hover:text-white',
  },
  teal: {
    badge: 'bg-teal-50 text-teal-700 ring-1 ring-teal-600/15',
    ring: 'hover:border-teal-300',
    glow: 'group-hover:bg-teal-600 group-hover:text-white',
  },
}

export function ServiceCard({
  to,
  icon,
  title,
  sub,
  tone = 'blue',
  highlight = false,
}: ServiceCardProps) {
  const href = to.startsWith('#') ? to : `#${to.startsWith('/') ? to : `/${to}`}`
  const style = TONE_STYLES[tone]
  const IconComp = typeof icon === 'string' ? ICON_MAP[icon] : icon

  return (
    <a
      href={href}
      className={`group flex min-h-25 flex-col justify-between gap-2 rounded-2xl border bg-white p-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] sm:min-h-31.5 sm:gap-3 sm:p-4 ${
        highlight
          ? 'border-[#1B3B73]/25 shadow-xs ring-1 ring-[#1B3B73]/10 hover:border-[#1B3B73]'
          : `border-slate-200/90 shadow-2xs ${style.ring}`
      }`}
    >
      <div className="flex items-start justify-between gap-1.5">
        <span
          className={`flex size-8.5 shrink-0 items-center justify-center rounded-xl transition-colors duration-200 sm:size-10 ${style.badge} ${style.glow}`}
        >
          <IconComp className="size-4 sm:size-4.75" strokeWidth={2.1} />
        </span>
        {highlight && (
          <span className="rounded-full bg-[#1B3B73]/10 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-[#1B3B73] sm:px-2.5 sm:text-[10px]">
            Quick
          </span>
        )}
      </div>

      <div className="space-y-0.5">
        <div className="text-[13.5px] font-bold leading-snug text-slate-900 transition-colors group-hover:text-[#1B3B73] sm:text-[14.5px]">
          {title}
        </div>
        {sub && (
          <p className="line-clamp-2 text-[11.5px] leading-snug text-slate-500 sm:text-[12px] sm:leading-relaxed">
            {sub}
          </p>
        )}
      </div>
    </a>
  )
}
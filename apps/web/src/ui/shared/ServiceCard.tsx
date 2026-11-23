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
      className={`group flex min-h-[126px] flex-col justify-between gap-3 rounded-2xl border bg-white p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] ${
        highlight
          ? 'border-[#1B3B73]/25 shadow-xs ring-1 ring-[#1B3B73]/10 hover:border-[#1B3B73]'
          : `border-slate-200/90 shadow-2xs ${style.ring}`
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={`flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors duration-200 ${style.badge} ${style.glow}`}
        >
          <IconComp className="size-[19px]" strokeWidth={2.1} />
        </span>
        {highlight && (
          <span className="rounded-full bg-[#1B3B73]/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#1B3B73]">
            Quick
          </span>
        )}
      </div>

      <div className="space-y-0.5">
        <div className="text-[14.5px] font-bold leading-snug text-slate-900 transition-colors group-hover:text-[#1B3B73]">
          {title}
        </div>
        {sub && <p className="line-clamp-2 text-[12px] leading-relaxed text-slate-500">{sub}</p>}
      </div>
    </a>
  )
}
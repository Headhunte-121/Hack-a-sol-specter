import type { ComponentProps } from 'react'
import { useLang } from '../../shell/i18n'
import { Icon } from '../../shell/ui'

type IconName = ComponentProps<typeof Icon>['name']

export type ServiceTone = 'blue' | 'indigo' | 'amber' | 'green' | 'purple' | 'teal'

export interface ServiceCardProps {
  to: string
  icon: IconName
  title: string
  sub?: string
  tone?: ServiceTone
  highlight?: boolean
}

const TONE_STYLES: Record<ServiceTone, { badge: string; ring: string }> = {
  blue: { badge: 'bg-blue-50 text-blue-700', ring: 'hover:border-blue-300' },
  indigo: { badge: 'bg-indigo-50 text-indigo-700', ring: 'hover:border-indigo-300' },
  amber: { badge: 'bg-amber-50 text-amber-700', ring: 'hover:border-amber-300' },
  green: { badge: 'bg-emerald-50 text-emerald-700', ring: 'hover:border-emerald-300' },
  purple: { badge: 'bg-purple-50 text-purple-700', ring: 'hover:border-purple-300' },
  teal: { badge: 'bg-teal-50 text-teal-700', ring: 'hover:border-teal-300' },
}

export function ServiceCard({
  to,
  icon,
  title,
  sub,
  tone = 'blue',
  highlight = false,
}: ServiceCardProps) {
  const { t } = useLang()
  const href = to.startsWith('#') ? to : `#${to.startsWith('/') ? to : `/${to}`}`
  const style = TONE_STYLES[tone]

  return (
    <a
      href={href}
      className={`group flex flex-col justify-between gap-3 rounded-2xl border bg-white p-4 shadow-xs transition-all active:scale-[0.98] ${
        highlight
          ? 'border-[#1B3B73]/30 ring-1 ring-[#1B3B73]/10 hover:border-[#1B3B73]'
          : `border-slate-200 ${style.ring}`
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${style.badge}`}>
          <Icon name={icon} size={22} />
        </span>
        {highlight && (
          <span className="rounded-full bg-[#1B3B73]/10 px-2 py-0.5 text-[10px] font-bold tracking-wide text-[#1B3B73]">
            {t('home.quick_badge')}
          </span>
        )}
      </div>

      <div className="space-y-0.5">
        <div className="text-[15px] font-bold leading-snug text-ink group-hover:text-[#1B3B73]">
          {title}
        </div>
        {sub && <p className="line-clamp-2 text-[12px] leading-snug text-muted">{sub}</p>}
      </div>
    </a>
  )
}
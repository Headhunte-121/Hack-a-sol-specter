import { useLang } from '../../shell/i18n'
import type { LayoutProps } from '../../shell/Layout'
import { useOnlineStatus } from '../../shell/online'
import { Icon } from '../../shell/ui'
import { goBack } from '../shared/goBack'
import { LangPill } from '../shared/LanguageSwitch'
import { BottomNav } from './BottomNav'

export function MobileLayout({ children, back = true, onBack, title, lead, backTo = '#/' }: LayoutProps) {
  const { t } = useLang()
  const online = useOnlineStatus()
  const showBack = back || Boolean(onBack)

  return (
    <div className="min-h-dvh bg-[#F5F7FA] text-ink">
      <header className="sticky top-0 z-30 bg-[#1B3B73] text-white shadow-xs">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between gap-2 px-4">
          <div className="flex min-w-0 items-center gap-2.5">
            {showBack ? (
              <button
                type="button"
                onClick={() => goBack(onBack, backTo)}
                aria-label={t('common.back')}
                className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white active:bg-white/20"
              >
                <Icon name="back" size={20} stroke={2.5} color="#fff" />
              </button>
            ) : (
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/15">
                <Icon name="shield" size={18} color="#fff" />
              </span>
            )}
            <span className="truncate text-[17px] font-bold tracking-tight">{title ?? 'Suraksha'}</span>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <LangPill inverted />
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                online ? 'bg-emerald-400/20 text-emerald-100' : 'bg-amber-400/25 text-amber-100'
              }`}
            >
              <span className={`size-1.5 rounded-full ${online ? 'bg-emerald-300' : 'bg-amber-300'}`} />
              {online ? t('status.online') : t('status.offline')}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-lg flex-col gap-4 px-4 pt-4 pb-24">
        {(title || lead) && (
          <div className="space-y-1">
            {title && <h1 className="text-[22px] font-bold leading-tight text-ink">{title}</h1>}
            {lead && <p className="text-[14px] text-muted">{lead}</p>}
          </div>
        )}
        {children}
      </main>

      <BottomNav />
    </div>
  )
}
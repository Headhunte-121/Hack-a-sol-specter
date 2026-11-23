import { ChevronLeft, ShieldCheck } from 'lucide-react'
import { useLang } from '../../shell/i18n'
import type { LayoutProps } from '../../shell/Layout'
import { useOnlineStatus } from '../../shell/online'
import { LangPill } from '../shared/LanguageSwitch'
import { BottomNav } from './BottomNav'

export function MobileLayout({ children, back = true, onBack, title, lead, backTo = '#/' }: LayoutProps) {
  const { t } = useLang()
  const online = useOnlineStatus()
  const showBack = back || Boolean(onBack)

  return (
    <div className="min-h-dvh bg-[#F3F6FA] text-slate-900">
      <header className="sticky top-0 z-30 bg-[#163264] text-white">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between gap-2 px-4">
          <div className="flex min-w-0 items-center gap-2.5">
            {showBack ? (
              onBack ? (
                <button
                  type="button"
                  onClick={onBack}
                  aria-label="Back"
                  className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white/12 text-white active:bg-white/20"
                >
                  <ChevronLeft className="size-5" />
                </button>
              ) : (
                <a
                  href={backTo}
                  aria-label="Back"
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/12 text-white active:bg-white/20"
                >
                  <ChevronLeft className="size-5" />
                </a>
              )
            ) : (
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/15">
                <ShieldCheck className="size-4.5 text-white" strokeWidth={2.25} />
              </span>
            )}
            <span className="truncate text-[17px] font-bold tracking-tight">Suraksha</span>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <LangPill inverted />
            <span
              className={`inline-flex h-8.5 items-center gap-1.5 rounded-full px-3 text-[12px] font-bold ring-1 ${
                online
                  ? 'bg-emerald-400/20 text-emerald-100 ring-emerald-300/25'
                  : 'bg-amber-400/25 text-amber-100 ring-amber-300/25'
              }`}
            >
              <span className={`size-2 shrink-0 rounded-full ${online ? 'bg-emerald-300' : 'bg-amber-300'}`} />
              <span className="translate-y-px leading-none">
                {online ? t('status.online') : t('status.offline')}
              </span>
            </span>
          </div>
        </div>
      </header>

      <main
        className={`mx-auto flex max-w-lg flex-col gap-4 px-4 pt-3 pb-28 ${
          showBack ? 'suraksha-page' : ''
        }`}
      >
        {(title || lead) && (
          <div className="space-y-0.5 px-0.5">
            {title && <h1 className="text-[19px] font-bold leading-tight text-slate-900">{title}</h1>}
            {lead && <p className="text-[13px] leading-snug text-slate-500">{lead}</p>}
          </div>
        )}
        {children}
      </main>

      <BottomNav />
    </div>
  )
}
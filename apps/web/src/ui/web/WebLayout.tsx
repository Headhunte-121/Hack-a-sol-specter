import type { ComponentProps } from 'react'
import { useLang } from '../../shell/i18n'
import type { LayoutProps } from '../../shell/Layout'
import { useOnlineStatus } from '../../shell/online'
import { Icon } from '../../shell/ui'
import { LangPill } from '../shared/LanguageSwitch'
import { useHashRoute } from '../shared/useViewport'

type IconName = ComponentProps<typeof Icon>['name']

export function WebLayout({ children, back = true, onBack, title, lead, backTo = '#/' }: LayoutProps) {
  const { t } = useLang()
  const online = useOnlineStatus()
  const hash = useHashRoute()
  const showBack = back || Boolean(onBack)

  const navItems: { href: string; icon: IconName; label: string }[] = [
    { href: '#/', icon: 'shield', label: 'Dashboard' },
    { href: '#/message', icon: 'message', label: t('tile.message') },
    { href: '#/call', icon: 'phone', label: t('tile.call') },
    { href: '#/qr', icon: 'qr', label: t('tile.qr') },
    { href: '#/report', icon: 'warn', label: t('tile.report') },
    { href: '#/learn', icon: 'book', label: t('tile.learn') },
    { href: '#/trends', icon: 'chart', label: t('tile.trends') },
    { href: '#/settings', icon: 'gear', label: t('settings.title') },
  ]

  const isActive = (href: string) =>
    href === '#/' ? hash === '' || hash === '#' || hash === '#/' : hash.startsWith(href)

  return (
    <div className="flex min-h-dvh bg-[#F5F7FA] text-ink">
      <aside className="sticky top-0 flex h-dvh w-64 shrink-0 flex-col justify-between border-r border-slate-200 bg-white p-4">
        <div className="space-y-6">
          <a href="#/" className="flex items-center gap-3 px-2 pt-1">
            <span className="flex size-10 items-center justify-center rounded-xl bg-[#1B3B73] text-white shadow-xs">
              <Icon name="shield" size={22} color="#fff" />
            </span>
            <div>
              <div className="text-[18px] font-extrabold leading-none text-[#1B3B73]">Suraksha</div>
              <div className="mt-0.5 text-[11px] font-semibold text-slate-500">Offline Cyber Shield</div>
            </div>
          </a>

          <nav aria-label="Sidebar navigation" className="space-y-1">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-semibold transition-colors ${
                  isActive(item.href)
                    ? 'bg-[#1B3B73] text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Icon name={item.icon} size={18} color={isActive(item.href) ? '#fff' : undefined} />
                <span className="truncate">{item.label}</span>
              </a>
            ))}
          </nav>
        </div>

        <div className="space-y-2 border-t border-slate-100 pt-4">
          <a
            href="#/during-call"
            className="flex items-center justify-between rounded-xl bg-red-600 px-3.5 py-2.5 text-[13px] font-bold text-white shadow-xs transition-colors hover:bg-red-700"
          >
            <span className="flex items-center gap-2">
              <Icon name="warn" size={16} color="#fff" />
              SOS Call Help
            </span>
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px]">SOS</span>
          </a>

          <a
            href="tel:1930"
            className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[13px] font-bold text-ink hover:border-[#1B3B73]"
          >
            <span>Cyber Helpline</span>
            <span className="rounded-md bg-[#1B3B73] px-2 py-0.5 text-[12px] text-white">1930</span>
          </a>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-8 backdrop-blur-md">
          <div className="flex items-center gap-3">
            {showBack &&
              (onBack ? (
                <button
                  type="button"
                  onClick={onBack}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[13px] font-semibold text-slate-600 hover:bg-slate-50"
                >
                  ‹ Back
                </button>
              ) : (
                <a
                  href={backTo}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[13px] font-semibold text-slate-600 hover:bg-slate-50"
                >
                  ‹ Back
                </a>
              ))}
            <h2 className="text-[18px] font-bold text-ink">{title ?? 'Overview'}</h2>
          </div>

          <div className="flex items-center gap-2.5">
            <LangPill />
            <span
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[12px] font-bold ${
                online ? 'bg-ok-bg text-ok' : 'bg-warn-bg text-warn'
              }`}
            >
              <span className={`size-2 rounded-full ${online ? 'bg-ok-line' : 'bg-warn-line'}`} />
              {online ? t('status.online') : t('status.offline')}
            </span>
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-8">
          {(title || lead) && (
            <div className="space-y-1">
              {title && <h1 className="text-[26px] font-bold leading-tight text-ink">{title}</h1>}
              {lead && <p className="text-[15px] text-muted">{lead}</p>}
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  )
}
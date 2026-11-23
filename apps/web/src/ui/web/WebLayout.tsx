import {
  AlertTriangle,
  BookOpen,
  ChevronLeft,
  Home,
  MessageSquareText,
  PanelLeftClose,
  PanelLeftOpen,
  PhoneCall,
  QrCode,
  Settings,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import { useLang } from '../../shell/i18n'
import type { LayoutProps } from '../../shell/Layout'
import { useOnlineStatus } from '../../shell/online'
import { useDemoMode } from '../shared/DemoModeCard'
import { LangPill } from '../shared/LanguageSwitch'
import { getUiLabels } from '../shared/uiLabels'
import { useHashRoute } from '../shared/useViewport'

interface NavItem {
  href: string
  icon: LucideIcon
  label: string
  group: 'protect' | 'support'
}

export function WebLayout({ children, back = true, onBack, title, lead, backTo = '#/' }: LayoutProps) {
  const { lang, t } = useLang()
  const ui = getUiLabels(lang)
  const online = useOnlineStatus()
  const { demoMode } = useDemoMode()
  const hash = useHashRoute()
  const showBack = back || Boolean(onBack)
  const isWideDashboard = !back && !onBack
  const isTrends = hash.startsWith('#/trends')

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('suraksha_sidebar_collapsed') === '1'
    } catch {
      return false
    }
  })

  const toggleSidebar = () => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem('suraksha_sidebar_collapsed', next ? '1' : '0')
      } catch {
        // ignore storage errors
      }
      return next
    })
  }

  const navItems: NavItem[] = [
    { href: '#/', icon: Home, label: ui.home, group: 'protect' },
    { href: '#/message', icon: MessageSquareText, label: t('tile.message'), group: 'protect' },
    { href: '#/call', icon: PhoneCall, label: t('tile.call'), group: 'protect' },
    { href: '#/qr', icon: QrCode, label: t('tile.qr'), group: 'protect' },
    { href: '#/report', icon: ShieldAlert, label: t('tile.report'), group: 'support' },
    { href: '#/learn', icon: BookOpen, label: t('tile.learn'), group: 'support' },
    { href: '#/trends', icon: TrendingUp, label: t('tile.trends'), group: 'support' },
    { href: '#/settings', icon: Settings, label: t('settings.title'), group: 'support' },
  ]

  const isActive = (href: string) =>
    href === '#/' ? hash === '' || hash === '#' || hash === '#/' : hash.startsWith(href)

  const renderNavLink = (item: NavItem) => {
    const active = isActive(item.href)
    const IconComp = item.icon

    return (
      <a
        key={item.href}
        href={item.href}
        title={collapsed ? item.label : undefined}
        className={`group relative flex items-center rounded-xl transition-all duration-150 ${
          collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5'
        } ${
          active
            ? 'bg-linear-to-r from-[#1B3B73] to-[#274F96] font-semibold text-white shadow-xs shadow-blue-950/20'
            : 'font-medium text-slate-600 hover:bg-slate-100/90 hover:text-slate-900'
        }`}
      >
        <IconComp
          className={`size-4.5 shrink-0 transition-transform duration-150 ${
            active ? 'text-white' : 'text-slate-500 group-hover:scale-105 group-hover:text-[#1B3B73]'
          }`}
          strokeWidth={active ? 2.2 : 1.9}
        />
        {!collapsed && <span className="truncate text-[13.5px] leading-snug">{item.label}</span>}
      </a>
    )
  }

  const contentWidthClass = isWideDashboard
    ? 'max-w-6xl'
    : isTrends
      ? 'max-w-4xl suraksha-page'
      : 'max-w-2xl suraksha-page'

  return (
    <div className="flex min-h-dvh bg-[#F3F6FA] text-slate-900">
      <aside
        className={`sticky top-0 z-30 flex h-dvh shrink-0 flex-col justify-between border-r border-slate-200/80 bg-white shadow-[4px_0_24px_-12px_rgba(15,23,42,0.1)] transition-[width] duration-200 ease-out ${
          collapsed ? 'w-19 p-2.5' : 'w-64 p-3.5'
        }`}
      >
        <div className="space-y-4">
          <div className={`flex items-center ${collapsed ? 'flex-col gap-2.5 pt-1' : 'justify-between gap-2 px-1 pt-1'}`}>
            <a href="#/" className="flex items-center gap-2.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-[#1B3B73] to-[#2B58A8] text-white shadow-xs">
                <ShieldCheck className="size-5" strokeWidth={2.2} />
              </span>
              {!collapsed && (
                <div>
                  <div className="text-[17px] font-extrabold leading-none tracking-tight text-[#1B3B73]">
                    Suraksha
                  </div>
                  <div className="mt-0.5 text-[11px] font-medium text-slate-400">{ui.tagline}</div>
                </div>
              )}
            </a>

            <button
              type="button"
              onClick={toggleSidebar}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="flex size-7.5 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-slate-200/80 bg-slate-50 text-slate-500 transition-colors hover:border-slate-300 hover:bg-white hover:text-[#1B3B73]"
            >
              {collapsed ? <PanelLeftOpen className="size-3.5" /> : <PanelLeftClose className="size-3.5" />}
            </button>
          </div>

          <nav aria-label="Sidebar navigation" className="space-y-3">
            <div className="space-y-1">
              {!collapsed && (
                <div className="px-3 pb-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  {ui.groupTools}
                </div>
              )}
              {navItems.filter((i) => i.group === 'protect').map(renderNavLink)}
            </div>

            <div className="space-y-1 border-t border-slate-100 pt-2.5">
              {!collapsed && (
                <div className="px-3 pb-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  {ui.groupHelp}
                </div>
              )}
              {navItems.filter((i) => i.group === 'support').map(renderNavLink)}
            </div>
          </nav>
        </div>

        <div className="space-y-2 border-t border-slate-100 pt-3">
          <a
            href="#/during-call"
            title={collapsed ? ui.sosSidebarLabel : undefined}
            className={`flex h-10 items-center rounded-xl bg-linear-to-r from-red-600 to-rose-600 text-white shadow-xs transition-all hover:brightness-105 active:scale-[0.98] ${
              collapsed ? 'justify-center' : 'justify-between gap-2 px-3'
            }`}
          >
            <span className="flex min-w-0 items-center gap-2 text-[13px] font-bold">
              <AlertTriangle className="size-4 shrink-0" strokeWidth={2.3} />
              {!collapsed && <span className="truncate">{ui.sosSidebarLabel}</span>}
            </span>
            {!collapsed && (
              <span className="shrink-0 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-extrabold tracking-wider">
                SOS
              </span>
            )}
          </a>

          <a
            href="tel:1930"
            title={collapsed ? `${ui.helplineLabel} 1930` : undefined}
            className={`flex h-10 items-center rounded-xl border border-slate-200/90 bg-slate-50/80 text-slate-800 transition-colors hover:border-[#1B3B73]/40 hover:bg-white ${
              collapsed ? 'justify-center' : 'justify-between gap-2 px-3'
            }`}
          >
            {collapsed ? (
              <span className="text-[11.5px] font-extrabold text-[#1B3B73]">1930</span>
            ) : (
              <>
                <span className="truncate text-[13px] font-semibold text-slate-700">{ui.helplineLabel}</span>
                <span className="shrink-0 rounded-md bg-[#1B3B73] px-2 py-0.5 text-[11px] font-extrabold text-white">
                  1930
                </span>
              </>
            )}
          </a>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-200/80 bg-white/85 px-7 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            {showBack ? (
              onBack ? (
                <button
                  type="button"
                  onClick={onBack}
                  className="inline-flex h-8.5 cursor-pointer items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 text-[13px] font-semibold text-slate-600 shadow-2xs transition hover:bg-slate-50"
                >
                  <ChevronLeft className="size-4" />
                  {ui.back}
                </button>
              ) : (
                <a
                  href={backTo}
                  className="inline-flex h-8.5 items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 text-[13px] font-semibold text-slate-600 shadow-2xs transition hover:bg-slate-50"
                >
                  <ChevronLeft className="size-4" />
                  {ui.back}
                </a>
              )
            ) : (
              <span className="text-[16px] font-bold tracking-tight text-slate-900">{ui.home}</span>
            )}
            {showBack && title && <span className="text-[13px] font-medium text-slate-400">/ {title}</span>}
          </div>

          <div className="flex items-center gap-2">
            {demoMode && (
              <a
                href="#/settings"
                className="inline-flex h-8.5 items-center rounded-full bg-indigo-50 px-3 text-[12px] font-bold text-indigo-700 ring-1 ring-indigo-600/20 hover:bg-indigo-100"
              >
                Demo mode
              </a>
            )}
            <LangPill />
            <span
              className={`inline-flex h-8.5 items-center gap-1.5 rounded-full px-3 text-[12px] font-bold ring-1 ${
                online
                  ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                  : 'bg-amber-50 text-amber-700 ring-amber-600/20'
              }`}
            >
              <span className={`size-2 rounded-full ${online ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              {online ? t('status.online') : t('status.offline')}
            </span>
          </div>
        </header>

        <main className={`mx-auto flex w-full flex-1 flex-col gap-4 px-7 py-6 ${contentWidthClass}`}>
          {(title || lead) && (
            <div className="space-y-1 pb-0.5">
              {title && <h1 className="text-[22px] font-bold leading-tight tracking-tight text-slate-900">{title}</h1>}
              {lead && <p className="text-[14px] leading-relaxed text-slate-500">{lead}</p>}
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  )
}
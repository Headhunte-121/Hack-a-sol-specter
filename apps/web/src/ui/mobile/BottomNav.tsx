import { AlertTriangle, BookOpen, Home, MessageSquareText, Settings } from 'lucide-react'
import { useLang } from '../../shell/i18n'
import { getUiLabels } from '../shared/uiLabels'
import { useHashRoute } from '../shared/useViewport'

export function BottomNav() {
  const { lang, t } = useLang()
  const ui = getUiLabels(lang)
  const hash = useHashRoute()

  const isActive = (path: string) =>
    path === '#/' ? hash === '' || hash === '#' || hash === '#/' : hash.startsWith(path)

  const linkCls = (path: string) =>
    `flex flex-col items-center justify-center gap-0.5 py-1 text-[10.5px] font-semibold transition-colors ${
      isActive(path) ? 'text-[#1B3B73]' : 'text-slate-400 hover:text-slate-600'
    }`

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/90 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_-8px_rgba(15,23,42,0.1)] backdrop-blur-md"
    >
      <div className="mx-auto grid max-w-lg grid-cols-5 items-end px-2 pt-1 pb-1">
        <a href="#/" className={linkCls('#/')}>
          <Home className="size-4.5" strokeWidth={isActive('#/') ? 2.4 : 2} />
          <span>{ui.home}</span>
        </a>

        <a href="#/message" className={linkCls('#/message')}>
          <MessageSquareText className="size-4.5" strokeWidth={isActive('#/message') ? 2.4 : 2} />
          <span>{ui.check}</span>
        </a>

        <a href="#/during-call" className="-mt-5 flex flex-col items-center" aria-label={t('home.duringcall.title')}>
          <span className="flex size-12.5 items-center justify-center rounded-full border-4 border-white bg-linear-to-br from-red-600 to-rose-600 text-white shadow-lg shadow-red-600/30 transition-transform active:scale-95">
            <AlertTriangle className="size-5.5" strokeWidth={2.4} />
          </span>
          <span className="mt-0.5 text-[10.5px] font-extrabold text-red-600">SOS</span>
        </a>

        <a href="#/learn" className={linkCls('#/learn')}>
          <BookOpen className="size-4.5" strokeWidth={isActive('#/learn') ? 2.4 : 2} />
          <span>{ui.learn}</span>
        </a>

        <a href="#/settings" className={linkCls('#/settings')}>
          <Settings className="size-4.5" strokeWidth={isActive('#/settings') ? 2.4 : 2} />
          <span>{ui.settings}</span>
        </a>
      </div>
    </nav>
  )
}
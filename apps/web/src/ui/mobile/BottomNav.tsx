import { useLang } from '../../shell/i18n'
import { Icon } from '../../shell/ui'
import { useHashRoute } from '../shared/useViewport'

export function BottomNav() {
  const { t } = useLang()
  const hash = useHashRoute()

  const isActive = (path: string) =>
    path === '#/' ? hash === '' || hash === '#' || hash === '#/' : hash.startsWith(path)

  const linkCls = (path: string) =>
    `flex flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] font-semibold transition-colors ${
      isActive(path) ? 'text-[#1B3B73]' : 'text-slate-500'
    }`

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md"
    >
      <div className="mx-auto grid max-w-lg grid-cols-5 items-end px-2 pt-1 pb-1.5">
        <a href="#/" className={linkCls('#/')}>
          <Icon name="shield" size={20} />
          <span>Home</span>
        </a>

        <a href="#/message" className={linkCls('#/message')}>
          <Icon name="message" size={20} />
          <span>Check</span>
        </a>

        <a href="#/during-call" className="-mt-6 flex flex-col items-center" aria-label={t('home.duringcall.title')}>
          <span className="flex size-14 items-center justify-center rounded-full border-4 border-white bg-red-600 text-[13px] font-extrabold tracking-wide text-white shadow-lg active:scale-95">
            SOS
          </span>
          <span className="mt-0.5 text-[11px] font-bold text-red-600">SOS</span>
        </a>

        <a href="#/learn" className={linkCls('#/learn')}>
          <Icon name="book" size={20} />
          <span>Learn</span>
        </a>

        <a href="#/settings" className={linkCls('#/settings')}>
          <Icon name="gear" size={20} />
          <span>{t('settings.title')}</span>
        </a>
      </div>
    </nav>
  )
}
import { useEffect, useState } from 'react'
import { AlertsFeed } from '../dashboard/AlertsFeed'
import { useLang } from './i18n'
import { LangPill, Layout } from './Layout'
import { useOnlineStatus } from './online'
import { applyUpdate, dismissUpdate, promptInstall, usePwaState } from './pwa'
import { subscribeQueue } from './queue'
import { Banner, Icon, type IconName } from './ui'

const MAIN: { to: string; icon: IconName; key: string; primary?: boolean }[] = [
  { to: '/message', icon: 'message', key: 'tile.message', primary: true },
  { to: '/call', icon: 'phone', key: 'tile.call' },
  { to: '/report', icon: 'shield', key: 'tile.report' },
  { to: '/learn', icon: 'book', key: 'tile.learn' },
]
const MORE: { to: string; icon: IconName; key: string }[] = [
  { to: '/qr', icon: 'qr', key: 'tile.qr' },
  { to: '/trends', icon: 'chart', key: 'tile.trends' },
  { to: '/settings', icon: 'gear', key: 'settings.title' },
]

export function Home() {
  const { t } = useLang()
  const online = useOnlineStatus()
  const pwa = usePwaState()
  const [pending, setPending] = useState(0)
  const [updateBlocked, setUpdateBlocked] = useState(false)
  useEffect(() => subscribeQueue(setPending), [])

  return (
    <Layout back={false}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[34px] font-bold leading-[1.3]">{t('home.greeting')}</div>
          <div className="text-[20px] leading-snug text-muted">{t('home.ask')}</div>
        </div>
        <LangPill />
      </div>

      <div role="status" data-testid="offline-status" data-state={pwa.offline}>
        {pwa.offline === 'ready' ? (
          <Banner tone="ok"><span className="flex items-center gap-2.5 text-[18px] font-bold"><Icon name="check" size={24} stroke={2.5} />{t('home.offline_ok')}<span className="ml-auto text-[15px] font-normal">{online ? t('status.online') : t('status.offline')}</span></span></Banner>
        ) : pwa.offline === 'partial' ? (
          <Banner tone="warn"><span className="text-[18px] font-bold">{t('status.partial')}</span></Banner>
        ) : (
          <Banner tone="info"><span className="text-[18px] font-bold">{t('status.notready')}</span></Banner>
        )}
      </div>
      {pending > 0 && <Banner tone="info">⏳ {t('status.pending', { count: pending })}</Banner>}
      {pwa.storageFull && <Banner tone="bad">{t('storage.full')}</Banner>}

      {pwa.needRefresh && (
        <div className="card space-y-2 !border-brand">
          <p className="font-bold">{t('update.ready')}</p>
          {updateBlocked && <p className="text-sm text-muted">…</p>}
          <div className="flex gap-2">
            <button className="btn btn-primary flex-1" onClick={async () => setUpdateBlocked(!(await applyUpdate()))}>{t('update.refresh')}</button>
            <button className="btn btn-secondary flex-1" onClick={dismissUpdate}>{t('update.later')}</button>
          </div>
        </div>
      )}

      <a href="#/during-call" className="flex min-h-[92px] items-center gap-3.5 rounded-2xl border-2 border-warn-line bg-warn-bg px-4 py-3 text-warn">
        <Icon name="warn" size={40} />
        <div>
          <div className="text-[22px] font-bold leading-snug">{t('home.duringcall.title')}</div>
          <div className="text-[18px] leading-snug">{t('home.duringcall.sub')}</div>
        </div>
      </a>

      <AlertsFeed />

      <nav aria-label="modules" className="flex flex-col gap-3">
        {MAIN.map((x) => (
          <a key={x.to} href={`#${x.to}`} className={`flex min-h-[92px] items-center gap-4 rounded-2xl border-2 px-4 py-3 ${x.primary ? 'border-brand bg-brand text-white' : 'border-line bg-white text-ink'}`}>
            <span className={`flex size-14 flex-none items-center justify-center rounded-full ${x.primary ? 'bg-white text-brand' : 'bg-soft text-brand'}`}><Icon name={x.icon} size={30} /></span>
            <span>
              <span className="block text-[24px] font-bold leading-snug">{t(x.key)}</span>
              <span className={`block text-[16px] leading-snug ${x.primary ? 'text-[#dce6ff]' : 'text-muted'}`}>{t(`${x.key}.sub`)}</span>
            </span>
          </a>
        ))}
      </nav>

      <div>
        <div className="mb-1.5 text-[16px] font-bold text-muted">{t('home.more')}</div>
        <div className="grid grid-cols-3 gap-2">
          {MORE.map((x) => (
            <a key={x.to} href={`#${x.to}`} className="flex min-h-[84px] flex-col items-center justify-center gap-1 rounded-2xl border-2 border-line bg-white px-1 py-2 text-center text-[16px] font-bold leading-tight text-ink">
              <Icon name={x.icon} size={26} color="#1747c4" />
              {t(x.key)}
            </a>
          ))}
        </div>
      </div>

      {pwa.installEvent && !pwa.installed && (
        <div className="card space-y-2">
          <p className="text-[16px] text-muted">{t('install.benefit')}</p>
          <button className="btn btn-secondary w-full" onClick={() => void promptInstall()}>{t('install.button')}</button>
        </div>
      )}

      <a href="tel:1930" className="mt-auto flex min-h-[72px] items-center justify-center gap-3.5 rounded-2xl bg-ink px-4 py-2 text-white">
        <Icon name="phone" size={30} color="#fff" />
        <span>
          <span className="block text-[22px] font-bold leading-tight">{t('home.call1930')}</span>
          <span className="block text-[16px] leading-tight text-[#dce6ff]">{t('home.call1930.sub')}</span>
        </span>
      </a>
    </Layout>
  )
}

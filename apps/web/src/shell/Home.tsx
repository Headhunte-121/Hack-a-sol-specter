import { useEffect, useState } from 'react'
import { useLang } from './i18n'
import { Layout } from './Layout'
import { useOnlineStatus } from './online'
import { applyUpdate, dismissUpdate, promptInstall, usePwaState } from './pwa'
import { subscribeQueue } from './queue'
import { AlertsFeed } from '../dashboard/AlertsFeed'

const TILES = [
  { to: '/message', icon: '💬', key: 'tile.message' },
  { to: '/call', icon: '📞', key: 'tile.call' },
  { to: '/report', icon: '🚨', key: 'tile.report' },
  { to: '/learn', icon: '🎓', key: 'tile.learn' },
  { to: '/trends', icon: '📊', key: 'tile.trends' },
  { to: '/qr', icon: '🔳', key: 'tile.qr' },
]

export function Home() {
  const { t } = useLang()
  const online = useOnlineStatus()
  const pwa = usePwaState()
  const [pending, setPending] = useState(0)
  const [updateBlocked, setUpdateBlocked] = useState(false)
  useEffect(() => subscribeQueue(setPending), [])

  const status =
    pwa.offline === 'ready'
      ? { color: 'bg-green-100 text-green-900 border-green-600', dot: '🟢', text: t('status.ready') }
      : pwa.offline === 'partial'
        ? { color: 'bg-amber-100 text-amber-900 border-amber-600', dot: '🟠', text: t('status.partial') }
        : { color: 'bg-red-100 text-red-900 border-red-600', dot: '🔴', text: t('status.notready') }

  return (
    <Layout back={false}>
      <p className="text-lg font-semibold">{t('home.tagline')}</p>

      <div role="status" className={`rounded-xl border-2 p-3 ${status.color}`} data-testid="offline-status">
        {status.dot} {status.text}
        <span className="ml-2 whitespace-nowrap font-bold">· {online ? t('status.online') : t('status.offline')}</span>
      </div>
      {pending > 0 && <div className="rounded-xl border-2 border-blue-600 bg-blue-50 p-3 text-blue-900">⏳ {t('status.pending', { count: pending })}</div>}
      {pwa.storageFull && <div className="rounded-xl border-2 border-red-600 bg-red-50 p-3 text-red-900">⚠️ {t('storage.full')}</div>}

      {pwa.needRefresh && (
        <div className="card space-y-2 border-teal-700">
          <p className="font-bold">{t('update.ready')}</p>
          {updateBlocked && <p className="text-sm text-slate-600">…</p>}
          <div className="flex gap-2">
            <button className="btn btn-primary flex-1" onClick={async () => setUpdateBlocked(!(await applyUpdate()))}>
              {t('update.refresh')}
            </button>
            <button className="btn btn-secondary flex-1" onClick={dismissUpdate}>
              {t('update.later')}
            </button>
          </div>
        </div>
      )}

      <AlertsFeed />

      <nav aria-label="modules" className="grid grid-cols-2 gap-3">
        {TILES.map((x) => (
          <a key={x.to} href={`#${x.to}`} className="card flex min-h-32 flex-col items-center justify-center gap-2 text-center font-bold shadow-sm active:bg-slate-100">
            <span className="text-4xl" aria-hidden>
              {x.icon}
            </span>
            <span>{t(x.key)}</span>
          </a>
        ))}
      </nav>

      <a href="#/during-call" className="btn btn-danger w-full">
        ☎️ {t('tile.duringcall')}
      </a>

      {pwa.installEvent && !pwa.installed && (
        <div className="card space-y-2">
          <p className="text-sm text-slate-700">{t('install.benefit')}</p>
          <button className="btn btn-primary w-full" onClick={() => void promptInstall()}>
            ⬇️ {t('install.button')}
          </button>
        </div>
      )}
    </Layout>
  )
}

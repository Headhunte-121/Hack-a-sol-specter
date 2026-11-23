import { useState } from 'react'
import { DemoModeCard } from '../ui/shared/DemoModeCard'
import { hasConsent, setConsent } from './consent'
import { useLang } from './i18n'
import { LanguageSwitch, Layout } from './Layout'
import { applyUpdate, usePwaState } from './pwa'
import { clearQueue } from './queue'
import { kvClearAll } from './storage'
import { Icon } from './ui'

export async function clearLocalData(): Promise<void> {
  kvClearAll()
  await clearQueue().catch(() => {})
  try {
    sessionStorage.clear()
  } catch {
    /* ignore */
  }
  try {
    for (const k of await caches.keys()) if (!k.startsWith('workbox-precache')) await caches.delete(k)
  } catch {
    /* ignore */
  }
}

export function appVersion(): string {
  const src =
    (document.querySelector('script[type="module"][src*="/assets/index-"]') as HTMLScriptElement | null)?.src ?? ''
  return src.match(/index-([\w-]+)\.js/)?.[1] ?? 'dev'
}

export function Settings() {
  const { t } = useLang()
  const pwa = usePwaState()
  const [share, setShare] = useState(hasConsent())
  const [done, setDone] = useState(false)

  return (
    <Layout title={t('settings.title')}>
      <section className="card space-y-2.5">
        <h2 className="text-[15.5px] font-bold text-slate-900">{t('common.language')}</h2>
        <LanguageSwitch />
      </section>

      <DemoModeCard />

      <section className="card space-y-2.5">
        <h2 className="text-[15.5px] font-bold text-slate-900">{t('privacy.consent.title')}</h2>
        <p className="text-[13px] leading-relaxed text-slate-600">{t('privacy.consent.body')}</p>
        <div className="grid grid-cols-1 gap-2 pt-0.5 sm:grid-cols-2">
          <button
            className={`btn min-h-10.5! text-[13.5px]! ${share ? 'btn-primary' : 'btn-secondary'}`}
            aria-pressed={share}
            onClick={() => {
              setConsent(true)
              setShare(true)
            }}
          >
            {t('privacy.consent.on')}
          </button>
          <button
            className={`btn min-h-10.5! text-[13.5px]! ${!share ? 'btn-primary' : 'btn-secondary'}`}
            aria-pressed={!share}
            onClick={() => {
              setConsent(false)
              setShare(false)
            }}
          >
            {t('privacy.consent.off')}
          </button>
        </div>
      </section>

      <section className="card space-y-2.5">
        <button
          className="btn btn-danger min-h-10.5! w-full text-[13.5px]!"
          onClick={async () => {
            if (window.confirm(t('settings.clear.confirm'))) {
              await clearLocalData()
              setShare(false)
              setDone(true)
            }
          }}
        >
          <Icon name="trash" size={16} color="#fff" />
          {t('settings.clear')}
        </button>
        {done && (
          <p role="status" className="text-[13px] font-bold text-ok">
            {t('settings.cleared')}
          </p>
        )}
      </section>

      <section className="card space-y-2" data-testid="app-version">
        <p className="text-[13px] text-slate-500">
          {t('settings.version')}: <span className="font-mono">{appVersion()}</span>
        </p>
        {pwa.needRefresh && (
          <>
            <p className="text-[13.5px] font-bold">{t('update.ready')}</p>
            <button className="btn btn-primary min-h-10.5! w-full text-[13.5px]!" onClick={() => void applyUpdate()}>
              {t('update.refresh')}
            </button>
          </>
        )}
      </section>
    </Layout>
  )
}
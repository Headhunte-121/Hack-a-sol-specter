import { useState } from 'react'
import { useLang } from './i18n'
import { Layout, LanguageSwitch } from './Layout'
import { Icon } from './ui'
import { hasConsent, setConsent } from './consent'
import { useDemoMode } from './demoMode'
import { applyUpdate, usePwaState } from './pwa'
import { clearQueue } from './queue'
import { kvClearAll } from './storage'

/** clearLocalData: remove history, progress, queued reports and saved copies, after confirmation. The app's own files
 *  (the offline copy of the app, model and lessons) hold no user data and are kept, so the app still opens without internet. */
export async function clearLocalData(): Promise<void> {
  kvClearAll()
  await clearQueue().catch(() => {})
  try { sessionStorage.clear() } catch { /* ignore */ }
  try {
    for (const k of await caches.keys()) if (!k.startsWith('workbox-precache')) await caches.delete(k)
  } catch {
    /* ignore */
  }
}

/** appVersion: the build's fingerprint (the main script's file name changes with every new build), so a phone can be checked
 *  against the live site. */
export function appVersion(): string {
  const src = (document.querySelector('script[type="module"][src*="/assets/index-"]') as HTMLScriptElement | null)?.src ?? ''
  return src.match(/index-([\w-]+)\.js/)?.[1] ?? 'dev'
}

export function Settings() {
  const { t } = useLang()
  const pwa = usePwaState()
  const [share, setShare] = useState(hasConsent())
  const [demo, setDemo] = useDemoMode()
  const [done, setDone] = useState(false)
  return (
    <Layout title={t('settings.title')}>
      <section className="card space-y-3">
        <h2 className="text-[20px] font-bold">{t('common.language')}</h2>
        <LanguageSwitch />
      </section>
      <section className="card space-y-3">
        <h2 className="text-[20px] font-bold">{t('settings.demo.title')}</h2>
        <p className="text-[17px] leading-snug text-muted">{t('settings.demo.body')}</p>
        <div className="flex gap-2">
          <button
            className={`btn flex-1 !text-[18px] ${demo ? 'btn-primary' : 'btn-secondary'}`}
            aria-pressed={demo}
            onClick={() => setDemo(true)}
          >
            {t('settings.demo.on')}
          </button>
          <button
            className={`btn flex-1 !text-[18px] ${!demo ? 'btn-primary' : 'btn-secondary'}`}
            aria-pressed={!demo}
            onClick={() => setDemo(false)}
          >
            {t('settings.demo.off')}
          </button>
        </div>
      </section>
      <section className="card space-y-3">
        <h2 className="text-[20px] font-bold">{t('privacy.consent.title')}</h2>
        <p className="text-[17px] leading-snug text-muted">{t('privacy.consent.body')}</p>
        <div className="flex gap-2">
          <button className={`btn flex-1 ${share ? 'btn-primary' : 'btn-secondary'}`} aria-pressed={share} onClick={() => { setConsent(true); setShare(true) }}>
            {t('privacy.consent.on')}
          </button>
          <button className={`btn flex-1 ${!share ? 'btn-primary' : 'btn-secondary'}`} aria-pressed={!share} onClick={() => { setConsent(false); setShare(false) }}>
            {t('privacy.consent.off')}
          </button>
        </div>
      </section>
      <section className="card space-y-3">
        <button
          className="btn btn-danger w-full !text-[19px]"
          onClick={async () => {
            if (window.confirm(t('settings.clear.confirm'))) {
              await clearLocalData()
              setShare(false)
              setDone(true)
            }
          }}
        >
          <Icon name="trash" size={24} color="#fff" />{t('settings.clear')}
        </button>
        {done && <p role="status" className="font-bold text-ok">{t('settings.cleared')}</p>}
      </section>
      <section className="card space-y-2" data-testid="app-version">
        <p className="text-[16px] text-muted">{t('settings.version')}: <span className="font-mono">{appVersion()}</span></p>
        {pwa.needRefresh && (
          <>
            <p className="font-bold">{t('update.ready')}</p>
            <button className="btn btn-primary w-full" onClick={() => void applyUpdate()}>{t('update.refresh')}</button>
          </>
        )}
      </section>
    </Layout>
  )
}

import { useState } from 'react'
import { useLang } from './i18n'
import { Layout, LanguageSwitch } from './Layout'
import { Icon } from './ui'
import { hasConsent, setConsent } from './consent'
import { clearQueue } from './queue'
import { kvClearAll } from './storage'

/** clearLocalData: remove history, progress, queued reports and caches, after confirmation. */
export async function clearLocalData(): Promise<void> {
  kvClearAll()
  await clearQueue().catch(() => {})
  try {
    for (const k of await caches.keys()) await caches.delete(k)
    for (const r of (await navigator.serviceWorker?.getRegistrations()) ?? []) await r.unregister()
  } catch {
    /* ignore */
  }
}

export function Settings() {
  const { t } = useLang()
  const [share, setShare] = useState(hasConsent())
  const [done, setDone] = useState(false)
  return (
    <Layout title={t('settings.title')}>
      <section className="card space-y-3">
        <h2 className="text-[20px] font-bold">{t('common.language')}</h2>
        <LanguageSwitch />
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
    </Layout>
  )
}

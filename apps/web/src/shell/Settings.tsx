import { useEffect, useState } from 'react'
import { asrBase, healthCheck } from '../call/asr'
import { apiBase } from '../dashboard/api'
import { DemoModeCard } from '../ui/shared/DemoModeCard'
import { hasConsent, setConsent } from './consent'
import { useLang } from './i18n'
import { LanguageSwitch, Layout } from './Layout'
import { applyUpdate, forceUpdateApp, usePwaState } from './pwa'
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

interface ServerProbe {
  status: 'not_configured' | 'checking' | 'online' | 'offline'
  detail?: string
}

export function Settings() {
  const { t } = useLang()
  const pwa = usePwaState()
  const [share, setShare] = useState(hasConsent())
  const [done, setDone] = useState(false)
  const [apiStatus, setApiStatus] = useState<ServerProbe>(() => ({
    status: apiBase() ? 'checking' : 'not_configured',
  }))
  const [speechStatus, setSpeechStatus] = useState<ServerProbe>(() => ({
    status: asrBase() ? 'checking' : 'not_configured',
  }))

  useEffect(() => {
    let live = true
    const aBase = apiBase()
    if (aBase) {
      const ctl = new AbortController()
      const timer = setTimeout(() => ctl.abort(), 8000)
      fetch(`${aBase}/health`, { signal: ctl.signal, cache: 'no-store' })
        .then((r) => {
          clearTimeout(timer)
          if (!r.ok) throw new Error()
          return r.json() as Promise<{ version?: string; status?: string }>
        })
        .then((j) => {
          if (!live) return
          setApiStatus({ status: 'online', detail: j.version ? `v${j.version}` : undefined })
        })
        .catch(() => {
          if (!live) return
          setApiStatus({ status: 'offline' })
        })
    } else {
      setApiStatus({ status: 'not_configured' })
    }

    const sBase = asrBase()
    if (sBase) {
      healthCheck(4000)
        .then((h) => {
          if (!live) return
          if (h.ok) {
            const m = [h.model, h.hindi_model].filter(Boolean).join(' / ')
            setSpeechStatus({ status: 'online', detail: m || undefined })
          } else {
            setSpeechStatus({ status: 'offline' })
          }
        })
        .catch(() => {
          if (!live) return
          setSpeechStatus({ status: 'offline' })
        })
    } else {
      setSpeechStatus({ status: 'not_configured' })
    }

    return () => {
      live = false
    }
  }, [])

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

      <section className="card space-y-3" data-testid="server-status">
        <h2 className="text-[15.5px] font-bold text-slate-900">{t('settings.server_status.title')}</h2>
        <div className="space-y-2 text-[13.5px]">
          <div className="flex items-center justify-between border-b border-line/60 pb-2">
            <span className="font-medium text-slate-700">{t('settings.server_status.reports_api')}</span>
            <div className="flex items-center gap-2">
              <span
                className={`inline-block h-2.5 w-2.5 rounded-full ${
                  apiStatus.status === 'online'
                    ? 'bg-ok'
                    : apiStatus.status === 'offline'
                      ? 'bg-bad'
                      : 'bg-slate-300'
                }`}
                aria-hidden
              />
              <span className="font-semibold text-slate-900" data-testid="reports-api-status">
                {t(`settings.server_status.${apiStatus.status}`)}
                {apiStatus.detail && <span className="ml-1 text-xs font-normal text-slate-500">({apiStatus.detail})</span>}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-700">{t('settings.server_status.speech_service')}</span>
            <div className="flex items-center gap-2">
              <span
                className={`inline-block h-2.5 w-2.5 rounded-full ${
                  speechStatus.status === 'online'
                    ? 'bg-ok'
                    : speechStatus.status === 'offline'
                      ? 'bg-bad'
                      : 'bg-slate-300'
                }`}
                aria-hidden
              />
              <span className="font-semibold text-slate-900" data-testid="speech-service-status">
                {t(`settings.server_status.${speechStatus.status}`)}
                {speechStatus.detail && <span className="ml-1 text-xs font-normal text-slate-500">({speechStatus.detail})</span>}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="card space-y-3" data-testid="app-version">
        <div className="flex items-center justify-between">
          <p className="text-[13px] text-slate-500">
            {t('settings.version')}: <span className="font-mono">{appVersion()}</span>
          </p>
          <button
            type="button"
            className="btn btn-secondary !min-h-8 !py-1 !px-2.5 text-xs font-semibold"
            onClick={() => void forceUpdateApp()}
            data-testid="force-update-btn"
          >
            🔄 {t('update.check')}
          </button>
        </div>
        {pwa.needRefresh && (
          <div className="space-y-1.5 pt-1">
            <p className="text-[13.5px] font-bold text-brand">{t('update.ready')}</p>
            <button className="btn btn-primary min-h-10.5! w-full text-[13.5px]!" onClick={() => void applyUpdate()}>
              {t('update.refresh')}
            </button>
          </div>
        )}
      </section>
    </Layout>
  )
}
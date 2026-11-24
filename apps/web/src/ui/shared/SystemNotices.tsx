import { Download, X } from 'lucide-react'
import { useState } from 'react'
import { useLang } from '../../shell/i18n'
import { dismissUpdate, promptInstall, usePwaState } from '../../shell/pwa'
import { Banner } from '../../shell/ui'
import { getUiLabels } from './uiLabels'

export interface HomeViewProps {
  online: boolean
  pending: number
  pwa: ReturnType<typeof usePwaState>
  updateBlocked: boolean
  onApplyUpdate: () => Promise<void>
}

export function SystemNotices({ pending, pwa, updateBlocked, onApplyUpdate }: HomeViewProps) {
  const { lang, t } = useLang()
  const ui = getUiLabels(lang)
  const [showManualHint, setShowManualHint] = useState(false)

  const handleInstallClick = async () => {
    // 1. Direct APK download
    try {
      const a = document.createElement('a')
      a.href = '/suraksha.apk'
      a.download = 'Suraksha.apk'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch {
      // ignore
    }

    // 2. Also trigger PWA prompt if available on browser
    if (pwa.installEvent) {
      await promptInstall()
    } else {
      setShowManualHint((prev) => !prev)
    }
  }

  return (
    <>
      {pending > 0 && <Banner tone="info">⏳ {t('status.pending', { count: pending })}</Banner>}
      {pwa.storageFull && <Banner tone="bad">{t('storage.full')}</Banner>}

      {pwa.needRefresh && (
        <div className="card flex flex-col gap-3 border-brand! sm:flex-row sm:items-center sm:justify-between">
          <p className="font-bold text-ink">
            {t('update.ready')}
            {updateBlocked ? ' …' : ''}
          </p>
          <div className="flex gap-2">
            <button className="btn btn-primary min-h-10! text-[14px]!" onClick={() => void onApplyUpdate()}>
              {t('update.refresh')}
            </button>
            <button className="btn btn-secondary min-h-10! text-[14px]!" onClick={dismissUpdate}>
              {t('update.later')}
            </button>
          </div>
        </div>
      )}

      {/* Sleek Single-Row Install Bar */}
      {!pwa.installed && (
        <div className="rounded-2xl border border-blue-200/80 bg-white px-3.5 py-2.5 shadow-2xs sm:px-5 sm:py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#1B3B73]">
                <Download className="size-4" strokeWidth={2.2} />
              </span>
              <p className="text-[12.5px] font-medium leading-snug text-slate-600 sm:text-[14px]">
                {t('install.benefit')}
              </p>
            </div>

            <button
              type="button"
              onClick={() => void handleInstallClick()}
              className="inline-flex h-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-[1.5px] border-[#1B3B73] bg-white px-3.5 text-[12.5px] font-bold text-[#1B3B73] transition-colors hover:bg-blue-50 active:scale-95 sm:h-9.5 sm:px-4.5 sm:text-[13.5px]"
            >
              {t('install.button')}
            </button>
          </div>

          {showManualHint && (
            <div className="mt-2 flex flex-col gap-2 border-t border-slate-100 pt-2 text-[11.5px] leading-snug text-slate-500">
              <div className="flex items-start justify-between gap-2">
                <span>{ui.installHint}</span>
                <button
                  type="button"
                  onClick={() => setShowManualHint(false)}
                  aria-label="Close tip"
                  className="shrink-0 cursor-pointer rounded p-0.5 text-slate-400 hover:text-slate-700"
                >
                  <X className="size-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-2 pt-0.5">
                <a
                  href="/suraksha.apk"
                  download="Suraksha.apk"
                  className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-1 text-[12px] font-bold text-[#1B3B73] transition-colors hover:bg-blue-100"
                >
                  <Download className="size-3.5" />
                  Suraksha.apk
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}
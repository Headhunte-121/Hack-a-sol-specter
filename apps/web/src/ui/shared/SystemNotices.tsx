import { useLang } from '../../shell/i18n'
import { dismissUpdate, promptInstall, usePwaState } from '../../shell/pwa'
import { Banner } from '../../shell/ui'

export interface HomeViewProps {
  online: boolean
  pending: number
  pwa: ReturnType<typeof usePwaState>
  updateBlocked: boolean
  onApplyUpdate: () => Promise<void>
}

export function SystemNotices({ pending, pwa, updateBlocked, onApplyUpdate }: HomeViewProps) {
  const { t } = useLang()

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
            <button className="btn btn-primary min-h-11! text-[15px]!" onClick={() => void onApplyUpdate()}>
              {t('update.refresh')}
            </button>
            <button className="btn btn-secondary min-h-11! text-[15px]!" onClick={dismissUpdate}>
              {t('update.later')}
            </button>
          </div>
        </div>
      )}

      {pwa.installEvent && !pwa.installed && (
        <div className="card flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <p className="text-[15px] text-muted">{t('install.benefit')}</p>
          <button
            className="btn btn-secondary w-full min-h-11! text-[15px]! sm:w-auto"
            onClick={() => void promptInstall()}
          >
            {t('install.button')}
          </button>
        </div>
      )}
    </>
  )
}
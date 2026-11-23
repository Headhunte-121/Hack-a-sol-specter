import { isDemoMode, setDemoMode as setShellDemoMode, useDemoMode as useShellDemoMode } from '../../shell/demoMode'
import { useLang } from '../../shell/i18n'

export { isDemoMode }

/** One shared Demo Mode switch: the Settings card, the Trends page, the detector and the call screen all read the same stored value. */
export function useDemoMode() {
  const [demoMode, setDemoMode] = useShellDemoMode()
  return { demoMode, setDemoMode }
}

export function setDemoModeStorage(enabled: boolean): void {
  setShellDemoMode(enabled)
}

export function DemoModeCard() {
  const { t } = useLang()
  const { demoMode, setDemoMode } = useDemoMode()

  return (
    <section className="card space-y-2.5">
      <h2 className="text-[15.5px] font-bold text-slate-900">{t('settings.demo.title')}</h2>
      <p className="text-[13px] leading-relaxed text-slate-600">{t('settings.demo.body')}</p>
      <div className="grid grid-cols-1 gap-2 pt-0.5 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setDemoMode(true)}
          aria-pressed={demoMode}
          className={`btn min-h-10.5! text-[13.5px]! ${demoMode ? 'btn-primary' : 'btn-secondary'}`}
        >
          {t('settings.demo.on')}
        </button>
        <button
          type="button"
          onClick={() => setDemoMode(false)}
          aria-pressed={!demoMode}
          className={`btn min-h-10.5! text-[13.5px]! ${!demoMode ? 'btn-primary' : 'btn-secondary'}`}
        >
          {t('settings.demo.off')}
        </button>
      </div>
    </section>
  )
}

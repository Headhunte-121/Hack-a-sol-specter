import { useLang } from '../shell/i18n'
import { NumberedList } from '../shell/ui'
import { cameraEnvironment } from './camera'

/** What to show when live scanning cannot use the camera. The people who use this app may never have changed a phone
 *  setting, so the message leads with the one thing that always works (a photo taken by the phone's own camera app, which
 *  needs no permission) and keeps the settings steps out of the way, for someone who can help. A website cannot switch a
 *  camera back on once the phone or browser has been told No, so the steps say plainly why. */
export function CameraHelp({ kind, standalone, code, open = false, onRetry, onFile }: {
  kind: 'denied' | 'dismissed'
  standalone: boolean
  code?: string | null
  open?: boolean
  onRetry: () => void
  onFile: (f: File) => void
}) {
  const { t } = useLang()
  if (kind === 'dismissed') {
    return (
      <div role="status" className="flex flex-col gap-3 rounded-2xl border-2 border-warn-line bg-warn-bg p-3 text-warn" data-testid="camera-help" data-kind="dismissed">
        <p>{t('qr.err.camera_dismissed')}</p>
        <label className="btn btn-primary cursor-pointer" data-testid="qr-take-photo">📷 {t('qr.take_photo')}
          <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = '' }} />
        </label>
      </div>
    )
  }
  // From the home screen the address bar is missing, so offer to open the same app in a Chrome tab.
  const android = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent)
  const chromeUrl = typeof location !== 'undefined' ? `intent://${location.host}/#Intent;scheme=https;package=com.android.chrome;end` : '#'
  const steps = standalone ? ['qr.cam.app.1', 'qr.cam.app.2', 'qr.cam.app.3', 'qr.cam.app.4'] : ['qr.cam.web.1', 'qr.cam.web.2', 'qr.cam.web.3']
  return (
    <div role="status" className="flex flex-col gap-3 rounded-2xl border-2 border-warn-line bg-warn-bg p-3 text-warn" data-testid="camera-help" data-kind="denied" data-mode={standalone ? 'app' : 'browser'}>
      <p className="font-bold">{t('qr.cam.use_photo')}</p>
      <details open={open} className="rounded-xl bg-white/60 p-2" data-testid="camera-steps">
        <summary className="cursor-pointer font-bold">{t('qr.cam.show')}</summary>
        <div className="mt-2 flex flex-col gap-3">
          <p className="font-bold">{t('qr.err.camera')}</p>
          <p>{t('qr.cam.why')}</p>
          {standalone && <p data-testid="camera-reinstall">{t('qr.cam.reinstall')}</p>}
          <NumberedList items={steps.map((k) => t(k, { site: typeof location !== 'undefined' ? location.host : '' }))} />
          <button type="button" className="btn btn-primary" onClick={onRetry} data-testid="camera-recheck">📷 {t('qr.cam.recheck')}</button>
          {standalone && android && <a className="btn btn-secondary" href={chromeUrl} data-testid="camera-open-chrome">{t('qr.cam.open_chrome')}</a>}
          {code && <p className="font-mono text-xs opacity-80" data-testid="qr-err-code">{t('qr.err.code')}: {code}</p>}
          <p className="font-mono text-xs opacity-80" data-testid="qr-env">{t('qr.cam.details')}: {cameraEnvironment()}</p>
        </div>
      </details>
    </div>
  )
}

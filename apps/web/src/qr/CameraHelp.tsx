import { useLang } from '../shell/i18n'
import { cameraEnvironment } from './camera'
import { NumberedList } from '../shell/ui'

/** What to do when the camera cannot be used because of a permission. A website cannot switch a camera back on once the
 *  phone or browser has been told No, so this says plainly why and gives the exact steps for how the app is opened
 *  (from the home screen there is no address bar, so "tap the lock" does not apply). */
export function CameraHelp({ kind, standalone, code, onRetry, onFile }: {
  kind: 'denied' | 'dismissed'
  standalone: boolean
  code?: string | null
  onRetry: () => void
  onFile: (f: File) => void
}) {
  const { t } = useLang()
  // the phone's own camera app takes the picture, so this works even when the browser may not use the camera
  const photo = (
    <label className="btn btn-secondary cursor-pointer" data-testid="qr-take-photo">📷 {t('qr.take_photo')}
      <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = '' }} />
    </label>
  )
  if (kind === 'dismissed') {
    return (
      <div role="status" className="flex flex-col gap-3 rounded-2xl border-2 border-warn-line bg-warn-bg p-3 text-warn" data-testid="camera-help" data-kind="dismissed">
        <p>{t('qr.err.camera_dismissed')}</p>
        {photo}
      </div>
    )
  }
  // From the home screen the address bar is missing, so offer to open the same app in a Chrome tab, where the lock shows the camera setting.
  const android = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent)
  const chromeUrl = typeof location !== 'undefined' ? `intent://${location.host}/#Intent;scheme=https;package=com.android.chrome;end` : '#'
  const steps = standalone ? ['qr.cam.app.1', 'qr.cam.app.2', 'qr.cam.app.3', 'qr.cam.app.4'] : ['qr.cam.web.1', 'qr.cam.web.2', 'qr.cam.web.3']
  return (
    <div role="status" className="flex flex-col gap-3 rounded-2xl border-2 border-warn-line bg-warn-bg p-3 text-warn" data-testid="camera-help" data-kind="denied" data-mode={standalone ? 'app' : 'browser'}>
      <p className="font-bold">{t('qr.err.camera')}</p>
      <p>{t('qr.cam.why')}</p>
      {standalone && <p data-testid="camera-reinstall">{t('qr.cam.reinstall')}</p>}
      <NumberedList items={steps.map((k) => t(k))} />
      <button type="button" className="btn btn-primary" onClick={onRetry} data-testid="camera-recheck">📷 {t('qr.cam.recheck')}</button>
      {standalone && android && <a className="btn btn-secondary" href={chromeUrl} data-testid="camera-open-chrome">{t('qr.cam.open_chrome')}</a>}
      {photo}
      {code && <p className="font-mono text-xs opacity-80" data-testid="qr-err-code">{t('qr.err.code')}: {code}</p>}
      <p className="font-mono text-xs opacity-80" data-testid="qr-env">{t('qr.cam.details')}: {cameraEnvironment()}</p>
    </div>
  )
}

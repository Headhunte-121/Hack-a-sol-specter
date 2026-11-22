import { useState } from 'react'
import { categoryFromSignals, type CategoryCode } from '../shared/categories'
import { consentAsked, hasConsent, markConsentAsked, setConsent } from '../shell/consent'
import { useLang } from '../shell/i18n'
import { kvGet, kvSet } from '../shell/storage'
import { buildReportPayload, channelFromKind } from './report'
import { REGIONS } from './regionsData'
import { queueReport } from './sync'

/** prepareTrendReport + collectConsent: opt-in, off by default. Builds a fixed-field report and queues it for later sending. */
export function ShareReport({ kind, signals, band, category }: { kind: 'message' | 'url' | 'call'; signals: string[]; band: string; category?: CategoryCode }) {
  const { t, lang } = useLang()
  const [consent, setConsentState] = useState(hasConsent())
  const [asked, setAsked] = useState(consentAsked())
  const [region, setRegion] = useState<string>(kvGet('region', ''))
  const [done, setDone] = useState(false)

  if (band === 'looks_genuine') return null
  const answer = (on: boolean) => { setConsent(on); markConsentAsked(); setConsentState(on); setAsked(true) }

  if (!asked && !consent) {
    return (
      <section className="card space-y-2" data-testid="consent-ask">
        <h3 className="font-bold">{t('privacy.consent.title')}</h3>
        <p className="text-sm">{t('privacy.consent.body')}</p>
        <div className="flex gap-2">
          <button className="btn btn-primary flex-1" onClick={() => answer(true)}>{t('privacy.consent.on')}</button>
          <button className="btn btn-secondary flex-1" onClick={() => answer(false)}>{t('privacy.consent.off')}</button>
        </div>
      </section>
    )
  }
  if (!consent) return <p className="text-sm text-slate-600">{t('share.off')} <a className="font-bold underline" href="#/settings">{t('settings.title')}</a></p>

  const send = async () => {
    if (!region) return
    kvSet('region', region)
    const p = buildReportPayload({ category: category ?? categoryFromSignals(signals), channel: channelFromKind(kind), region, band })
    if ((await queueReport(p)) === 'queued') setDone(true)
  }

  return (
    <section className="card space-y-2" data-testid="share-report">
      <h3 className="font-bold">{t('share.title')}</h3>
      <p className="text-xs text-slate-600">{t('share.contains')}</p>
      {done ? (
        <p role="status" className="font-bold text-green-800">{t('share.queued')}</p>
      ) : (
        <>
          <label className="block text-sm font-bold" htmlFor="region">{t('share.region')}</label>
          <select id="region" className="min-h-12 w-full rounded-lg border-2 border-slate-400 bg-white px-2" value={region} onChange={(e) => setRegion(e.target.value)}>
            <option value="">{t('share.choose')}</option>
            {REGIONS.map((r) => <option key={r.code} value={r.code}>{lang === 'en' ? r.en : r.hi}</option>)}
          </select>
          <button className="btn btn-primary w-full" disabled={!region} onClick={send}>📊 {t('share.send')}</button>
        </>
      )}
    </section>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { loadLastResult } from '../detector/lastResult'
import { formatDate, useLang } from '../shell/i18n'
import { setBusy } from '../shell/busy'
import { Layout } from '../shell/Layout'
import { currentQuery } from '../shell/router'
import { kvGet, kvSet } from '../shell/storage'
import { CHANNELS, LAST_VERIFIED } from './channels'
import { buildEvidenceChecklist, chooseChannel, type Answers, type ChecklistId, type Outcome, type StepId } from './routing'
import { buildReportSummary } from './summary'
import { ShareReport } from '../dashboard/ShareReport'

const isTouch = () => typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches

export default function ReportPage() {
  const { t, lang } = useLang()
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [shared, setShared] = useState<boolean | null>(null)
  const [copied, setCopied] = useState(false)
  const [offlineNote, setOfflineNote] = useState(false)
  const last = useMemo(() => (currentQuery().get('from') ? loadLastResult() : loadLastResult()), [])

  useEffect(() => {
    setBusy('report', outcome !== null) // an app update must never refresh the page mid-report
    return () => setBusy('report', false)
  }, [outcome])

  const answers: Answers | null = outcome === null ? null : outcome === 'no_money' ? (shared === null ? null : { outcome, shared }) : { outcome }
  const route = answers ? chooseChannel(answers) : null
  const checklist = route ? buildEvidenceChecklist(route.channel) : []
  const [ticks, setTicks] = useState<Record<string, boolean>>({})
  useEffect(() => {
    if (route) setTicks(kvGet<Record<string, boolean>>(`checklist.${route.channel}`, {}))
  }, [route?.channel])
  const tick = (id: ChecklistId) => {
    const next = { ...ticks, [id]: !ticks[id] }
    setTicks(next)
    kvSet(`checklist.${route!.channel}`, next) // saveChecklistProgress: on the device only
  }

  const summary = useMemo(() => (route && route.channel !== 'tips' ? buildReportSummary(last, t) : ''), [route?.channel, last, lang])
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(summary)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard blocked: the text stays selectable */ }
  }
  const share = async () => { try { await navigator.share?.({ text: summary }) } catch { /* cancelled */ } }
  const openPortal = (url: string) => {
    if (!navigator.onLine) { setOfflineNote(true); return }
    setOfflineNote(false)
    window.open(url, '_blank', 'noopener,noreferrer')
  }
  const reset = () => { setOutcome(null); setShared(null); setCopied(false); setOfflineNote(false) }

  const stepText: Record<StepId, string> = {
    call_1930: t('step.call_1930'), open_cybercrime: t('step.open_cybercrime'), open_chakshu: t('step.open_chakshu'), call_bank: t('step.call_bank'),
    block_cards: t('step.block_cards'), keep_evidence: t('step.keep_evidence'), dont_delete: t('step.dont_delete'), watch_followup: t('step.watch_followup'),
    read_tips: t('step.read_tips'), open_learn: t('step.open_learn'),
  }
  const Big = ({ onClick, children, primary }: { onClick: () => void; children: React.ReactNode; primary?: boolean }) => (
    <button className={`btn w-full ${primary ? 'btn-primary' : 'btn-secondary'}`} onClick={onClick}>{children}</button>
  )

  return (
    <Layout title={t('report.title')}>
      <p className="rounded-xl border-2 border-amber-600 bg-amber-50 p-3 text-sm text-amber-950">⚠️ {t('report.warning')}</p>

      {!outcome && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold">{t('report.q1')}</h2>
          <Big primary onClick={() => setOutcome('money_lost')}>💸 {t('report.q1.money')}</Big>
          <Big onClick={() => setOutcome('no_money')}>🛡️ {t('report.q1.nomoney')}</Big>
          <Big onClick={() => setOutcome('other_cyber')}>🧑‍💻 {t('report.q1.other')}</Big>
          <Big onClick={() => setOutcome('checking')}>🔎 {t('report.q1.checking')}</Big>
        </section>
      )}

      {outcome === 'no_money' && shared === null && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold">{t('report.q2')}</h2>
          <Big primary onClick={() => setShared(true)}>{t('report.q2.yes')}</Big>
          <Big onClick={() => setShared(false)}>{t('report.q2.no')}</Big>
          <button className="underline" onClick={reset}>{t('report.restart')}</button>
        </section>
      )}

      {route && (
        <section className="space-y-4" data-testid="channel-card" data-channel={route.channel}>
          <div className="card space-y-2 border-teal-700">
            <h2 className="text-xl font-bold">{t(`report.ch.${route.channel}.title`)}</h2>
            <p>{t(`report.ch.${route.channel}.why`)}</p>
            <p className="text-xs text-slate-600">{t('report.verified', { date: formatDate(new Date(LAST_VERIFIED), lang) })} · {t('report.verified.note')}</p>
          </div>

          <div className="space-y-2">
            {(route.primary === 'call_1930' || route.secondary === 'open_cybercrime') && route.channel !== 'tips' && route.primary === 'call_1930' && (
              isTouch()
                ? <a className="btn btn-danger" href={`tel:${CHANNELS.helpline_1930.phone}`}>{t('report.act.call_1930')}</a>
                : <button className="btn btn-danger" onClick={() => navigator.clipboard?.writeText('1930')}>{t('report.act.dial_desktop')}: 1930</button>
            )}
            {(route.primary === 'open_cybercrime' || route.secondary === 'open_cybercrime') && (
              <button className={`btn w-full ${route.primary === 'open_cybercrime' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => openPortal(CHANNELS.cybercrime.url)}>{t('report.act.open_cybercrime')}</button>
            )}
            {route.primary === 'open_chakshu' && <button className="btn btn-primary w-full" onClick={() => openPortal(CHANNELS.chakshu.url)}>{t('report.act.open_chakshu')}</button>}
            {route.primary === 'open_learn' && <a className="btn btn-primary" href="#/learn">{t('report.act.learn')}</a>}
            {offlineNote && <p role="status" className="rounded-lg bg-slate-200 p-2 text-sm">{t('report.offline')}</p>}
          </div>

          <div className="card">
            <h3 className="mb-2 font-bold">{t('report.steps')}</h3>
            <ol className="list-decimal space-y-2 pl-5">{route.steps.map((s) => <li key={s}>{stepText[s]}</li>)}</ol>
          </div>

          {checklist.length > 0 && (
            <div className="card">
              <h3 className="mb-2 font-bold">{t('report.ready')}</h3>
              <ul className="space-y-2">
                {checklist.map((id) => (
                  <li key={id}>
                    <label className="flex min-h-11 items-center gap-3">
                      <input type="checkbox" className="size-6" checked={!!ticks[id]} onChange={() => tick(id)} />
                      <span>{t(`ck.${id}`)}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {summary && (
            <div className="card space-y-2">
              <h3 className="font-bold">{t('summary.title')}</h3>
              <pre className="whitespace-pre-wrap rounded-lg bg-slate-100 p-3 text-sm">{summary}</pre>
              <div className="flex gap-2">
                <button className="btn btn-secondary flex-1" onClick={copy}>📋 {copied ? t('common.copied') : t('common.copy')}</button>
                {typeof navigator.share === 'function' && <button className="btn btn-secondary flex-1" onClick={share}>↗ {t('summary.share')}</button>}
              </div>
            </div>
          )}

          {last && route.channel !== 'tips' && <ShareReport kind={last.kind} signals={last.signals} band={last.band === 'looks_genuine' ? 'suspicious' : last.band} />}

          <p className="text-sm text-slate-600">{t('report.disclaimer')}</p>
          <button className="underline" onClick={reset}>{t('report.restart')}</button>
        </section>
      )}
    </Layout>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { ShareReport } from '../dashboard/ShareReport'
import { recentLastResult } from '../detector/lastResult'
import { useBackStep, useInnerScreenOnReturn } from '../shell/backStep'
import { setBusy } from '../shell/busy'
import { formatDate, useLang } from '../shell/i18n'
import { Layout } from '../shell/Layout'
import { kvGet, kvSet } from '../shell/storage'
import { Banner, Icon, NumberedList, type Tone } from '../shell/ui'
import { CHANNELS, LAST_VERIFIED } from './channels'
import { buildEvidenceChecklist, chooseChannel, type Answers, type ChecklistId, type ChannelId, type Outcome, type StepId } from './routing'
import { buildReportSummary } from './summary'

const isTouch = () => typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches
const CARD_TONE: Record<ChannelId, Tone> = { helpline_1930: 'bad', bank_then_1930: 'warn', chakshu: 'info', cybercrime_portal: 'info', tips: 'ok' }

export default function ReportPage() {
  const { t, lang } = useLang()
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [shared, setShared] = useState<boolean | null>(null)
  const [copied, setCopied] = useState(false)
  const [offlineNote, setOfflineNote] = useState(false)
  const last = useMemo(() => recentLastResult(), [])

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
    try { await navigator.clipboard.writeText(summary); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { /* clipboard blocked: the text stays selectable */ }
  }
  const share = async () => { try { await navigator.share?.({ text: summary }) } catch { /* cancelled */ } }
  const openPortal = (url: string) => {
    if (!navigator.onLine) { setOfflineNote(true); return }
    setOfflineNote(false)
    window.open(url, '_blank', 'noopener,noreferrer')
  }
  const reset = () => { setOutcome(null); setShared(null); setCopied(false); setOfflineNote(false) }
  // Phone Back returns to the first question; coming back from a lesson or another screen shows the same advice again.
  useInnerScreenOnReturn((d) => {
    const o = d?.outcome
    if (o !== 'money_lost' && o !== 'no_money' && o !== 'other_cyber' && o !== 'checking') return false
    setOutcome(o)
    setShared(typeof d?.shared === 'boolean' ? d.shared : null)
    return true
  })
  const back = useBackStep(outcome !== null, reset, { outcome, shared })

  const stepText: Record<StepId, string> = {
    call_1930: t('step.call_1930'), open_cybercrime: t('step.open_cybercrime'), open_chakshu: t('step.open_chakshu'), call_bank: t('step.call_bank'),
    block_cards: t('step.block_cards'), keep_evidence: t('step.keep_evidence'), dont_delete: t('step.dont_delete'), watch_followup: t('step.watch_followup'),
    read_tips: t('step.read_tips'), open_learn: t('step.open_learn'),
  }
  const callButton = isTouch()
    ? <a className="btn btn-primary !min-h-[68px] !text-[26px]" href={`tel:${CHANNELS.helpline_1930.phone}`}><Icon name="phone" size={30} color="#fff" />{t('report.act.call_1930')}</a>
    : <button className="btn btn-primary !min-h-[68px] !text-[24px]" onClick={() => navigator.clipboard?.writeText('1930')}><Icon name="phone" size={30} color="#fff" />{t('report.act.dial_desktop')}: 1930</button>

  return (
    <Layout title={t('report.title')} onBack={outcome ? back : undefined}>
      {/* question 1 */}
      {!outcome && (
        <>
          <div className="text-[21px] font-bold leading-snug">{t('report.q.money')}</div>
          <div className="flex gap-2.5">
            <button className="btn btn-primary flex-1" onClick={() => setOutcome('money_lost')}>{t('report.a.yes')}</button>
            <button className="btn btn-secondary flex-1" onClick={() => setOutcome('no_money')}>{t('report.a.no')}</button>
          </div>
          <Banner tone="warn" className="!text-[17px]">{t('report.warning')}</Banner>
          <div className="text-[16px] font-bold text-muted">{t('report.other_hint')}</div>
          <button className="btn btn-secondary !min-h-14 !text-[18px]" onClick={() => setOutcome('other_cyber')}>{t('report.q1.other')}</button>
          <button className="btn btn-secondary !min-h-14 !text-[18px]" onClick={() => setOutcome('checking')}>{t('report.q1.checking')}</button>
        </>
      )}

      {/* question 2 */}
      {outcome === 'no_money' && shared === null && (
        <>
          <div className="text-[21px] font-bold leading-snug">{t('report.q2')}</div>
          <div className="flex gap-2.5">
            <button className="btn btn-primary flex-1" onClick={() => setShared(true)}>{t('report.q2.yes')}</button>
            <button className="btn btn-secondary flex-1" onClick={() => setShared(false)}>{t('report.q2.no')}</button>
          </div>
        </>
      )}

      {/* the channel */}
      {route && (
        <div className="flex flex-col gap-3" data-testid="channel-card" data-channel={route.channel}>
          <Banner tone={CARD_TONE[route.channel]}>
            <div className="text-[22px] font-bold leading-snug">{t(`report.ch.${route.channel}.title`)}</div>
            <div className="text-[18px] leading-snug">{t(`report.ch.${route.channel}.why`)}</div>
          </Banner>

          {(route.primary === 'call_1930' && route.channel !== 'tips') && callButton}
          {(route.primary === 'open_cybercrime' || route.secondary === 'open_cybercrime') && (
            <button className={`btn ${route.primary === 'open_cybercrime' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => openPortal(CHANNELS.cybercrime.url)}>{t('report.act.open_cybercrime')}</button>
          )}
          {route.primary === 'open_chakshu' && <button className="btn btn-primary" onClick={() => openPortal(CHANNELS.chakshu.url)}>{t('report.act.open_chakshu')}</button>}
          {route.primary === 'open_learn' && <a className="btn btn-primary" href="#/learn">{t('report.act.learn')}</a>}
          {offlineNote && <Banner tone="info" role="status" className="!text-[16px]">{t('report.offline')}</Banner>}

          <div className="mt-1 text-[20px] font-bold">{t('report.steps')}</div>
          <NumberedList items={route.steps.map((s) => stepText[s])} />

          {checklist.length > 0 && (
            <>
              <div className="mt-1 text-[20px] font-bold">{t('report.ready')}</div>
              <div className="flex flex-col gap-2">
                {checklist.map((id) => (
                  <label key={id} className="flex min-h-14 items-center gap-3.5 rounded-[14px] border-2 border-line bg-white px-3.5 py-2 text-[19px] leading-snug">
                    <input type="checkbox" className="size-7 flex-none accent-brand" checked={!!ticks[id]} onChange={() => tick(id)} />
                    {t(`ck.${id}`)}
                  </label>
                ))}
              </div>
            </>
          )}

          {summary && (
            <div className="card space-y-2">
              <h3 className="font-bold">{t('summary.title')}</h3>
              <pre className="whitespace-pre-wrap rounded-lg bg-surface p-3 text-[14px]">{summary}</pre>
              <div className="flex gap-2">
                <button className="btn btn-secondary flex-1 !min-h-14 !text-[18px]" onClick={copy}>{copied ? t('common.copied') : t('common.copy')}</button>
                {typeof navigator.share === 'function' && <button className="btn btn-secondary flex-1 !min-h-14 !text-[18px]" onClick={share}>{t('summary.share')}</button>}
              </div>
            </div>
          )}

          {last && route.channel !== 'tips' && <ShareReport kind={last.kind} signals={last.signals} category={last.category as never} band={last.band === 'looks_genuine' ? 'suspicious' : last.band} />}

          <p className="mt-2 text-[16px] leading-snug text-muted">{t('report.disclaimer')} {t('report.verified', { date: formatDate(new Date(LAST_VERIFIED), lang) })}</p>
        </div>
      )}
    </Layout>
  )
}

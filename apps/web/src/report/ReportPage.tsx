import { useEffect, useMemo, useState } from 'react'
import { CHANNELS as ANSWER_CHANNELS, type Channel } from '../dashboard/report'
import { ShareReport } from '../dashboard/ShareReport'
import { recentLastResult } from '../detector/lastResult'
import { CATEGORY_CODES, LESSON_FOR_CATEGORY, type CategoryCode } from '../shared/categories'
import { useBackStep, useInnerScreenOnReturn } from '../shell/backStep'
import { setBusy } from '../shell/busy'
import { formatDate, useLang } from '../shell/i18n'
import { Layout } from '../shell/Layout'
import { navigate } from '../shell/router'
import { kvGet, kvSet } from '../shell/storage'
import { Banner, Icon, NumberedList, type Tone } from '../shell/ui'
import { CHANNELS, LAST_VERIFIED } from './channels'
import { asPayMethod, buildEvidenceChecklist, chooseChannel, PAY_METHODS, withPaymentStep, type Answers, type ChecklistId, type ChannelId, type Outcome, type PayMethod, type StepId } from './routing'
import { adviceKey, asCategory, asChannel, problemFromCheck, reportBand } from './problem'
import { buildReportSummary, type ReportFacts } from './summary'

const isTouch = () => typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches
const CARD_TONE: Record<ChannelId, Tone> = { helpline_1930: 'bad', bank_then_1930: 'warn', chakshu: 'info', cybercrime_portal: 'info', tips: 'ok' }

export default function ReportPage() {
  const { t, lang } = useLang()
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [shared, setShared] = useState<boolean | null>(null)
  const [copied, setCopied] = useState(false)
  const [offlineNote, setOfflineNote] = useState(false)
  const last = useMemo(() => recentLastResult(), [])
  // What happened, in the person's own answer. A recent flagged check only pre-fills it; it stays visible and can be changed.
  const initial = useMemo(() => problemFromCheck(last), [last])
  const [category, setCategory] = useState<CategoryCode | null>(initial.category)
  const [channelPick, setChannelPick] = useState<Channel | null>(initial.channel)
  const [edited, setEdited] = useState(false)
  const [payMethod, setPayMethod] = useState<PayMethod | null>(null) // optional: how the money left

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

  const asksProblem = !!route && (route.channel === 'helpline_1930' || route.channel === 'bank_then_1930' || route.channel === 'chakshu')
  const facts: ReportFacts = {
    category: asksProblem ? category : null,
    channel: asksProblem ? channelPick : null,
    moneyLost: outcome === 'money_lost' ? true : outcome === 'no_money' ? false : undefined,
    paid: outcome === 'money_lost' ? payMethod : undefined,
    shared: outcome === 'no_money' ? shared : undefined,
  }
  const summary = useMemo(() => (route && route.channel !== 'tips' ? buildReportSummary(last, t, new Date(), lang, facts) : ''), [route?.channel, last, lang, category, channelPick, outcome, shared, payMethod])
  const copy = async () => {
    try { await navigator.clipboard.writeText(summary); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { /* clipboard blocked: the text stays selectable */ }
  }
  const share = async () => { try { await navigator.share?.({ text: summary }) } catch { /* cancelled */ } }
  const openPortal = (url: string) => {
    if (!navigator.onLine) { setOfflineNote(true); return }
    setOfflineNote(false)
    window.open(url, '_blank', 'noopener,noreferrer')
  }
  const reset = () => { setOutcome(null); setShared(null); setCopied(false); setOfflineNote(false); setCategory(initial.category); setChannelPick(initial.channel); setEdited(false); setPayMethod(null) }
  // Phone Back returns to the first question; coming back from a lesson or another screen shows the same advice again.
  useInnerScreenOnReturn((d) => {
    const o = d?.outcome
    if (o !== 'money_lost' && o !== 'no_money' && o !== 'other_cyber' && o !== 'checking') return false
    setOutcome(o)
    setShared(typeof d?.shared === 'boolean' ? d.shared : null)
    const c = asCategory(d?.category)
    const ch = asChannel(d?.channel)
    if (c || ch) { setCategory(c); setChannelPick(ch); setEdited(true) }
    setPayMethod(asPayMethod(d?.paid))
    return true
  })
  const back = useBackStep(outcome !== null, reset, { outcome, shared, category, channel: channelPick, paid: payMethod })

  const stepText: Record<StepId, string> = {
    call_1930: t('step.call_1930'), open_cybercrime: t('step.open_cybercrime'), open_chakshu: t('step.open_chakshu'), call_bank: t('step.call_bank'),
    block_cards: t('step.block_cards'), keep_evidence: t('step.keep_evidence'), dont_delete: t('step.dont_delete'), watch_followup: t('step.watch_followup'),
    read_tips: t('step.read_tips'), open_learn: t('step.open_learn'),
    pay_upi: t('step.pay_upi'), pay_card: t('step.pay_card'), pay_bank: t('step.pay_bank'), pay_other: t('step.pay_other'),
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

          {route.channel !== 'tips' && (
            <div className="card space-y-2" data-testid="complaint-entry">
              <p className="text-[17px] leading-snug">{t('report.act.complaint_hint')}</p>
              <button className="btn btn-primary" onClick={() => { kvSet('complaint.context', { outcome, shared, category, channel: channelPick, paid: payMethod }); navigate('/report/complaint') }}>
                <Icon name="clipboard" size={24} />{t('report.act.complaint')}
              </button>
            </div>
          )}

          {route.channel === 'helpline_1930' && (
            <div className="card space-y-2.5" data-testid="paid">
              <h3 className="text-[20px] font-bold">{t('report.paid.title')}</h3>
              <p className="text-[16px] text-muted">{t('report.paid.hint')}</p>
              <div role="radiogroup" aria-label={t('report.paid.title')} className="grid grid-cols-2 gap-2">
                {PAY_METHODS.map((m) => (
                  <button key={m} type="button" role="radio" aria-checked={payMethod === m} data-pay={m} className={`btn !min-h-14 !px-2 !text-[16px] !leading-tight ${payMethod === m ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setPayMethod(payMethod === m ? null : m)}>{t(`pay.${m}`)}</button>
                ))}
              </div>
            </div>
          )}

          {asksProblem && (
            <div className="card space-y-3" data-testid="problem">
              <h3 className="text-[20px] font-bold">{t('report.happened.title')}</h3>
              {!category ? <p className="text-[16px] text-muted">{t('report.happened.pick')}</p> : !edited && initial.category === category ? <p className="text-[16px] text-muted">{t('report.happened.prefilled')}</p> : null}
              <div role="radiogroup" aria-label={t('report.happened.title')} className="grid grid-cols-2 gap-2">
                {CATEGORY_CODES.map((c) => (
                  <button key={c} type="button" role="radio" aria-checked={category === c} data-category={c} className={`btn !min-h-14 !px-2 !text-[16px] !leading-tight ${category === c ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setCategory(c); setEdited(true) }}>{t(`cat.${c}`)}</button>
                ))}
              </div>
              <h3 className="text-[18px] font-bold">{t('report.channel.title')}</h3>
              <div role="radiogroup" aria-label={t('report.channel.title')} className="grid grid-cols-2 gap-2">
                {ANSWER_CHANNELS.map((c) => (
                  <button key={c} type="button" role="radio" aria-checked={channelPick === c} data-channel-pick={c} className={`btn !min-h-14 !text-[17px] ${channelPick === c ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setChannelPick(c); setEdited(true) }}>{t(`trends.channel.${c}`)}</button>
                ))}
              </div>
              {category && (
                <div data-testid="advice" className="space-y-1.5">
                  <Banner tone="info" className="!text-[17px]">
                    <div className="font-bold">{t('report.advice.title')}</div>
                    <div>{t(adviceKey(category))}</div>
                    <a className="mt-2 inline-block font-bold underline" href={`#/learn?lesson=${LESSON_FOR_CATEGORY[category]}`}>{t('report.advice.lesson')}</a>
                  </Banner>
                </div>
              )}
            </div>
          )}

          <div className="mt-1 text-[20px] font-bold">{t('report.steps')}</div>
          <NumberedList items={withPaymentStep(route.steps, payMethod).map((s) => stepText[s])} />

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

          {asksProblem && (category && channelPick
            ? <ShareReport channel={channelPick} category={category} band={reportBand(last, category)} />
            : <p className="text-[16px] leading-snug text-muted" data-testid="send-hint">{t('report.send_hint')}</p>)}

          <p className="mt-2 text-[16px] leading-snug text-muted">{t('report.disclaimer')} {t('report.verified', { date: formatDate(new Date(LAST_VERIFIED), lang) })}</p>
        </div>
      )}
    </Layout>
  )
}

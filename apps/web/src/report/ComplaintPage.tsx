import { useEffect, useMemo, useState } from 'react'
import { CHANNELS as ANSWER_CHANNELS, type Channel } from '../dashboard/report'
import { recentLastResult } from '../detector/lastResult'
import { isAndroidNative, readRecentSms, type DeviceSms } from '../native/sms'
import { CATEGORY_CODES, type CategoryCode } from '../shared/categories'
import { setBusy } from '../shell/busy'
import { translate, useLang } from '../shell/i18n'
import { Layout } from '../shell/Layout'
import { kvGet, kvSet } from '../shell/storage'
import { Banner, Icon } from '../shell/ui'
import {
  applyExtracted, asSharedItem, buildCallSheet, buildComplaint, buildFieldList, buildPlan, emptyFacts, extractDetails, missingDetails, SHARED_ITEMS, type ComplaintFacts, type SharedItem,
} from './complaint'
import { CHANNELS } from './channels'
import { asCategory, asChannel, problemFromCheck } from './problem'
import { asPayMethod, PAY_METHODS, type PayMethod } from './routing'

const DRAFT_KEY = 'complaint.draft' // on the device only; "Delete all my data" in Settings removes it
const CONTEXT_KEY = 'complaint.context' // what the report screen already knows (money lost, what was shared)

const INPUT = 'h-12 w-full rounded-xl border-2 border-line bg-white px-3 text-[18px] text-ink focus:border-brand focus:outline-none'
const TEXTAREA = 'w-full resize-none rounded-2xl border-2 border-line bg-white p-3 text-[18px] text-ink focus:border-brand focus:outline-none'
const LABEL = 'text-[17px] font-bold text-ink'
const HINT = 'text-[15px] leading-snug text-muted'
const toTr = (lang: 'en' | 'hi' | 'cg') => (k: string, v?: Record<string, string | number>) => translate(lang, k, v)

/** What the report screen stored for this screen: money lost, how it left, what was shared. Never any message text. */
export interface ComplaintContext {
  outcome?: string
  shared?: boolean | null
  category?: string | null
  channel?: string | null
  paid?: string | null
}

function initialFacts(): ComplaintFacts {
  const draft = kvGet<Partial<ComplaintFacts> | null>(DRAFT_KEY, null)
  const ctx = kvGet<ComplaintContext | null>(CONTEXT_KEY, null) // set by the report screen when the person pressed the button; used once
  const check = problemFromCheck(recentLastResult())
  const base = emptyFacts()
  const fromDraft: ComplaintFacts =
    draft && typeof draft === 'object'
      ? {
          ...base, ...draft,
          category: asCategory(draft.category), channel: asChannel(draft.channel), paid: asPayMethod(draft.paid),
          shared: (Array.isArray(draft.shared) ? draft.shared : []).map(asSharedItem).filter((x): x is SharedItem => x !== null),
        }
      : { ...base, category: check.category, channel: check.channel, date: new Date().toISOString().slice(0, 10) }
  if (!ctx) return fromDraft
  // what the person just answered on the report screen wins over an older draft
  return {
    ...fromDraft,
    category: asCategory(ctx.category) ?? fromDraft.category,
    channel: asChannel(ctx.channel) ?? fromDraft.channel,
    moneyLost: ctx.outcome === 'money_lost' ? true : ctx.outcome ? false : fromDraft.moneyLost,
    paid: asPayMethod(ctx.paid) ?? fromDraft.paid,
  }
}

export default function ComplaintPage() {
  const { t, lang } = useLang()
  const [facts, setFacts] = useState<ComplaintFacts>(initialFacts)
  const [pasted, setPasted] = useState('')
  const [foundNote, setFoundNote] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [offlineNote, setOfflineNote] = useState(false)
  const [smsList, setSmsList] = useState<DeviceSms[] | null>(null)
  const native = isAndroidNative()

  useEffect(() => {
    setBusy('complaint', true) // an app update must never refresh the page while someone is writing a complaint
    return () => setBusy('complaint', false)
  }, [])
  useEffect(() => { kvSet(DRAFT_KEY, facts) }, [facts])
  useEffect(() => { kvSet(CONTEXT_KEY, null) }, []) // the report screen's answers were read once above

  const set = <K extends keyof ComplaintFacts>(k: K, v: ComplaintFacts[K]) => setFacts((f) => ({ ...f, [k]: v }))
  const toggleShared = (s: SharedItem) => setFacts((f) => ({ ...f, shared: f.shared.includes(s) ? f.shared.filter((x) => x !== s) : [...f.shared, s] }))

  const findDetails = () => {
    const x = extractDetails(pasted)
    const { facts: next, filled } = applyExtracted(facts, x)
    setFacts(next)
    setFoundNote(filled > 0 ? t('complaint.s1.found', { n: filled }) : t('complaint.s1.none'))
  }
  const chooseFromSms = async () => {
    try { setSmsList(await readRecentSms(20)) } catch { setSmsList([]) }
  }

  const plan = useMemo(() => buildPlan(facts), [facts])
  const missing = useMemo(() => missingDetails(facts), [facts])
  const en = useMemo(() => toTr('en'), [])
  const website = useMemo(() => buildComplaint(facts, en, 'en'), [facts, en])
  const websiteShort = useMemo(() => buildComplaint(facts, en, 'en', new Date(), { short: true }), [facts, en])
  const fields = useMemo(() => buildFieldList(facts, en, 'en'), [facts, en])
  const own = useMemo(() => (lang === 'en' ? '' : buildComplaint(facts, t, lang)), [facts, lang, t])
  const sheet = useMemo(() => buildCallSheet(facts, t, lang), [facts, lang, t])

  const copy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(id)
      setTimeout(() => setCopied((c) => (c === id ? null : c)), 2000)
    } catch { /* clipboard blocked: the text stays selectable */ }
  }
  const share = async () => { try { await navigator.share?.({ text: website }) } catch { /* cancelled */ } }
  const openSite = () => {
    if (!navigator.onLine) { setOfflineNote(true); return }
    setOfflineNote(false)
    void copy('all', website)
    window.open(CHANNELS.cybercrime.url, '_blank', 'noopener,noreferrer')
  }
  const clearAll = () => {
    setFacts({ ...emptyFacts(), date: new Date().toISOString().slice(0, 10) })
    setPasted('')
    setFoundNote(t('complaint.cleared'))
    kvSet(DRAFT_KEY, null)
    kvSet(CONTEXT_KEY, null)
  }

  const chip = (on: boolean) => `btn !min-h-14 !px-2 !text-[16px] !leading-tight ${on ? 'btn-primary' : 'btn-secondary'}`

  return (
    <Layout title={t('complaint.title')}>
      <p className="text-[18px] leading-snug">{t('complaint.lead')}</p>
      <Banner tone="info" className="!text-[16px]"><Icon name="lock" size={18} /> {t('complaint.privacy')}</Banner>

      {/* 1. paste a message */}
      <section className="card space-y-3" data-testid="paste">
        <h2 className="text-[20px] font-bold">{t('complaint.s1.title')}</h2>
        <p className={HINT}>{t('complaint.s1.hint')}</p>
        <textarea className={`${TEXTAREA} h-[120px]`} value={pasted} onChange={(e) => setPasted(e.target.value)} placeholder={t('complaint.s1.placeholder')} maxLength={3000} aria-label={t('complaint.s1.title')} />
        <button className="btn btn-primary" disabled={!pasted.trim()} onClick={findDetails}><Icon name="search" size={22} stroke={2.5} />{t('complaint.s1.button')}</button>
        {native && (
          <>
            <button className="btn btn-secondary" onClick={chooseFromSms}><Icon name="message" size={22} />{t('complaint.s1.sms')}</button>
            {smsList && (smsList.length === 0 ? <p className={HINT}>{t('complaint.s1.sms_none')}</p> : (
              <div className="space-y-2" data-testid="sms-list">
                <p className={HINT}>{t('complaint.s1.sms_pick')}</p>
                {smsList.map((m) => (
                  <button key={m.id} type="button" className="btn btn-secondary !h-auto !min-h-14 !justify-start !py-2 !text-left !text-[15px] !leading-snug" onClick={() => { setPasted(m.body); setSmsList(null) }}>
                    <span className="block"><b>{m.sender}</b> {m.body.slice(0, 90)}</span>
                  </button>
                ))}
              </div>
            ))}
          </>
        )}
        {foundNote && <Banner tone="ok" role="status" className="!text-[16px]">{foundNote}</Banner>}
      </section>

      {/* 2. what happened */}
      <section className="card space-y-3" data-testid="details">
        <h2 className="text-[20px] font-bold">{t('complaint.s2.title')}</h2>
        <div className="text-[19px] font-bold">{t('report.q.money')}</div>
        <div className="flex gap-2.5">
          <button type="button" className={`btn flex-1 ${facts.moneyLost ? 'btn-primary' : 'btn-secondary'}`} aria-pressed={facts.moneyLost} data-money="yes" onClick={() => set('moneyLost', true)}>{t('report.a.yes')}</button>
          <button type="button" className={`btn flex-1 ${!facts.moneyLost ? 'btn-primary' : 'btn-secondary'}`} aria-pressed={!facts.moneyLost} data-money="no" onClick={() => set('moneyLost', false)}>{t('report.a.no')}</button>
        </div>

        <div className={LABEL}>{t('report.happened.title')}</div>
        <div role="radiogroup" aria-label={t('report.happened.title')} className="grid grid-cols-2 gap-2">
          {CATEGORY_CODES.map((c: CategoryCode) => (
            <button key={c} type="button" role="radio" aria-checked={facts.category === c} data-category={c} className={chip(facts.category === c)} onClick={() => set('category', facts.category === c ? null : c)}>{t(`cat.${c}`)}</button>
          ))}
        </div>
        <div className={LABEL}>{t('report.channel.title')}</div>
        <div role="radiogroup" aria-label={t('report.channel.title')} className="grid grid-cols-2 gap-2">
          {ANSWER_CHANNELS.map((c: Channel) => (
            <button key={c} type="button" role="radio" aria-checked={facts.channel === c} data-channel-pick={c} className={chip(facts.channel === c)} onClick={() => set('channel', facts.channel === c ? null : c)}>{t(`trends.channel.${c}`)}</button>
          ))}
        </div>

        {facts.moneyLost && (
          <>
            <div className={LABEL}>{t('report.paid.title')}</div>
            <div role="radiogroup" aria-label={t('report.paid.title')} className="grid grid-cols-2 gap-2">
              {PAY_METHODS.map((m: PayMethod) => (
                <button key={m} type="button" role="radio" aria-checked={facts.paid === m} data-pay={m} className={chip(facts.paid === m)} onClick={() => set('paid', facts.paid === m ? null : m)}>{t(`pay.${m}`)}</button>
              ))}
            </div>
            <label className="flex flex-col gap-1.5"><span className={LABEL}>{t('complaint.f.amount')}</span>
              <input className={INPUT} inputMode="decimal" value={facts.amount} onChange={(e) => set('amount', e.target.value.replace(/[^0-9.]/g, ''))} aria-describedby="amount-hint" />
              <span id="amount-hint" className={HINT}>{t('complaint.f.amount_hint')}</span></label>
          </>
        )}

        <div className="grid grid-cols-2 gap-2.5">
          <label className="flex flex-col gap-1.5"><span className={LABEL}>{t('complaint.f.date')}</span>
            <input className={INPUT} type="date" value={facts.date} onChange={(e) => set('date', e.target.value)} /></label>
          <label className="flex flex-col gap-1.5"><span className={LABEL}>{t('complaint.f.time')}</span>
            <input className={INPUT} type="time" value={facts.time} onChange={(e) => set('time', e.target.value)} /></label>
        </div>

        {facts.moneyLost && (
          <>
            <label className="flex flex-col gap-1.5"><span className={LABEL}>{t('complaint.f.bank')}</span>
              <input className={INPUT} value={facts.bankApp} onChange={(e) => set('bankApp', e.target.value)} maxLength={60} aria-describedby="bank-hint" />
              <span id="bank-hint" className={HINT}>{t('complaint.f.bank_hint')}</span></label>
            <label className="flex flex-col gap-1.5"><span className={LABEL}>{t('complaint.f.txn')}</span>
              <input className={INPUT} value={facts.txnId} onChange={(e) => set('txnId', e.target.value)} maxLength={40} aria-describedby="txn-hint" />
              <span id="txn-hint" className={HINT}>{t('complaint.f.txn_hint')}</span></label>
            <label className="flex flex-col gap-1.5"><span className={LABEL}>{t('complaint.f.payee')}</span>
              <input className={INPUT} value={facts.payee} onChange={(e) => set('payee', e.target.value)} maxLength={80} /></label>
          </>
        )}
        <label className="flex flex-col gap-1.5"><span className={LABEL}>{t('complaint.f.phone')}</span>
          <input className={INPUT} inputMode="tel" value={facts.suspectPhone} onChange={(e) => set('suspectPhone', e.target.value)} maxLength={20} /></label>
        <label className="flex flex-col gap-1.5"><span className={LABEL}>{t('complaint.f.link')}</span>
          <input className={INPUT} inputMode="url" value={facts.suspectLink} onChange={(e) => set('suspectLink', e.target.value)} maxLength={200} /></label>
        <label className="flex flex-col gap-1.5"><span className={LABEL}>{t('complaint.f.claimed')}</span>
          <input className={INPUT} value={facts.claimedAs} onChange={(e) => set('claimedAs', e.target.value)} maxLength={80} aria-describedby="claimed-hint" />
          <span id="claimed-hint" className={HINT}>{t('complaint.f.claimed_hint')}</span></label>
        <label className="flex flex-col gap-1.5"><span className={LABEL}>{t('complaint.f.story')}</span>
          <textarea className={`${TEXTAREA} h-[110px]`} value={facts.story} onChange={(e) => set('story', e.target.value)} maxLength={1200} aria-describedby="story-hint" />
          <span id="story-hint" className={HINT}>{t('complaint.f.story_hint')}</span></label>
      </section>

      {/* 3. what was shared or done */}
      <section className="card space-y-2.5" data-testid="shared">
        <h2 className="text-[20px] font-bold">{t('complaint.s3.title')}</h2>
        {SHARED_ITEMS.map((s) => (
          <label key={s} className="flex min-h-14 items-center gap-3.5 rounded-[14px] border-2 border-line bg-white px-3.5 py-2 text-[18px] leading-snug">
            <input type="checkbox" className="size-7 flex-none accent-brand" checked={facts.shared.includes(s)} onChange={() => toggleShared(s)} data-shared={s} />
            {t(`complaint.shared.${s}`)}
          </label>
        ))}
      </section>

      {/* what to do now */}
      <section className="space-y-2.5" data-testid="plan">
        <h2 className="text-[22px] font-bold">{t('complaint.plan.title')}</h2>
        <ol className="space-y-2.5">
          {plan.map((s, i) => (
            <li key={s.id} data-plan={s.id} className={`flex gap-3 rounded-[14px] border-2 p-3 text-[18px] leading-snug ${s.when === 'now' ? 'border-bad bg-white' : 'border-line bg-white'}`}>
              <span className={`flex size-8 flex-none items-center justify-center rounded-full text-[16px] font-bold text-white ${s.when === 'now' ? 'bg-bad' : s.when === 'next' ? 'bg-brand' : 'bg-muted'}`}>{i + 1}</span>
              <span><span className="mb-0.5 block text-[13px] font-bold tracking-wide text-muted">{t(`complaint.when.${s.when}`)}</span>{t(`complaint.plan.${s.id}`)}</span>
            </li>
          ))}
        </ol>
        {facts.moneyLost && (
          <a className="btn btn-primary w-full !min-h-[64px] !text-[24px]" href={`tel:${CHANNELS.helpline_1930.phone}`}><Icon name="phone" size={28} color="#fff" />{t('report.act.call_1930')}</a>
        )}
      </section>

      {missing.length > 0 && (
        <section className="card space-y-2" data-testid="missing">
          <h3 className="text-[19px] font-bold">{t('complaint.missing.title')}</h3>
          <ul className="list-disc space-y-1.5 pl-5 text-[16px] leading-snug">
            {missing.map((m) => <li key={m}>{t(`complaint.missing.${m}`)}</li>)}
          </ul>
        </section>
      )}

      {/* if you call 1930 */}
      {facts.moneyLost && (
        <section className="card space-y-2.5" data-testid="call-sheet">
          <h3 className="text-[20px] font-bold">{t('complaint.call.title')}</h3>
          <p className="rounded-xl bg-surface p-3 text-[19px] leading-snug">{sheet.say}</p>
          <div className="text-[16px] font-bold text-muted">{t('complaint.call.have')}</div>
          <dl className="space-y-1.5 text-[17px]">
            {sheet.facts.map((x) => (
              <div key={x.id} className="flex justify-between gap-3 border-b border-line pb-1.5">
                <dt className="text-muted">{x.label}</dt>
                <dd className={x.value ? 'text-right font-bold' : 'text-right text-muted'}>{x.value ?? t('complaint.call.missing')}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* the report for the website */}
      <section className="card space-y-3" data-testid="report">
        <h2 className="text-[20px] font-bold">{t('complaint.web.title')}</h2>
        <p className={HINT}>{t('complaint.web.hint')}</p>
        <pre className="whitespace-pre-wrap rounded-lg bg-surface p-3 text-[14px]" data-testid="website-text">{website}</pre>
        <div className="grid grid-cols-2 gap-2">
          <button className="btn btn-primary !min-h-14 !text-[17px]" onClick={() => copy('all', website)}>{copied === 'all' ? t('common.copied') : t('complaint.copy_all')}</button>
          <button className="btn btn-secondary !min-h-14 !text-[17px]" onClick={() => copy('short', websiteShort)}>{copied === 'short' ? t('common.copied') : t('complaint.copy_short')}</button>
          {typeof navigator.share === 'function' && <button className="btn btn-secondary !min-h-14 !text-[17px]" onClick={share}>{t('summary.share')}</button>}
          <button className="btn btn-secondary !min-h-14 !text-[17px]" onClick={() => window.print()}>{t('complaint.print')}</button>
        </div>
        <button className="btn btn-primary" onClick={openSite} data-testid="open-site">{t('report.act.open_cybercrime')}</button>
        {offlineNote && <Banner tone="info" role="status" className="!text-[16px]">{t('report.offline')}</Banner>}

        {fields.length > 0 && (
          <div className="space-y-2" data-testid="fields">
            <h3 className="text-[18px] font-bold">{t('complaint.fields.title')}</h3>
            <p className={HINT}>{t('complaint.fields.hint')}</p>
            {fields.map((f) => (
              <div key={f.id} className="rounded-xl border-2 border-line bg-white p-2.5">
                <div className="text-[14px] font-bold text-muted">{f.label}</div>
                <div className="break-words text-[16px]">{f.value}</div>
                <button className="btn btn-secondary mt-1.5 !min-h-11 !text-[15px]" onClick={() => copy(`f.${f.id}`, f.value)} data-field-copy={f.id}>{copied === `f.${f.id}` ? t('common.copied') : t('common.copy')}</button>
              </div>
            ))}
          </div>
        )}
      </section>

      {own && (
        <section className="card space-y-2" data-testid="own-summary">
          <h3 className="text-[19px] font-bold">{t('complaint.own.title')}</h3>
          <p className={HINT}>{t('complaint.own.hint')}</p>
          <pre className="whitespace-pre-wrap rounded-lg bg-surface p-3 text-[14px]">{own}</pre>
          <div className="flex gap-2">
            <button className="btn btn-secondary flex-1 !min-h-14 !text-[17px]" onClick={() => copy('own', own)}>{copied === 'own' ? t('common.copied') : t('common.copy')}</button>
          </div>
        </section>
      )}

      <p className="text-[16px] leading-snug text-muted">{t('complaint.disclaimer')}</p>
      <button className="btn btn-secondary !text-[17px]" onClick={clearAll} data-testid="clear"><Icon name="trash" size={20} />{t('complaint.clear')}</button>

      {/* printed or saved as PDF: only the report for the website */}
      <div className="complaint-print hidden" aria-hidden="true"><pre className="whitespace-pre-wrap text-[12pt]">{website}</pre></div>
    </Layout>
  )
}

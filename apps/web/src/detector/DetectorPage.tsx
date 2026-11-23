import { useEffect, useMemo, useState } from 'react'
import { ShareReport } from '../dashboard/ShareReport'
import { useBackStep, useInnerScreenOnReturn } from '../shell/backStep'
import { useDemoMode } from '../shell/demoMode'
import { pick } from '../learn/content'
import { useLang } from '../shell/i18n'
import { Layout } from '../shell/Layout'
import { currentQuery } from '../shell/router'
import { Banner, Icon, NumberedList, type Tone } from '../shell/ui'
import type { Lexicon } from '../call/scripts'
import { consumeSharedText, isAndroidNative, readRecentSms, subscribeIncomingSms, type DeviceSms } from '../native/sms'
import { analyzeInput, type DetectResult } from './detect'
import { DEMO_MESSAGES } from './demo'
import { handleFeedback, saveLastResult } from './lastResult'
import { loadScorer, type Scorer } from './model'
import { parseSenderAndText } from './sender'
import type { BrandsFile } from './url'

const BAND = {
  likely_scam: { tone: 'bad' as Tone, icon: 'octagon' as const, color: '#c62828', num: 'bad' as const, advice: 'advice.scam' },
  suspicious: { tone: 'warn' as Tone, icon: 'warn' as const, color: '#7a4600', num: 'bad' as const, advice: 'advice.suspicious' },
  looks_genuine: { tone: 'ok' as Tone, icon: 'check' as const, color: '#14583a', num: 'ok' as const, advice: 'advice.genuine' },
}

/** Render text with highlight ranges as plain text nodes (React escapes everything; no HTML insertion). */
function Highlighted({ text, ranges }: { text: string; ranges: { start: number; end: number }[] }) {
  const parts: React.ReactNode[] = []
  let at = 0
  ranges.forEach((r, i) => {
    if (r.start > at) parts.push(text.slice(at, r.start))
    parts.push(<mark key={i} className="hl">{text.slice(r.start, r.end)}</mark>)
    at = r.end
  })
  if (at < text.length) parts.push(text.slice(at))
  return <p className="card whitespace-pre-wrap break-words !text-[19px] leading-[1.7]">{parts}</p>
}

export default function DetectorPage() {
  const { t, lang } = useLang()
  const [demoMode] = useDemoMode()
  const [scorer, setScorer] = useState<Scorer | null>(null)
  const [brands, setBrands] = useState<BrandsFile | null>(null)
  const [lex, setLex] = useState<Lexicon | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [input, setInput] = useState('')
  const [sender, setSender] = useState('')
  const [initialChecked, setInitialChecked] = useState(false)
  const [result, setResult] = useState<DetectResult | null>(null)
  const [fb, setFb] = useState(false)

  type ScannedSms = DeviceSms & { result: DetectResult }
  const nativeSms = isAndroidNative()
  const [inbox, setInbox] = useState<ScannedSms[]>([])
  const [smsLoading, setSmsLoading] = useState(nativeSms)
  const [smsDenied, setSmsDenied] = useState(false)
  const [watchingSms, setWatchingSms] = useState(false)

  const loadInbox = () => {
    if (!nativeSms || !scorer || !brands) return
    setSmsLoading(true)
    setSmsDenied(false)
    readRecentSms(30)
      .then((msgs) => {
        setInbox(msgs.map((m) => ({ ...m, result: analyzeInput(m.body, scorer, brands, lex, m.sender) })))
      })
      .catch(() => setSmsDenied(true))
      .finally(() => setSmsLoading(false))
  }

  useEffect(() => {
    let live = true
    Promise.all([loadScorer(), fetch('/model/brands.json').then((r) => r.json())])
      .then(([s, b]) => live && (setScorer(s), setBrands(b as BrandsFile)))
      .catch(() => live && setLoadError(true))
    // the call-script rules also read pasted messages; without them the checker still works on the AI model and the warning rules
    fetch('/model/call_lexicon.json').then((r) => r.json()).then((j) => live && setLex(j as Lexicon)).catch(() => {})
    return () => { live = false }
  }, [])

  // 1. Auto-scan recent SMS + watch incoming SMS live on Android APK (no form needed)
  useEffect(() => {
    if (!nativeSms || !scorer || !brands) return
    let live = true
    let stop: (() => void) | null = null

    setSmsLoading(true)
    readRecentSms(30)
      .then((msgs) => {
        if (!live) return
        setInbox(msgs.map((m) => ({ ...m, result: analyzeInput(m.body, scorer, brands, lex, m.sender) })))
        setSmsLoading(false)
        return subscribeIncomingSms((sms) => {
          const res = analyzeInput(sms.body, scorer, brands, lex, sms.sender)
          if (res.band !== 'looks_genuine') navigator.vibrate?.([250, 100, 250])
          setInbox((prev) => [{ ...sms, result: res }, ...prev.filter((x) => x.id !== sms.id)])
        })
      })
      .then((unsub) => {
        if (live && unsub) { stop = unsub; setWatchingSms(true) }
      })
      .catch(() => { if (live) { setSmsDenied(true); setSmsLoading(false) } })

    return () => { live = false; stop?.() }
  }, [nativeSms, scorer, brands, lex])

  // 2. Auto-check any message shared from WhatsApp / SMS (zero form on both APK & PWA)
  useEffect(() => {
    if (!scorer || !brands) return
    const runShared = () => {
      void consumeSharedText().then((txt) => {
        if (txt) check(txt)
      })
    }
    runShared()
    window.addEventListener('suraksha:shared', runShared)
    return () => window.removeEventListener('suraksha:shared', runShared)
  }, [scorer, brands, lex])

  // Auto-fill from query params (e.g. from Web Share Target or route query)
  useEffect(() => {
    const q = currentQuery()
    const qText = q.get('text')
    const qSender = q.get('sender')
    if (qText || qSender) {
      if (qText) {
        const parsed = parseSenderAndText(qText, qSender || undefined)
        setInput(parsed.text)
        if (parsed.sender) setSender(parsed.sender)
      } else if (qSender) {
        setSender(qSender)
      }
    }
  }, [])

  const check = (text = input, fresh = true, currentSender = sender) => {
    if (!scorer || !brands || !text.trim()) return
    const parsed = parseSenderAndText(text, currentSender || undefined)
    const effectiveSender = parsed.sender || currentSender || undefined
    const r = analyzeInput(parsed.text, scorer, brands, lex, effectiveSender)
    setInput(parsed.text)
    if (effectiveSender) setSender(effectiveSender)
    setResult(r)
    setFb(false)
    if (fresh) saveLastResult({ kind: r.type, band: r.band, script: r.script, signals: r.scamSignals, category: r.category, phrases: r.topWords, at: Date.now() })
  }

  // Auto-run check if initial shared text was provided once scorer & brands load
  useEffect(() => {
    if (scorer && brands && !initialChecked) {
      const q = currentQuery()
      const qText = q.get('text')
      if (qText) {
        setInitialChecked(true)
        const qSender = q.get('sender')
        check(qText, true, qSender || undefined)
      }
    }
  }, [scorer, brands, initialChecked])

  // Phone Back closes the result and keeps the text; coming back from the report or a lesson shows the same result again.
  const [restoreText, setRestoreText] = useState<string | null>(null)
  useInnerScreenOnReturn((d) => {
    const text = typeof d?.text === 'string' ? d.text : null
    if (text) { setInput(text); setRestoreText(text) }
    return text !== null
  })
  useEffect(() => {
    if (restoreText && scorer && brands) { check(restoreText, false); setRestoreText(null) }
  }, [restoreText, scorer, brands])
  const back = useBackStep(result !== null, () => setResult(null), { text: input })

  const canSpeak = useMemo(() => typeof window !== 'undefined' && 'speechSynthesis' in window, [])
  const speak = () => {
    if (!result || !canSpeak) return
    const b = BAND[result.band]
    const text = [t(`band.${result.band}`), t(b.advice), ...result.reasons.map((k) => t(k))].join('. ')
    const u = new SpeechSynthesisUtterance(text)
    u.lang = lang === 'en' ? 'en-IN' : 'hi-IN'
    speechSynthesis.cancel()
    speechSynthesis.speak(u)
  }

  // ---------------------------------------------------------------- result screen
  if (result) {
    const b = BAND[result.band]
    const scamLike = result.band !== 'looks_genuine'
    return (
      <Layout back onBack={back}>
        <div data-testid="result-card" data-band={result.band} className="flex flex-col gap-3" aria-live="polite">
          <Banner tone={b.tone} className="flex items-center gap-3.5 !px-4 !py-3.5">
            <Icon name={b.icon} size={52} color={b.color} />
            <div>
              <div className="text-[30px] font-bold leading-tight">{t(`band.${result.band}`)}</div>
              <div className="text-[20px] leading-snug">{t(`band.sub.${result.band}`)}</div>
            </div>
          </Banner>
          <p className="-mt-1 text-[15px] text-muted">{t(`conf.${result.confidence}`)} · {t(`detector.script.${result.script}`)}</p>

          {result.sender && (
            <div className="flex items-center gap-2 rounded-xl border border-line bg-surface p-3 text-[16px]">
              <span className="font-bold">{t('detector.sender.info')}:</span>
              <span className="font-mono font-bold text-ink">{result.sender.sender}</span>
              {result.sender.kind === 'dlt_header' && (
                <span className="ml-auto rounded-full bg-emerald-100 px-2.5 py-0.5 text-[13px] font-bold text-emerald-800">
                  TRAI DLT
                </span>
              )}
              {result.sender.kind === 'foreign_number' && (
                <span className="ml-auto rounded-full bg-red-100 px-2.5 py-0.5 text-[13px] font-bold text-red-800">
                  {result.sender.countryCode} Foreign
                </span>
              )}
              {result.sender.kind === 'personal_mobile' && (
                <span className="ml-auto rounded-full bg-amber-100 px-2.5 py-0.5 text-[13px] font-bold text-amber-800">
                  10-Digit Mobile
                </span>
              )}
            </div>
          )}

          {result.type === 'message' ? <Highlighted text={result.text} ranges={result.highlights} /> : <p className="card break-all font-mono !text-[17px]">{result.text}</p>}

          <div className="text-[22px] font-bold">{scamLike ? t('detector.why') : t('detector.why_ok')}</div>
          <NumberedList tone={b.num} items={result.reasons.map((k) => t(k))} />

          <Banner tone="warn" className="font-bold">{t(b.advice)}</Banner>
          <ShareReport kind={result.type} signals={result.scamSignals} band={result.band} />
        </div>

        <div className="mt-auto flex flex-col gap-2.5 pt-2">
          {scamLike && <a className="btn btn-primary !min-h-16 !text-[24px]" href="#/report?from=message">{t('report.cta')}</a>}
          <div className="flex gap-2.5">
            {canSpeak && <button className="btn btn-secondary flex-1 !text-[21px]" onClick={speak}><Icon name="speaker" size={26} />{t('detector.speak')}</button>}
            <a className="btn btn-secondary flex-1 !text-[21px]" href={`#/learn?from=${result.scamSignals.join(',')}`}>{t('detector.learn_short')}</a>
          </div>
          <div className="flex items-center justify-between gap-2 text-[16px] text-muted">
            <span>{fb ? t('detector.feedback.thanks') : t('detector.feedback.q')}</span>
            {!fb && (
              <span className="flex gap-2">
                <button className="rounded-lg border-2 border-line bg-white px-3 py-1.5 font-bold text-ink" onClick={() => { handleFeedback('message', true); setFb(true) }}>👍 {t('detector.feedback.right')}</button>
                <button className="rounded-lg border-2 border-line bg-white px-3 py-1.5 font-bold text-ink" onClick={() => { handleFeedback('message', false); setFb(true) }}>👎 {t('detector.feedback.wrong')}</button>
              </span>
            )}
          </div>
          <p className="flex items-center gap-1.5 text-[14px] text-muted"><Icon name="lock" size={16} />{t('detector.local')}</p>
        </div>
      </Layout>
    )
  }

  const flaggedCount = inbox.filter((m) => m.result.band !== 'looks_genuine').length

  // ---------------------------------------------------------------- input screen
  return (
    <Layout title={t('detector.title')} lead={nativeSms ? t('sms.inbox.sub') : t('detector.lead')}>
      {loadError && <Banner tone="bad" role="alert">{t('detector.error')}</Banner>}
      {!scorer && !loadError && <p className="text-muted">{t('detector.loading')}</p>}

      {nativeSms && scorer && (
        <section className="space-y-3" data-testid="sms-inbox">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-[18px] font-bold text-ink">{t('sms.inbox.title')}</h2>
              {watchingSms && <p className="text-xs font-bold text-ok">● {t('sms.inbox.live_badge')}</p>}
            </div>
            <button type="button" className="btn btn-secondary !min-h-10 !text-[14px]" onClick={loadInbox}>
              🔄 {t('sms.inbox.refresh')}
            </button>
          </div>

          {flaggedCount > 0 && (
            <Banner tone="bad" className="font-bold">⚠️ {t('sms.inbox.scam_count', { n: flaggedCount })}</Banner>
          )}

          {smsDenied ? (
            <div className="card space-y-2.5">
              <p className="text-[16px]">{t('sms.inbox.permission')}</p>
              <button type="button" className="btn btn-primary w-full" onClick={loadInbox}>{t('sms.inbox.allow')}</button>
            </div>
          ) : smsLoading ? (
            <p className="text-muted">{t('detector.loading')}</p>
          ) : inbox.length === 0 ? (
            <p className="card text-muted">{t('sms.inbox.empty')}</p>
          ) : (
            <ul className="space-y-2">
              {inbox.map((item) => {
                const bad = item.result.band === 'likely_scam'
                const warn = item.result.band === 'suspicious'
                const pill = bad
                  ? 'border-bad-line bg-bad-bg text-bad'
                  : warn
                    ? 'border-warn-line bg-warn-bg text-warn'
                    : 'border-ok-line bg-ok-bg text-ok'
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => check(item.body, true, item.sender)}
                      className={`card w-full space-y-1.5 text-left transition hover:border-brand ${bad ? 'border-bad-line!' : warn ? 'border-warn-line!' : ''}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-bold text-ink">{item.sender || 'SMS'}</span>
                        <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-bold ${pill}`}>
                          {t(`band.${item.result.band}`)}
                        </span>
                      </div>
                      <p className="line-clamp-2 text-[15px] text-muted">{item.body}</p>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      )}

      {/* Manual input: hidden inside collapsible toggle on Android APK (no form by default), visible on Web */}
      {nativeSms ? (
        <details className="card">
          <summary className="cursor-pointer font-bold text-brand">{t('sms.inbox.manual_toggle')}</summary>
          <div className="mt-3 flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="sender-input-native" className="text-[17px] font-bold text-ink">
                {t('detector.sender.label')}
              </label>
              <input
                id="sender-input-native"
                type="text"
                value={sender}
                onChange={(e) => setSender(e.target.value)}
                placeholder={t('detector.sender.placeholder')}
                maxLength={40}
                className="h-12 w-full rounded-xl border-2 border-line bg-white px-3 text-[18px] text-ink focus:border-brand focus:outline-none"
              />
            </div>
            <textarea
              id="msg-native"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('detector.placeholder')}
              maxLength={2000}
              className="h-[140px] w-full resize-none rounded-2xl border-2 border-brand bg-white p-3 text-[18px] text-ink"
            />
            <button className="btn btn-primary" disabled={!scorer || !input.trim()} onClick={() => check()}>
              <Icon name="search" size={22} stroke={2.5} />{t('detector.check')}
            </button>
          </div>
        </details>
      ) : (
        <>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="sender-input" className="text-[17px] font-bold text-ink">
              {t('detector.sender.label')}
            </label>
            <input
              id="sender-input"
              type="text"
              value={sender}
              onChange={(e) => setSender(e.target.value)}
              placeholder={t('detector.sender.placeholder')}
              maxLength={40}
              className="h-12 w-full rounded-xl border-2 border-line bg-white px-3 text-[18px] text-ink focus:border-brand focus:outline-none"
            />
          </div>

          <label htmlFor="msg" className="text-[20px] font-bold">{t('detector.label')}</label>
          <textarea
            id="msg"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('detector.placeholder')}
            maxLength={2000}
            className="h-[170px] w-full resize-none rounded-2xl border-2 border-brand bg-white p-4 text-[20px] leading-normal text-ink"
          />

          {'clipboard' in navigator && typeof navigator.clipboard?.readText === 'function' && (
            <button
              className="btn btn-secondary !min-h-[60px] !text-[22px]"
              onClick={async () => {
                try {
                  const text = await navigator.clipboard.readText()
                  const parsed = parseSenderAndText(text, sender || undefined)
                  setInput(parsed.text)
                  if (parsed.sender) setSender(parsed.sender)
                } catch {
                  /* permission refused */
                }
              }}
            >
              <Icon name="clipboard" size={26} />{t('detector.paste')}
            </button>
          )}
          <button className="btn btn-primary !min-h-[68px] !text-[26px]" disabled={!scorer || !input.trim()} onClick={() => check()}>
            <Icon name="search" size={28} stroke={2.5} />{t('detector.check')}
          </button>
        </>
      )}

      <Banner tone="info" className="flex items-center gap-3 !text-[18px]"><Icon name="lock" size={26} />{t('detector.privacy')}</Banner>

      {demoMode && (
        <section>
          <h2 className="mb-2 text-[16px] font-bold text-muted">{t('detector.examples')}</h2>
          <div className="flex flex-wrap gap-2">
            {DEMO_MESSAGES.map((m) => (
              <button key={m.id} className="rounded-full border-2 border-line bg-white px-3.5 py-2 text-[15px] font-bold text-ink" onClick={() => check(m.text, true, '')}>
                {pick(m.label, lang)}
              </button>
            ))}
          </div>
        </section>
      )}
    </Layout>
  )
}

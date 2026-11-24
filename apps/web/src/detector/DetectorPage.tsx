import { useEffect, useMemo, useState } from 'react'
import { ShareReport } from '../dashboard/ShareReport'
import { useBackStep, useInnerScreenOnReturn } from '../shell/backStep'
import { useDemoMode } from '../shell/demoMode'
import { pick } from '../learn/content'
import { formatDateTime, useLang } from '../shell/i18n'
import { Layout } from '../shell/Layout'
import { currentQuery } from '../shell/router'
import { Banner, Icon, NumberedList, type Tone } from '../shell/ui'
import type { Lexicon } from '../call/scripts'
import { consumeSharedText, isAndroidNative, openAppSettings, openChatAccessSettings, readChatMessages, readRecentSms, subscribeIncomingSms, type ChatRead, type DeviceSms } from '../native/sms'
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

const sameText = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase().slice(0, 60)

/** The SMS inbox plus the Chat (RCS) messages kept from the messaging app's notifications, newest first. An SMS also posts a notification, so a message that is in
 *  both lists is shown once (the SMS copy wins). Rejects only when the SMS inbox cannot be read. */
async function readAllMessages(): Promise<{ messages: DeviceSms[]; chat: ChatRead }> {
  const [sms, chat] = await Promise.all([readRecentSms(30), readChatMessages(30)])
  const have = new Set(sms.map((m) => sameText(m.body)))
  const extra = chat.messages.filter((m) => !have.has(sameText(m.body)))
  return { messages: [...sms, ...extra].sort((a, b) => (b.date || 0) - (a.date || 0)).slice(0, 40), chat }
}

function formatSenderDisplay(raw: string): string {
  if (!raw || !raw.trim()) return 'SMS'
  const s = raw.trim()

  // Google RCS RBM bot addresses: e.g. jio_festival_jydffppd_agent@rbm.goog or trends_8cfzvlbp_agent@r...
  if (s.includes('@rbm.goog') || s.includes('_agent@') || s.startsWith('bot:')) {
    const base = s.replace(/@.*$/i, '').replace(/^bot:/i, '').replace(/_agent$/i, '')
    const clean = base.replace(/_[a-z0-9]{6,15}(?:_[a-z0-9]+)?$/i, '')
    const words = clean.split('_').filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    if (words.length > 0) return words.join(' ')
  }

  // Trailing random hash in underscored bot ID (e.g. jiopc_offers_llcgztlq_k...)
  if (/^[a-z0-9]+_[a-z0-9]+_[a-z0-9_]+$/i.test(s) && !s.includes('-')) {
    const clean = s.replace(/_[a-z0-9]{6,15}(?:_[a-z0-9]+)?$/i, '')
    const words = clean.split('_').filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    if (words.length > 0) return words.join(' ')
  }

  // Indian Phone number formatting: e.g. +919340254236 -> +91 93402 54236
  const phoneMatch = s.match(/^(\+91)?([6-9]\d{4})(\d{5})$/)
  if (phoneMatch) {
    const prefix = phoneMatch[1] ? '+91 ' : ''
    return `${prefix}${phoneMatch[2]} ${phoneMatch[3]}`
  }

  return s
}

function getSenderAvatar(sender: string, via?: string, band?: string) {
  if (band === 'likely_scam') {
    return { icon: '🚨', bg: 'bg-red-100 text-red-700 border-red-200' }
  }
  if (band === 'suspicious') {
    return { icon: '⚡', bg: 'bg-amber-100 text-amber-800 border-amber-200' }
  }
  if (via === 'whatsapp') {
    return { icon: '💬', bg: 'bg-emerald-100 text-emerald-800 border-emerald-200' }
  }
  const clean = formatSenderDisplay(sender)
  const initial = clean.replace(/^[^a-zA-Z0-9]+/, '').charAt(0).toUpperCase() || 'S'
  return { icon: initial, bg: 'bg-slate-100 text-slate-700 border-slate-200' }
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
  const [lastScan, setLastScan] = useState<number | null>(null)
  const [chat, setChat] = useState({ supported: false, enabled: false }) // Chat (RCS) messages, read from the messaging app's notifications
  const [filter, setFilter] = useState<'all' | 'scam' | 'suspicious' | 'genuine'>('all')

  const loadInbox = () => {
    if (!nativeSms || !scorer || !brands) return
    setSmsLoading(true)
    setSmsDenied(false)
    readAllMessages()
      .then(({ messages, chat: c }) => {
        setInbox(messages.map((m) => ({ ...m, result: analyzeInput(m.body, scorer, brands, lex, m.sender) })))
        setChat({ supported: c.supported, enabled: c.enabled })
        setLastScan(Date.now())
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

  // 1. Auto-scan recent SMS and watch for new ones on the Android app (no form needed).
  // Two ways to learn about a new message, so one failing does not hide it: the live receiver (instant, but the phone can pause the page while the
  // app is in the background, and a message sent over RCS / "Chat" never reaches any app as an SMS) and a re-read of the inbox every few seconds
  // and whenever the app comes back to the screen.
  useEffect(() => {
    if (!nativeSms || !scorer || !brands) return
    let live = true
    let unsub: Promise<() => void> | null = null
    let timer: ReturnType<typeof setInterval> | null = null
    const seen = new Set<string>() // sender + text, because the live id and the inbox id of one message differ
    const keyOf = (m: DeviceSms) => `${m.sender}|${m.body}`
    const scan = (first: boolean) =>
      readAllMessages().then(({ messages, chat: c }) => {
        if (!live) return
        setChat({ supported: c.supported, enabled: c.enabled })
        const scanned = messages.map((m) => ({ ...m, result: analyzeInput(m.body, scorer, brands, lex, m.sender) }))
        if (!first && scanned.some((m) => !seen.has(keyOf(m)) && m.result.band !== 'looks_genuine')) navigator.vibrate?.([250, 100, 250])
        for (const m of scanned) seen.add(keyOf(m))
        setInbox(scanned)
        setSmsDenied(false)
        setLastScan(Date.now())
      })
    const onVisible = () => { if (document.visibilityState === 'visible') void scan(false).catch(() => {}) }

    setSmsLoading(true)
    scan(true)
      .then(() => {
        if (!live) return
        setSmsLoading(false)
        unsub = subscribeIncomingSms((sms) => {
          const res = analyzeInput(sms.body, scorer, brands, lex, sms.sender)
          if (!seen.has(keyOf(sms)) && res.band !== 'looks_genuine') navigator.vibrate?.([250, 100, 250])
          seen.add(keyOf(sms))
          setInbox((prev) => [{ ...sms, result: res }, ...prev.filter((x) => x.id !== sms.id && keyOf(x) !== keyOf(sms))])
          setLastScan(Date.now())
        })
        return unsub.then(() => { if (live) setWatchingSms(true) })
      })
      .catch(() => { if (live) { setSmsDenied(true); setSmsLoading(false) } })
    timer = setInterval(onVisible, 8000)
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      live = false
      if (timer) clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
      void unsub?.then((u) => u()).catch(() => {}) // stop listening even when the screen was left before the listener finished starting
    }
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
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [result])

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
  const scamCount = inbox.filter((m) => m.result.band === 'likely_scam').length
  const suspCount = inbox.filter((m) => m.result.band === 'suspicious').length
  const genCount = inbox.filter((m) => m.result.band === 'looks_genuine').length

  const displayInbox = inbox.filter((item) => {
    if (filter === 'scam') return item.result.band === 'likely_scam'
    if (filter === 'suspicious') return item.result.band === 'suspicious'
    if (filter === 'genuine') return item.result.band === 'looks_genuine'
    return true
  })

  // ---------------------------------------------------------------- input screen
  return (
    <Layout title={t('detector.title')} lead={nativeSms ? t('sms.inbox.sub') : t('detector.lead')}>
      {loadError && <Banner tone="bad" role="alert">{t('detector.error')}</Banner>}
      {!scorer && !loadError && <p className="text-muted">{t('detector.loading')}</p>}

      {nativeSms && scorer && (
        <section className="space-y-3.5" data-testid="sms-inbox">
          {/* Header Card with live status and refresh */}
          <div className="rounded-2xl bg-gradient-to-br from-[#163264] to-[#1e4488] p-4 text-white shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-[17px] font-bold tracking-tight">{t('sms.inbox.title')}</h2>
                  {watchingSms && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/25 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                      ● {t('sms.inbox.live_badge')}
                    </span>
                  )}
                </div>
                {lastScan && (
                  <p className="mt-0.5 text-[11.5px] text-blue-200/80 font-medium" data-testid="sms-last-checked">
                    {t('sms.inbox.last_checked', { time: formatDateTime(lastScan, lang) })}
                  </p>
                )}
              </div>
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-xl bg-white/15 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-xs transition hover:bg-white/25 active:scale-95 cursor-pointer"
                onClick={loadInbox}
              >
                🔄 {t('sms.inbox.refresh')}
              </button>
            </div>

            {flaggedCount > 0 ? (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-red-500/25 border border-red-400/30 px-3 py-2 text-xs font-bold text-red-100">
                <span className="text-sm">⚠️</span>
                <span>{t('sms.inbox.scam_count', { n: flaggedCount })}</span>
              </div>
            ) : inbox.length > 0 ? (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-500/20 border border-emerald-400/25 px-3 py-1.5 text-xs font-medium text-emerald-200">
                <span>🛡️</span>
                <span>No scam threats detected in recent messages</span>
              </div>
            ) : null}
          </div>

          {chat.supported && !chat.enabled && (
            <div className="card space-y-2.5" data-testid="chat-access">
              <h3 className="font-bold text-ink">{t('sms.chat.title')}</h3>
              <p className="text-[15px]">{t('sms.chat.why')}</p>
              <button type="button" className="btn btn-primary w-full" onClick={() => void openChatAccessSettings()}>{t('sms.chat.allow')}</button>
              <p className="text-[14px] text-muted">{t('sms.chat.restricted')}</p>
              <button type="button" className="btn btn-secondary !min-h-10 !text-[14px]" onClick={() => void openAppSettings()}>{t('sms.chat.appinfo')}</button>
            </div>
          )}
          {chat.supported && chat.enabled && <p className="text-xs font-bold text-ok" data-testid="chat-on">✓ {t('sms.chat.on')}</p>}

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
            <div className="space-y-2.5">
              {/* Category Filter Pills */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs font-bold no-scrollbar">
                <button
                  type="button"
                  onClick={() => setFilter('all')}
                  className={`rounded-full px-3 py-1.5 transition cursor-pointer ${
                    filter === 'all'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-100'
                  }`}
                >
                  All ({inbox.length})
                </button>
                {scamCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setFilter('scam')}
                    className={`rounded-full px-3 py-1.5 transition cursor-pointer ${
                      filter === 'scam'
                        ? 'bg-red-600 text-white shadow-xs'
                        : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                    }`}
                  >
                    🚨 {t('band.likely_scam')} ({scamCount})
                  </button>
                )}
                {suspCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setFilter('suspicious')}
                    className={`rounded-full px-3 py-1.5 transition cursor-pointer ${
                      filter === 'suspicious'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                    }`}
                  >
                    ⚡ {t('band.suspicious')} ({suspCount})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setFilter('genuine')}
                  className={`rounded-full px-3 py-1.5 transition cursor-pointer ${
                    filter === 'genuine'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200/80 hover:bg-emerald-100'
                  }`}
                >
                  ✓ {t('band.looks_genuine')} ({genCount})
                </button>
              </div>

              {/* Message cards */}
              {displayInbox.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-slate-500">
                  <p className="text-2xl mb-1">🎉</p>
                  <p className="font-semibold text-slate-700">No messages in this category</p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {displayInbox.map((item) => {
                    const bad = item.result.band === 'likely_scam'
                    const warn = item.result.band === 'suspicious'
                    const pill = bad
                      ? 'border-red-200 bg-red-100/90 text-red-800'
                      : warn
                        ? 'border-amber-200 bg-amber-100/90 text-amber-800'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    const displayName = formatSenderDisplay(item.sender)
                    const avatar = getSenderAvatar(item.sender, item.via, item.result.band)

                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => check(item.body, true, item.sender)}
                          className={`group relative w-full overflow-hidden rounded-2xl border bg-white p-3 text-left transition-all duration-150 active:scale-[0.99] hover:shadow-md cursor-pointer ${
                            bad
                              ? 'border-red-300 hover:border-red-400 bg-gradient-to-r from-red-50/40 via-white to-white'
                              : warn
                                ? 'border-amber-300 hover:border-amber-400 bg-gradient-to-r from-amber-50/30 via-white to-white'
                                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/40'
                          }`}
                        >
                          {/* Colored left indicator strip */}
                          <div
                            className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                              bad ? 'bg-red-500' : warn ? 'bg-amber-400' : 'bg-emerald-400/80'
                            }`}
                          />

                          <div className="flex items-start gap-2.5 pl-1.5">
                            {/* Visual Avatar */}
                            <div
                              className={`flex size-10 shrink-0 items-center justify-center rounded-xl border text-sm font-bold shadow-2xs ${avatar.bg}`}
                            >
                              {avatar.icon}
                            </div>

                            {/* Message Details */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1.5">
                                <div className="flex min-w-0 items-center gap-1.5">
                                  <span className="truncate text-[15px] font-bold text-slate-900">
                                    {displayName}
                                  </span>
                                  {item.via === 'chat' && (
                                    <span
                                      className="rounded-md bg-blue-50 border border-blue-200 px-1.5 py-0.2 text-[10.5px] font-bold text-blue-700 shrink-0"
                                      data-testid="chat-badge"
                                    >
                                      {t('sms.chat.badge')}
                                    </span>
                                  )}
                                  {item.via === 'whatsapp' && (
                                    <span
                                      className="rounded-md bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 text-[10.5px] font-bold text-emerald-700 shrink-0"
                                      data-testid="whatsapp-badge"
                                    >
                                      {t('sms.whatsapp.badge')}
                                    </span>
                                  )}
                                </div>

                                <span
                                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-bold tracking-tight shadow-2xs ${pill}`}
                                >
                                  {bad ? `🚨 ${t('band.likely_scam')}` : warn ? `⚡ ${t('band.suspicious')}` : `✓ ${t('band.looks_genuine')}`}
                                </span>
                              </div>

                              <p className="mt-0.5 text-[11.5px] font-medium text-slate-400">
                                {item.date ? formatDateTime(item.date, lang) : ''}
                              </p>

                              <p className="mt-1 line-clamp-2 text-[13.5px] leading-relaxed text-slate-600">
                                {item.body}
                              </p>
                            </div>
                          </div>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
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

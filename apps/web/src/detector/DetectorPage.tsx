import { useEffect, useMemo, useState } from 'react'
import { ShareReport } from '../dashboard/ShareReport'
import { useLang } from '../shell/i18n'
import { Layout } from '../shell/Layout'
import { Banner, Icon, NumberedList, type Tone } from '../shell/ui'
import { analyzeInput, type DetectResult } from './detect'
import { DEMO_MESSAGES } from './demo'
import { handleFeedback, saveLastResult } from './lastResult'
import { loadScorer, type Scorer } from './model'
import type { BrandsFile } from './url'

const BAND = {
  likely_scam: { tone: 'bad' as Tone, icon: 'octagon' as const, color: '#c62828', num: 'bad' as const, advice: 'advice.scam', en: 'Likely scam' },
  suspicious: { tone: 'warn' as Tone, icon: 'warn' as const, color: '#7a4600', num: 'bad' as const, advice: 'advice.suspicious', en: 'Suspicious' },
  looks_genuine: { tone: 'ok' as Tone, icon: 'check' as const, color: '#14583a', num: 'ok' as const, advice: 'advice.genuine', en: 'Looks genuine' },
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
  const [scorer, setScorer] = useState<Scorer | null>(null)
  const [brands, setBrands] = useState<BrandsFile | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [input, setInput] = useState('')
  const [result, setResult] = useState<DetectResult | null>(null)
  const [fb, setFb] = useState(false)

  useEffect(() => {
    let live = true
    Promise.all([loadScorer(), fetch('/model/brands.json').then((r) => r.json())])
      .then(([s, b]) => live && (setScorer(s), setBrands(b as BrandsFile)))
      .catch(() => live && setLoadError(true))
    return () => { live = false }
  }, [])

  const check = (text = input) => {
    if (!scorer || !brands || !text.trim()) return
    const r = analyzeInput(text, scorer, brands)
    setResult(r)
    setFb(false)
    saveLastResult({ kind: r.type, band: r.band, script: r.script, signals: r.scamSignals, phrases: r.topWords, at: Date.now() })
  }

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
      <Layout back onBack={() => setResult(null)}>
        <div data-testid="result-card" data-band={result.band} className="flex flex-col gap-3" aria-live="polite">
          <Banner tone={b.tone} className="flex items-center gap-3.5 !px-4 !py-3.5">
            <Icon name={b.icon} size={52} color={b.color} />
            <div>
              <div className="text-[30px] font-bold leading-tight">{t(`band.${result.band}`)}</div>
              <div className="text-[20px] leading-snug">{t(`band.sub.${result.band}`)}{lang !== 'en' ? ` · ${b.en}` : ''}</div>
            </div>
          </Banner>
          <p className="-mt-1 text-[15px] text-muted">{t(`conf.${result.confidence}`)} · {t(`detector.script.${result.script}`)}</p>

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

  // ---------------------------------------------------------------- input screen
  return (
    <Layout title={t('detector.title')} lead={t('detector.lead')}>
      {loadError && <Banner tone="bad" role="alert">{t('detector.error')}</Banner>}
      {!scorer && !loadError && <p className="text-muted">{t('detector.loading')}</p>}

      <label htmlFor="msg" className="text-[20px] font-bold">{t('detector.label')}</label>
      <textarea
        id="msg"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={t('detector.placeholder')}
        maxLength={2000}
        className="h-[190px] w-full resize-none rounded-2xl border-2 border-brand bg-white p-4 text-[20px] leading-normal text-ink"
      />

      {'clipboard' in navigator && typeof navigator.clipboard?.readText === 'function' && (
        <button className="btn btn-secondary !min-h-[60px] !text-[22px]" onClick={async () => { try { setInput(await navigator.clipboard.readText()) } catch { /* permission refused */ } }}>
          <Icon name="clipboard" size={26} />{t('detector.paste')}
        </button>
      )}
      <button className="btn btn-primary !min-h-[68px] !text-[26px]" disabled={!scorer || !input.trim()} onClick={() => check()}>
        <Icon name="search" size={28} stroke={2.5} />{t('detector.check')}
      </button>

      <Banner tone="info" className="flex items-center gap-3 !text-[18px]"><Icon name="lock" size={26} />{t('detector.privacy')}</Banner>

      <section>
        <h2 className="mb-2 text-[16px] font-bold text-muted">{t('detector.examples')}</h2>
        <div className="flex flex-wrap gap-2">
          {DEMO_MESSAGES.map((m) => (
            <button key={m.id} className="rounded-full border-2 border-line bg-white px-3.5 py-2 text-[15px] font-bold text-ink" onClick={() => { setInput(m.text); check(m.text) }}>
              {m.label}
            </button>
          ))}
        </div>
      </section>
    </Layout>
  )
}

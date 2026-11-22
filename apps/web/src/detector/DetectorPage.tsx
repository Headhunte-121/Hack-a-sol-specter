import { useEffect, useMemo, useState } from 'react'
import { useLang } from '../shell/i18n'
import { Layout } from '../shell/Layout'
import { analyzeInput, type DetectResult } from './detect'
import { DEMO_MESSAGES } from './demo'
import { handleFeedback, saveLastResult } from './lastResult'
import { loadScorer, type Scorer } from './model'
import type { BrandsFile } from './url'

const BAND_STYLE = {
  likely_scam: { box: 'border-red-700 bg-red-50 text-red-950', icon: '⛔', bar: 'bg-red-700' },
  suspicious: { box: 'border-amber-600 bg-amber-50 text-amber-950', icon: '⚠️', bar: 'bg-amber-600' },
  looks_genuine: { box: 'border-green-700 bg-green-50 text-green-950', icon: '✅', bar: 'bg-green-700' },
} as const

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
  return <p className="whitespace-pre-wrap break-words rounded-lg bg-white p-3 text-base leading-8">{parts}</p>
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
    return () => {
      live = false
    }
  }, [])

  const check = (text = input) => {
    if (!scorer || !brands || !text.trim()) return
    const r = analyzeInput(text, scorer, brands)
    setResult(r)
    setFb(false)
    saveLastResult({
      kind: r.type, band: r.band, script: r.script, signals: r.scamSignals, phrases: r.topWords, at: Date.now(),
    })
  }

  const speak = () => {
    if (!result || !('speechSynthesis' in window)) return
    const u = new SpeechSynthesisUtterance(t('band.spoken.likely_scam'))
    u.lang = lang === 'en' ? 'en-IN' : 'hi-IN'
    speechSynthesis.cancel()
    speechSynthesis.speak(u)
  }

  const style = result ? BAND_STYLE[result.band] : null
  const canSpeak = useMemo(() => typeof window !== 'undefined' && 'speechSynthesis' in window, [])

  return (
    <Layout title={t('detector.title')}>
      {loadError && <div role="alert" className="rounded-xl border-2 border-red-600 bg-red-50 p-3 text-red-900">{t('detector.error')}</div>}
      {!scorer && !loadError && <p>{t('detector.loading')}</p>}

      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={t('detector.placeholder')}
        rows={5}
        maxLength={2000}
        className="w-full rounded-xl border-2 border-slate-400 bg-white p-3 text-base"
        aria-label={t('detector.placeholder')}
      />
      <div className="grid grid-cols-3 gap-2">
        <button className="btn btn-primary col-span-3" disabled={!scorer || !input.trim()} onClick={() => check()}>
          🔍 {t('detector.check')}
        </button>
        {'clipboard' in navigator && typeof navigator.clipboard?.readText === 'function' && (
          <button className="btn btn-secondary" onClick={async () => { try { setInput(await navigator.clipboard.readText()) } catch { /* permission refused */ } }}>
            📋 {t('detector.paste')}
          </button>
        )}
        <button className="btn btn-secondary" onClick={() => { setInput(''); setResult(null) }}>
          ✖ {t('detector.clear')}
        </button>
      </div>

      <section>
        <h2 className="mb-2 font-bold">{t('detector.examples')}</h2>
        <div className="flex flex-wrap gap-2">
          {DEMO_MESSAGES.map((m) => (
            <button key={m.id} className="rounded-full border-2 border-slate-400 bg-white px-3 py-2 text-sm font-bold" onClick={() => { setInput(m.text); check(m.text) }}>
              {m.label}
            </button>
          ))}
        </div>
      </section>

      {result && style && (
        <section aria-live="polite" className={`space-y-3 rounded-2xl border-4 p-4 ${style.box}`} data-testid="result-card" data-band={result.band}>
          <div className="flex items-center gap-3">
            <span className="text-4xl" aria-hidden>{style.icon}</span>
            <div>
              <p className="text-xl font-bold">{t(`band.${result.band}`)}</p>
              <p className="text-sm">{t(`conf.${result.confidence}`)} · {t(`detector.script.${result.script}`)}</p>
            </div>
            {canSpeak && result.band === 'likely_scam' && (
              <button className="btn btn-secondary ml-auto min-h-11" onClick={speak} aria-label={t('detector.speak')}>🔊</button>
            )}
          </div>

          {result.type === 'message' && <Highlighted text={result.text} ranges={result.highlights} />}
          {result.topWords.length > 0 && result.band !== 'looks_genuine' && (
            <p className="text-sm"><strong>{t('detector.flagged')}:</strong> {result.topWords.join(' · ')}</p>
          )}

          <div>
            <h3 className="font-bold">{t('detector.why')}</h3>
            <ul className="list-disc space-y-1 pl-5">
              {result.reasons.map((k) => <li key={k}>{t(k)}</li>)}
            </ul>
          </div>

          <div>
            <h3 className="font-bold">{t('detector.next')}</h3>
            <ul className="list-disc space-y-1 pl-5">
              {result.actions.map((k) => <li key={k}>{t(k)}</li>)}
            </ul>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {result.band !== 'looks_genuine' && <a className="btn btn-danger" href="#/report?from=message">🚨 {t('action.report')}</a>}
            <a className="btn btn-secondary" href={`#/learn?from=${result.scamSignals.join(',')}`}>🎓 {t('detector.learn')}</a>
          </div>

          <div className="border-t border-current/30 pt-3">
            <p className="font-bold">{t('detector.feedback.q')}</p>
            {fb ? (
              <p role="status">{t('detector.feedback.thanks')}</p>
            ) : (
              <div className="mt-1 flex gap-2">
                <button className="btn btn-secondary flex-1" onClick={() => { handleFeedback('message', true); setFb(true) }}>👍 {t('detector.feedback.right')}</button>
                <button className="btn btn-secondary flex-1" onClick={() => { handleFeedback('message', false); setFb(true) }}>👎 {t('detector.feedback.wrong')}</button>
              </div>
            )}
          </div>
          <p className="text-xs">🔒 {t('detector.local')}</p>
        </section>
      )}
    </Layout>
  )
}

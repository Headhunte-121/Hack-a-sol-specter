import { useEffect, useMemo, useRef, useState } from 'react'
import { loadScorer, type Scorer } from '../detector/model'
import { handleFeedback, saveLastResult } from '../detector/lastResult'
import { ShareReport } from '../dashboard/ShareReport'
import type { CategoryCode } from '../shared/categories'
import { useLang } from '../shell/i18n'
import { Layout } from '../shell/Layout'
import { analyzeCall, fmtTime, hitRanges, STAGES, type CallResult, type Lexicon, type Segment } from './analyze'
import { asrBase, AsrError, audioDuration, startRecording, uploadForTranscript, validateClip } from './asr'
import { buildEvidenceNote, SCRIPT_CATEGORY } from './evidence'
import { postProcessTranscript } from './normalize'

interface DemoCall { id: string; title: string; style: string; segments: Segment[] }
type Mode = 'examples' | 'paste' | 'audio'
type Analysed = { result: CallResult; segments: Segment[]; duration: number | null; label?: string }

const LEVEL_STYLE = {
  high: { box: 'border-bad-line bg-bad-bg text-bad', icon: '⛔' },
  medium: { box: 'border-warn-line bg-warn-bg text-warn', icon: '⚠️' },
  low: { box: 'border-ok-line bg-ok-bg text-ok', icon: '✅' },
} as const

export default function CallPage() {
  const { t } = useLang()
  const [lex, setLex] = useState<Lexicon | null>(null)
  const [demos, setDemos] = useState<DemoCall[]>([])
  const [scorer, setScorer] = useState<Scorer | null>(null)
  const [mode, setMode] = useState<Mode>('examples')
  const [pasted, setPasted] = useState('')
  const [out, setOut] = useState<Analysed | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [recording, setRecording] = useState<{ stop: () => Promise<Blob> } | null>(null)
  const [fb, setFb] = useState(false)
  const [copied, setCopied] = useState(false)
  const abort = useRef<AbortController | null>(null)
  const segRefs = useRef<Record<number, HTMLElement | null>>({})

  useEffect(() => {
    void fetch('/model/call_lexicon.json').then((r) => r.json()).then(setLex)
    void fetch('/content/demo_calls.json').then((r) => r.json()).then((j: { calls: DemoCall[] }) => setDemos(j.calls))
    void loadScorer().then(setScorer).catch(() => setScorer(null)) // the learned window score is optional: rules still work without it
  }, [])

  const run = (segments: Segment[], duration: number | null, label?: string) => {
    if (!lex) return
    const result = analyzeCall(segments, lex, scorer)
    setOut({ result, segments, duration, label })
    setFb(false); setError(null); setStatus(null); setCopied(false)
    const category = result.topScript ? (SCRIPT_CATEGORY[result.topScript] as CategoryCode) : undefined
    saveLastResult({
      kind: 'call', band: result.level === 'high' ? 'likely_scam' : result.level === 'medium' ? 'suspicious' : 'looks_genuine', script: 'call',
      signals: [], category, phrases: [...new Set(result.hits.map((h) => result.text.slice(h.charStart, h.charEnd)))].filter((w) => !/\d{6,}/.test(w)).slice(0, 8),
      durationSec: duration ?? undefined, at: Date.now(),
    })
  }

  const fromPaste = () => run([{ start: null, end: null, text: postProcessTranscript(pasted) }], null)

  const handleBlob = async (blob: Blob & { name?: string }) => {
    setError(null); setOut(null)
    const dur = await audioDuration(blob)
    const bad = validateClip(blob, dur)
    if (bad) { setError(`call.err.${bad}`); return }
    const ctl = new AbortController(); abort.current = ctl
    try {
      const r = await uploadForTranscript(blob, { signal: ctl.signal, onStatus: (s) => setStatus(`call.status.${s}`) })
      const segs = r.segments.map((s) => ({ ...s, text: postProcessTranscript(s.text) }))
      if (!segs.some((s) => s.text)) throw new AsrError('silent')
      run(segs, r.duration)
    } catch (e) {
      setStatus(null)
      setError(e instanceof AsrError ? (e.code === 'cancelled' ? null : `call.err.${e.code}`) : 'call.err.failed')
    } finally { abort.current = null }
  }

  const toggleRecord = async () => {
    if (recording) { const b = await recording.stop(); setRecording(null); void handleBlob(b); return }
    try { setRecording(await startRecording((b) => { setRecording(null); void handleBlob(b) })) } catch (e) { setError(e instanceof AsrError ? `call.err.${e.code}` : 'call.err.failed') }
  }

  const res = out?.result
  const style = res ? LEVEL_STYLE[res.level] : null
  const ranges = useMemo(() => (res ? hitRanges(res) : []), [res])
  const phraseChips = useMemo(() => {
    if (!res) return []
    const seen = new Set<string>(); const chips: { text: string; segment: number; time: number | null }[] = []
    for (const h of res.hits) { const w = res.text.slice(h.charStart, h.charEnd); const k = `${h.segment}:${w}`; if (!seen.has(k) && !/\d{6,}/.test(w)) { seen.add(k); chips.push({ text: w, segment: h.segment, time: h.time }) } }
    return chips.slice(0, 14)
  }, [res])

  const renderSegment = (seg: Segment, i: number) => {
    const base = res!.segmentStarts[i] ?? 0
    const parts: React.ReactNode[] = []; let at = 0
    for (const r of ranges) {
      if (r.end <= base || r.start >= base + seg.text.length) continue
      const s = Math.max(r.start, base) - base, e = Math.min(r.end, base + seg.text.length) - base
      if (s > at) parts.push(seg.text.slice(at, s))
      parts.push(<mark key={`${i}-${s}`} className="hl">{seg.text.slice(s, e)}</mark>); at = e
    }
    if (at < seg.text.length) parts.push(seg.text.slice(at))
    return (
      <p key={i} ref={(el) => { segRefs.current[i] = el }} className="rounded-lg bg-white p-2 leading-8">
        {seg.start !== null && <span className="mr-2 font-mono text-xs text-muted">{fmtTime(seg.start)}</span>}{parts}
      </p>
    )
  }

  const copyNote = async () => {
    if (!res) return
    try { await navigator.clipboard.writeText(buildEvidenceNote(res, out!.duration, t)); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { /* clipboard blocked */ }
  }
  const tabs: Mode[] = ['examples', 'paste', 'audio']
  const topEv = res && res.topScript ? res.evidence.find((e) => e.script === res.topScript) : null

  return (
    <Layout title={t('call.title')}>
      <p className="rounded-lg bg-soft p-2 text-sm">ℹ️ {t('call.langnote')}</p>
      <div role="tablist" className="grid grid-cols-3 gap-1">
        {tabs.map((m) => <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)} className={`min-h-12 rounded-2xl border-2 text-sm font-bold ${mode === m ? 'border-brand bg-brand text-white' : 'border-line bg-white text-ink'}`}>{t(`call.mode.${m}`)}</button>)}
      </div>

      {mode === 'examples' && (
        <section className="space-y-2">
          <p className="text-sm text-muted">{t('call.examples.note')}</p>
          {demos.map((d) => <button key={d.id} className="card w-full text-left font-bold" onClick={() => run(d.segments, d.segments[d.segments.length - 1]?.end ?? null, d.title)}>🎧 {d.title}</button>)}
        </section>
      )}

      {mode === 'paste' && (
        <section className="space-y-2">
          <textarea value={pasted} onChange={(e) => setPasted(e.target.value)} rows={6} maxLength={6000} placeholder={t('call.paste.placeholder')} className="w-full rounded-2xl border-2 border-line bg-white text-ink p-3" aria-label={t('call.paste.placeholder')} />
          <button className="btn btn-primary w-full" disabled={!lex || !pasted.trim()} onClick={fromPaste}>🔍 {t('call.analyse')}</button>
        </section>
      )}

      {mode === 'audio' && (
        <section className="space-y-3">
          <p className="rounded-2xl border-2 border-warn-line bg-warn-bg p-3 text-sm text-warn">🔒 {t('call.audio.warning')}</p>
          {!asrBase() ? <p className="card">{t('call.audio.nobackend')}</p> : (
            <>
              <label className="btn btn-secondary cursor-pointer">📁 {t('call.audio.pick')}
                <input type="file" accept="audio/*,.mp3,.wav,.m4a,.ogg,.webm" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleBlob(f); e.target.value = '' }} />
              </label>
              <button className={`btn w-full ${recording ? 'btn-danger' : 'btn-secondary'}`} onClick={toggleRecord}>{recording ? `⏹ ${t('call.audio.stop')}` : `🎙️ ${t('call.audio.record')}`}</button>
              {recording && <p role="status" className="font-bold text-bad">● {t('call.audio.recording')}</p>}
              <p className="text-xs text-muted">{t('call.audio.limits')}</p>
            </>
          )}
          {status && (
            <div role="status" className="card space-y-2"><p>⏳ {t(status)}</p><button className="btn btn-secondary min-h-11" onClick={() => abort.current?.abort()}>{t('call.cancel')}</button></div>
          )}
        </section>
      )}

      {error && (
        <div role="alert" className="space-y-2 rounded-2xl border-2 border-bad-line bg-bad-bg p-3 text-bad">
          <p>{t(error)}</p>
          {mode === 'audio' && <button className="underline" onClick={() => { setError(null); setMode('paste') }}>{t('call.try_paste')}</button>}
        </div>
      )}

      {res && style && out && (
        <section aria-live="polite" className={`space-y-3 rounded-2xl border-4 p-4 ${style.box}`} data-testid="call-result" data-level={res.level}>
          {out.label && <p className="text-xs">{t('call.example.label')}: {out.label}</p>}
          <div className="flex items-center gap-3"><span className="text-4xl" aria-hidden>{style.icon}</span>
            <div><p className="text-xl font-bold">{t(`call.level.${res.level}`)}</p>{res.topScript && res.level !== 'low' && <p className="font-bold">{t(`call.script.${res.topScript}`)}</p>}</div></div>
          <p>{t(`call.advice.${res.level}`)}</p>

          {topEv && res.level !== 'low' && (
            <div><h3 className="font-bold">{t('call.stages.heard')}</h3>
              <ul className="space-y-1">{STAGES.map((s) => <li key={s} className={topEv.stages[s].heard ? 'font-bold' : 'opacity-60'}>{topEv.stages[s].heard ? '✔' : '–'} {t(`call.stage.${s}`)}</li>)}</ul></div>
          )}

          {phraseChips.length > 0 && res.level !== 'low' && (
            <div><h3 className="mb-1 font-bold">{t('call.phrases')}</h3>
              <div className="flex flex-wrap gap-2">{phraseChips.map((c, i) => (
                <button key={i} className="rounded-full border-2 border-current bg-white px-3 py-1 text-sm font-bold" onClick={() => segRefs.current[c.segment]?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>
                  {c.time !== null && <span className="mr-1 font-mono text-xs">{fmtTime(c.time)}</span>}{c.text}
                </button>))}</div></div>
          )}

          <div><h3 className="mb-1 font-bold">{t('call.transcript')}</h3><div className="space-y-1">{out.segments.filter((s) => s.text.trim()).map(renderSegment)}</div></div>

          {res.level !== 'low' && <a className="btn btn-danger" href="#/report?from=call">🚨 {t('call.report')}</a>}
          <button className="btn btn-secondary w-full" onClick={copyNote}>📋 {copied ? t('common.copied') : t('call.evidence')}</button>
          <ShareReport kind="call" signals={[]} band={res.level === 'high' ? 'likely_scam' : res.level === 'medium' ? 'suspicious' : 'looks_genuine'} category={res.topScript ? (SCRIPT_CATEGORY[res.topScript] as CategoryCode) : undefined} />

          <div className="border-t border-current/30 pt-3"><p className="font-bold">{t('call.feedback.q')}</p>
            {fb ? <p role="status">{t('detector.feedback.thanks')}</p> : (
              <div className="mt-1 flex gap-2">
                <button className="btn btn-secondary flex-1" onClick={() => { handleFeedback('call', true); setFb(true) }}>👍 {t('detector.feedback.right')}</button>
                <button className="btn btn-secondary flex-1" onClick={() => { handleFeedback('call', false); setFb(true) }}>👎 {t('detector.feedback.wrong')}</button>
              </div>)}</div>
        </section>
      )}
    </Layout>
  )
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { loadScorer, type Scorer } from '../detector/model'
import { pick, type Tri } from '../learn/content'
import { handleFeedback, saveLastResult } from '../detector/lastResult'
import { ShareReport } from '../dashboard/ShareReport'
import type { CategoryCode } from '../shared/categories'
import { useLang } from '../shell/i18n'
import { Layout } from '../shell/Layout'
import { Banner, NumberedList, type Tone } from '../shell/ui'
import { useBackStep } from '../shell/backStep'
import { isDemoMode, useDemoMode } from '../shell/demoMode'
import { analyzeCall, fmtTime, hitRanges, STAGES, type CallResult, type Lexicon, type Segment } from './analyze'
import { asrBase, AsrError, audioDuration, startRecording, uploadForTranscript, validateClip } from './asr'
import { buildEvidenceNote, SCRIPT_CATEGORY } from './evidence'
import { postProcessTranscript } from './normalize'

interface DemoCall { id: string; title: Tri; style: string; segments: Segment[] }
type Mode = 'examples' | 'paste' | 'audio'
type Analysed = { result: CallResult; segments: Segment[]; duration: number | null; label?: Tri }

const LEVEL_STYLE = {
  high: { tone: 'bad' as Tone, icon: '⛔', color: '#c62828' },
  medium: { tone: 'warn' as Tone, icon: '⚠️', color: '#7a4600' },
  low: { tone: 'ok' as Tone, icon: '✅', color: '#14583a' },
} as const

export default function CallPage() {
  const { t, lang } = useLang()
  const [demoMode] = useDemoMode()
  const [lex, setLex] = useState<Lexicon | null>(null)
  const [demos, setDemos] = useState<DemoCall[]>([])
  const [scorer, setScorer] = useState<Scorer | null>(null)
  const [mode, setMode] = useState<Mode>(() => (isDemoMode() ? 'examples' : 'audio'))
  const [pasted, setPasted] = useState('')
  const [out, setOut] = useState<Analysed | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [recording, setRecording] = useState<{ stop: () => Promise<Blob>; cancel: () => void } | null>(null)
  const [fb, setFb] = useState(false)
  const [copied, setCopied] = useState(false)
  const abort = useRef<AbortController | null>(null)
  const recRef = useRef<{ cancel: () => void } | null>(null)
  const segRefs = useRef<Record<number, HTMLElement | null>>({})
  recRef.current = recording

  useEffect(() => {
    let live = true
    fetch('/model/call_lexicon.json').then((r) => r.json()).then((j) => live && setLex(j)).catch(() => live && setError('detector.error'))
    fetch('/content/demo_calls.json').then((r) => r.json()).then((j: { calls: DemoCall[] }) => live && setDemos(j.calls)).catch(() => {})
    void loadScorer().then((s) => live && setScorer(s)).catch(() => live && setScorer(null))
    return () => { live = false; recRef.current?.cancel(); abort.current?.abort() }
  }, [])

  const run = (segments: Segment[], duration: number | null, label?: Tri) => {
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

  const back = useBackStep(out !== null, () => setOut(null))

  const res = out?.result
  const style = res ? LEVEL_STYLE[res.level] : null
  const ranges = useMemo(() => (res ? hitRanges(res) : []), [res])
  const phraseChips = useMemo(() => {
    if (!res) return []
    const seen = new Set<string>(); const chips: { text: string; segment: number; time: number | null }[] = []
    for (const h of res.hits) {
      const w = res.text.slice(h.charStart, h.charEnd)
      const k = `${h.segment}:${w}`
      if (!seen.has(k) && !/\d{6,}/.test(w)) {
        seen.add(k)
        chips.push({ text: w, segment: h.segment, time: h.time })
      }
    }
    return chips.slice(0, 8)
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
      <p key={i} ref={(el) => { segRefs.current[i] = el }} className="rounded-lg bg-surface p-2.5 text-[17px] leading-relaxed border border-line/60">
        {seg.start !== null && <span className="mr-2 font-mono text-xs font-bold text-muted">{fmtTime(seg.start)}</span>}{parts}
      </p>
    )
  }

  const jumpToSegment = (segIdx: number) => {
    const details = document.getElementById('call-transcript-details') as HTMLDetailsElement | null
    if (details) details.open = true
    setTimeout(() => {
      segRefs.current[segIdx]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 100)
  }

  const copyNote = async () => {
    if (!res) return
    try { await navigator.clipboard.writeText(buildEvidenceNote(res, out!.duration, t, new Date(), lang)); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { /* clipboard blocked */ }
  }

  useEffect(() => {
    if (!demoMode && mode === 'examples') {
      setMode('audio')
    }
  }, [demoMode, mode])

  const tabs: Mode[] = demoMode ? ['examples', 'paste', 'audio'] : ['audio', 'paste']
  const topEv = res && res.topScript ? res.evidence.find((e) => e.script === res.topScript) : null
  const heardStages = res && topEv && res.level !== 'low' ? STAGES.filter((s) => topEv.stages[s].heard) : []

  // ---------------------------------------------------------------- RESULT VIEW
  if (res && style && out) {
    return (
      <Layout title={t('call.title')} back onBack={back}>
        <div data-testid="call-result" data-level={res.level} className="flex flex-col gap-3" aria-live="polite">
          {/* 1. Clear Verdict Banner */}
          <Banner tone={style.tone} className="flex items-center gap-3.5 !px-4 !py-3.5">
            <span className="text-4xl" aria-hidden>{style.icon}</span>
            <div>
              <div className="text-[26px] font-bold leading-tight">{t(`call.level.${res.level}`)}</div>
              {res.topScript && res.level !== 'low' && (
                <div className="text-[18px] font-medium opacity-90">{t(`call.script.${res.topScript}`)}</div>
              )}
            </div>
          </Banner>

          {demoMode && out.label && <p className="-mt-1 text-xs text-muted">{t('call.example.label')}: {pick(out.label, lang)}</p>}

          {/* 2. Immediate Action Advice */}
          <Banner tone="warn" className="font-bold flex items-start gap-2.5 !text-[18px]">
            <span className="text-xl">🛑</span>
            <span>{t(`call.advice.${res.level}`)}</span>
          </Banner>

          {/* 3. Red Flags Heard (Filtered only to what was actually detected) */}
          {heardStages.length > 0 && (
            <div className="card space-y-2">
              <h3 className="text-[19px] font-bold text-ink">{t('call.stages.heard')}</h3>
              <NumberedList tone="bad" items={heardStages.map((s) => t(`call.stage.${s}`))} />
            </div>
          )}

          {/* 4. Flagged Words */}
          {phraseChips.length > 0 && res.level !== 'low' && (
            <div className="card space-y-2">
              <h3 className="text-[17px] font-bold text-muted">{t('call.phrases')}</h3>
              <div className="flex flex-wrap gap-2">
                {phraseChips.map((c, i) => (
                  <button
                    key={i}
                    className="rounded-full border border-bad-line bg-bad-bg px-3 py-1 text-sm font-bold text-bad hover:opacity-80 transition-opacity"
                    onClick={() => jumpToSegment(c.segment)}
                  >
                    {c.time !== null && <span className="mr-1 font-mono text-xs opacity-75">{fmtTime(c.time)}</span>}
                    {c.text}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 5. Collapsible Transcript */}
          <details id="call-transcript-details" className="card group cursor-pointer">
            <summary className="flex items-center justify-between font-bold text-ink select-none">
              <span className="flex items-center gap-2">📝 {t('call.transcript')} <span className="text-sm font-normal text-muted">({out.segments.filter((s) => s.text.trim()).length} lines)</span></span>
              <span className="text-muted text-sm transition-transform group-open:rotate-180">▼</span>
            </summary>
            <div className="mt-3 space-y-1.5 max-h-[340px] overflow-y-auto pr-1 pt-2 border-t border-line">
              {out.segments.filter((s) => s.text.trim()).map(renderSegment)}
            </div>
          </details>

          {/* 6. Action buttons */}
          <div className="mt-2 flex flex-col gap-2.5">
            {res.level !== 'low' && (
              <a className="btn btn-primary !min-h-16 !text-[22px]" href="#/report?from=call">
                🚨 {t('call.report')}
              </a>
            )}
            <div className="flex gap-2">
              <button className="btn btn-secondary flex-1 !text-[19px]" onClick={copyNote}>
                📋 {copied ? t('common.copied') : t('call.evidence')}
              </button>
              <button className="btn btn-secondary flex-1 !text-[19px]" onClick={() => { setOut(null); setPasted('') }}>
                🔄 {t('call.another')}
              </button>
            </div>
          </div>

          {/* 7. Bottom sharing & feedback */}
          <div className="pt-2">
            <ShareReport kind="call" signals={[]} band={res.level === 'high' ? 'likely_scam' : res.level === 'medium' ? 'suspicious' : 'looks_genuine'} category={res.topScript ? (SCRIPT_CATEGORY[res.topScript] as CategoryCode) : undefined} />
          </div>

          <div className="border-t border-line pt-3">
            <p className="font-bold text-ink">{t('call.feedback.q')}</p>
            {fb ? <p role="status" className="text-muted text-sm mt-1">{t('detector.feedback.thanks')}</p> : (
              <div className="mt-2 flex gap-2">
                <button className="btn btn-secondary flex-1 !min-h-12 !text-[18px]" onClick={() => { handleFeedback('call', true); setFb(true) }}>👍 {t('detector.feedback.right')}</button>
                <button className="btn btn-secondary flex-1 !min-h-12 !text-[18px]" onClick={() => { handleFeedback('call', false); setFb(true) }}>👎 {t('detector.feedback.wrong')}</button>
              </div>
            )}
          </div>
        </div>
      </Layout>
    )
  }

  // ---------------------------------------------------------------- INPUT VIEW
  return (
    <Layout title={t('call.title')}>
      <p className="rounded-lg bg-soft p-2 text-sm text-info">ℹ️ {t('call.langnote')}</p>
      <div role="tablist" className="grid grid-cols-3 gap-1">
        {tabs.map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={`min-h-12 rounded-2xl border-2 text-sm font-bold ${mode === m ? 'border-brand bg-brand text-white' : 'border-line bg-white text-ink'}`}
          >
            {t(`call.mode.${m}`)}
          </button>
        ))}
      </div>

      {mode === 'examples' && (
        <section className="space-y-2">
          <p className="text-sm text-muted">{t('call.examples.note')}</p>
          {demos.map((d) => (
            <button
              key={d.id}
              className="card w-full text-left font-bold hover:border-brand transition-colors"
              onClick={() => run(d.segments, d.segments[d.segments.length - 1]?.end ?? null, d.title)}
            >
              🎧 {pick(d.title, lang)}
            </button>
          ))}
        </section>
      )}

      {mode === 'paste' && (
        <section className="space-y-2">
          <textarea
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            rows={6}
            maxLength={6000}
            placeholder={t('call.paste.placeholder')}
            className="w-full rounded-2xl border-2 border-line bg-white text-ink p-3 text-[18px]"
            aria-label={t('call.paste.placeholder')}
          />
          <button className="btn btn-primary w-full" disabled={!lex || !pasted.trim()} onClick={fromPaste}>
            🔍 {t('call.analyse')}
          </button>
        </section>
      )}

      {mode === 'audio' && (
        <section className="space-y-3">
          <p className="rounded-2xl border-2 border-warn-line bg-warn-bg p-3 text-sm text-warn">
            🔒 {t('call.audio.warning')}
          </p>
          {!asrBase() ? (
            <p className="card">{t('call.audio.nobackend')}</p>
          ) : (
            <>
              <label className="btn btn-secondary cursor-pointer">
                📁 {t('call.audio.pick')}
                <input
                  type="file"
                  accept="audio/*,.mp3,.wav,.m4a,.ogg,.webm"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) void handleBlob(f)
                    e.target.value = ''
                  }}
                />
              </label>
              <button
                className={`btn w-full ${recording ? 'btn-danger' : 'btn-secondary'}`}
                onClick={toggleRecord}
              >
                {recording ? `⏹ ${t('call.audio.stop')}` : `🎙️ ${t('call.audio.record')}`}
              </button>
              {recording && <p role="status" className="font-bold text-bad">● {t('call.audio.recording')}</p>}
              <p className="text-xs text-muted">{t('call.audio.limits')}</p>
            </>
          )}
          {status && (
            <div role="status" className="card space-y-2">
              <p>⏳ {t(status)}</p>
              <button className="btn btn-secondary min-h-11" onClick={() => abort.current?.abort()}>
                {t('call.cancel')}
              </button>
            </div>
          )}
        </section>
      )}

      {error && (
        <div role="alert" className="space-y-2 rounded-2xl border-2 border-bad-line bg-bad-bg p-3 text-bad">
          <p>{t(error)}</p>
          {mode === 'audio' && (
            <button className="underline" onClick={() => { setError(null); setMode('paste') }}>
              {t('call.try_paste')}
            </button>
          )}
        </div>
      )}
    </Layout>
  )
}

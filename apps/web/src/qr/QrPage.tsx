import { useEffect, useMemo, useRef, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import type { BrandsFile } from '../detector/url'
import { saveLastResult } from '../detector/lastResult'
import { useLang } from '../shell/i18n'
import { Layout } from '../shell/Layout'
import { cameraErrorKey, describeCameraError, isStandalone, openCamera, watchCameraPermission, type CameraPermission } from './camera'
import { CameraHelp } from './CameraHelp'
import { decodeImageFile, decodeQr } from './decode'
import { analyzeQr, type QrAnalysis } from './parse'

const RISK_STYLE = { high: 'border-bad-line bg-bad-bg text-bad', medium: 'border-warn-line bg-warn-bg text-warn', none: 'border-line bg-white text-ink' } as const
const RISK_ICON = { high: '⚠️', medium: '❓', none: 'ℹ️' } as const

export default function QrPage() {
  const { t } = useLang()
  const [brands, setBrands] = useState<BrandsFile | null>(null)
  const [raw, setRaw] = useState<string | null>(null)
  const [expected, setExpected] = useState('')
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [opening, setOpening] = useState(false)
  const [errCode, setErrCode] = useState<string | null>(null)
  const [perm, setPerm] = useState<CameraPermission>('unknown')
  const [showHelp, setShowHelp] = useState(false)
  const [nowOk, setNowOk] = useState(false)
  const permRef = useRef<CameraPermission>('unknown')
  const video = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const scanTimer = useRef<number>(0)

  useEffect(() => {
    // without the brand list the UPI checks still work; only the lookalike-name link check is skipped
    fetch('/model/brands.json').then((r) => r.json()).then(setBrands).catch(() => setBrands({ version: 'none', brands: [] }))
    return stop
  }, [])

  const isNative = Capacitor.isNativePlatform()
  useEffect(() => {
    if (isNative) {
      void openScanner()
      return
    }
    return watchCameraPermission((p) => {
      const was = permRef.current
      permRef.current = p
      setPerm(p)
      if (was === 'denied' && p !== 'denied') {
        setError((e) => (e === 'qr.err.camera' || e === 'qr.err.camera_dismissed' ? null : e))
        setShowHelp(false)
        setNowOk(true)
      }
    })
  }, [isNative])
  const secure = typeof window === 'undefined' || window.isSecureContext // camera works over HTTPS or localhost only

  function stop() {
    window.clearTimeout(scanTimer.current)
    stream.current?.getTracks().forEach((x) => x.stop())
    stream.current = null
    if (video.current) video.current.srcObject = null
    setScanning(false)
  }

  // Live scanner effect: starts playback and throttled decoding AFTER the video element is visible in the DOM
  useEffect(() => {
    if (!scanning || !stream.current || !video.current) return
    const v = video.current
    v.srcObject = stream.current
    void v.play().catch(() => {})

    type NativeDetector = { detect: (src: HTMLVideoElement) => Promise<{ rawValue?: string }[]> }
    const BD = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => NativeDetector }).BarcodeDetector
    const detector = BD ? new BD({ formats: ['qr_code'] }) : null
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!
    let alive = true

    const scanFrame = async () => {
      if (!alive) return
      if (v.readyState >= 2 && v.videoWidth) {
        let code: string | null = null
        if (detector) {
          const hits = await detector.detect(v).catch(() => [])
          code = hits[0]?.rawValue ?? null
        } else if (ctx) {
          const scale = Math.min(1, 640 / Math.max(v.videoWidth, v.videoHeight))
          canvas.width = Math.round(v.videoWidth * scale)
          canvas.height = Math.round(v.videoHeight * scale)
          ctx.drawImage(v, 0, 0, canvas.width, canvas.height)
          code = decodeQr(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height)
        }
        if (code && alive) {
          navigator.vibrate?.(120)
          stop()
          setRaw(code)
          return
        }
      }
      scanTimer.current = window.setTimeout(() => void scanFrame(), 150)
    }

    scanTimer.current = window.setTimeout(() => void scanFrame(), 150)
    return () => { alive = false; window.clearTimeout(scanTimer.current) }
  }, [scanning])

  /** openScanner: the camera is requested only when the user taps Scan, and stopped as soon as a code is read. */
  async function openScanner() {
    setError(null); setRaw(null); setNowOk(false); setShowHelp(false)
    setOpening(true) // the first request can take a moment (a permission question, or one quiet retry)
    try {
      stream.current = await openCamera()
      setScanning(true)
    } catch (e) {
      setError(cameraErrorKey(e)); setErrCode(describeCameraError(e))
    } finally {
      setOpening(false)
    }
  }

  async function fromFile(f: File) {
    setError(null); setRaw(null)
    const code = await decodeImageFile(f).catch(() => null)
    if (code) setRaw(code); else setError('qr.err.none')
  }

  const a: QrAnalysis | null = useMemo(() => (raw && brands ? analyzeQr(raw, brands, expected) : null), [raw, brands, expected])
  useEffect(() => {
    if (a) saveLastResult({ kind: 'url', band: a.risk === 'high' ? 'likely_scam' : a.risk === 'medium' ? 'suspicious' : 'looks_genuine', script: 'qr', signals: [], category: 'fake_qr', phrases: [], at: Date.now() })
  }, [a?.raw, a?.risk])

  const rows: [string, string | undefined][] = a?.upi ? [['qr.field.payee', a.upi.pa], ['qr.field.name', a.upi.pn], ['qr.field.amount', a.upi.am], ['qr.field.note', a.upi.tn], ['qr.field.merchant', a.upi.mc]] : []
  const urlReasons = a?.url ? a.url.flags.map((f) => `reason.url.${f.id}`) : []

  return (
    <Layout title={t('qr.title')}>
      <p>{t('qr.intro')}</p>
      {!secure && <p role="alert" className="rounded-lg bg-warn-bg p-2 text-warn">{t('qr.https_only')}</p>}

      <label className="block text-sm font-bold">{t('qr.expected')}
        <input value={expected} onChange={(e) => setExpected(e.target.value)} maxLength={60} className="mt-1 min-h-12 w-full rounded-2xl border-2 border-line bg-white text-ink px-3 font-normal" />
      </label>

      {scanning && (
        <div className="space-y-2">
          <div className="relative overflow-hidden rounded-2xl bg-black">
            <video ref={video} autoPlay playsInline muted className="aspect-square w-full object-cover" aria-label={t('qr.scan')} />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-52 w-52 rounded-2xl border-4 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
            </div>
          </div>
          <p className="text-center text-sm font-bold text-brand">{t('qr.live.scanning')}</p>
          <button className="btn btn-secondary w-full" onClick={stop}>⏹ {t('qr.stop')}</button>
        </div>
      )}

      {!scanning && (
        <div className="grid gap-2">
          <button className="btn btn-primary" disabled={!secure || opening} onClick={openScanner} data-testid="qr-scan-live">
            🎥 {opening ? t('qr.opening') : t('qr.scan')}
          </button>
          <label className="btn btn-secondary cursor-pointer" data-testid="qr-photo-main">📷 {t('qr.take_photo')}
            <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) void fromFile(f); e.target.value = '' }} />
          </label>
          <label className="btn btn-secondary cursor-pointer">🖼️ {t('qr.upload')}
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) void fromFile(f); e.target.value = '' }} />
          </label>
          <p className="text-xs text-muted">{t('qr.camera_note')}</p>
          {!isNative && perm !== 'denied' && !nowOk && !error && <p className="text-sm" data-testid="camera-ask">{t('qr.cam.ask')}</p>}
          {!isNative && nowOk && <p role="status" className="font-bold text-ok" data-testid="camera-now-ok">{t('qr.cam.now_ok')}</p>}
          {!isNative && perm === 'denied' && !error && !showHelp && (
            <div className="flex flex-col gap-2 rounded-xl border-2 border-warn-line bg-warn-bg px-3 py-2 text-warn" data-testid="camera-off-note">
              <span>{t('qr.cam.use_photo')}</span>
              <button type="button" className="self-start text-sm font-bold underline" onClick={() => setShowHelp(true)}>{t('qr.cam.show')}</button>
            </div>
          )}
        </div>
      )}

      {(error === 'qr.err.camera' || error === 'qr.err.camera_dismissed' || showHelp) && (
        <CameraHelp kind={error === 'qr.err.camera_dismissed' ? 'dismissed' : 'denied'} open={showHelp && !error} standalone={isStandalone()} code={errCode} onRetry={() => void openScanner()} onFile={(f) => void fromFile(f)} />
      )}

      {error && error !== 'qr.err.camera' && error !== 'qr.err.camera_dismissed' && (
        <div role="alert" className="flex flex-col gap-3 rounded-2xl border-2 border-bad-line bg-bad-bg p-3 text-bad">
          <p>{t(error)}</p>
          {error.startsWith('qr.err.camera') && errCode && <p className="font-mono text-xs opacity-80" data-testid="qr-err-code">{t('qr.err.code')}: {errCode}</p>}
          {error.startsWith('qr.err.camera') && (
            // the phone's own camera app takes the picture, so this works even when the browser may not use the camera
            <label className="btn btn-primary cursor-pointer" data-testid="qr-take-photo">📷 {t('qr.take_photo')}
              <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) void fromFile(f); e.target.value = '' }} />
            </label>
          )}
        </div>
      )}

      {a && (
        <section aria-live="polite" className={`space-y-3 rounded-2xl border-4 p-4 ${RISK_STYLE[a.risk]}`} data-testid="qr-result" data-risk={a.risk}>
          <p className="text-xl font-bold"><span aria-hidden>{RISK_ICON[a.risk]}</span> {t(`qr.risk.${a.risk}`)}</p>
          <div className="rounded-lg bg-white p-3 text-ink">
            <p className="text-sm font-bold">{t('qr.found')}: {t(`qr.kind.${a.kind}`)}</p>
            <p className="break-all font-mono text-sm">{a.raw /* rendered as plain text */}</p>
            {rows.filter(([, v]) => v).map(([k, v]) => <p key={k} className="text-sm"><strong>{t(k)}:</strong> {v}</p>)}
          </div>
          <ul className="list-disc space-y-1 pl-5">
            {a.flags.map((f) => <li key={f.id}>{t(`qr.flag.${f.id}`)}</li>)}
            {urlReasons.map((k) => <li key={k}>{t(k)}</li>)}
          </ul>
          {a.risk === 'none' && <p>{t('qr.none_note')}</p>}
          <p className="font-bold">{t('qr.rule')}</p>
          <div className="grid gap-2">
            <a className="btn btn-secondary" href="#/learn?lesson=upi_qr">🎓 {t('qr.next.lesson')}</a>
            {a.risk !== 'none' && !(a.flags.length === 1 && a.flags[0].id === 'preset_amount') && (
              <a className="btn btn-danger" href="#/report?from=message">🚨 {t('qr.next.report')}</a>
            )}
          </div>
        </section>
      )}
    </Layout>
  )
}

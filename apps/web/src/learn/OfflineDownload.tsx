import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { WifiOff } from 'lucide-react'
import { useLang } from '../shell/i18n'
import { useOnlineStatus } from '../shell/online'
import { lessonMinutes, type Lesson } from './content'
import { audioFiles, cachedCount, canStoreOffline, downloadFiles, estimateBytes, formatBytes, outcomeKey, removeDownloads, storageInfo, type CacheStorageLike, type DownloadProgress, type StorageInfo } from './offline'

/** OfflineDownload: "Download all lessons for offline". Shows only when the lessons have recordings for the language. */
export function OfflineDownload({ lessons }: { lessons: Lesson[] }) {
  const { t, lang } = useLang()
  const online = useOnlineStatus()
  const urls = useMemo(() => audioFiles(lessons, lang), [lessons, lang])
  const unit = useMemo(() => ({ kb: t('learn.offline.unit.kb'), mb: t('learn.offline.unit.mb'), gb: t('learn.offline.unit.gb') }), [t])
  const [have, setHave] = useState(0)
  const [progress, setProgress] = useState<DownloadProgress | null>(null)
  const [running, setRunning] = useState(false)
  const [message, setMessage] = useState('')
  const [storage, setStorage] = useState<StorageInfo | null>(null)
  const abort = useRef<AbortController | null>(null)

  const refresh = useCallback(async () => {
    setHave(canStoreOffline() ? await cachedCount(urls, caches as unknown as CacheStorageLike) : 0)
    setStorage(await storageInfo())
  }, [urls])
  useEffect(() => { void refresh() }, [refresh])
  useEffect(() => () => abort.current?.abort(), [])

  if (urls.length === 0) return null
  const supported = canStoreOffline()
  const estimate = estimateBytes(lessons, lang, lessonMinutes)

  const start = async () => {
    abort.current = new AbortController()
    setRunning(true)
    setMessage('')
    const result = await downloadFiles(urls, {
      caches: caches as unknown as CacheStorageLike,
      fetchFn: (u, init) => fetch(u, init),
      onProgress: setProgress,
      signal: abort.current.signal,
    })
    setRunning(false)
    setMessage(t(outcomeKey(result), { failed: result.failed }))
    await refresh()
  }
  const remove = async () => {
    await removeDownloads(caches as unknown as CacheStorageLike)
    setProgress(null)
    setMessage(t('learn.offline.removed'))
    await refresh()
  }

  const percent = progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0
  return (
    <section
      className="flex flex-col gap-3 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-md shadow-blue-950/6 sm:p-5"
      aria-label={t('learn.offline.title')}
      data-testid="offline-download"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="flex items-center gap-2 text-[17px] font-extrabold text-[#163264]">
            <WifiOff className="size-4 text-[#1747c4]" strokeWidth={2.3} />
            <span>{t('learn.offline.title')}</span>
          </h2>
          <p className="text-[14.5px] leading-relaxed text-slate-600">
            {t('learn.offline.have', { n: have, total: urls.length })} · {t('learn.offline.size', { size: formatBytes(estimate, unit) })}
            {storage && <> · {t('learn.offline.free', { free: formatBytes(storage.free, unit) })}</>}
          </p>
        </div>
      </div>

      {running && progress && (
        <div className="flex flex-col gap-1.5">
          <div role="progressbar" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.done} aria-label={t('learn.offline.progress', { done: progress.done, total: progress.total })} className="h-2.5 overflow-hidden rounded-full bg-[#E3EBFF]">
            <div className="h-full rounded-full bg-[#1747c4] transition-all duration-200" style={{ width: `${percent}%` }} />
          </div>
          <p className="text-xs font-semibold text-slate-500">{t('learn.offline.progress', { done: progress.done, total: progress.total })}</p>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        {running ? (
          <button type="button" className="btn btn-secondary sm:w-auto" onClick={() => abort.current?.abort()}>{t('learn.offline.cancel')}</button>
        ) : (
          <button type="button" className="btn btn-primary !min-h-11 !rounded-xl !text-[15px] shadow-xs sm:flex-1" disabled={!supported || !online || have === urls.length} onClick={() => void start()}>{t('learn.offline.button')}</button>
        )}
        {have > 0 && !running && <button type="button" className="btn btn-secondary !min-h-11 !rounded-xl !text-[15px]" onClick={() => void remove()}>{t('learn.offline.remove')}</button>}
      </div>

      {!supported && <p className="text-sm text-slate-500">{t('learn.offline.unsupported')}</p>}
      {supported && !online && have < urls.length && <p className="text-sm text-slate-500">{t('learn.offline.need_online')}</p>}
      {message && <p className="text-sm font-bold text-[#163264]" role="status" aria-live="polite">{message}</p>}
    </section>
  )
}
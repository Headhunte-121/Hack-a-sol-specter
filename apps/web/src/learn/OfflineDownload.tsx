import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLang } from '../shell/i18n'
import { useOnlineStatus } from '../shell/online'
import { lessonMinutes, type Lesson } from './content'
import { audioFiles, cachedCount, canStoreOffline, downloadFiles, estimateBytes, formatBytes, outcomeKey, removeDownloads, storageInfo, type CacheStorageLike, type DownloadProgress, type StorageInfo } from './offline'

/** OfflineDownload: "Download all lessons for offline". Shows only when the lessons have recordings for the language: with none there is
 *  nothing to download, and the lessons already work as text, cards and the phone's own voice. */
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
    <section className="card flex flex-col gap-3" aria-label={t('learn.offline.title')} data-testid="offline-download">
      <h2 className="text-[1.15rem] font-bold text-brand">{t('learn.offline.title')}</h2>
      <p className="text-[1.05rem] leading-[1.6]">
        {t('learn.offline.have', { n: have, total: urls.length })} · {t('learn.offline.size', { size: formatBytes(estimate, unit) })}
        {storage && <> · {t('learn.offline.free', { free: formatBytes(storage.free, unit) })}</>}
      </p>
      {running && progress && (
        <div className="flex flex-col gap-1.5">
          <div role="progressbar" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.done} aria-label={t('learn.offline.progress', { done: progress.done, total: progress.total })} className="h-3.5 rounded-[7px] bg-soft">
            <div className="h-3.5 rounded-[7px] bg-brand" style={{ width: `${percent}%` }} />
          </div>
          <p className="text-[1rem] text-muted">{t('learn.offline.progress', { done: progress.done, total: progress.total })}</p>
        </div>
      )}
      <div className="flex flex-col gap-2.5">
        {running ? (
          <button type="button" className="btn btn-secondary" onClick={() => abort.current?.abort()}>{t('learn.offline.cancel')}</button>
        ) : (
          <button type="button" className="btn btn-primary" disabled={!supported || !online || have === urls.length} onClick={() => void start()}>
            {t('learn.offline.button')}
          </button>
        )}
        {have > 0 && !running && <button type="button" className="btn btn-secondary" onClick={() => void remove()}>{t('learn.offline.remove')}</button>}
      </div>
      {!supported && <p className="text-[1rem] text-muted">{t('learn.offline.unsupported')}</p>}
      {supported && !online && have < urls.length && <p className="text-[1rem] text-muted">{t('learn.offline.need_online')}</p>}
      <p className="min-h-[1.5rem] text-[1.05rem] font-bold" role="status" aria-live="polite">{message}</p>
    </section>
  )
}

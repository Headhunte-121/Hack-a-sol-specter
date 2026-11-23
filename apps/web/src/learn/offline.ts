import type { Lang } from '../shell/i18n'
import { audioUrl } from './audio'
import type { Lesson } from './content'

// Keeping the lesson audio on the phone: the list of files, a size estimate, the download into a named cache, and finding a file again
// when there is no internet. The rest of the app works without any of this: lessons are text, cards and the phone's own voice.

/** The named cache the recordings are stored in. A service-worker rule for /audio/ may use the same name. */
export const AUDIO_CACHE = 'lesson-audio'
/** The recordings are mono AAC at 32 kbps (scripts/make_audio.py), which is 240 000 bytes for each minute. */
export const BYTES_PER_MINUTE = 240_000

/** About how many bytes one video narration takes (mono AAC at 32 kbps, about a minute). */
export const BYTES_PER_NARRATION = 300_000

/** videoNarrationUrl: the narration file of a lesson's video in a language. */
export const videoNarrationUrl = (lessonId: string, lang: Lang): string => `/audio/video/${lessonId}.${lang}.m4a`

/** audioFiles: every recording and caption file the lessons declare for a language, plus each lesson's video narration, once each. */
export function audioFiles(lessons: Lesson[], lang: Lang): string[] {
  const out: string[] = []
  for (const l of lessons) {
    for (const p of [l.audio?.[lang], l.captions?.[lang]]) if (p && !out.includes(audioUrl(p))) out.push(audioUrl(p))
    out.push(videoNarrationUrl(l.id, lang))
  }
  return out
}

/** estimateBytes: about how much the recordings of a language take, from each lesson's reading time (an estimate, shown as "about"). */
export function estimateBytes(lessons: Lesson[], lang: Lang, minutesOf: (l: Lesson) => number): number {
  return lessons.reduce((n, l) => n + (l.audio?.[lang] ? minutesOf(l) * BYTES_PER_MINUTE : 0) + BYTES_PER_NARRATION, 0)
}

/** formatBytes: "850 KB", "7.2 MB". The unit names come from the language files so Hindi and Chhattisgarhi screens show Devanagari. */
export function formatBytes(bytes: number, units: { kb: string; mb: string; gb: string } = { kb: 'KB', mb: 'MB', gb: 'GB' }): string {
  const b = Math.max(0, bytes)
  const fmt = (n: number) => (n >= 10 ? String(Math.round(n)) : String(Math.round(n * 10) / 10))
  if (b >= 1024 ** 3) return `${fmt(b / 1024 ** 3)} ${units.gb}`
  if (b >= 1024 ** 2) return `${fmt(b / 1024 ** 2)} ${units.mb}`
  return `${Math.max(1, Math.round(b / 1024))} ${units.kb}`
}

/** The parts of the browser the download needs, so tests can pass fakes. */
export interface CacheLike {
  put(url: string, response: Response): Promise<void>
  match(url: string): Promise<Response | undefined>
  delete(url: string): Promise<boolean>
  keys(): Promise<readonly { url: string }[]>
}
export interface CacheStorageLike {
  open(name: string): Promise<CacheLike>
  delete(name: string): Promise<boolean>
}
export type FetchLike = (url: string, init?: { signal?: AbortSignal }) => Promise<Response>

export interface DownloadProgress {
  done: number
  total: number
  failed: number
  bytes: number
}
export interface DownloadResult extends DownloadProgress {
  /** True when the phone ran out of space (the rest was not tried). */
  full: boolean
  cancelled: boolean
}

const isQuotaError = (e: unknown) => !!e && typeof e === 'object' && (e as { name?: string }).name === 'QuotaExceededError'

/** downloadFiles: fetch each file and store it whole in the named cache, one at a time, reporting progress after each. A file that
 *  cannot be fetched is counted as failed and the others carry on; running out of space or a cancel stops the rest. */
export async function downloadFiles(
  urls: string[],
  deps: { caches: CacheStorageLike; fetchFn: FetchLike; onProgress?: (p: DownloadProgress) => void; signal?: AbortSignal; cacheName?: string },
): Promise<DownloadResult> {
  const cache = await deps.caches.open(deps.cacheName ?? AUDIO_CACHE)
  const result: DownloadResult = { done: 0, total: urls.length, failed: 0, bytes: 0, full: false, cancelled: false }
  const report = () => deps.onProgress?.({ done: result.done, total: result.total, failed: result.failed, bytes: result.bytes })
  report()
  for (const url of urls) {
    if (deps.signal?.aborted) {
      result.cancelled = true
      break
    }
    try {
      const res = await deps.fetchFn(url, { signal: deps.signal })
      if (!res.ok || res.status !== 200) throw new Error(`status ${res.status}`) // a partial (206) answer must never be stored as the file
      const copy = res.clone()
      await cache.put(url, res)
      result.bytes += (await copy.blob()).size
      result.done++
    } catch (e) {
      if (deps.signal?.aborted) {
        result.cancelled = true
        break
      }
      result.failed++
      if (isQuotaError(e)) {
        result.full = true
        break
      }
    }
    report()
  }
  report()
  return result
}

/** outcomeKey: the language string that tells the person how the download ended. */
export function outcomeKey(r: DownloadResult): 'learn.offline.done' | 'learn.offline.partial' | 'learn.offline.full' | 'learn.offline.cancelled' {
  if (r.cancelled) return 'learn.offline.cancelled'
  if (r.full) return 'learn.offline.full'
  return r.failed > 0 ? 'learn.offline.partial' : 'learn.offline.done'
}

/** cachedCount: how many of the files are already in the cache (shown as "n of N is on this phone"). */
export async function cachedCount(urls: string[], caches: CacheStorageLike, cacheName = AUDIO_CACHE): Promise<number> {
  try {
    const cache = await caches.open(cacheName)
    let n = 0
    for (const u of urls) if (await cache.match(u)) n++
    return n
  } catch {
    return 0
  }
}

/** removeDownloads: delete the named cache, freeing the space. */
export async function removeDownloads(caches: CacheStorageLike, cacheName = AUDIO_CACHE): Promise<boolean> {
  try {
    return await caches.delete(cacheName)
  } catch {
    return false
  }
}

/** playableUrl: the address to give an audio element. A file that was downloaded is read from the cache as an object address, which
 *  plays and seeks with no internet; otherwise the normal address is used. */
export async function playableUrl(url: string, caches: CacheStorageLike | undefined, makeObjectUrl: (b: Blob) => string, cacheName = AUDIO_CACHE): Promise<{ src: string; fromCache: boolean }> {
  if (caches) {
    try {
      const hit = await (await caches.open(cacheName)).match(url)
      if (hit && hit.ok) return { src: makeObjectUrl(await hit.blob()), fromCache: true }
    } catch {
      /* no cache: use the network address */
    }
  }
  return { src: url, fromCache: false }
}

export interface StorageInfo {
  usage: number
  quota: number
  free: number
}
/** storageInfo: what the browser says about space on this phone, or null when it cannot tell. */
export async function storageInfo(storage: { estimate?: () => Promise<{ usage?: number; quota?: number }> } | undefined = typeof navigator !== 'undefined' ? navigator.storage : undefined): Promise<StorageInfo | null> {
  try {
    const e = await storage?.estimate?.()
    if (!e || typeof e.quota !== 'number' || e.quota <= 0) return null
    const usage = e.usage ?? 0
    return { usage, quota: e.quota, free: Math.max(0, e.quota - usage) }
  } catch {
    return null
  }
}

/** Whether the download control can work at all in this browser. */
export const canStoreOffline = (): boolean => typeof caches !== 'undefined' && typeof fetch !== 'undefined'

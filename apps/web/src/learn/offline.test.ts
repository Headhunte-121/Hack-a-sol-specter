import { describe, expect, it } from 'vitest'
import type { Lesson } from './content'
import { AUDIO_CACHE, audioFiles, BYTES_PER_MINUTE, cachedCount, downloadFiles, estimateBytes, formatBytes, outcomeKey, playableUrl, removeDownloads, storageInfo, type CacheLike, type CacheStorageLike } from './offline'

const t = (s: string) => ({ en: s, hi: s, cg: s })
const lesson = (id: string, audio: Lesson['audio'], captions?: Lesson['captions']): Lesson => ({ id, scripts: [], minutes: 4, title: t(id), example: t(id), signs: [t(id)], todo: t(id), audio, captions })
const lessons = [
  lesson('a', { hi: 'audio/a.hi.m4a', cg: 'audio/a.cg.m4a' }, { hi: 'audio/a.hi.json' }),
  lesson('b', { hi: 'audio/b.hi.m4a' }),
  lesson('c', undefined), // no recording yet
]

class FakeCache implements CacheLike {
  store = new Map<string, Response>()
  async put(url: string, r: Response) { this.store.set(url, r) }
  async match(url: string) { return this.store.get(url)?.clone() }
  async delete(url: string) { return this.store.delete(url) }
  async keys() { return [...this.store.keys()].map((url) => ({ url })) }
}
function fakeCaches(cache = new FakeCache(), opts: { failPut?: (url: string) => Error | null } = {}) {
  const names: string[] = []
  const wrapped: CacheLike = opts.failPut
    ? Object.assign(Object.create(cache), { put: async (u: string, r: Response) => { const e = opts.failPut!(u); if (e) throw e; await cache.put(u, r) } })
    : cache
  const caches: CacheStorageLike = { open: async (n) => { names.push(n); return wrapped }, delete: async () => true }
  return { caches, cache, names }
}
const ok = (body: string, status = 200) => new Response(body, { status })

describe('which files to download', () => {
  it('lists the recordings and captions of one language, once each, and skips lessons with none', () => {
    expect(audioFiles(lessons, 'hi')).toEqual(['/audio/a.hi.m4a', '/audio/a.hi.json', '/audio/b.hi.m4a'])
    expect(audioFiles(lessons, 'cg')).toEqual(['/audio/a.cg.m4a'])
    expect(audioFiles(lessons, 'en')).toEqual([])
  })
  it('estimates the size from the reading time at 32 kbps', () => {
    expect(BYTES_PER_MINUTE).toBe(240_000)
    expect(estimateBytes(lessons, 'hi', (l) => l.minutes ?? 1)).toBe(2 * 4 * 240_000)
    expect(estimateBytes(lessons, 'en', () => 4)).toBe(0)
  })
  it('formats sizes with the unit names it is given', () => {
    expect(formatBytes(512)).toBe('1 KB')
    expect(formatBytes(850 * 1024)).toBe('850 KB')
    expect(formatBytes(7.2 * 1024 * 1024)).toBe('7.2 MB')
    expect(formatBytes(2.5 * 1024 ** 3)).toBe('2.5 GB')
    expect(formatBytes(7.2 * 1024 * 1024, { kb: 'केबी', mb: 'एमबी', gb: 'जीबी' })).toBe('7.2 एमबी')
    expect(formatBytes(-5)).toBe('1 KB')
  })
})

describe('downloading into the named cache', () => {
  it('stores every file whole in the named cache and reports progress after each', async () => {
    const { caches, cache, names } = fakeCaches()
    const seen: number[] = []
    const r = await downloadFiles(['/audio/a.m4a', '/audio/b.m4a', '/audio/c.m4a'], { caches, fetchFn: async (u) => ok(`data:${u}`), onProgress: (p) => seen.push(p.done) })
    expect(names).toEqual([AUDIO_CACHE])
    expect([...cache.store.keys()]).toEqual(['/audio/a.m4a', '/audio/b.m4a', '/audio/c.m4a'])
    expect(r).toMatchObject({ done: 3, total: 3, failed: 0, full: false, cancelled: false })
    expect(r.bytes).toBe('data:/audio/a.m4a'.length * 3)
    expect(seen[0]).toBe(0)
    expect(seen.at(-1)).toBe(3)
    expect(seen.every((n, i) => i === 0 || n >= seen[i - 1])).toBe(true)
    expect(outcomeKey(r)).toBe('learn.offline.done')
  })
  it('a file that fails is counted and the others carry on', async () => {
    const { caches, cache } = fakeCaches()
    const r = await downloadFiles(['/audio/a.m4a', '/audio/b.m4a', '/audio/c.m4a'], {
      caches,
      fetchFn: async (u) => { if (u.includes('b')) throw new Error('offline'); return ok('x') },
    })
    expect(r).toMatchObject({ done: 2, failed: 1 })
    expect([...cache.store.keys()]).toEqual(['/audio/a.m4a', '/audio/c.m4a'])
    expect(outcomeKey(r)).toBe('learn.offline.partial')
  })
  it('never stores a partial or failed answer as if it were the file', async () => {
    const { caches, cache } = fakeCaches()
    const r = await downloadFiles(['/audio/a.m4a', '/audio/b.m4a'], { caches, fetchFn: async (u) => (u.includes('a') ? ok('part', 206) : ok('x', 404)) })
    expect(r).toMatchObject({ done: 0, failed: 2 })
    expect(cache.store.size).toBe(0)
  })
  it('stops when the phone is full and says so', async () => {
    const quota = Object.assign(new Error('full'), { name: 'QuotaExceededError' })
    const { caches } = fakeCaches(undefined, { failPut: (u) => (u.includes('b') ? quota : null) })
    const r = await downloadFiles(['/audio/a.m4a', '/audio/b.m4a', '/audio/c.m4a'], { caches, fetchFn: async () => ok('x') })
    expect(r).toMatchObject({ done: 1, failed: 1, full: true })
    expect(outcomeKey(r)).toBe('learn.offline.full')
  })
  it('stops when cancelled and keeps what was already stored', async () => {
    const { caches, cache } = fakeCaches()
    const ctl = new AbortController()
    const r = await downloadFiles(['/audio/a.m4a', '/audio/b.m4a', '/audio/c.m4a'], {
      caches,
      signal: ctl.signal,
      fetchFn: async (u) => { if (u.includes('b')) ctl.abort(); return ok('x') },
      onProgress: () => {},
    })
    expect(r.cancelled).toBe(true)
    expect(cache.store.has('/audio/a.m4a')).toBe(true)
    expect(outcomeKey(r)).toBe('learn.offline.cancelled')
  })
})

describe('finding the files again with no internet', () => {
  it('counts what is in the cache and can remove it', async () => {
    const { caches } = fakeCaches()
    await downloadFiles(['/audio/a.m4a', '/audio/b.m4a'], { caches, fetchFn: async () => ok('x') })
    expect(await cachedCount(['/audio/a.m4a', '/audio/b.m4a', '/audio/z.m4a'], caches)).toBe(2)
    expect(await removeDownloads(caches)).toBe(true)
  })
  it('plays the stored copy through an object address, otherwise the normal address', async () => {
    const { caches, cache } = fakeCaches()
    await cache.put('/audio/a.m4a', ok('bytes'))
    const made: Blob[] = []
    const make = (b: Blob) => { made.push(b); return 'blob:copy' }
    expect(await playableUrl('/audio/a.m4a', caches, make)).toEqual({ src: 'blob:copy', fromCache: true })
    expect(made[0].size).toBe(5)
    expect(await playableUrl('/audio/other.m4a', caches, make)).toEqual({ src: '/audio/other.m4a', fromCache: false })
    expect(await playableUrl('/audio/a.m4a', undefined, make)).toEqual({ src: '/audio/a.m4a', fromCache: false })
  })
  it('falls back to the normal address when the cache cannot be read', async () => {
    const broken: CacheStorageLike = { open: async () => { throw new Error('blocked') }, delete: async () => false }
    expect(await playableUrl('/audio/a.m4a', broken, () => 'x')).toEqual({ src: '/audio/a.m4a', fromCache: false })
    expect(await cachedCount(['/audio/a.m4a'], broken)).toBe(0)
    expect(await removeDownloads(broken)).toBe(false)
  })
})

describe('storage estimate', () => {
  it('reports used, total and free space', async () => {
    expect(await storageInfo({ estimate: async () => ({ usage: 30, quota: 100 }) })).toEqual({ usage: 30, quota: 100, free: 70 })
  })
  it('is null when the browser cannot tell', async () => {
    expect(await storageInfo(undefined)).toBeNull()
    expect(await storageInfo({})).toBeNull()
    expect(await storageInfo({ estimate: async () => ({}) })).toBeNull()
    expect(await storageInfo({ estimate: async () => { throw new Error('no') } })).toBeNull()
  })
})

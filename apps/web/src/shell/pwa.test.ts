import { afterEach, describe, expect, it, vi } from 'vitest'
import { checkOfflineReady, forceUpdateApp } from './pwa'

vi.mock('virtual:pwa-register', () => ({ registerSW: () => async () => {} }))

/** A cache store that matches like the real Cache API: the query string counts unless ignoreSearch is set. */
function fakeCaches(keys: string[]) {
  return {
    match: async (url: string, opts?: { ignoreSearch?: boolean }) => {
      const want = new URL(url, 'http://localhost')
      const found = keys.find((k) => {
        const have = new URL(k, 'http://localhost')
        return have.pathname === want.pathname && (opts?.ignoreSearch || have.search === want.search)
      })
      return found ? new Response('{}') : undefined
    },
  }
}

afterEach(() => vi.unstubAllGlobals())

describe('checkOfflineReady', () => {
  it('reports ready when the model is precached under a revisioned key', async () => {
    vi.stubGlobal('caches', fakeCaches(['/model/model.json?__WB_REVISION__=a45e1ca']))
    expect(await checkOfflineReady()).toBe('ready')
  })

  it('reports ready when the model is cached under its plain URL', async () => {
    vi.stubGlobal('caches', fakeCaches(['/model/model.json']))
    expect(await checkOfflineReady()).toBe('ready')
  })

  it('reports not_ready when the model is missing and no service worker exists', async () => {
    vi.stubGlobal('caches', fakeCaches(['/assets/index-abc.js']))
    expect(await checkOfflineReady()).toBe('not_ready')
  })

  it('reports partial when a service worker is active but the model is not cached yet', async () => {
    vi.stubGlobal('caches', fakeCaches([]))
    vi.stubGlobal('navigator', { ...navigator, serviceWorker: { getRegistration: async () => ({ active: {} }) } })
    expect(await checkOfflineReady()).toBe('partial')
  })
})

describe('forceUpdateApp', () => {
  it('updates registration, clears caches, and reloads window', async () => {
    const updateSpy = vi.fn().mockResolvedValue(undefined)
    const deleteSpy = vi.fn().mockResolvedValue(true)
    const reloadSpy = vi.fn()
    vi.stubGlobal('navigator', {
      serviceWorker: {
        getRegistration: async () => ({ update: updateSpy }),
      },
    })
    vi.stubGlobal('caches', {
      keys: async () => ['workbox-precache-v1', 'runtime-cache'],
      delete: deleteSpy,
    })
    vi.stubGlobal('location', { reload: reloadSpy })

    await forceUpdateApp()
    expect(updateSpy).toHaveBeenCalled()
    expect(deleteSpy).toHaveBeenCalledWith('workbox-precache-v1')
    expect(deleteSpy).toHaveBeenCalledWith('runtime-cache')
    expect(reloadSpy).toHaveBeenCalled()
  })
})

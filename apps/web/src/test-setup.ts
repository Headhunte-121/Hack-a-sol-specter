// Node 25 ships a global `localStorage` stub that shadows jsdom's and has no working methods. Install a small in-memory Storage for tests.
const data: Record<string, string> = {}
const api: Record<string, unknown> = {
  getItem: (k: string) => (k in data ? data[k] : null),
  setItem: (k: string, v: string) => void (data[k] = String(v)),
  removeItem: (k: string) => void delete data[k],
  clear: () => Object.keys(data).forEach((k) => delete data[k]),
  key: (i: number) => Object.keys(data)[i] ?? null,
}
const storage = new Proxy(api, {
  get: (t, p: string) => (p === 'length' ? Object.keys(data).length : p in t ? t[p] : data[p]),
  ownKeys: () => Reflect.ownKeys(data),
  getOwnPropertyDescriptor: (_t, p: string) => (p in data ? { enumerable: true, configurable: true, value: data[p] } : undefined),
  has: (t, p: string) => p in t || p in data,
})
Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true, writable: true })
if (typeof window !== 'undefined') Object.defineProperty(window, 'localStorage', { value: storage, configurable: true, writable: true })

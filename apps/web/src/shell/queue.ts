// Offline queue for anonymous reports. Stored in IndexedDB so it survives restarts. Never holds names or phone numbers
// (the report builder in dashboard/report.ts only allows a fixed list of fields).
export interface QueuedReport {
  client_batch_id: string
  payload: Record<string, unknown>
  attempts: number
  queued_at: number
}

const DB = 'gt02-queue'
const STORE = 'reports'
const MAX_ATTEMPTS = 5
const BATCH = 20

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'client_batch_id' })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}
function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const r = fn(db.transaction(STORE, mode).objectStore(STORE))
        r.onsuccess = () => resolve(r.result)
        r.onerror = () => reject(r.error)
      }),
  )
}

const subs = new Set<(n: number) => void>()
async function notify() {
  const n = await queueLength().catch(() => 0)
  subs.forEach((f) => f(n))
}
export function subscribeQueue(f: (n: number) => void): () => void {
  subs.add(f)
  void queueLength().then(f).catch(() => f(0))
  return () => subs.delete(f)
}

export function newBatchId(): string {
  return (crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`) as string
}

/** enqueueReport: save a report for later sending. Idempotent on client_batch_id. */
export async function enqueueReport(payload: Record<string, unknown>, id = newBatchId()): Promise<number> {
  await tx('readwrite', (s) => s.put({ client_batch_id: id, payload, attempts: 0, queued_at: Date.now() } satisfies QueuedReport))
  await notify()
  return queueLength()
}
export const queueLength = () => tx<number>('readonly', (s) => s.count())
export const listQueue = () => tx<QueuedReport[]>('readonly', (s) => s.getAll())
export async function clearQueue() {
  await tx('readwrite', (s) => s.clear())
  await notify()
}

export interface FlushResult {
  sent: number
  failed: number
}
type Fetcher = typeof fetch

/** flushReportQueue: send waiting reports in batches. Removes only reports the server confirmed (or permanently rejected).
 *  Safe to call repeatedly: the server de-duplicates on client_batch_id, so a retry never double-counts. */
export async function flushReportQueue(apiBase: string, fetcher: Fetcher = fetch): Promise<FlushResult> {
  let sent = 0
  let failed = 0
  const all = await listQueue()
  for (let i = 0; i < all.length; i += BATCH) {
    const chunk = all.slice(i, i + BATCH)
    try {
      const r = await fetcher(`${apiBase}/reports/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reports: chunk.map((c) => ({ ...c.payload, client_batch_id: c.client_batch_id })) }),
      })
      if (!r.ok) throw new Error(String(r.status))
      const res = (await r.json()) as { accepted?: string[]; duplicates?: string[]; rejected?: string[] }
      const done = new Set([...(res.accepted ?? []), ...(res.duplicates ?? []), ...(res.rejected ?? [])])
      for (const c of chunk) {
        if (done.has(c.client_batch_id)) {
          await tx('readwrite', (s) => s.delete(c.client_batch_id))
          if (!(res.rejected ?? []).includes(c.client_batch_id)) sent++
        } else {
          failed++
          await bump(c)
        }
      }
    } catch {
      failed += chunk.length
      for (const c of chunk) await bump(c)
    }
  }
  await notify()
  return { sent, failed }
}
async function bump(c: QueuedReport) {
  if (c.attempts + 1 >= MAX_ATTEMPTS) await tx('readwrite', (s) => s.delete(c.client_batch_id)) // drop quietly after repeated failure
  else await tx('readwrite', (s) => s.put({ ...c, attempts: c.attempts + 1 }))
}

/** syncQueue: try now, then back off. Call on app open and when the browser says it is online again. */
export async function syncQueueWithBackoff(apiBase: string, healthy: () => Promise<boolean>, tries = 3): Promise<FlushResult> {
  let last: FlushResult = { sent: 0, failed: 0 }
  for (let i = 0; i < tries; i++) {
    if (await healthy()) {
      last = await flushReportQueue(apiBase)
      if (last.failed === 0) return last
    }
    await new Promise((r) => setTimeout(r, 1500 * 2 ** i))
  }
  return last
}

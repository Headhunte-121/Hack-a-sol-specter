import { useEffect } from 'react'
import { hasConsent } from '../shell/consent'
import { clearQueue, enqueueReport, flushReportQueue, queueLength } from '../shell/queue'
import { apiBase, apiHealthy } from './api'
import { clearLocalAnonymousReports, recordLocalAnonymousReport } from './localDemo'
import { REGIONS } from './regionsData'
import { validateReportSchema, type ReportPayload } from './report'
import { rotateClientToken } from './token'

const codes = REGIONS.map((r) => r.code)

/** queueReport: validate, then store in the offline queue. Does nothing (and sends nothing) unless the user consented. */
export async function queueReport(p: ReportPayload): Promise<'queued' | 'no_consent' | 'invalid'> {
  if (!hasConsent()) return 'no_consent'
  if (!validateReportSchema(p, codes)) return 'invalid'
  recordLocalAnonymousReport(p) // the same four fields, kept on this device so the charts can show them while no server is reachable
  await enqueueReport({ ...p })
  void syncQueue()
  return 'queued'
}

let syncing = false
/** syncQueue: send queued reports when the backend is reachable. Off by default: with consent off, queued items are discarded, nothing is sent. */
export async function syncQueue(): Promise<{ sent: number; failed: number }> {
  if (syncing) return { sent: 0, failed: 0 }
  syncing = true
  try {
    if (!hasConsent()) {
      if ((await queueLength().catch(() => 0)) > 0) await clearQueue()
      clearLocalAnonymousReports()
      return { sent: 0, failed: 0 }
    }
    if (!apiBase() || !(await apiHealthy())) return { sent: 0, failed: 0 }
    const token = rotateClientToken()
    const base = apiBase()
    const withToken: typeof fetch = (url, init) =>
      fetch(url, { ...init, headers: { ...(init?.headers as Record<string, string>), 'X-Client-Token': token } })
    return await flushReportQueue(base, withToken)
  } finally {
    syncing = false
  }
}

/** Sync on app open and whenever the browser says it is online again. */
export function useReportSync() {
  useEffect(() => {
    void syncQueue()
    const on = () => void syncQueue()
    window.addEventListener('online', on)
    return () => window.removeEventListener('online', on)
  }, [])
}

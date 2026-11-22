import { useEffect, useState } from 'react'
import { LESSON_FOR_CATEGORY, type CategoryCode } from '../shared/categories'
import { useLang } from '../shell/i18n'
import { kvGet, kvSet } from '../shell/storage'
import { apiGet } from './api'

interface Alert {
  id: number
  title_en: string; title_hi: string; title_cg: string
  summary_en: string; summary_hi: string; summary_cg: string
  scam_category: CategoryCode
  region_scope: string
  expires_at: string
  source_note: string
}

/** renderAlertFeed + markAlertRead: a short list on the home screen with an unread badge. Cached, so visible offline. */
export function AlertsFeed() {
  const { t, lang } = useLang()
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [read, setRead] = useState<number[]>(kvGet('alerts.read', []))
  useEffect(() => {
    let live = true
    void apiGet<{ rows: Alert[] }>('/alerts').then((r) => live && setAlerts(r.data?.rows ?? []))
    return () => { live = false }
  }, [])
  if (alerts.length === 0) return null
  const unread = alerts.filter((a) => !read.includes(a.id)).length
  const pick = (a: Alert, f: 'title' | 'summary') => (a[`${f}_${lang}` as keyof Alert] as string) || (a[`${f}_hi` as keyof Alert] as string) || (a[`${f}_en` as keyof Alert] as string)
  const mark = (id: number) => { const next = [...read, id]; setRead(next); kvSet('alerts.read', next) }
  return (
    <section className="space-y-2" aria-label={t('alerts.title')}>
      <h2 className="flex items-center gap-2 font-bold">🔔 {t('alerts.title')} {unread > 0 && <span className="rounded-full bg-red-700 px-2 text-sm text-white">{t('alerts.new', { count: unread })}</span>}</h2>
      {alerts.slice(0, 2).map((a) => (
        <article key={a.id} className={`card space-y-1 ${read.includes(a.id) ? '' : 'border-red-700'}`}>
          <h3 className="font-bold">{pick(a, 'title')}</h3>
          <p className="text-sm">{pick(a, 'summary')}</p>
          <p className="text-xs text-slate-600">{t('alerts.source', { source: a.source_note })}</p>
          <div className="flex gap-2">
            <a className="btn btn-secondary min-h-11 flex-1" href={`#/learn?lesson=${LESSON_FOR_CATEGORY[a.scam_category] ?? 'what_to_do'}`}>{t('alerts.learn')}</a>
            {!read.includes(a.id) && <button className="btn btn-secondary min-h-11 flex-1" onClick={() => mark(a.id)}>{t('alerts.dismiss')}</button>}
          </div>
        </article>
      ))}
    </section>
  )
}

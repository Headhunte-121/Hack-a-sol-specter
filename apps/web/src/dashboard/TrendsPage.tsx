import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useLang } from '../shell/i18n'
import { Layout } from '../shell/Layout'
import { apiBase, apiGet } from './api'
import { REGIONS } from './regionsData'

type Row = { week_start?: string; region_code?: string; scam_category: string; report_count: number }
interface Trend { group: string; min_count: number; suppressed_cells: number; includes_seed: boolean; rows: Row[] }
interface Overview { this_week_total: number; last_week_total: number; change_pct: number | null; min_count: number; top3: { scam_category: string; report_count: number }[]; includes_seed: boolean }
interface Rising { rows: { scam_category: string; this_week: number; last_week: number }[] }

const COLORS = ['#0f766e', '#b45309', '#1d4ed8', '#be123c', '#6d28d9', '#15803d', '#a16207', '#0e7490', '#9d174d', '#475569', '#7c2d12']
const CHANNELS = ['sms', 'call', 'qr', 'other'] as const
type Tab = 'overview' | 'trend' | 'regions' | 'about'

const q = (o: Record<string, string>) => {
  const s = new URLSearchParams(Object.entries(o).filter(([, v]) => v)).toString()
  return s ? `?${s}` : ''
}

export default function TrendsPage() {
  const { t, lang } = useLang()
  const [tab, setTab] = useState<Tab>('overview')
  const [region, setRegion] = useState('')
  const [channel, setChannel] = useState('')
  const [overview, setOverview] = useState<Overview | null>(null)
  const [weekly, setWeekly] = useState<Trend | null>(null)
  const [byRegion, setByRegion] = useState<Trend | null>(null)
  const [rising, setRising] = useState<Rising | null>(null)
  const [state, setState] = useState<{ loading: boolean; cached: boolean; error: boolean }>({ loading: true, cached: false, error: false })

  useEffect(() => {
    let live = true
    setState((s) => ({ ...s, loading: true }))
    Promise.all([
      apiGet<Overview>('/trends/overview' + q({ region })),
      apiGet<Trend>('/trends' + q({ group: 'week', region, channel })),
      apiGet<Trend>('/trends' + q({ group: 'region', channel })),
      apiGet<Rising>('/trends/rising'),
    ]).then(([o, w, r, ri]) => {
      if (!live) return
      setOverview(o.data); setWeekly(w.data); setByRegion(r.data); setRising(ri.data)
      setState({ loading: false, cached: [o, w, r].some((x) => x.fromCache), error: [o, w, r].every((x) => x.error) })
    })
    return () => { live = false }
  }, [region, channel])

  const regionName = (code: string) => { const r = REGIONS.find((x) => x.code === code); return r ? (lang === 'en' ? r.en : r.hi) : code }
  const cat = (c: string) => t(`cat.${c}`) || c
  const demo = [overview, weekly, byRegion].some((x) => x?.includes_seed)

  const weeklyPivot = useMemo(() => {
    const weeks = [...new Set((weekly?.rows ?? []).map((r) => r.week_start!))].sort()
    const cats = [...new Set((weekly?.rows ?? []).map((r) => r.scam_category))]
    const data = weeks.map((w) => Object.fromEntries([['week', w], ...cats.map((c) => [c, weekly!.rows.find((r) => r.week_start === w && r.scam_category === c)?.report_count ?? 0])]))
    return { data, cats }
  }, [weekly])

  const regionTotals = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of byRegion?.rows ?? []) m.set(r.region_code!, (m.get(r.region_code!) ?? 0) + r.report_count)
    return [...m.entries()].map(([code, n]) => ({ name: regionName(code), n })).sort((a, b) => b.n - a.n).slice(0, 15)
  }, [byRegion, lang])

  const Filters = (
    <div className="grid grid-cols-2 gap-2">
      <label className="text-sm font-bold">{t('trends.filter.region')}
        <select className="mt-1 min-h-12 w-full rounded-lg border-2 border-slate-400 bg-white px-2 font-normal" value={region} onChange={(e) => setRegion(e.target.value)}>
          <option value="">{t('trends.all')}</option>
          {REGIONS.map((r) => <option key={r.code} value={r.code}>{lang === 'en' ? r.en : r.hi}</option>)}
        </select>
      </label>
      <label className="text-sm font-bold">{t('trends.filter.channel')}
        <select className="mt-1 min-h-12 w-full rounded-lg border-2 border-slate-400 bg-white px-2 font-normal" value={channel} onChange={(e) => setChannel(e.target.value)}>
          <option value="">{t('trends.all')}</option>
          {CHANNELS.map((c) => <option key={c} value={c}>{t(`trends.channel.${c}`)}</option>)}
        </select>
      </label>
    </div>
  )

  const tabs: Tab[] = ['overview', 'trend', 'regions', 'about']
  const empty = !state.loading && ((tab === 'trend' && weeklyPivot.data.length === 0) || (tab === 'regions' && regionTotals.length === 0))

  return (
    <Layout title={t('trends.title')}>
      {demo && <div role="note" className="rounded-xl border-2 border-amber-600 bg-amber-100 p-3 font-bold text-amber-950">⚠️ {t('trends.demo_banner')}</div>}
      {state.cached && <p className="text-sm text-slate-600">📴 {t('trends.cached')}</p>}
      {!apiBase() && !state.cached && <p role="alert" className="rounded-xl border-2 border-slate-500 bg-white p-3">{t('trends.no_backend')}</p>}
      {state.error && apiBase() && <p role="alert" className="rounded-xl border-2 border-red-600 bg-red-50 p-3 text-red-900">{t('trends.error')}</p>}

      <div role="tablist" className="grid grid-cols-4 gap-1">
        {tabs.map((x) => (
          <button key={x} role="tab" aria-selected={tab === x} onClick={() => setTab(x)} className={`min-h-12 rounded-lg border-2 px-1 text-sm font-bold ${tab === x ? 'border-teal-800 bg-teal-700 text-white' : 'border-slate-400 bg-white'}`}>
            {t(`trends.tab.${x}`)}
          </button>
        ))}
      </div>

      {tab !== 'about' && Filters}
      {state.loading && <p>…</p>}
      {empty && <p className="card">{t('trends.empty')}</p>}

      {tab === 'overview' && overview && !state.loading && (
        <section className="space-y-3" data-testid="overview">
          <div className="card text-center">
            <p className="text-sm">{t('trends.this_week')}</p>
            <p className="text-5xl font-bold text-teal-800">{overview.this_week_total}</p>
            <p className="text-sm">{overview.change_pct === null ? t('trends.change.none') : t('trends.change', { pct: `${overview.change_pct > 0 ? '+' : ''}${overview.change_pct}` })}</p>
          </div>
          <div className="card">
            <h2 className="mb-2 font-bold">{t('trends.top3')}</h2>
            <ol className="space-y-2">
              {overview.top3.map((r, i) => (
                <li key={r.scam_category} className="flex items-center justify-between gap-2">
                  <span><span className="mr-2 inline-grid size-7 place-items-center rounded-full bg-teal-700 text-white">{i + 1}</span>{cat(r.scam_category)}</span>
                  <strong>{r.report_count}</strong>
                </li>
              ))}
            </ol>
          </div>
          {rising && rising.rows.length > 0 && (
            <div className="card">
              <h2 className="mb-1 font-bold">📈 {t('trends.rising')}</h2>
              <ul className="list-disc pl-5">{rising.rows.map((r) => <li key={r.scam_category}>{cat(r.scam_category)}: {r.last_week} → {r.this_week}</li>)}</ul>
            </div>
          )}
          <p className="text-xs text-slate-600">{t('trends.suppressed', { n: (weekly?.suppressed_cells ?? 0) })}</p>
        </section>
      )}

      {tab === 'trend' && weeklyPivot.data.length > 0 && !state.loading && (
        <section className="space-y-3" data-testid="trend">
          <h2 className="font-bold">{t('trends.chart_trend')}</h2>
          <div role="img" aria-label={t('trends.chart_trend')} className="h-72 rounded-xl bg-white p-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyPivot.data} margin={{ left: -20, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="week" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} formatter={(v: string) => cat(v)} />
                {weeklyPivot.cats.map((c, i) => <Line key={c} type="monotone" dataKey={c} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} name={c} />)}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <details className="card"><summary className="font-bold">{t('trends.view_table')}</summary>
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr><th className="text-left">{t('trends.col.week')}</th><th className="text-left">{t('trends.col.type')}</th><th>{t('trends.col.count')}</th></tr></thead>
              <tbody>{(weekly?.rows ?? []).map((r, i) => <tr key={i}><td>{r.week_start}</td><td>{cat(r.scam_category)}</td><td className="text-center">{r.report_count}</td></tr>)}</tbody></table></div>
          </details>
        </section>
      )}

      {tab === 'regions' && regionTotals.length > 0 && !state.loading && (
        <section className="space-y-3" data-testid="regions">
          <h2 className="font-bold">{t('trends.chart_region')}</h2>
          <div role="img" aria-label={t('trends.chart_region')} className="h-96 rounded-xl bg-white p-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={regionTotals} layout="vertical" margin={{ left: 20, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" /><XAxis type="number" tick={{ fontSize: 11 }} /><YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} /><Tooltip />
                <Bar dataKey="n" fill="#0f766e" name={t('trends.col.count')} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <details className="card"><summary className="font-bold">{t('trends.view_table')}</summary>
            <table className="w-full text-sm"><thead><tr><th className="text-left">{t('trends.col.district')}</th><th>{t('trends.col.count')}</th></tr></thead>
              <tbody>{regionTotals.map((r) => <tr key={r.name}><td>{r.name}</td><td className="text-center">{r.n}</td></tr>)}</tbody></table>
          </details>
          <p className="text-xs text-slate-600">{t('trends.suppressed', { n: byRegion?.suppressed_cells ?? 0 })}</p>
        </section>
      )}

      {tab === 'about' && (
        <section className="card space-y-3 leading-7" data-testid="about">
          <p>✅ {t('trends.about.collected')}</p>
          <p>🚫 {t('trends.about.never')}</p>
          <p>🔒 {t('trends.about.rule', { min: overview?.min_count ?? 5 })}</p>
          <p>{demo ? `⚠️ ${t('trends.demo_banner')}` : ''}</p>
          <p className="text-sm">{t('trends.about.indicative')}</p>
          {apiBase() && <a className="btn btn-secondary" href={`${apiBase()}/export`}>⬇️ {t('trends.export')}</a>}
        </section>
      )}
    </Layout>
  )
}

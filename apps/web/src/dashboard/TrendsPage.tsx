import {
  AlertTriangle,
  BarChart3,
  Building2,
  Download,
  Flame,
  Info,
  Lock,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  WifiOff,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useDemoMode } from '../shell/demoMode'
import { useLang } from '../shell/i18n'
import { Layout } from '../shell/Layout'
import { apiBase, apiGet } from './api'
import { downloadLocalTrendsCsv } from './localDemo'
import { REGIONS } from './regionsData'

type Row = { week_start?: string; region_code?: string; scam_category: string; report_count: number }
interface Trend {
  group: string
  min_count: number
  suppressed_cells: number
  includes_seed: boolean
  rows: Row[]
}
interface Overview {
  this_week_total: number
  last_week_total: number
  change_pct: number | null
  min_count: number
  top3: { scam_category: string; report_count: number }[]
  channels?: { channel: string; report_count: number }[]
  includes_seed: boolean
}
interface Rising {
  rows: { scam_category: string; this_week: number; last_week: number }[]
}

const COLORS = ['#1B3B73', '#2563EB', '#0D9488', '#D97706', '#DC2626', '#7C3AED', '#059669', '#0284C7', '#BE123C', '#475569', '#B45309']
const CHANNELS = ['sms', 'call', 'qr', 'other'] as const
type Tab = 'overview' | 'trend' | 'regions' | 'about'

const qs = (o: Record<string, string>) => {
  const s = new URLSearchParams(Object.entries(o).filter(([, v]) => v)).toString()
  return s ? `?${s}` : ''
}

export default function TrendsPage() {
  const { t, lang } = useLang()
  const [demoMode] = useDemoMode()
  const [tab, setTab] = useState<Tab>('overview')
  const [region, setRegion] = useState('')
  const [channel, setChannel] = useState('')
  const [tick, setTick] = useState(0)
  const [overview, setOverview] = useState<Overview | null>(null)
  const [weekly, setWeekly] = useState<Trend | null>(null)
  const [byRegion, setByRegion] = useState<Trend | null>(null)
  const [rising, setRising] = useState<Rising | null>(null)
  const [state, setState] = useState({ loading: true, cached: false, error: false })

  const load = useCallback(() => {
    let live = true
    setState((s) => ({ ...s, loading: true }))
    const demo = demoMode ? '' : '0' // Demo mode off: real reports only, never the labelled demo rows
    Promise.all([
      apiGet<Overview>('/trends/overview' + qs({ region, channel, demo })),
      apiGet<Trend>('/trends' + qs({ group: 'week', region, channel, demo })),
      apiGet<Trend>('/trends' + qs({ group: 'region', channel, demo })),
      apiGet<Rising>('/trends/rising' + qs({ region, demo })),
    ]).then(([o, w, r, ri]) => {
      if (!live) return
      setOverview(o.data)
      setWeekly(w.data)
      setByRegion(r.data)
      setRising(ri.data)
      setState({
        loading: false,
        cached: [o, w, r].some((x) => x.fromCache),
        error: [o, w, r].every((x) => x.error),
      })
    })
    return () => {
      live = false
    }
  }, [region, channel, demoMode])

  useEffect(() => load(), [load, tick])

  const regionName = useCallback(
    (code: string) => {
      const r = REGIONS.find((x) => x.code === code)
      return r ? (lang === 'en' ? r.en : r.hi) : code
    },
    [lang],
  )
  const cat = useCallback((c: string) => t(`cat.${c}`) || c, [t])
  // demo numbers are always labelled, whatever the Demo setting says: the label follows the data, not the switch
  const includesSeed = [overview, weekly, byRegion].some((x) => x?.includes_seed)

  // Weekly series pivoted for the chart: the five biggest scam types, so the lines stay readable
  const weeklyPivot = useMemo(() => {
    const weeks = [...new Set((weekly?.rows ?? []).map((r) => r.week_start!))].sort()
    const totals = new Map<string, number>()
    for (const r of weekly?.rows ?? []) totals.set(r.scam_category, (totals.get(r.scam_category) ?? 0) + r.report_count)
    const cats = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([c]) => c)
    const data = weeks.map((w) =>
      Object.fromEntries([
        ['week', w],
        ...cats.map((c) => [c, weekly!.rows.find((r) => r.week_start === w && r.scam_category === c)?.report_count ?? 0]),
      ]),
    )
    return { data, cats }
  }, [weekly])

  // District totals with the most reported scam type in each, for banks and district administration
  const regionTotals = useMemo(() => {
    const map = new Map<string, { total: number; topCat: string; topCount: number }>()
    for (const r of byRegion?.rows ?? []) {
      const code = r.region_code!
      const prev = map.get(code)
      if (!prev) {
        map.set(code, { total: r.report_count, topCat: r.scam_category, topCount: r.report_count })
      } else {
        prev.total += r.report_count
        if (r.report_count > prev.topCount) {
          prev.topCat = r.scam_category
          prev.topCount = r.report_count
        }
      }
    }
    return [...map.entries()]
      .map(([code, v]) => ({ code, name: regionName(code), n: v.total, topCat: v.topCat }))
      .sort((a, b) => b.n - a.n)
      .slice(0, 12)
  }, [byRegion, regionName])

  const topRegion = regionTotals[0] ?? null
  const topScam = overview?.top3?.[0] ?? null
  const maxTopCount = overview?.top3?.[0]?.report_count || 1
  const suppressedTotal = Math.max(weekly?.suppressed_cells ?? 0, byRegion?.suppressed_cells ?? 0)

  const handleExport = () => {
    if (apiBase()) window.open(`${apiBase()}/export`, '_blank', 'noopener,noreferrer')
    else downloadLocalTrendsCsv(demoMode)
  }

  const tabs: { id: Tab; icon: typeof BarChart3 }[] = [
    { id: 'overview', icon: BarChart3 },
    { id: 'trend', icon: TrendingUp },
    { id: 'regions', icon: Building2 },
    { id: 'about', icon: Info },
  ]

  const overviewEmpty = !!overview && overview.this_week_total === 0 && overview.top3.length === 0
  const isEmpty =
    !state.loading &&
    ((tab === 'trend' && weeklyPivot.data.length === 0) ||
      (tab === 'regions' && regionTotals.length === 0) ||
      (tab === 'overview' && overviewEmpty))

  return (
    <Layout title={t('trends.title')}>
      <div className="space-y-4">
        {includesSeed && (
          <div
            role="note"
            className="flex items-start gap-2.5 rounded-2xl border border-amber-300/80 bg-amber-50 px-4 py-3 text-[13.5px] font-semibold text-amber-900"
          >
            <AlertTriangle className="mt-0.5 size-4.5 shrink-0 text-amber-600" />
            <span>{t('trends.demo_banner')}</span>
          </div>
        )}

        {!apiBase() && !demoMode && (
          <p className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-[13px] font-medium text-slate-600">{t('trends.no_backend')}</p>
        )}

        {state.cached && (
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-[13px] font-medium text-slate-600">
            <WifiOff className="size-4 text-amber-600" />
            <span>{t('trends.cached')}</span>
          </div>
        )}

        {state.error && (
          <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[14px] font-semibold text-red-800">
            {t('trends.error')}
          </div>
        )}

        {/* Tabs, refresh and export */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div role="tablist" className="grid grid-cols-4 gap-1 rounded-2xl border border-slate-200/90 bg-white p-1 shadow-2xs sm:inline-grid">
            {tabs.map(({ id, icon: TabIcon }) => {
              const active = tab === id
              return (
                <button
                  key={id}
                  role="tab"
                  type="button"
                  aria-selected={active}
                  onClick={() => setTab(id)}
                  className={`inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-bold transition-all ${
                    active ? 'bg-[#1B3B73] text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <TabIcon className="hidden size-3.5 sm:inline" />
                  <span className="truncate">{t(`trends.tab.${id}`)}</span>
                </button>
              )
            })}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTick((x) => x + 1)}
              className="inline-flex h-9.5 cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-bold text-slate-700 shadow-2xs transition hover:border-[#1B3B73]/40 hover:text-[#1B3B73]"
            >
              <RefreshCw className={`size-3.5 ${state.loading ? 'animate-spin' : ''}`} />
              <span>{t('common.retry')}</span>
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex h-9.5 cursor-pointer items-center gap-1.5 rounded-xl border border-[#1B3B73]/30 bg-blue-50/70 px-3 text-[13px] font-bold text-[#1B3B73] transition hover:bg-blue-100"
            >
              <Download className="size-3.5" />
              <span className="hidden sm:inline">{t('trends.export')}</span>
              <span className="sm:hidden">CSV</span>
            </button>
          </div>
        </div>

        {tab !== 'about' && (
          <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-2xs sm:grid-cols-2">
            <label className="space-y-1 text-[12px] font-bold uppercase tracking-wider text-slate-500">
              <span>{t('trends.filter.region')}</span>
              <select
                className="input h-10! min-h-10! py-1! text-[14px]! font-semibold text-slate-800"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
              >
                <option value="">{t('trends.all')}</option>
                {REGIONS.map((r) => (
                  <option key={r.code} value={r.code}>
                    {lang === 'en' ? r.en : r.hi}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-[12px] font-bold uppercase tracking-wider text-slate-500">
              <span>{t('trends.filter.channel')}</span>
              <select
                className="input h-10! min-h-10! py-1! text-[14px]! font-semibold text-slate-800"
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
              >
                <option value="">{t('trends.all')}</option>
                {CHANNELS.map((c) => (
                  <option key={c} value={c}>
                    {t(`trends.channel.${c}`)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        {state.loading && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white" />
            ))}
          </div>
        )}

        {isEmpty && <div className="card py-8 text-center text-[15px] font-medium text-slate-600">{t('trends.empty')}</div>}

        {/* ==================== OVERVIEW ==================== */}
        {tab === 'overview' && overview && !overviewEmpty && !state.loading && (
          <section className="space-y-4" data-testid="overview">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="card space-y-1">
                <p className="text-[12px] font-bold uppercase tracking-wider text-slate-500">{t('trends.this_week')}</p>
                <div className="flex items-baseline gap-2.5">
                  <span className="text-[34px] font-extrabold leading-none text-[#1B3B73]">{overview.this_week_total}</span>
                  {overview.change_pct !== null && (
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[12px] font-bold ${
                        overview.change_pct > 0 ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {overview.change_pct > 0 ? `+${overview.change_pct}%` : `${overview.change_pct}%`}
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-slate-500">
                  {overview.change_pct === null
                    ? t('trends.change.none')
                    : t('trends.change', { pct: `${overview.change_pct > 0 ? '+' : ''}${overview.change_pct}` })}
                </p>
              </div>

              <div className="card space-y-1">
                <p className="text-[12px] font-bold uppercase tracking-wider text-slate-500">{t('trends.top3')}</p>
                <div className="text-[18px] font-extrabold leading-snug text-slate-900">{topScam ? cat(topScam.scam_category) : '—'}</div>
                {topScam && (
                  <p className="text-[12.5px] font-semibold text-[#1B3B73]">
                    {topScam.report_count} {t('trends.col.count').toLowerCase()}
                  </p>
                )}
              </div>

              <div className="card space-y-1">
                <p className="text-[12px] font-bold uppercase tracking-wider text-slate-500">{t('trends.tab.regions')}</p>
                <div className="text-[18px] font-extrabold leading-snug text-slate-900">{topRegion ? topRegion.name : '—'}</div>
                {topRegion && (
                  <p className="text-[12.5px] font-semibold text-teal-700">
                    {topRegion.n} {t('trends.col.count').toLowerCase()} · {cat(topRegion.topCat)}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
              <div className="card space-y-3 lg:col-span-3">
                <h2 className="text-[16px] font-bold text-slate-900">{t('trends.top3')}</h2>
                <ol className="space-y-3">
                  {overview.top3.slice(0, 5).map((r, i) => {
                    const pct = Math.max(8, Math.round((r.report_count / maxTopCount) * 100))
                    return (
                      <li key={r.scam_category} className="space-y-1">
                        <div className="flex items-center justify-between gap-2 text-[14px]">
                          <span className="flex items-center gap-2 font-bold text-slate-800">
                            <span
                              className="inline-flex size-5 items-center justify-center rounded-full text-[11px] font-extrabold text-white"
                              style={{ backgroundColor: COLORS[i % COLORS.length] }}
                            >
                              {i + 1}
                            </span>
                            {cat(r.scam_category)}
                          </span>
                          <span className="font-extrabold text-slate-900">{r.report_count}</span>
                        </div>
                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                        </div>
                      </li>
                    )
                  })}
                </ol>
              </div>

              <div className="space-y-4 lg:col-span-2">
                {rising && rising.rows.length > 0 && (
                  <div className="card space-y-2.5 border-amber-200/90! bg-amber-50/40!">
                    <h2 className="flex items-center gap-2 text-[15.5px] font-bold text-amber-900">
                      <Flame className="size-4.5 text-amber-600" />
                      <span>{t('trends.rising')}</span>
                    </h2>
                    <ul className="space-y-2">
                      {rising.rows.map((r) => (
                        <li
                          key={r.scam_category}
                          className="flex items-center justify-between gap-2 rounded-xl border border-amber-200/70 bg-white px-3 py-2 text-[13.5px]"
                        >
                          <span className="font-bold text-slate-800">{cat(r.scam_category)}</span>
                          <span className="shrink-0 font-mono text-[12.5px] font-bold text-red-600">
                            {r.last_week} → {r.this_week}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {overview.channels && overview.channels.length > 0 && (
                  <div className="card space-y-2.5">
                    <h2 className="text-[15px] font-bold text-slate-900">{t('trends.filter.channel')}</h2>
                    <div className="grid grid-cols-2 gap-2">
                      {overview.channels.map((c) => (
                        <div key={c.channel} className="rounded-xl border border-slate-200/80 bg-slate-50/70 px-3 py-2">
                          <div className="text-[12px] font-semibold text-slate-500">{t(`trends.channel.${c.channel}`)}</div>
                          <div className="text-[19px] font-extrabold text-[#1B3B73]">{c.report_count}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <p className="flex items-center gap-1.5 text-[12.5px] text-slate-500">
              <Lock className="size-3.5 shrink-0" />
              <span>{t('trends.suppressed', { n: suppressedTotal })}</span>
            </p>
          </section>
        )}

        {/* ==================== OVER TIME ==================== */}
        {tab === 'trend' && weeklyPivot.data.length > 0 && !state.loading && (
          <section className="space-y-4" data-testid="trend">
            <div className="card space-y-3">
              <h2 className="text-[16px] font-bold text-slate-900">{t('trends.chart_trend')}</h2>
              <div role="img" aria-label={t('trends.chart_trend')} className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weeklyPivot.data} margin={{ top: 8, right: 12, left: -16, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#64748B' }} tickFormatter={(v: string) => v.slice(5)} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 13 }}
                      labelFormatter={(v) => `${t('trends.col.week')}: ${String(v)}`}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    {weeklyPivot.cats.map((c, i) => (
                      <Area
                        key={c}
                        type="monotone"
                        dataKey={c}
                        stroke={COLORS[i % COLORS.length]}
                        fill={COLORS[i % COLORS.length]}
                        fillOpacity={0.12}
                        strokeWidth={2.3}
                        name={cat(c)}
                      />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <details className="card">
              <summary className="cursor-pointer text-[14.5px] font-bold text-slate-800">{t('trends.view_table')}</summary>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-[13.5px]">
                  <thead className="border-b border-slate-200 text-[12px] uppercase text-slate-500">
                    <tr>
                      <th className="py-2 pr-3">{t('trends.col.week')}</th>
                      <th className="py-2 pr-3">{t('trends.col.type')}</th>
                      <th className="py-2 text-right">{t('trends.col.count')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(weekly?.rows ?? []).slice(0, 40).map((r, i) => (
                      <tr key={i}>
                        <td className="py-2 pr-3 font-mono text-[12.5px] text-slate-600">{r.week_start}</td>
                        <td className="py-2 pr-3 font-semibold text-slate-800">{cat(r.scam_category)}</td>
                        <td className="py-2 text-right font-bold text-[#1B3B73]">{r.report_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </section>
        )}

        {/* ==================== DISTRICTS ==================== */}
        {tab === 'regions' && regionTotals.length > 0 && !state.loading && (
          <section className="space-y-4" data-testid="regions">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
              <div className="card space-y-3 lg:col-span-3">
                <h2 className="text-[16px] font-bold text-slate-900">{t('trends.chart_region')}</h2>
                <div role="img" aria-label={t('trends.chart_region')} className="h-96 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={regionTotals} layout="vertical" margin={{ top: 4, right: 16, left: 10, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11, fill: '#64748B' }} />
                      <YAxis type="category" dataKey="name" width={104} tick={{ fontSize: 12, fill: '#1E293B', fontWeight: 600 }} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 13 }} />
                      <Bar dataKey="n" radius={[0, 8, 8, 0]} name={t('trends.col.count')}>
                        {regionTotals.map((_, i) => (
                          <Cell key={i} fill={i === 0 ? '#1B3B73' : i < 3 ? '#2563EB' : '#0D9488'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="card space-y-3 lg:col-span-2">
                <h2 className="text-[15.5px] font-bold text-slate-900">{t('trends.view_table')}</h2>
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full text-left text-[13.5px]">
                    <thead className="sticky top-0 border-b border-slate-200 bg-white text-[11.5px] uppercase text-slate-500">
                      <tr>
                        <th className="py-2 pr-2">{t('trends.col.district')}</th>
                        <th className="py-2 pr-2">{t('trends.col.type')}</th>
                        <th className="py-2 text-right">{t('trends.col.count')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {regionTotals.map((r) => (
                        <tr key={r.code}>
                          <td className="py-2 pr-2 font-bold text-slate-800">{r.name}</td>
                          <td className="py-2 pr-2 text-[12.5px] text-slate-600">{cat(r.topCat)}</td>
                          <td className="py-2 text-right font-extrabold text-[#1B3B73]">{r.n}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <p className="flex items-center gap-1.5 text-[12.5px] text-slate-500">
              <Lock className="size-3.5 shrink-0" />
              <span>{t('trends.suppressed', { n: byRegion?.suppressed_cells ?? 0 })}</span>
            </p>
          </section>
        )}

        {/* ==================== ABOUT THE DATA ==================== */}
        {tab === 'about' && (
          <section className="card space-y-3.5 text-[14.5px] leading-relaxed text-slate-700" data-testid="about">
            <div className="flex items-start gap-2.5 rounded-xl bg-emerald-50/80 p-3 text-emerald-900">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-emerald-600" />
              <p>{t('trends.about.collected')}</p>
            </div>
            <div className="flex items-start gap-2.5 rounded-xl bg-slate-50 p-3 text-slate-800">
              <Lock className="mt-0.5 size-5 shrink-0 text-[#1B3B73]" />
              <p>{t('trends.about.never')}</p>
            </div>
            <p className="px-1">🔒 {t('trends.about.rule', { min: overview?.min_count ?? 5 })}</p>
            <p className="px-1 text-[13.5px] text-slate-500">{t('trends.about.indicative')}</p>

            <div className="pt-1">
              <button type="button" className="btn btn-secondary" onClick={handleExport}>
                <Download className="size-4" />
                <span>{t('trends.export')}</span>
              </button>
            </div>
          </section>
        )}
      </div>
    </Layout>
  )
}

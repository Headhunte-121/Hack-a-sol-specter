import { beforeEach, describe, expect, it } from 'vitest'
import { setConsent } from '../shell/consent'
import { isDemoMode, setDemoMode } from '../shell/demoMode'
import { setDemoModeStorage, isDemoMode as cardIsDemoMode } from '../ui/shared/DemoModeCard'
import { apiGet } from './api'
import { buildLocalDashboardResponse, recordLocalAnonymousReport } from './localDemo'
import { buildReportPayload } from './report'
import { syncQueue } from './sync'

interface Overview { this_week_total: number; top3: { scam_category: string; report_count: number }[]; includes_seed: boolean; min_count: number }
interface Trend { group: string; suppressed_cells: number; includes_seed: boolean; rows: { week_start?: string; region_code?: string; scam_category: string; report_count: number }[] }

beforeEach(() => {
  localStorage.clear()
})

describe('trends with no server connected', () => {
  it('shows labelled demo numbers while Demo mode is on', async () => {
    const r = await apiGet<Overview>('/trends/overview')
    expect(r.localFallback).toBe(true)
    expect(r.error).toBe(false)
    expect(r.data!.includes_seed).toBe(true)
    expect(r.data!.this_week_total).toBeGreaterThan(0)
    expect(r.data!.top3.length).toBeGreaterThan(0)
  })

  it('shows no demo numbers with Demo mode off, and no sample alerts either', async () => {
    const o = (await apiGet<Overview>('/trends/overview?demo=0')).data!
    expect(o.this_week_total).toBe(0)
    expect(o.top3).toEqual([])
    expect(o.includes_seed).toBe(false)
    expect((buildLocalDashboardResponse('/alerts?demo=0') as { rows: unknown[] }).rows).toEqual([])
    expect((buildLocalDashboardResponse('/alerts') as { rows: unknown[] }).rows.length).toBeGreaterThan(0)
  })

  it('hides any group of fewer than five reports, and counts the hidden groups', () => {
    const t = buildLocalDashboardResponse('/trends?group=region') as Trend
    expect(t.rows.every((r) => r.report_count >= 5)).toBe(true)
    expect(t.suppressed_cells).toBeGreaterThan(0)
    const w = buildLocalDashboardResponse('/trends?group=week') as Trend
    expect(w.rows.every((r) => r.week_start && !r.region_code && r.report_count >= 5)).toBe(true)
    const weeks = w.rows.map((r) => r.week_start!)
    expect([...weeks].sort()).toEqual(weeks)
  })

  it('groups districts by district and weeks by week', () => {
    const regions = (buildLocalDashboardResponse('/trends?group=region') as Trend).rows.map((r) => r.region_code)
    expect(regions.every((c) => typeof c === 'string' && c.length > 0 && !c.startsWith('20'))).toBe(true)
    expect(regions).toContain('raipur')
  })

  it('adds reports sent from this device, but only once five of a kind exist', () => {
    setDemoMode(false)
    const p = buildReportPayload({ category: 'fake_qr', channel: 'qr', region: 'raipur', band: 'likely_scam' })
    for (let i = 0; i < 4; i++) recordLocalAnonymousReport(p)
    expect((buildLocalDashboardResponse('/trends/overview?demo=0') as Overview).this_week_total).toBe(0)
    recordLocalAnonymousReport(p)
    const o = buildLocalDashboardResponse('/trends/overview?demo=0') as Overview
    expect(o.this_week_total).toBe(5)
    expect(o.top3[0]).toEqual({ scam_category: 'fake_qr', report_count: 5 })
    expect(o.includes_seed).toBe(false)
  })

  it('keeps only the four report fields on the device', () => {
    recordLocalAnonymousReport(buildReportPayload({ category: 'otp', channel: 'call', region: 'durg', band: 'suspicious' }))
    const stored = JSON.parse(localStorage.getItem('gt02:local_anon_reports')!)[0]
    expect(Object.keys(stored).sort()).toEqual(['channel', 'date', 'region_code', 'scam_category'])
    expect(stored.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('forgets the on-device reports when consent is withdrawn', async () => {
    recordLocalAnonymousReport(buildReportPayload({ category: 'otp', channel: 'call', region: 'durg', band: 'suspicious' }))
    setConsent(false)
    await syncQueue()
    expect(JSON.parse(localStorage.getItem('gt02:local_anon_reports')!)).toEqual([])
  })
})

describe('one Demo mode switch', () => {
  it('the Settings card and the pages read the same stored value', () => {
    expect(isDemoMode()).toBe(true)
    setDemoModeStorage(false)
    expect(isDemoMode()).toBe(false)
    expect(cardIsDemoMode()).toBe(false)
    setDemoMode(true)
    expect(cardIsDemoMode()).toBe(true)
  })
})

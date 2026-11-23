import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { kvGet, kvSet } from '../shell/storage'
import { LangProvider } from '../shell/i18n'
import ComplaintPage from './ComplaintPage'
import ReportPage from './ReportPage'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

// jsdom has no matchMedia: report a phone-sized, touch screen
const phone = () => { window.matchMedia = ((q: string) => ({ matches: q.includes('pointer: coarse'), media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as unknown as typeof window.matchMedia }

const bankSms = 'Dear Customer, INR 25,000.00 debited from A/c XX1234 on 23-Nov-26 17:42 and credited to VPA fraudster99@ybl (UPI Ref No 412398765012). -SBI'

describe('the complaint helper screen', () => {
  let host: HTMLDivElement
  let root: Root
  beforeEach(() => {
    phone()
    localStorage.clear()
    localStorage.setItem('gt02:lang', JSON.stringify('en'))
    host = document.createElement('div')
    document.body.appendChild(host)
  })
  afterEach(() => { act(() => root.unmount()); host.remove(); vi.restoreAllMocks() })

  const mount = async (el = <ComplaintPage />) => { await act(async () => { root = createRoot(host); root.render(<LangProvider>{el}</LangProvider>) }) }
  const $ = (sel: string) => host.querySelector(sel) as HTMLElement
  const fill = async (el: HTMLElement, value: string) => {
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
    await act(async () => {
      Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(el, value)
      el.dispatchEvent(new Event('input', { bubbles: true }))
    })
  }
  const click = async (el: HTMLElement) => { await act(async () => { el.click() }) }
  const inputByLabel = (label: string) => [...host.querySelectorAll('label')].find((l) => l.textContent?.includes(label))!.querySelector('input,textarea') as HTMLInputElement
  const reportText = () => $('[data-testid="website-text"]').textContent ?? ''

  it('says up front that nothing leaves the phone and never shows the money boxes before they are needed', async () => {
    await mount()
    expect(host.textContent).toContain('stays on this phone')
    expect(host.textContent).not.toContain('Transaction number (UTR)')
    await click($('[data-money="yes"]'))
    expect(host.textContent).toContain('Transaction number (UTR)')
    expect($('[data-testid="call-sheet"]')).not.toBeNull()
  })

  it('fills the details out of a pasted bank SMS and builds the report from them', async () => {
    await mount()
    await click($('[data-money="yes"]'))
    await fill($('[data-testid="paste"] textarea'), bankSms)
    await click([...host.querySelectorAll('[data-testid="paste"] button')].find((b) => b.textContent?.includes('Find the details')) as HTMLElement)
    expect(host.textContent).toMatch(/Filled in \d+ details/)
    expect(inputByLabel('Amount lost').value).toBe('25000')
    expect(inputByLabel('Transaction number').value).toBe('412398765012')
    expect(inputByLabel('Money went to').value).toBe('fraudster99@ybl')
    expect(reportText()).toContain('Amount lost: Rs 25,000')
    expect(reportText()).toContain('Transaction ID / UTR: 412398765012')
  })

  it('changes the plan to match what the person shared or did, with 1930 first when money was lost', async () => {
    await mount()
    await click($('[data-money="yes"]'))
    const first = () => [...host.querySelectorAll('[data-plan]')].map((e) => e.getAttribute('data-plan'))
    expect(first().slice(0, 2)).toEqual(['call_1930', 'ask_bank_hold'])
    expect(first()).not.toContain('remove_app')
    await click($('[data-shared="installed_app"]'))
    expect(first()).toContain('remove_app')
    await click($('[data-shared="otp"]'))
    expect(first()).toContain('block_card_upi')
  })

  it('lists what is still missing and copies a box on its own', async () => {
    const write = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: write }, configurable: true })
    await mount()
    await click($('[data-money="yes"]'))
    expect($('[data-testid="missing"]').textContent).toContain('Transaction number (UTR)')
    await fill(inputByLabel('Transaction number'), '998877665544')
    expect($('[data-testid="missing"]').textContent).not.toContain('Transaction number (UTR)')
    await click($('[data-field-copy="txn"]'))
    expect(write).toHaveBeenCalledWith('998877665544')
  })

  it('keeps a draft on the device so a refresh does not lose it, and clears it on request', async () => {
    await mount()
    await click($('[data-money="yes"]'))
    await fill(inputByLabel('Amount lost'), '4200')
    expect(kvGet<{ amount: string } | null>('complaint.draft', null)?.amount).toBe('4200')
    act(() => root.unmount())
    await mount()
    expect(inputByLabel('Amount lost').value).toBe('4200')
    await click($('[data-testid="clear"]'))
    const after = kvGet<{ amount: string; txnId: string; payee: string; story: string } | null>('complaint.draft', null)
    expect([after?.amount ?? '', after?.txnId ?? '', after?.payee ?? '', after?.story ?? '']).toEqual(['', '', '', ''])
    expect(inputByLabel('Date').value).not.toBe('')
    expect(host.textContent).not.toContain('Transaction number (UTR)')
  })

  it('starts from what the report screen already knows, once', async () => {
    kvSet('complaint.context', { outcome: 'money_lost', category: 'fake_qr', channel: 'qr', paid: 'upi' })
    await mount()
    expect($('[data-category="fake_qr"]').getAttribute('aria-checked')).toBe('true')
    expect($('[data-channel-pick="qr"]').getAttribute('aria-checked')).toBe('true')
    expect($('[data-pay="upi"]').getAttribute('aria-checked')).toBe('true')
    expect(kvGet('complaint.context', 'x')).toBeNull()
    expect(host.textContent).toContain('Transaction number (UTR)')
  })

  it('shows a summary in the person\'s own language next to the English report, and none when the language is English', async () => {
    localStorage.setItem('gt02:lang', JSON.stringify('hi'))
    await mount()
    await click($('[data-money="yes"]'))
    expect($('[data-testid="own-summary"]')).not.toBeNull()
    expect(reportText()).toContain('COMPLAINT')
    act(() => root.unmount())
    localStorage.setItem('gt02:lang', JSON.stringify('en'))
    await mount()
    expect($('[data-testid="own-summary"]')).toBeNull()
  })
})

describe('the way in from the report screen', () => {
  let host: HTMLDivElement
  let root: Root
  beforeEach(() => { phone(); localStorage.clear(); localStorage.setItem('gt02:lang', JSON.stringify('en')); host = document.createElement('div'); document.body.appendChild(host); window.location.hash = '#/report' })
  afterEach(() => { act(() => root.unmount()); host.remove() })

  it('offers the helper after the first answer and passes the answers on', async () => {
    await act(async () => { root = createRoot(host); root.render(<LangProvider><ReportPage /></LangProvider>) })
    await act(async () => { (host.querySelector('button.btn-primary') as HTMLElement).click() }) // "Yes" to money lost
    const entry = host.querySelector('[data-testid="complaint-entry"]') as HTMLElement
    expect(entry).not.toBeNull()
    await act(async () => { (entry.querySelector('button') as HTMLElement).click() })
    expect(window.location.hash).toBe('#/report/complaint')
    expect(kvGet<{ outcome: string } | null>('complaint.context', null)?.outcome).toBe('money_lost')
  })
})

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import en from '../i18n/en.json'
import { LangProvider } from '../shell/i18n'
import QrPage from './QrPage'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

class FakeStatus extends EventTarget {
  constructor(public state: PermissionState) { super() }
  set(s: PermissionState) { this.state = s; this.dispatchEvent(new Event('change')) }
}

describe('the QR page asks first and explains a switched-off camera', () => {
  let host: HTMLDivElement
  let root: Root
  let status: FakeStatus
  let standalone = false
  const denied = () => Object.assign(new Error('Permission denied'), { name: 'NotAllowedError' })

  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('gt02:lang', '"en"')
    standalone = false
    window.matchMedia = ((q: string) => ({ matches: q.includes('standalone') ? standalone : q.includes('pointer: coarse'), media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as unknown as typeof window.matchMedia
    Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true })
    Object.defineProperty(navigator, 'permissions', { value: { query: vi.fn(async () => status) }, configurable: true })
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: vi.fn(async () => { throw denied() }) }, configurable: true })
    host = document.createElement('div')
    document.body.appendChild(host)
  })
  afterEach(() => { act(() => root.unmount()); host.remove() })

  const mount = async (state: PermissionState) => {
    status = new FakeStatus(state)
    await act(async () => { root = createRoot(host); root.render(<LangProvider><QrPage /></LangProvider>) })
    await act(async () => { await Promise.resolve() })
  }
  const q = (id: string) => host.querySelector(`[data-testid="${id}"]`)
  const scan = () => [...host.querySelectorAll('button')].find((b) => b.textContent?.includes('Scan with the camera'))!

  it('while the phone has not been asked yet, tells the person to choose Allow, and shows no warning', async () => {
    await mount('prompt')
    expect(q('camera-ask')?.textContent).toBe(en['qr.cam.ask'])
    expect(q('camera-off-note')).toBeNull()
    expect(q('camera-help')).toBeNull()
  })

  it('when the camera is already off, says so up front and offers the steps', async () => {
    await mount('denied')
    expect(q('camera-ask')).toBeNull()
    expect(q('camera-off-note')?.textContent).toContain(en['qr.cam.off_note'])
    await act(async () => { (q('camera-off-note')!.querySelector('button') as HTMLElement).click() })
    expect(q('camera-help')?.getAttribute('data-kind')).toBe('denied')
    expect(q('camera-help')?.getAttribute('data-mode')).toBe('browser')
    expect(q('camera-help')?.textContent).toContain('Site settings, then All sites') // the lock icon is hidden in newer Chrome, so the steps go through the menu
    expect(q('camera-help')?.textContent).toContain(location.host) // names the site to look for
    expect(q('camera-help')?.textContent).not.toContain('{site}')
  })

  it('from the home screen there is no address bar, so the steps use App info instead of the lock', async () => {
    standalone = true
    await mount('denied')
    await act(async () => { (q('camera-off-note')!.querySelector('button') as HTMLElement).click() })
    expect(q('camera-help')?.getAttribute('data-mode')).toBe('app')
    expect(q('camera-help')?.textContent).toContain(en['qr.cam.app.1'])
    expect(q('camera-help')?.textContent).toContain(en['qr.cam.app.4'])
    expect(q('camera-help')?.textContent).toContain('Delete data & reset permissions')
    expect(q('camera-reinstall')?.textContent).toBe(en['qr.cam.reinstall']) // deleting and reinstalling the app does not clear Chrome's choice
    expect(q('qr-env')?.textContent).toContain('home-screen app')
  })

  it('from the home screen on Android, offers to open the app in Chrome; in a browser tab it does not', async () => {
    const ua = Object.getOwnPropertyDescriptor(navigator, 'userAgent')
    Object.defineProperty(navigator, 'userAgent', { value: 'Mozilla/5.0 (Linux; Android 14; Phone) AppleWebKit/537.36 Chrome/130.0.0.0 Mobile Safari/537.36', configurable: true })
    standalone = true
    await mount('denied')
    await act(async () => { (q('camera-off-note')!.querySelector('button') as HTMLElement).click() })
    const link = q('camera-open-chrome') as HTMLAnchorElement
    expect(link.getAttribute('href')).toMatch(/^intent:\/\/.+#Intent;scheme=https;package=com\.android\.chrome;end$/)
    expect(q('qr-env')?.textContent).toContain('Chrome 130')
    act(() => root.unmount())
    standalone = false
    await mount('denied')
    await act(async () => { (q('camera-off-note')!.querySelector('button') as HTMLElement).click() })
    expect(q('camera-open-chrome')).toBeNull()
    if (ua) Object.defineProperty(navigator, 'userAgent', ua); else delete (navigator as unknown as Record<string, unknown>).userAgent
  })

  it('tapping Scan when the browser refuses shows the steps, the error code and the photo fallback', async () => {
    await mount('denied')
    await act(async () => { scan().click() })
    await act(async () => { await Promise.resolve() })
    expect(q('camera-help')?.getAttribute('data-kind')).toBe('denied')
    expect(q('qr-err-code')?.textContent).toContain('NotAllowedError · denied')
    expect(q('qr-take-photo')).toBeTruthy()
    expect(q('camera-recheck')).toBeTruthy()
  })

  it('a question that was closed without an answer asks the person to tap Scan and choose Allow', async () => {
    await mount('prompt')
    await act(async () => { scan().click() })
    await act(async () => { await Promise.resolve() })
    expect(q('camera-help')?.getAttribute('data-kind')).toBe('dismissed')
    expect(q('camera-help')?.textContent).toContain(en['qr.err.camera_dismissed'])
  })

  it('when the person turns the camera on in settings and returns, the help clears by itself', async () => {
    await mount('denied')
    await act(async () => { scan().click() })
    await act(async () => { await Promise.resolve() })
    expect(q('camera-help')).toBeTruthy()
    await act(async () => { status.set('granted') })
    expect(q('camera-help')).toBeNull()
    expect(q('camera-now-ok')?.textContent).toBe(en['qr.cam.now_ok'])
  })
})

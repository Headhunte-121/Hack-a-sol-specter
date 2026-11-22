import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { LangProvider, useLang } from './i18n'
import { LangPill } from './Layout'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

function Greeting() {
  const { t } = useLang()
  return <p data-testid="greeting">{t('common.language')}</p>
}

let host: HTMLDivElement
let root: Root
beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('gt02:lang', '"hi"')
  host = document.createElement('div')
  document.body.appendChild(host)
})
afterEach(() => { act(() => root.unmount()); host.remove() })

const choose = (value: string) => {
  const select = host.querySelector<HTMLSelectElement>('[data-testid="lang-select"]')!
  Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!.set!.call(select, value)
  select.dispatchEvent(new Event('change', { bubbles: true }))
}

describe('language dropdown', () => {
  it('lists all three languages in their own script and shows the current one', async () => {
    await act(() => { root = createRoot(host); root.render(<LangProvider><LangPill /></LangProvider>) })
    const select = host.querySelector<HTMLSelectElement>('[data-testid="lang-select"]')!
    expect([...select.options].map((o) => o.textContent)).toEqual(['हिन्दी', 'छत्तीसगढ़ी', 'English'])
    expect(select.value).toBe('hi')
    expect(host.querySelector('label')?.textContent).toContain('भाषा') // the hidden label names the control for screen readers
  })

  it('switches the text, remembers the choice and sets the page language', async () => {
    await act(() => { root = createRoot(host); root.render(<LangProvider><LangPill /><Greeting /></LangProvider>) })
    await act(() => choose('en'))
    expect(host.querySelector('[data-testid="greeting"]')?.textContent).toBe('Language')
    expect(localStorage.getItem('gt02:lang')).toBe('"en"')
    expect(document.documentElement.lang).toBe('en')
    await act(() => choose('cg'))
    expect(document.documentElement.lang).toBe('hne')
  })
})

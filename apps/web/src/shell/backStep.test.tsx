import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useBackStep, useInnerScreenOnReturn } from './backStep'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let api: { open: () => void; back: () => void; isOpen: () => boolean } = null!
let restored: unknown = null

function Page({ restoreOnReturn = false }: { restoreOnReturn?: boolean }) {
  const [open, setOpen] = useState(false)
  useInnerScreenOnReturn(restoreOnReturn ? (d) => { restored = d; if (d) setOpen(true); return !!d } : undefined)
  const back = useBackStep(open, () => setOpen(false), { text: 'hello' })
  api = { open: () => setOpen(true), back, isOpen: () => open }
  return <p>{open ? 'inner' : 'outer'}</p>
}

const popped = () => new Promise<void>((r) => window.addEventListener('popstate', () => r(), { once: true }))
let host: HTMLDivElement
let root: Root
const mount = (el: React.ReactElement) => act(() => { root = createRoot(host); root.render(el) })

beforeEach(() => {
  history.replaceState(null, '', '#/message')
  host = document.createElement('div')
  document.body.appendChild(host)
  restored = null
})
afterEach(() => { act(() => root.unmount()); host.remove() })

describe('useBackStep', () => {
  it('gives the inner screen its own history entry, and Back closes it', async () => {
    await mount(<Page />)
    const before = history.length
    await act(() => api.open())
    expect(history.length).toBe(before + 1)
    expect(host.textContent).toBe('inner')
    const p = popped()
    history.back()
    await act(() => p)
    expect(host.textContent).toBe('outer')
    expect(location.hash).toBe('#/message')
  })

  it('the on-screen Back button goes through history, so no dead entry is left behind', async () => {
    await mount(<Page />)
    await act(() => api.open())
    const p = popped()
    await act(() => api.back())
    await act(() => p)
    expect(host.textContent).toBe('outer')
    expect(history.state).toBe(null)
  })

  it('on return to an inner-screen entry, restores it when the page can', async () => {
    history.pushState({ innerScreen: { id: 'x1', data: { text: 'saved' } } }, '', '#/message')
    await mount(<Page restoreOnReturn />)
    expect(restored).toEqual({ text: 'saved' })
    expect(host.textContent).toBe('inner')
  })

  it('keeps the saved data current while the inner screen is open', async () => {
    let setAnswer: (v: string) => void = null!
    function Answering() {
      const [answer, set] = useState('first')
      setAnswer = set
      useBackStep(true, () => {}, { answer })
      return null
    }
    await mount(<Answering />)
    expect(history.state.innerScreen.data).toEqual({ answer: 'first' })
    await act(() => setAnswer('second'))
    expect(history.state.innerScreen.data).toEqual({ answer: 'second' })
  })

  it('on return to an inner-screen entry it cannot show, steps back past it', async () => {
    history.pushState({ innerScreen: { id: 'x2' } }, '', '#/message')
    const p = popped()
    await mount(<Page />)
    await act(() => p)
    expect(history.state).toBe(null)
    expect(host.textContent).toBe('outer')
  })
})

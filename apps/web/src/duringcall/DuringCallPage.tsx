import { useEffect, useRef, useState } from 'react'
import { useLang } from '../shell/i18n'
import { Layout } from '../shell/Layout'

const ITEMS = ['dc.item1', 'dc.item2', 'dc.item3', 'dc.item4', 'dc.item5']

/** The During-a-Call card: one screen, one tap from home, large text, works offline. A web app cannot listen to a call in progress,
 *  so this is the practical substitute for live detection. */
export default function DuringCallPage() {
  const { t, lang } = useLang()
  const [left, setLeft] = useState<number | null>(null)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearInterval(timer.current), [])

  /** startCooldown: an optional 60 second pause with a reminder that urgency is the scammer's main tool. */
  const startCooldown = () => {
    setLeft(60)
    window.clearInterval(timer.current)
    timer.current = window.setInterval(() => setLeft((s) => { if (s === null || s <= 1) { window.clearInterval(timer.current); return 0 } return s - 1 }), 1000)
  }
  const speak = () => {
    if (!('speechSynthesis' in window)) return
    const u = new SpeechSynthesisUtterance(ITEMS.map((k) => t(k)).join('. '))
    u.lang = lang === 'en' ? 'en-IN' : 'hi-IN'
    speechSynthesis.cancel(); speechSynthesis.speak(u)
  }

  return (
    <Layout title={t('dc.title')}>
      <ol className="space-y-3" data-testid="dc-checklist">
        {ITEMS.map((k, i) => (
          <li key={k} className="card flex gap-3 text-xl font-bold leading-9">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-red-700 text-white">{i + 1}</span>
            <span>{t(k)}</span>
          </li>
        ))}
      </ol>

      <section className="card space-y-2 text-center">
        {left === null && <button className="btn btn-secondary w-full" onClick={startCooldown}>⏱️ {t('dc.cooldown.start')}</button>}
        {left !== null && left > 0 && <p role="timer" aria-live="off" className="text-5xl font-bold text-teal-800">{left}<span className="block text-sm font-normal">{t('dc.seconds', { n: left })}</span></p>}
        {left === 0 && <p role="status" className="text-lg font-bold text-green-800">{t('dc.cooldown.done')}</p>}
        <p className="text-sm">{t('dc.cooldown.note')}</p>
      </section>

      {'speechSynthesis' in window && <button className="btn btn-secondary w-full" onClick={speak}>🔊 {t('dc.listen')}</button>}
      <a className="btn btn-danger" href="#/report">🚨 {t('dc.report')}</a>
    </Layout>
  )
}

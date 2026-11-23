import { useEffect, useRef, useState } from 'react'
import { useLang } from '../shell/i18n'
import { Layout } from '../shell/Layout'
import { Banner, NumberedList } from '../shell/ui'

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
    window.clearInterval(timer.current)
    setLeft(60)
    timer.current = window.setInterval(() => setLeft((s) => { if (s === null || s <= 1) { window.clearInterval(timer.current); return 0 } return s - 1 }), 1000)
  }
  const speak = () => {
    if (!('speechSynthesis' in window)) return
    const u = new SpeechSynthesisUtterance([t('dc.hero1'), t('dc.hero2'), ...ITEMS.map((k) => t(k))].join(' '))
    u.lang = lang === 'en' ? 'en-IN' : 'hi-IN'
    speechSynthesis.cancel(); speechSynthesis.speak(u)
  }
  const shown = left === null ? 60 : left

  return (
    <Layout>
      <Banner tone="warn" className="!px-4 !py-3.5" role="note">
        <div className="text-[30px] font-bold leading-tight">{t('dc.hero1')}</div>
        <div className="text-[22px] font-bold leading-snug">{t('dc.hero2')}</div>
      </Banner>

      <div data-testid="dc-checklist"><NumberedList items={ITEMS.map((k) => t(k))} /></div>

      <button onClick={startCooldown} aria-label={t('dc.cooldown.tap')} className="flex items-center gap-3.5 rounded-2xl bg-soft px-3.5 py-2.5 text-left text-info">
        <span role="timer" aria-live="off" className="flex size-[68px] flex-none items-center justify-center rounded-full border-[6px] border-brand bg-white text-[24px] font-bold text-brand">{shown}</span>
        <span className="text-[19px] leading-snug">
          {left === 0 ? t('dc.cooldown.done') : t('dc.cooldown.card', { n: 60 })}
          {left === null && <span className="mt-0.5 block text-[14px] text-muted">{t('dc.cooldown.tap')}</span>}
        </span>
      </button>

      {'speechSynthesis' in window && <button className="btn btn-secondary" onClick={speak}>{t('dc.listen')}</button>}
      <a className="btn btn-danger !min-h-14 !text-[20px]" href="#/call?live=1">
        🎙️ {t('call.live.start')}
      </a>
      <a className="btn btn-primary mt-auto !min-h-16 !text-[24px]" href="#/report">{t('report.cta')}</a>
    </Layout>
  )
}

import { useEffect, useState } from 'react'
import { useLang } from '../../shell/i18n'

const DEMO_STORAGE_KEY = 'specter_demo_mode'
const DEMO_EVENT = 'specter:demo-mode'

export function isDemoMode(): boolean {
  try {
    const raw = localStorage.getItem(DEMO_STORAGE_KEY)
    return raw === null ? true : raw === '1' || raw === 'true'
  } catch {
    return true
  }
}

export function setDemoModeStorage(enabled: boolean): void {
  try {
    localStorage.setItem(DEMO_STORAGE_KEY, enabled ? '1' : '0')
  } catch {
    // ignore storage errors
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(DEMO_EVENT, { detail: enabled }))
  }
}

export function useDemoMode() {
  const [demoMode, setDemoModeState] = useState<boolean>(isDemoMode)

  useEffect(() => {
    const sync = () => setDemoModeState(isDemoMode())
    window.addEventListener(DEMO_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(DEMO_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const setDemoMode = (enabled: boolean) => {
    setDemoModeStorage(enabled)
    setDemoModeState(enabled)
  }

  return { demoMode, setDemoMode }
}

const COPY = {
  en: {
    title: 'Demo & Example Mode',
    desc: 'Demo mode is for presentations: it shows sample scam messages, acted example calls and made-up trend numbers. Turn it off to use the app as it is for real people: no examples, and only real reports in the trends.',
    show: 'Show examples (Demo)',
    hide: 'Hide examples (Production)',
  },
  hi: {
    title: 'डेमो और उदाहरण मोड',
    desc: 'डेमो मोड प्रस्तुतियों के लिए है: यह नमूना स्कैम संदेश, अभिनय की गई उदाहरण कॉल और काल्पनिक रुझान संख्याएँ दिखाता है। वास्तविक उपयोग के लिए इसे बंद करें: कोई उदाहरण नहीं, और रुझानों में केवल वास्तविक रिपोर्ट।',
    show: 'उदाहरण दिखाएँ (डेमो)',
    hide: 'उदाहरण छिपाएँ (प्रोडक्शन)',
  },
  cg: {
    title: 'डेमो अउ उदाहरण मोड',
    desc: 'डेमो मोड देखाए बर हे: एमा नमूना ठगी संदेसा, उदाहरण कॉल अउ बनाए गे आंकड़ा दिखथे। असली उपयोग बर एला बंद करव: कोनो उदाहरण नइ, अउ सिरिफ असली रिपोर्ट दिखही।',
    show: 'उदाहरण देखाव (डेमो)',
    hide: 'उदाहरण लुकाव (प्रोडक्शन)',
  },
} as const

export function DemoModeCard() {
  const { lang } = useLang()
  const { demoMode, setDemoMode } = useDemoMode()
  const copy = COPY[lang] ?? COPY.en

  return (
    <section className="card space-y-2.5">
      <h2 className="text-[15.5px] font-bold text-slate-900">{copy.title}</h2>
      <p className="text-[13px] leading-relaxed text-slate-600">{copy.desc}</p>
      <div className="grid grid-cols-1 gap-2 pt-0.5 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setDemoMode(true)}
          aria-pressed={demoMode}
          className={`btn min-h-10.5! text-[13.5px]! ${demoMode ? 'btn-primary' : 'btn-secondary'}`}
        >
          {copy.show}
        </button>
        <button
          type="button"
          onClick={() => setDemoMode(false)}
          aria-pressed={!demoMode}
          className={`btn min-h-10.5! text-[13.5px]! ${!demoMode ? 'btn-primary' : 'btn-secondary'}`}
        >
          {copy.hide}
        </button>
      </div>
    </section>
  )
}
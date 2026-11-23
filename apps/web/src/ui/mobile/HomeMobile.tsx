import { AlertTriangle, CheckCircle2, Lock, Phone } from 'lucide-react'
import { useState } from 'react'
import { AlertsFeed } from '../../dashboard/AlertsFeed'
import { useLang } from '../../shell/i18n'
import { HeroSearch } from '../shared/HeroSearch'
import { ServiceCard } from '../shared/ServiceCard'
import { type HomeViewProps, SystemNotices } from '../shared/SystemNotices'
import { getUiLabels } from '../shared/uiLabels'

const HERO_SOURCES = [
  '/images/hero-village.jpeg',
  '/images/hero-village.jpg',
  '/images/hero-village.png',
  '/images/hero-village.webp',
]

export function HomeMobile(props: HomeViewProps) {
  const { pwa } = props
  const { lang, t } = useLang()
  const ui = getUiLabels(lang)
  const [srcIdx, setSrcIdx] = useState(0)

  return (
    <>
      {/* Seamless Left-to-Right Blended Civic Hero */}
      <section className="relative -mx-4 -mt-3 rounded-b-[28px] bg-[#163264] px-4 pt-3 pb-5 text-white shadow-md shadow-blue-950/15">
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-b-[28px]"
          aria-hidden="true"
        >
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(96deg, #163264 0%, #163264 32%, #2B57A3 50%, #BFD7FF 72%, #EEF5FF 100%)',
            }}
          />

          {srcIdx < HERO_SOURCES.length && (
            <img
              src={HERO_SOURCES[srcIdx]}
              alt=""
              onError={() => setSrcIdx((prev) => prev + 1)}
              className="absolute bottom-6 left-[34%] h-[108%] w-auto max-w-none object-contain object-bottom-left mix-blend-multiply"
            />
          )}

          <div
            className="absolute inset-0"
            style={{
              background: [
                'linear-gradient(90deg, #163264 0%, #163264 38%, rgba(22, 50, 100, 0.9) 48%, rgba(22, 50, 100, 0.42) 59%, rgba(22, 50, 100, 0.06) 71%, rgba(22, 50, 100, 0) 82%)',
                'linear-gradient(180deg, #163264 0%, rgba(22, 50, 100, 0.5) 14%, rgba(22, 50, 100, 0) 32%)',
                'linear-gradient(0deg, #163264 0%, rgba(22, 50, 100, 0.94) 24%, rgba(22, 50, 100, 0) 46%)',
              ].join(', '),
            }}
          />
        </div>

        {/* Foreground Greeting Column */}
        <div className="relative z-10 max-w-[60%] space-y-2 pt-1 pb-4">
          <h1 className="text-[28px] font-extrabold leading-none tracking-tight drop-shadow-xs">
            {t('home.greeting')}
          </h1>
          <p className="text-[14px] font-medium leading-snug text-blue-100/95">
            {t('home.ask')}
          </p>
          <span
            role="status"
            data-testid="offline-status"
            data-state={pwa.offline}
            className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-[#0D2144]/80 px-3 py-1 text-[11.5px] font-bold leading-tight text-blue-50 ring-1 ring-white/15"
          >
            {pwa.offline === 'ready' ? (
              <CheckCircle2 className="size-3.5 shrink-0 text-emerald-300" strokeWidth={2.5} />
            ) : (
              <AlertTriangle className="size-3.5 shrink-0 text-amber-300" strokeWidth={2.5} />
            )}
            <span className="truncate">
              {pwa.offline === 'ready'
                ? t('home.offline_ok')
                : pwa.offline === 'partial'
                  ? t('status.partial')
                  : t('status.notready')}
            </span>
          </span>
        </div>

        {/* Interactive Search & Navigation Bar */}
        <HeroSearch />
      </section>

      <SystemNotices {...props} />

      {/* Bold Emergency SOS Card */}
      <a
        href="#/during-call"
        className="flex items-center justify-between gap-3 rounded-2xl bg-linear-to-r from-red-600 to-rose-600 px-4 py-3.5 text-white shadow-sm shadow-red-600/20 transition-transform active:scale-[0.99]"
      >
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/20 ring-1 ring-white/25">
            <AlertTriangle className="size-5 text-white" strokeWidth={2.3} />
          </span>
          <div>
            <div className="text-[15.5px] font-bold leading-snug">{ui.sosBannerTitle}</div>
            <div className="mt-0.5 text-[12.5px] leading-snug text-red-100">{t('home.duringcall.sub')}</div>
          </div>
        </div>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/20 text-[12px] font-extrabold ring-1.5 ring-white/40">
          SOS
        </span>
      </a>

      <AlertsFeed />

      {/* 2-Column Pastel Service Grid */}
      <section className="space-y-2.5">
        <h2 className="px-0.5 text-[11.5px] font-bold uppercase tracking-widest text-slate-400">
          {ui.quickServices}
        </h2>
        <nav aria-label="modules" className="grid grid-cols-2 gap-3">
          <ServiceCard to="/message" icon="message" title={t('tile.message')} sub={t('tile.message.sub')} tone="blue" highlight />
          <ServiceCard to="/call" icon="phone" title={t('tile.call')} sub={t('tile.call.sub')} tone="indigo" />
          <ServiceCard to="/report" icon="shield" title={t('tile.report')} sub={t('tile.report.sub')} tone="amber" />
          <ServiceCard to="/learn" icon="book" title={t('tile.learn')} sub={t('tile.learn.sub')} tone="green" />
          <ServiceCard to="/qr" icon="qr" title={t('tile.qr')} tone="purple" />
          <ServiceCard to="/trends" icon="chart" title={t('tile.trends')} tone="teal" />
        </nav>
      </section>

      {/* Helpline 1930 Strip */}
      <a
        href="tel:1930"
        className="flex min-h-15 items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-white px-4 py-3 shadow-2xs transition-colors hover:border-[#1B3B73]/30"
      >
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#1B3B73] ring-1 ring-blue-600/15">
            <Phone className="size-4.5" strokeWidth={2.2} />
          </span>
          <div>
            <span className="block text-[15px] font-bold text-slate-900">{t('home.call1930')}</span>
            <span className="block text-[12px] text-slate-500">{t('home.call1930.sub')}</span>
          </div>
        </div>
        <span className="rounded-xl bg-[#1B3B73] px-3 py-1.5 text-[13.5px] font-extrabold text-white shadow-2xs">
          1930
        </span>
      </a>

      <p className="flex items-center justify-center gap-1.5 pt-1 text-center text-[12px] text-slate-400">
        <Lock className="size-3.5" />
        <span>{t('footer.disclaimer')}</span>
      </p>
    </>
  )
}
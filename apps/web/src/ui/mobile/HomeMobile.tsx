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
      <section className="relative -mx-4 -mt-3 rounded-b-[26px] bg-[#163264] px-4 pt-2.5 pb-4 text-white shadow-md shadow-blue-950/15">
        {/* Clipped Background Layers (keeps HeroSearch dropdown unclipped) */}
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-b-[26px]"
          aria-hidden="true"
        >
          {/* 1. Smooth Left-to-Right Sky Base */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(96deg, #163264 0%, #163264 32%, #2B57A3 50%, #BFD7FF 72%, #EEF5FF 100%)',
            }}
          />

          {/* 2. Village Illustration (left edge tucked inside the opaque #163264 zone) */}
          {srcIdx < HERO_SOURCES.length && (
            <img
              src={HERO_SOURCES[srcIdx]}
              alt=""
              onError={() => setSrcIdx((prev) => prev + 1)}
              className="absolute bottom-6 left-[34%] h-[108%] w-auto max-w-none object-contain object-left-bottom mix-blend-multiply"
            />
          )}

          {/* 3. Seamless Left-to-Right, Top, & Bottom Scrim OVER the image (zero seams) */}
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
        <div className="relative z-10 max-w-[54%] space-y-1.5 pt-1 pb-3.5">
          <h1 className="text-[24px] font-extrabold leading-none tracking-tight drop-shadow-xs">
            {t('home.greeting')}
          </h1>
          <p className="text-[13px] font-medium leading-snug text-blue-100/95">
            {t('home.ask')}
          </p>
          <span
            role="status"
            data-testid="offline-status"
            data-state={pwa.offline}
            className="inline-flex max-w-full items-center gap-1 rounded-full bg-[#0D2144]/80 px-2.5 py-1 text-[10.5px] font-semibold leading-tight text-blue-50 ring-1 ring-white/15 backdrop-blur-xs"
          >
            {pwa.offline === 'ready' ? (
              <CheckCircle2 className="size-3 shrink-0 text-emerald-300" strokeWidth={2.5} />
            ) : (
              <AlertTriangle className="size-3 shrink-0 text-amber-300" strokeWidth={2.5} />
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

        {/* Real Interactive Search & Navigation Bar */}
        <HeroSearch />
      </section>

      <SystemNotices {...props} />

      {/* Compact High-Contrast SOS Strip */}
      <a
        href="#/during-call"
        className="flex items-center justify-between gap-3 rounded-2xl bg-linear-to-r from-red-600 to-rose-600 px-3.5 py-3 text-white shadow-sm shadow-red-600/20 transition-transform active:scale-[0.99]"
      >
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/20 ring-1 ring-white/25">
            <AlertTriangle className="size-4.5 text-white" strokeWidth={2.3} />
          </span>
          <div>
            <div className="text-[14.5px] font-bold leading-snug">{ui.sosBannerTitle}</div>
            <div className="text-[11.5px] text-red-100">{t('home.duringcall.sub')}</div>
          </div>
        </div>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/20 text-[11px] font-extrabold ring-2 ring-white/40">
          SOS
        </span>
      </a>

      <AlertsFeed />

      {/* 2-Column Pastel Service Grid */}
      <section className="space-y-2">
        <h2 className="px-0.5 text-[11px] font-bold uppercase tracking-widest text-slate-400">
          {ui.quickServices}
        </h2>
        <nav aria-label="modules" className="grid grid-cols-2 gap-2.5">
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
        className="flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-white px-3.5 py-2.5 shadow-2xs transition-colors hover:border-[#1B3B73]/30"
      >
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#1B3B73] ring-1 ring-blue-600/15">
            <Phone className="size-4" strokeWidth={2.2} />
          </span>
          <div>
            <span className="block text-[14px] font-bold text-slate-900">{t('home.call1930')}</span>
            <span className="block text-[11.5px] text-slate-500">{t('home.call1930.sub')}</span>
          </div>
        </div>
        <span className="rounded-lg bg-[#1B3B73] px-2.5 py-1 text-[13px] font-extrabold text-white">
          1930
        </span>
      </a>

      <p className="flex items-center justify-center gap-1.5 pt-0.5 text-center text-[11.5px] text-slate-400">
        <Lock className="size-3.5" />
        <span>{t('footer.disclaimer')}</span>
      </p>
    </>
  )
}
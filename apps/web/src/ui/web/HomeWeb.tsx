import { AlertTriangle, ArrowRight, CheckCircle2, Lock, ShieldAlert } from 'lucide-react'
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

export function HomeWeb(props: HomeViewProps) {
  const { pwa } = props
  const { lang, t } = useLang()
  const ui = getUiLabels(lang)
  const [srcIdx, setSrcIdx] = useState(0)

  return (
    <div className="space-y-5">
      {/* Seamless Left-to-Right Blended Desktop Civic Hero */}
      <section className="relative rounded-3xl bg-[#163264] px-7 py-6 text-white shadow-md shadow-blue-950/15">
        {/* Clipped background layers keep the HeroSearch dropdown unclipped */}
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl"
          aria-hidden="true"
        >
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(96deg, #163264 0%, #163264 40%, #24509B 60%, #9BC0F7 85%, #DCEBFF 100%)',
            }}
          />

          {srcIdx < HERO_SOURCES.length && (
            <img
              src={HERO_SOURCES[srcIdx]}
              alt=""
              onError={() => setSrcIdx((prev) => prev + 1)}
              className="absolute inset-y-0 right-0 h-full w-[54%] object-cover object-center"
            />
          )}

          {/* Smooth multi-edge navy blend over the illustration */}
          <div
            className="absolute inset-0"
            style={{
              background: [
                'linear-gradient(90deg, #163264 0%, #163264 43%, rgba(22, 50, 100, 0.94) 51%, rgba(22, 50, 100, 0.56) 61%, rgba(22, 50, 100, 0.14) 74%, rgba(22, 50, 100, 0) 86%)',
                'linear-gradient(180deg, rgba(22, 50, 100, 0.4) 0%, rgba(22, 50, 100, 0) 26%)',
                'linear-gradient(0deg, rgba(22, 50, 100, 0.45) 0%, rgba(22, 50, 100, 0) 30%)',
              ].join(', '),
            }}
          />
        </div>

        {/* Left Foreground Column: Greeting + Offline Status + Live Search */}
        <div className="relative z-10 max-w-xl space-y-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-[30px] font-extrabold leading-none tracking-tight drop-shadow-xs">
                {t('home.greeting')}
              </h1>
              <span
                role="status"
                data-testid="offline-status"
                data-state={pwa.offline}
                className="inline-flex h-7 items-center gap-1.5 rounded-full bg-[#0D2144]/75 px-3 text-[12px] font-semibold text-blue-50 ring-1 ring-white/15 backdrop-blur-xs"
              >
                {pwa.offline === 'ready' ? (
                  <CheckCircle2 className="size-3.5 shrink-0 text-emerald-300" strokeWidth={2.4} />
                ) : (
                  <AlertTriangle className="size-3.5 shrink-0 text-amber-300" strokeWidth={2.4} />
                )}
                <span className="translate-y-px leading-none">
                  {pwa.offline === 'ready'
                    ? t('home.offline_ok')
                    : pwa.offline === 'partial'
                      ? t('status.partial')
                      : t('status.notready')}
                </span>
              </span>
            </div>

            <p className="text-[14.5px] font-medium text-blue-100/95">{t('home.ask')}</p>
          </div>

          <HeroSearch showQrShortcut className="max-w-lg" />
        </div>
      </section>

      <SystemNotices {...props} />

      <AlertsFeed />

      {/* Full-Width 3x2 Horizontal Protection Tools Grid */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-0.5">
          <h2 className="text-[11.5px] font-extrabold uppercase tracking-widest text-slate-500">
            {ui.groupTools}
          </h2>
        </div>

        <nav aria-label="modules" className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3">
          <ServiceCard
            layout="horizontal"
            to="/message"
            icon="message"
            title={t('tile.message')}
            sub={t('tile.message.sub')}
            tone="blue"
            highlight
          />
          <ServiceCard
            layout="horizontal"
            to="/call"
            icon="phone"
            title={t('tile.call')}
            sub={t('tile.call.sub')}
            tone="indigo"
          />
          <ServiceCard
            layout="horizontal"
            to="/report"
            icon="shield"
            title={t('tile.report')}
            sub={t('tile.report.sub')}
            tone="amber"
          />
          <ServiceCard
            layout="horizontal"
            to="/learn"
            icon="book"
            title={t('tile.learn')}
            sub={t('tile.learn.sub')}
            tone="green"
          />
          <ServiceCard
            layout="horizontal"
            to="/qr"
            icon="qr"
            title={t('tile.qr')}
            tone="purple"
          />
          <ServiceCard
            layout="horizontal"
            to="/trends"
            icon="chart"
            title={t('tile.trends')}
            tone="teal"
          />
        </nav>
      </section>

      {/* Emergency Section — Full-Width SOS Banner (1930 remains in sidebar without duplication) */}
      <section className="space-y-3 pt-1">
        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-slate-200/90" aria-hidden="true" />
          <h2 className="inline-flex items-center gap-1.5 text-[11.5px] font-extrabold uppercase tracking-widest text-slate-600">
            <ShieldAlert className="size-3.5 text-[#1B3B73]" strokeWidth={2.3} />
            <span>{ui.groupHelp}</span>
          </h2>
          <span className="h-px flex-1 bg-slate-200/90" aria-hidden="true" />
        </div>

        <a
          href="#/during-call"
          className="group flex items-center justify-between gap-4 rounded-2xl bg-linear-to-r from-[#DC2626] via-[#E11D48] to-[#BE123C] px-5 py-4 text-white shadow-md shadow-red-900/15 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg hover:brightness-[1.03]"
        >
          <div className="flex min-w-0 items-center gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25">
              <AlertTriangle className="size-6 text-white" strokeWidth={2.3} />
            </span>
            <div className="min-w-0">
              <div className="text-[16.5px] font-extrabold leading-snug tracking-tight">
                {ui.sosBannerTitle}
              </div>
              <div className="mt-0.5 text-[13px] font-medium text-red-100">
                {t('home.duringcall.sub')}
              </div>
            </div>
          </div>

          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/20 px-4 py-2 text-[13px] font-extrabold tracking-wide text-white ring-1 ring-white/25 transition-colors group-hover:bg-white/28">
            <span>SOS</span>
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" strokeWidth={2.6} />
          </span>
        </a>
      </section>

      <p className="flex items-center justify-center gap-1.5 pt-1 text-center text-[12px] text-slate-400">
        <Lock className="size-3.5 shrink-0" />
        <span>{t('footer.disclaimer')}</span>
      </p>
    </div>
  )
}
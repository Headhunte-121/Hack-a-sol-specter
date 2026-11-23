import { AlertTriangle, CheckCircle2, Lock, Search } from 'lucide-react'
import { AlertsFeed } from '../../dashboard/AlertsFeed'
import { useLang } from '../../shell/i18n'
import { ServiceCard } from '../shared/ServiceCard'
import { type HomeViewProps, SystemNotices } from '../shared/SystemNotices'
import { getUiLabels } from '../shared/uiLabels'

export function HomeWeb(props: HomeViewProps) {
  const { pwa } = props
  const { lang, t } = useLang()
  const ui = getUiLabels(lang)

  return (
    <>
      {/* Civic Hero Banner */}
      <section className="relative overflow-hidden rounded-2xl border border-[#1B3B73]/20 bg-linear-to-r from-[#163163] via-[#1E4388] to-[#2B59AD] px-7 py-6 text-white shadow-sm">
        <div
          className="pointer-events-none absolute -right-12 -top-16 size-56 rounded-full bg-sky-300/15 blur-2xl"
          aria-hidden="true"
        />
        <div className="relative flex items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-[28px] font-extrabold leading-tight tracking-tight">{t('home.greeting')}</h1>
              <span
                role="status"
                data-testid="offline-status"
                data-state={pwa.offline}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11.5px] font-bold text-white ring-1 ring-white/20 backdrop-blur-xs"
              >
                {pwa.offline === 'ready' ? (
                  <CheckCircle2 className="size-3.5 text-emerald-300" strokeWidth={2.5} />
                ) : (
                  <AlertTriangle className="size-3.5 text-amber-300" strokeWidth={2.5} />
                )}
                {pwa.offline === 'ready'
                  ? t('home.offline_ok')
                  : pwa.offline === 'partial'
                    ? t('status.partial')
                    : t('status.notready')}
              </span>
            </div>
            <p className="max-w-xl text-[15px] text-blue-100/95">{t('home.ask')}</p>
          </div>

          <a
            href="#/message"
            className="inline-flex h-11.5 shrink-0 items-center gap-2 rounded-xl bg-white px-5 text-[14.5px] font-bold text-[#1B3B73] shadow-sm transition-all hover:-translate-y-0.5 hover:bg-blue-50 active:scale-[0.98]"
          >
            <Search className="size-4" strokeWidth={2.4} />
            {t('tile.message')}
          </a>
        </div>
      </section>

      <SystemNotices {...props} />

      {/* 2-Column Dashboard Body */}
      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-8 space-y-3">
          <h2 className="text-[11.5px] font-bold uppercase tracking-widest text-slate-400">{ui.groupTools}</h2>
          <nav aria-label="modules" className="grid grid-cols-3 gap-3.5">
            <ServiceCard to="/message" icon="message" title={t('tile.message')} sub={t('tile.message.sub')} tone="blue" highlight />
            <ServiceCard to="/call" icon="phone" title={t('tile.call')} sub={t('tile.call.sub')} tone="indigo" />
            <ServiceCard to="/report" icon="shield" title={t('tile.report')} sub={t('tile.report.sub')} tone="amber" />
            <ServiceCard to="/learn" icon="book" title={t('tile.learn')} sub={t('tile.learn.sub')} tone="green" />
            <ServiceCard to="/qr" icon="qr" title={t('tile.qr')} tone="purple" />
            <ServiceCard to="/trends" icon="chart" title={t('tile.trends')} tone="teal" />
          </nav>
        </div>

        <div className="col-span-4 space-y-3">
          <h2 className="text-[11.5px] font-bold uppercase tracking-widest text-slate-400">{ui.groupHelp}</h2>

          <a
            href="#/during-call"
            className="flex min-h-[126px] items-center justify-between gap-3 rounded-2xl border border-red-200/90 bg-linear-to-br from-red-50 to-rose-50/80 p-4 shadow-2xs transition-all hover:-translate-y-0.5 hover:border-red-300 hover:shadow-sm"
          >
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white shadow-2xs">
                <AlertTriangle className="size-5" strokeWidth={2.25} />
              </span>
              <div>
                <div className="text-[14.5px] font-bold leading-snug text-red-900">{ui.sosBannerTitle}</div>
                <div className="mt-0.5 text-[12.5px] text-red-700/90">{t('home.duringcall.sub')}</div>
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-red-600 px-3 py-1 text-[11px] font-extrabold text-white shadow-2xs">
              SOS
            </span>
          </a>

          <AlertsFeed />
        </div>
      </div>

      <p className="flex items-center justify-center gap-1.5 pt-1 text-center text-[12.5px] text-slate-400">
        <Lock className="size-3.5" />
        <span>{t('footer.disclaimer')}</span>
      </p>
    </>
  )
}
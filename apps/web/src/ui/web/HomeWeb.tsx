import { AlertsFeed } from '../../dashboard/AlertsFeed'
import { useLang } from '../../shell/i18n'
import { Icon } from '../../shell/ui'
import { ServiceCard } from '../shared/ServiceCard'
import { type HomeViewProps, SystemNotices } from '../shared/SystemNotices'

export function HomeWeb(props: HomeViewProps) {
  const { pwa } = props
  const { t } = useLang()

  return (
    <>
      <section className="rounded-3xl border border-[#1B3B73]/15 bg-linear-to-r from-[#1B3B73] to-[#284E93] p-7 text-white shadow-sm">
        <div className="flex items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <h1 className="text-[30px] font-bold leading-tight">{t('home.greeting')}</h1>
              <span
                role="status"
                data-testid="offline-status"
                data-state={pwa.offline}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[12px] font-bold text-white"
              >
                <Icon name={pwa.offline === 'ready' ? 'check' : 'warn'} size={14} color="#fff" stroke={2.5} />
                {pwa.offline === 'ready'
                  ? t('home.offline_ok')
                  : pwa.offline === 'partial'
                    ? t('status.partial')
                    : t('status.notready')}
              </span>
            </div>
            <p className="max-w-xl text-[16px] text-blue-100">{t('home.ask')}</p>
          </div>

          <a
            href="#/message"
            className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-white px-5 py-3.5 text-[15px]! font-bold! text-[#1B3B73] shadow-sm transition hover:bg-blue-50"
          >
            <Icon name="search" size={18} />
            {t('tile.message')}
          </a>
        </div>
      </section>

      <SystemNotices {...props} />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-8 space-y-4">
          <h2 className="text-[13px] font-bold tracking-wider text-slate-500">{t('web.modules')}</h2>
          <nav aria-label="modules" className="grid grid-cols-3 gap-4">
            <ServiceCard to="/message" icon="message" title={t('tile.message')} sub={t('tile.message.sub')} tone="blue" highlight />
            <ServiceCard to="/call" icon="phone" title={t('tile.call')} sub={t('tile.call.sub')} tone="indigo" />
            <ServiceCard to="/report" icon="shield" title={t('tile.report')} sub={t('tile.report.sub')} tone="amber" />
            <ServiceCard to="/learn" icon="book" title={t('tile.learn')} sub={t('tile.learn.sub')} tone="green" />
            <ServiceCard to="/qr" icon="qr" title={t('tile.qr')} tone="purple" />
            <ServiceCard to="/trends" icon="chart" title={t('tile.trends')} tone="teal" />
          </nav>
        </div>

        <div className="col-span-4 space-y-4">
          <h2 className="text-[13px] font-bold tracking-wider text-slate-500">{t('web.emergency')}</h2>

          <a
            href="#/during-call"
            className="flex items-center justify-between gap-3 rounded-2xl border border-red-200 bg-bad-bg p-4 transition hover:border-bad-line"
          >
            <div className="flex items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-bad-line text-white">
                <Icon name="warn" size={22} color="#fff" />
              </span>
              <div>
                <div className="text-[15px] font-bold text-bad">{t('home.duringcall.title')}</div>
                <div className="text-[13px] text-bad/80">{t('home.duringcall.sub')}</div>
              </div>
            </div>
            <span className="rounded-full bg-bad-line px-3 py-1 text-[12px] font-extrabold text-white">{t('nav.sos')}</span>
          </a>

          <AlertsFeed />
        </div>
      </div>

      <p className="flex items-center justify-center gap-1.5 pt-2 text-center text-[13px] text-muted">
        <Icon name="lock" size={14} />
        <span>{t('footer.disclaimer')}</span>
      </p>
    </>
  )
}
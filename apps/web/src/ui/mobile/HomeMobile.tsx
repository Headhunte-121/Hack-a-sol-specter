import { AlertsFeed } from '../../dashboard/AlertsFeed'
import { useLang } from '../../shell/i18n'
import { Icon } from '../../shell/ui'
import { ServiceCard } from '../shared/ServiceCard'
import { type HomeViewProps, SystemNotices } from '../shared/SystemNotices'

export function HomeMobile(props: HomeViewProps) {
  const { pwa } = props
  const { t } = useLang()

  return (
    <>
      <section className="-mx-4 -mt-4 rounded-b-3xl bg-[#1B3B73] px-4 pt-2 pb-5 text-white shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-bold leading-tight">{t('home.greeting')}</h1>
            <p className="mt-0.5 text-[14px] text-blue-100/90">{t('home.ask')}</p>
          </div>
          <span
            role="status"
            data-testid="offline-status"
            data-state={pwa.offline}
            className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold text-white"
          >
            <Icon name={pwa.offline === 'ready' ? 'check' : 'warn'} size={13} color="#fff" stroke={2.5} />
            {pwa.offline === 'ready'
              ? t('home.offline_ok')
              : pwa.offline === 'partial'
                ? t('status.partial')
                : t('status.notready')}
          </span>
        </div>

        <a
          href="#/message"
          className="mt-4 flex items-center gap-2.5 rounded-2xl bg-white px-4 py-3 text-[14px] font-medium text-slate-500 shadow-xs active:scale-[0.99]"
        >
          <Icon name="search" size={18} />
          <span className="truncate">{t('tile.message')} — SMS, WhatsApp, URL…</span>
        </a>
      </section>

      <SystemNotices {...props} />

      <a
        href="#/during-call"
        className="flex items-center justify-between gap-3 rounded-2xl bg-linear-to-r from-red-600 to-red-700 px-4 py-3.5 text-white shadow-sm active:scale-[0.99]"
      >
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/20">
            <Icon name="warn" size={22} color="#fff" />
          </span>
          <div>
            <div className="text-[16px] font-bold leading-snug">{t('home.duringcall.title')}</div>
            <div className="text-[12px] text-red-100">{t('home.duringcall.sub')}</div>
          </div>
        </div>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/20 text-[12px] font-extrabold ring-2 ring-white/40">
          SOS
        </span>
      </a>

      <AlertsFeed />

      <section className="space-y-2.5">
        <h2 className="px-0.5 text-[12px] font-bold uppercase tracking-wider text-slate-500">Quick Services</h2>
        <nav aria-label="modules" className="grid grid-cols-2 gap-3">
          <ServiceCard to="/message" icon="message" title={t('tile.message')} sub={t('tile.message.sub')} tone="blue" highlight />
          <ServiceCard to="/call" icon="phone" title={t('tile.call')} sub={t('tile.call.sub')} tone="indigo" />
          <ServiceCard to="/report" icon="shield" title={t('tile.report')} sub={t('tile.report.sub')} tone="amber" />
          <ServiceCard to="/learn" icon="book" title={t('tile.learn')} sub={t('tile.learn.sub')} tone="green" />
          <ServiceCard to="/qr" icon="qr" title={t('tile.qr')} tone="purple" />
          <ServiceCard to="/trends" icon="chart" title={t('tile.trends')} tone="teal" />
        </nav>
      </section>

      <a
        href="tel:1930"
        className="flex min-h-15 items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xs"
      >
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-soft text-brand">
            <Icon name="phone" size={20} />
          </span>
          <div>
            <span className="block text-[15px] font-bold text-ink">{t('home.call1930')}</span>
            <span className="block text-[12px] text-muted">{t('home.call1930.sub')}</span>
          </div>
        </div>
        <span className="rounded-xl bg-[#1B3B73] px-3 py-1.5 text-[14px] font-extrabold text-white">1930</span>
      </a>

      <p className="flex items-center justify-center gap-1.5 pt-1 text-center text-[12px] text-muted">
        <Icon name="lock" size={13} />
        <span>{t('footer.disclaimer')}</span>
      </p>
    </>
  )
}
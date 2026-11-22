import type { ReactNode } from 'react'
import { LANGS, useLang, type Lang } from './i18n'
import { navigate } from './router'
import { Icon } from './ui'

/** Full three-way language choice (used in Settings). */
export function LanguageSwitch() {
  const { lang, setLang, t } = useLang()
  return (
    <div role="group" aria-label={t('common.language')} className="grid grid-cols-3 gap-2">
      {LANGS.map((l) => (
        <button key={l.code} onClick={() => setLang(l.code)} aria-pressed={lang === l.code} className={`btn !min-h-14 !text-[18px] ${lang === l.code ? 'btn-primary' : 'btn-secondary'}`}>
          {l.label}
        </button>
      ))}
    </div>
  )
}

/** The language dropdown on the home screen. A native list, so phones open their own large picker and screen readers announce it. */
export function LangPill() {
  const { lang, setLang, t } = useLang()
  return (
    <label className="relative flex min-h-12 shrink-0 items-center rounded-full border-2 border-brand bg-white text-brand">
      <span className="sr-only">{t('common.language')}</span>
      <span className="pointer-events-none absolute left-3"><Icon name="globe" size={20} /></span>
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value as Lang)}
        data-testid="lang-select"
        className="min-h-12 cursor-pointer appearance-none rounded-full bg-transparent pl-9 pr-9 text-[17px] font-bold text-brand"
      >
        {LANGS.map((l) => <option key={l.code} value={l.code} lang={l.code === 'cg' ? 'hne' : l.code} className="bg-white text-ink">{l.label}</option>)}
      </select>
      <span className="pointer-events-none absolute right-3"><Icon name="down" size={18} stroke={2.5} /></span>
    </label>
  )
}

/** Screen frame: a Back link, the screen title, then the content in a column. */
export function Layout({ title, lead, children, back = true, onBack }: { title?: string; lead?: string; children: ReactNode; back?: boolean; onBack?: () => void }) {
  const { t } = useLang()
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col gap-3 px-4 pb-4" style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
      {back && (
        <button className="flex min-h-[52px] items-center gap-2 self-start text-[22px] font-bold text-brand" onClick={() => (onBack ? onBack() : history.length > 1 ? history.back() : navigate('/'))}>
          <Icon name="back" size={28} stroke={2.5} />
          <span>{t('common.back')}</span>
        </button>
      )}
      {title && <h1 className="text-[30px] font-bold leading-[1.3]">{title}</h1>}
      {lead && <p className="-mt-1 text-[20px] leading-normal text-muted">{lead}</p>}
      {children}
    </div>
  )
}

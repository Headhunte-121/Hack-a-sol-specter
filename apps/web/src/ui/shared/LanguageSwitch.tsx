import { LANGS, useLang, type Lang } from '../../shell/i18n'
import { Icon } from '../../shell/ui'

/** Full three-way language choice (used in Settings). */
export function LanguageSwitch() {
  const { lang, setLang, t } = useLang()
  return (
    <div role="group" aria-label={t('common.language')} className="grid grid-cols-3 gap-2">
      {LANGS.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => setLang(l.code)}
          aria-pressed={lang === l.code}
          className={`btn min-h-14! text-[18px]! ${lang === l.code ? 'btn-primary' : 'btn-secondary'}`}
        >
          {l.label}
        </button>
      ))}
    </div>
  )
}

/** Language dropdown for the Mobile and Web headers (also exported from Layout.tsx). A native list, so phones open their own
 *  large picker and screen readers announce it as "Language". All three languages show in their own script. */
export function LangPill({ inverted = false }: { inverted?: boolean }) {
  const { lang, setLang, t } = useLang()

  return (
    <label
      className={`relative inline-flex min-h-9 shrink-0 items-center rounded-full transition-colors ${
        inverted
          ? 'bg-white/15 text-white hover:bg-white/25'
          : 'border border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
      }`}
    >
      <span className="sr-only">{t('common.language')}</span>
      <span className="pointer-events-none absolute left-2.5">
        <Icon name="globe" size={15} />
      </span>
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value as Lang)}
        data-testid="lang-select"
        className="min-h-9 cursor-pointer appearance-none rounded-full bg-transparent pr-7 pl-8 text-[13px]! font-bold!"
      >
        {LANGS.map((l) => (
          <option key={l.code} value={l.code} lang={l.code === 'cg' ? 'hne' : l.code} className="bg-white text-ink">
            {l.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-2.5">
        <Icon name="down" size={14} stroke={2.5} />
      </span>
    </label>
  )
}
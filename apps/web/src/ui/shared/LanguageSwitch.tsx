import { ChevronDown, Globe } from 'lucide-react'
import { useId } from 'react'
import { LANGS, useLang, type Lang } from '../../shell/i18n'

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
          className={`btn min-h-10.5! px-2! text-[14px]! ${lang === l.code ? 'btn-primary' : 'btn-secondary'}`}
        >
          {l.label}
        </button>
      ))}
    </div>
  )
}

/** Proportional native-select language pill for Mobile & Web headers. */
export function LangPill({ inverted = false }: { inverted?: boolean }) {
  const { lang, setLang, t } = useLang()
  const id = useId()

  return (
    <div className="relative inline-flex items-center">
      <label htmlFor={id} className="sr-only">
        {t('common.language')}
      </label>

      <Globe
        aria-hidden="true"
        className={`pointer-events-none absolute left-2.5 z-10 size-3.5 shrink-0 ${
          inverted ? 'text-white/90' : 'text-slate-500'
        }`}
        strokeWidth={2}
      />

      <select
        id={id}
        data-testid="lang-select"
        value={lang}
        onChange={(e) => setLang(e.target.value as Lang)}
        className={`cursor-pointer appearance-none rounded-full font-semibold transition-colors focus-visible:outline-none ${
          inverted
            ? 'h-7.5 bg-white/15 pr-6.5 pl-7 text-[11.5px] text-white ring-1 ring-white/25 hover:bg-white/25'
            : 'h-8.5 border border-slate-200/90 bg-white pr-7 pl-7.5 text-[12.5px] text-slate-700 shadow-2xs hover:border-slate-300 hover:bg-slate-50'
        }`}
      >
        {LANGS.map((l) => (
          <option key={l.code} value={l.code} className="bg-white text-slate-900">
            {l.label}
          </option>
        ))}
      </select>

      <ChevronDown
        aria-hidden="true"
        className={`pointer-events-none absolute right-2 z-10 size-3.5 shrink-0 ${
          inverted ? 'text-white/85' : 'text-slate-500'
        }`}
        strokeWidth={2.2}
      />
    </div>
  )
}
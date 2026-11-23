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
  const current = LANGS.find((l) => l.code === lang) ?? LANGS[0]

  return (
    <div
      className={`relative inline-flex h-8.5 items-center gap-1.5 rounded-full px-3 font-semibold transition-colors focus-within:outline-2 focus-within:outline-offset-2 ${
        inverted
          ? 'bg-white/15 text-[12px] text-white ring-1 ring-white/25 hover:bg-white/25 focus-within:outline-white'
          : 'border border-slate-200/90 bg-white text-[12.5px] text-slate-700 shadow-2xs hover:border-slate-300 focus-within:outline-[#1B3B73]'
      }`}
    >
      <label htmlFor={id} className="sr-only">
        {t('common.language')}
      </label>

      <Globe
        aria-hidden="true"
        className={`pointer-events-none size-3.5 shrink-0 ${
          inverted ? 'text-white/90' : 'text-slate-500'
        }`}
        strokeWidth={2}
      />

      <span
        aria-hidden="true"
        className="pointer-events-none translate-y-px leading-none whitespace-nowrap"
      >
        {current.label}
      </span>

      <ChevronDown
        aria-hidden="true"
        className={`pointer-events-none size-3.5 shrink-0 ${
          inverted ? 'text-white/85' : 'text-slate-500'
        }`}
        strokeWidth={2.2}
      />

      <select
        id={id}
        data-testid="lang-select"
        value={lang}
        onChange={(e) => setLang(e.target.value as Lang)}
        className="absolute inset-0 size-full cursor-pointer appearance-none opacity-0"
      >
        {LANGS.map((l) => (
          <option key={l.code} value={l.code} className="bg-white text-slate-900">
            {l.label}
          </option>
        ))}
      </select>
    </div>
  )
}